// Usage: npx tsx server/scripts/create-admin.ts admin@example.com "StrongPass123!" "Admin" "User"
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";

async function main() {
  const [, , email, password, firstName = "Admin", lastName = "User"] = process.argv;

  if (!email || !password) {
    console.error('Usage: npx tsx server/scripts/create-admin.ts <email> <password> [firstName] [lastName]');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "ACTIVE", password: hashedPassword },
    create: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      firstName,
      lastName,
    },
  });

  console.log(`✅ Admin ready: ${user.email} (id: ${user.id})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
