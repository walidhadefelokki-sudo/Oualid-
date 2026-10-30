import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * The mini-portfolio, and the plan limits on it.
 *
 * The limits are what people pay for, so they are tested where they are
 * enforced rather than where the editor happens to hide a button.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error("Refusing to run against a non-local database.");
}
process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const portfolios = await import("./portfolio.service");

const EMAIL = "portfolio-test@example.invalid";
let freelancerId: string;
let userId: string;
let username: string;

beforeAll(async () => {
  for (const p of [
    { tier: "FREE" as const, name: "Gratuit", price: "0", maxActiveServices: 1, monthlyProposals: null, maxPortfolioProjects: 6, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PRO" as const, name: "Pro", price: "2500", maxActiveServices: 5, monthlyProposals: 40, maxPortfolioProjects: 20, prioritySearch: false, removableBranding: false, customSubdomain: false, weeklyBoosts: 0 },
    { tier: "PREMIUM" as const, name: "Premium", price: "6000", maxActiveServices: null, monthlyProposals: 100, maxPortfolioProjects: null, prioritySearch: true, removableBranding: true, customSubdomain: true, weeklyBoosts: 1 },
  ]) {
    await prisma.freelancePlan.upsert({ where: { tier: p.tier }, update: p, create: p });
  }
});

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  username = `pf-${Date.now()}`;
  const u = await prisma.user.create({
    data: {
      email: EMAIL,
      password: "x",
      role: "CANDIDATE",
      freelancerProfile: { create: { username, displayName: "Portfolio Test" } },
    },
    select: { id: true, freelancerProfile: { select: { id: true } } },
  });
  userId = u.id;
  freelancerId = u.freelancerProfile!.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

const subscribe = async (tier: "PRO" | "PREMIUM") => {
  const plan = await prisma.freelancePlan.findUnique({ where: { tier } });
  await prisma.freelanceSubscription.create({
    data: {
      freelancerId,
      userId,
      planId: plan!.id,
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 86400_000),
      periodStartedAt: new Date(),
    },
  });
};

const addProjects = async (n: number) => {
  for (let i = 0; i < n; i++) {
    await portfolios.addProject(freelancerId, { title: `Réalisation ${i + 1}` });
  }
};

describe("sections", () => {
  it("offers the full set in order before anything is arranged", async () => {
    const p = await portfolios.getOrCreate(freelancerId);
    const sections = await portfolios.sectionsFor(p.id);

    expect(sections[0].type).toBe("HEADER");
    expect(sections).toHaveLength(10);
    expect(sections.every((s) => s.visible)).toBe(true);
  });

  it("keeps an arrangement and the sections turned off", async () => {
    await portfolios.saveSections(freelancerId, [
      { type: "HEADER" },
      { type: "SERVICES" },
      { type: "ABOUT", visible: false },
    ]);

    const p = await portfolios.getOrCreate(freelancerId);
    const sections = await portfolios.sectionsFor(p.id);

    expect(sections[1].type).toBe("SERVICES");
    expect(sections.find((s) => s.type === "ABOUT")!.visible).toBe(false);
  });
});

describe("plan limits on projects", () => {
  it("stops the free plan at six", async () => {
    await addProjects(6);
    await expect(portfolios.addProject(freelancerId, { title: "La septième" })).rejects.toThrow(
      /6 réalisations/
    );
  });

  it("lets Pro go further", async () => {
    await subscribe("PRO");
    await addProjects(7);
    const count = await prisma.portfolioProject.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  it("does not limit Premium", async () => {
    await subscribe("PREMIUM");
    await addProjects(8);
    await expect(
      portfolios.addProject(freelancerId, { title: "Encore une" })
    ).resolves.toBeTruthy();
  });

  it("allows at most three featured", async () => {
    await addProjects(4);
    const all = await prisma.portfolioProject.findMany({ orderBy: { position: "asc" } });

    for (const p of all.slice(0, 3)) {
      await portfolios.updateProject(freelancerId, p.id, { featured: true });
    }
    await expect(
      portfolios.updateProject(freelancerId, all[3].id, { featured: true })
    ).rejects.toThrow(/Trois réalisations/);
  });

  it("refuses to touch someone else's realisation", async () => {
    await addProjects(1);
    const mine = await prisma.portfolioProject.findFirst();

    const other = await prisma.user.create({
      data: {
        email: "pf-other@example.invalid",
        password: "x",
        role: "CANDIDATE",
        freelancerProfile: { create: { username: `pfo-${Date.now()}`, displayName: "Autre" } },
      },
      select: { freelancerProfile: { select: { id: true } } },
    });

    await expect(
      portfolios.updateProject(other.freelancerProfile!.id, mine!.id, { title: "volé" })
    ).rejects.toThrow(/introuvable/);

    await prisma.user.deleteMany({ where: { email: "pf-other@example.invalid" } });
  });
});

describe("video and templates", () => {
  it("refuses video on the free plan", async () => {
    await expect(
      portfolios.addProject(freelancerId, {
        title: "Avec vidéo",
        videoUrl: "https://www.youtube.com/watch?v=abc",
      })
    ).rejects.toThrow(/Pro et Premium/);
  });

  it("accepts YouTube and Vimeo on Pro, and nothing else", async () => {
    await subscribe("PRO");

    await expect(
      portfolios.addProject(freelancerId, {
        title: "YouTube",
        videoUrl: "https://www.youtube.com/watch?v=abc",
      })
    ).resolves.toBeTruthy();

    await expect(
      portfolios.addProject(freelancerId, {
        title: "Ailleurs",
        videoUrl: "https://example.com/video.mp4",
      })
    ).rejects.toThrow(/YouTube et Vimeo/);
  });

  it("keeps the other templates for paid plans", async () => {
    await expect(
      portfolios.updateSettings(freelancerId, { template: "bold" })
    ).rejects.toThrow(/Pro et Premium/);

    await subscribe("PRO");
    await expect(
      portfolios.updateSettings(freelancerId, { template: "bold" })
    ).resolves.toBeTruthy();
  });

  it("refuses a colour that is not a colour", async () => {
    await expect(
      portfolios.updateSettings(freelancerId, { accentColor: "rouge" })
    ).rejects.toThrow(/Couleur/);
  });
});

describe("the public page", () => {
  it("stays hidden until it is published", async () => {
    await portfolios.getOrCreate(freelancerId);
    expect(await portfolios.publicPage(username)).toBeNull();

    await portfolios.updateSettings(freelancerId, { published: true });
    expect(await portfolios.publicPage(username)).not.toBeNull();
  });

  it("carries the branding on a free plan and drops it on Premium", async () => {
    await portfolios.updateSettings(freelancerId, { published: true });
    expect((await portfolios.publicPage(username))!.showBranding).toBe(true);

    await subscribe("PREMIUM");
    expect((await portfolios.publicPage(username))!.showBranding).toBe(false);
  });

  it("shows featured realisations first", async () => {
    await addProjects(3);
    const all = await prisma.portfolioProject.findMany({ orderBy: { position: "asc" } });
    await portfolios.updateProject(freelancerId, all[2].id, { featured: true });
    await portfolios.updateSettings(freelancerId, { published: true });

    const page = await portfolios.publicPage(username);
    expect(page!.projects[0].title).toBe("Réalisation 3");
  });

  it("returns null for an unknown handle", async () => {
    expect(await portfolios.publicPage("personne-du-tout")).toBeNull();
  });
});
