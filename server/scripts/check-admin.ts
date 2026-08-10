// Usage: npx tsx server/scripts/check-admin.ts admin@yourdomain.com
import prisma from "../utils/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx server/scripts/check-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log(`❌ No user found with email ${email}`);
    process.exit(1);
  }

  console.log("Current DB record:");
  console.log({ id: user.id, email: user.email, role: user.role, status: user.status });

  if (user.role !== "ADMIN") {
    console.log(`⚠️  role is "${user.role}", not "ADMIN". Fixing...`);
    const updated = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log("✅ Updated:", { role: updated.role });
  } else {
    console.log("✅ role is already ADMIN in the database.");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
