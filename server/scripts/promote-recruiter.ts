// Usage: npx tsx server/scripts/promote-recruiter.ts user@example.com "Company Name"
import crypto from "crypto";
import prisma from "../utils/prisma";

const slugify = (name: string) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "company"}-${suffix}`;
};

async function main() {
  const [, , email, companyName = "My Company"] = process.argv;

  if (!email) {
    console.error('Usage: npx tsx server/scripts/promote-recruiter.ts <email> ["Company Name"]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { recruiterProfile: true, candidateProfile: true },
  });

  if (!user) {
    console.log(`❌ No user found with email ${email}`);
    process.exit(1);
  }

  if (user.role === "RECRUITER" && user.recruiterProfile) {
    console.log(`✅ ${email} is already a recruiter (recruiterProfile id: ${user.recruiterProfile.id}).`);
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: {
      role: "RECRUITER",
      recruiterProfile: user.recruiterProfile ? undefined : { create: {} },
    },
    include: { recruiterProfile: true },
  });

  if (!updated.recruiterProfile) {
    console.log("❌ Something went wrong creating the recruiter profile.");
    process.exit(1);
  }

  // Only create a Company if this recruiter isn't already linked to one.
  const existingMembership = await prisma.companyMember.findFirst({
    where: { recruiterId: updated.recruiterProfile.id },
  });

  if (!existingMembership) {
    await prisma.company.create({
      data: {
        name: companyName,
        slug: slugify(companyName),
        plan: "FREE",
        members: {
          create: {
            role: "OWNER",
            recruiter: { connect: { id: updated.recruiterProfile.id } },
          },
        },
      },
    });
  }

  console.log(`✅ ${email} is now a RECRUITER with company "${companyName}".`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
