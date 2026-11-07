/**
 * Creates or resets an administrator.
 *
 *   npx tsx server/scripts/create-admin.ts <email> <password> [options]
 *
 *     --super               unrestricted: every admin section
 *     --scopes=a,b,c        limited to these sections
 *     --name="First Last"
 *
 * One of --super or --scopes is required. Neither was accepted before, which
 * now produces an administrator who can sign in and reach nothing: admin
 * access is an allow-list and its default is empty, deliberately. Rather than
 * create that silently, the script asks which it is.
 *
 * Re-running on an existing e-mail resets the password. The access flags are
 * only touched when the command says so, so resetting a forgotten password
 * cannot quietly change what somebody may do.
 */
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import {
  ADMIN_SCOPES,
  SCOPE_LABELS,
  isAdminScope,
  normaliseScopes,
} from "../utils/adminScopes";

const usage = () => {
  console.error(
    [
      "Usage: npx tsx server/scripts/create-admin.ts <email> <password> [options]",
      "",
      "  --super            unrestricted administrator",
      "  --scopes=a,b,c     limited to these sections",
      '  --name="First Last"',
      "",
      "Sections:",
      ...ADMIN_SCOPES.map((s) => `  ${s.padEnd(22)}${SCOPE_LABELS[s].label}`),
      "",
      "Examples:",
      "  … create-admin.ts chef@darlemploi.dz 'Pass123!' --super",
      "  … create-admin.ts moderateur@darlemploi.dz 'Pass123!' --scopes=freelance_moderation,jobs",
    ].join("\n")
  );
  process.exit(1);
};

async function main() {
  const argv = process.argv.slice(2);
  const flags = argv.filter((a) => a.startsWith("--"));
  const [email, password] = argv.filter((a) => !a.startsWith("--"));

  if (!email || !password) usage();

  const isSuper = flags.includes("--super");
  const scopesFlag = flags.find((f) => f.startsWith("--scopes="));
  const nameFlag = flags.find((f) => f.startsWith("--name="));

  if (!isSuper && !scopesFlag) {
    console.error("Say which: --super, or --scopes=… (an administrator with neither reaches nothing).\n");
    usage();
  }

  if (isSuper && scopesFlag) {
    console.error("--super and --scopes are mutually exclusive: unrestricted ignores the list.\n");
    usage();
  }

  const asked = scopesFlag ? scopesFlag.slice("--scopes=".length).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const scopes = normaliseScopes(asked);
  const unknown = asked.filter((s) => !scopes.includes(s as never));

  // Refused rather than dropped: on the command line a typo would otherwise
  // produce an administrator quietly missing the section you meant to grant.
  if (unknown.length) {
    console.error(`Unknown section(s): ${unknown.join(", ")}\n`);
    usage();
  }

  if (scopesFlag && scopes.length === 0) {
    console.error("--scopes was empty. An administrator with no section reaches nothing.\n");
    usage();
  }

  if (password.length < 10) {
    console.error("Choose a password of at least 10 characters for an admin account.");
    process.exit(1);
  }

  const [firstName = "Admin", ...rest] = (nameFlag ? nameFlag.slice("--name=".length) : "").split(" ");
  const lastName = rest.join(" ") || "";

  const hashedPassword = await bcrypt.hash(password, 12);

  const access = isSuper
    ? { isSuperAdmin: true, adminScopes: [] }
    : { isSuperAdmin: false, adminScopes: scopes };

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      // Confirmed by definition: somebody with the server shell set this.
      emailVerified: true,
      password: hashedPassword,
      ...access,
    },
    create: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: true,
      firstName: firstName || "Admin",
      lastName,
      ...access,
    },
    select: { id: true, email: true, isSuperAdmin: true, adminScopes: true },
  });

  console.log(`\n✅ ${user.email}`);
  console.log(`   id      ${user.id}`);
  console.log(
    `   access  ${
      user.isSuperAdmin
        ? "unrestricted — every section"
        : user.adminScopes
            .map((s) => (isAdminScope(s) ? SCOPE_LABELS[s].label : s))
            .join(", ")
    }`
  );
  console.log(
    "\n   The password is stored as a bcrypt hash and cannot be read back.\n" +
      "   Re-run this command to set a new one.\n"
  );

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
