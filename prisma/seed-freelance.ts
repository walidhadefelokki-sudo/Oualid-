/**
 * Development fixtures for the freelance marketplace.
 *
 * Sectors, credit packs and plans only — the things an admin would configure
 * before launch, not invented services, ratings or users. The brief forbids
 * fabricated marketplace content, so an empty marketplace stays empty and
 * the pages show their empty states.
 *
 * Prices are the PDF's opening proposals, which it is explicit are figures
 * to test rather than market data. They live here as seed values precisely
 * so they can be changed from the back-office without a deploy.
 *
 *   npx tsx prisma/seed-freelance.ts
 *
 * Idempotent: upserts by a natural key, so running it twice changes nothing.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SECTORS = [
  { name: "Technologie & IT", slug: "technologie-it" },
  { name: "Design & Création", slug: "design-creation" },
  { name: "Rédaction & Traduction", slug: "redaction-traduction" },
  { name: "Marketing & Ventes", slug: "marketing-ventes" },
  { name: "Vidéo & Audio", slug: "video-audio" },
  { name: "Finance & Comptabilité", slug: "finance-comptabilite" },
  { name: "Éducation & Formation", slug: "education-formation" },
  { name: "Services aux entreprises", slug: "services-entreprises" },
];

const PACKS = [
  { name: "50 crédits", credits: 50, price: 1000, position: 1 },
  { name: "150 crédits", credits: 150, price: 2500, position: 2 },
  { name: "400 crédits", credits: 400, price: 5000, position: 3 },
];

const PLANS = [
  {
    tier: "FREE" as const,
    name: "Gratuit",
    price: 0,
    maxActiveServices: 1,
    monthlyProposals: 5,
    maxPortfolioProjects: 6,
    prioritySearch: false,
    removableBranding: false,
    customSubdomain: false,
    weeklyBoosts: 0,
  },
  {
    tier: "PRO" as const,
    name: "Pro",
    price: 2500,
    maxActiveServices: 5,
    monthlyProposals: 40,
    maxPortfolioProjects: 20,
    prioritySearch: false,
    removableBranding: false,
    customSubdomain: false,
    weeklyBoosts: 0,
  },
  {
    tier: "PREMIUM" as const,
    name: "Premium",
    price: 6000,
    // Null is unlimited, bounded in code by operational safeguards.
    maxActiveServices: null,
    monthlyProposals: 100,
    maxPortfolioProjects: null,
    prioritySearch: true,
    removableBranding: true,
    customSubdomain: true,
    weeklyBoosts: 1,
  },
];

/** What a publication and a proposal cost, editable from the back-office. */
const SETTINGS = [
  { key: "freelance.credits.servicePublication", value: 10, description: "Crédits par publication de service" },
  { key: "freelance.credits.proposal", value: 2, description: "Crédits par proposition" },
  { key: "freelance.service.durationDays", value: 30, description: "Durée de mise en ligne d'un service" },
  { key: "freelance.trial.services", value: 1, description: "Services offerts à l'essai" },
  { key: "freelance.trial.proposals", value: 5, description: "Propositions offertes à l'essai" },
];

const main = async () => {
  // Keyed on name, not slug: JobCategory.name is unique and the recruitment
  // side already seeded several of these under different slugs. Matching on
  // slug would try to create a duplicate name and fail.
  for (const s of SECTORS) {
    const existing = await prisma.jobCategory.findUnique({ where: { name: s.name } });
    if (existing) continue;
    await prisma.jobCategory.create({ data: s });
  }
  const sectorCount = await prisma.jobCategory.count();
  console.log(`${sectorCount} secteurs au total`);

  for (const p of PACKS) {
    const existing = await prisma.creditPack.findFirst({ where: { credits: p.credits } });
    if (existing) {
      await prisma.creditPack.update({ where: { id: existing.id }, data: p });
    } else {
      await prisma.creditPack.create({ data: p });
    }
  }
  console.log(`${PACKS.length} packs de crédits`);

  for (const plan of PLANS) {
    await prisma.freelancePlan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }
  console.log(`${PLANS.length} formules`);

  for (const s of SETTINGS) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }
  console.log(`${SETTINGS.length} réglages`);

  await prisma.$disconnect();
};

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
