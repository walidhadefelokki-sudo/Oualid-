import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * The recruiter's CV directory, against a real database.
 *
 * Two things matter here. One is that the search finds people the browser's
 * `String.includes` could not — accents, skills, several words meaning
 * several different fields. The other is scope: a recruiter sees their own
 * applicants and nobody else's, and that is the kind of rule worth a test
 * rather than a careful reading.
 */

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

const isLocal = !!url && /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!url) throw new Error("TEST_DATABASE_URL or DATABASE_URL must be set");
if (!isLocal && !process.env.ALLOW_REMOTE_TEST_DB) {
  throw new Error(
    "Refusing to run tests against a non-local database. These tests write and " +
      "delete rows. Set TEST_DATABASE_URL to a local database, or set " +
      "ALLOW_REMOTE_TEST_DB=1 if you are certain."
  );
}

process.env.DATABASE_URL = url;

const prisma = new PrismaClient({ datasources: { db: { url } } });
const directory = await import("./cvDirectory.service");

const TAG = "cvdir-test";

let recruiterA: string;
let recruiterB: string;
let jobA1: string;
let jobA2: string;
let jobB1: string;

const names = (r: { candidates: unknown[] }) => (r.candidates as any[]).map((c) => c.fullName);

const search = (params: Partial<Parameters<typeof directory.searchCvDirectory>[0]> = {}) =>
  directory.searchCvDirectory({ recruiterProfileId: recruiterA, ...params });

const wipe = async () => {
  await prisma.job.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
  await prisma.jobCategory.deleteMany({ where: { slug: { startsWith: TAG } } });
};

/** A recruiter with a company and an offer. */
const makeRecruiter = async (label: string) => {
  const user = await prisma.user.create({
    data: {
      email: `${TAG}-rec-${label}@example.invalid`,
      password: "x",
      role: "RECRUITER",
      recruiterProfile: { create: {} },
    },
    include: { recruiterProfile: true },
  });

  const company = await prisma.company.create({
    data: { name: `Co ${label}`, slug: `${TAG}-co-${label}`, plan: "FREE" },
  });

  return { profileId: user.recruiterProfile!.id, companyId: company.id };
};

const makeJob = async (
  recruiterId: string,
  companyId: string,
  title: string,
  categoryId?: string
) =>
  (
    await prisma.job.create({
      data: {
        recruiterId,
        companyId,
        title,
        slug: `${TAG}-${Math.random().toString(36).slice(2, 10)}`,
        description: "Peu importe.",
        location: "Alger",
        type: "FULL_TIME",
        experienceLevel: "MID",
        status: "PUBLISHED",
        categoryId,
      },
      select: { id: true },
    })
  ).id;

/** A candidate who has applied, with the profile a recruiter searches on. */
const apply = async (
  opts: {
    label: string;
    firstName: string;
    lastName: string;
    jobId: string;
    recruiterId: string;
    skills?: string[];
    currentJobTitle?: string;
    wilaya?: string;
    city?: string;
    yearsExperience?: number;
    aiScore?: number;
    isPreselected?: boolean;
    availableImmediately?: boolean;
    withCv?: boolean;
  }
) => {
  const cv = opts.withCv
    ? await prisma.fileAsset.create({
        data: { url: "https://example.invalid/cv.pdf", provider: TAG, fileName: "cv.pdf" },
      })
    : null;

  const user = await prisma.user.create({
    data: {
      email: `${TAG}-${opts.label}@example.invalid`,
      password: "x",
      role: "CANDIDATE",
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: "0555000000",
      candidateProfile: {
        create: {
          skills: opts.skills ?? [],
          currentJobTitle: opts.currentJobTitle,
          wilaya: opts.wilaya,
          city: opts.city,
          yearsExperience: opts.yearsExperience,
          availableImmediately: opts.availableImmediately ?? true,
          resumeId: cv?.id,
        },
      },
    },
    include: { candidateProfile: true },
  });

  await prisma.application.create({
    data: {
      jobId: opts.jobId,
      candidateId: user.candidateProfile!.id,
      recruiterId: opts.recruiterId,
      aiScore: opts.aiScore,
      isPreselected: opts.isPreselected ?? false,
    },
  });

  return user.candidateProfile!.id;
};

beforeAll(async () => {
  await wipe();

  const a = await makeRecruiter("a");
  const b = await makeRecruiter("b");
  recruiterA = a.profileId;
  recruiterB = b.profileId;

  const category = await prisma.jobCategory.create({
    data: { name: "Informatique", slug: `${TAG}-cat` },
  });

  jobA1 = await makeJob(recruiterA, a.companyId, "Développeur Front-End", category.id);
  jobA2 = await makeJob(recruiterA, a.companyId, "Comptable", category.id);
  jobB1 = await makeJob(recruiterB, b.companyId, "Chauffeur");

  await apply({
    label: "amina",
    firstName: "Amina",
    lastName: "Belkacem",
    jobId: jobA1,
    recruiterId: recruiterA,
    skills: ["React", "TypeScript"],
    currentJobTitle: "Développeuse Front-End",
    wilaya: "Alger",
    yearsExperience: 5,
    aiScore: 88,
    withCv: true,
  });

  await apply({
    label: "karim",
    firstName: "Karim",
    lastName: "Saïdi",
    jobId: jobA2,
    recruiterId: recruiterA,
    skills: ["Excel", "Sage"],
    currentJobTitle: "Comptable",
    wilaya: "Oran",
    yearsExperience: 2,
    aiScore: 61,
    isPreselected: true,
    availableImmediately: false,
  });

  await apply({
    label: "sofiane",
    firstName: "Sofiane",
    lastName: "Mansouri",
    jobId: jobA1,
    recruiterId: recruiterA,
    skills: ["React"],
    currentJobTitle: "Intégrateur web",
    city: "Blida",
    yearsExperience: 8,
    aiScore: 74,
  });

  // Another recruiter's applicant entirely.
  await apply({
    label: "yacine",
    firstName: "Yacine",
    lastName: "Toumi",
    jobId: jobB1,
    recruiterId: recruiterB,
    skills: ["Conduite"],
    currentJobTitle: "Chauffeur",
    wilaya: "Alger",
    aiScore: 95,
  });
});

afterAll(async () => {
  await wipe();
  await prisma.fileAsset.deleteMany({ where: { provider: TAG } });
  await prisma.$disconnect();
});

describe("scope", () => {
  it("shows only this recruiter's applicants", async () => {
    const result = await search();

    expect(names(result).sort()).toEqual(["Amina Belkacem", "Karim Saïdi", "Sofiane Mansouri"]);
    // Scores highest on the board, and belongs to somebody else.
    expect(names(result)).not.toContain("Yacine Toumi");
    expect(result.total).toBe(3);
  });

  it("gives the other recruiter their own list", async () => {
    const result = await directory.searchCvDirectory({ recruiterProfileId: recruiterB });
    expect(names(result)).toEqual(["Yacine Toumi"]);
  });

  it("does not find another recruiter's candidate by name", async () => {
    // The search must not be a way round the scope.
    expect(names(await search({ q: "Toumi" }))).toHaveLength(0);
  });

  it("leaves out a candidate whose account was deleted", async () => {
    await prisma.user.update({
      where: { email: `${TAG}-sofiane@example.invalid` },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    expect(names(await search())).not.toContain("Sofiane Mansouri");

    await prisma.user.update({
      where: { email: `${TAG}-sofiane@example.invalid` },
      data: { status: "PENDING", deletedAt: null },
    });
  });
});

describe("search", () => {
  it("finds a name typed without its accents", async () => {
    expect(names(await search({ q: "saidi" }))).toEqual(["Karim Saïdi"]);
  });

  it("finds a name typed with them", async () => {
    expect(names(await search({ q: "Saïdi" }))).toEqual(["Karim Saïdi"]);
  });

  it("searches skills, which the browser filter never looked at", async () => {
    expect(names(await search({ q: "react" })).sort()).toEqual([
      "Amina Belkacem",
      "Sofiane Mansouri",
    ]);
  });

  it("searches the current job title", async () => {
    expect(names(await search({ q: "integrateur" }))).toEqual(["Sofiane Mansouri"]);
  });

  it("searches the offer they applied to", async () => {
    expect(names(await search({ q: "comptable" }))).toEqual(["Karim Saïdi"]);
  });

  it("treats several words as several conditions, not one substring", async () => {
    // One term matches a skill, the other a wilaya. "%react alger%" as a
    // single substring — what the old client-side filter did — matches nobody.
    expect(names(await search({ q: "react alger" }))).toEqual(["Amina Belkacem"]);

    // Both must match: Sofiane knows React but is in Blida.
    expect(names(await search({ q: "react oran" }))).toHaveLength(0);
  });

  it("matches a partial word", async () => {
    expect(names(await search({ q: "bel" }))).toEqual(["Amina Belkacem"]);
  });

  it("returns nobody rather than everybody for an unmatched term", async () => {
    expect(names(await search({ q: "astronaute" }))).toHaveLength(0);
  });
});

describe("filters", () => {
  it("filters by the offer applied to", async () => {
    expect(names(await search({ jobId: jobA1 })).sort()).toEqual([
      "Amina Belkacem",
      "Sofiane Mansouri",
    ]);
  });

  it("filters by wilaya, and looks at the city as well", async () => {
    expect(names(await search({ wilaya: "Oran" }))).toEqual(["Karim Saïdi"]);
    // Sofiane filled in a city and no wilaya.
    expect(names(await search({ wilaya: "blida" }))).toEqual(["Sofiane Mansouri"]);
  });

  it("filters by years of experience", async () => {
    expect(names(await search({ minExperience: 5 })).sort()).toEqual([
      "Amina Belkacem",
      "Sofiane Mansouri",
    ]);
  });

  it("filters on the best score, not every application", async () => {
    expect(names(await search({ minScore: 80 }))).toEqual(["Amina Belkacem"]);
  });

  it("filters on having a CV", async () => {
    expect(names(await search({ hasCv: true }))).toEqual(["Amina Belkacem"]);
  });

  it("filters on availability", async () => {
    expect(names(await search({ availableNow: true }))).not.toContain("Karim Saïdi");
  });

  it("filters on preselection", async () => {
    expect(names(await search({ preselectedOnly: true }))).toEqual(["Karim Saïdi"]);
  });

  it("combines a term with a filter", async () => {
    expect(names(await search({ q: "react", minExperience: 8 }))).toEqual([
      "Sofiane Mansouri",
    ]);
  });
});

describe("one row per person", () => {
  it("lists somebody once however many offers they answered", async () => {
    const amina = await prisma.candidateProfile.findFirstOrThrow({
      where: { user: { email: `${TAG}-amina@example.invalid` } },
      select: { id: true },
    });

    // A second application, to the recruiter's other offer.
    await prisma.application.create({
      data: {
        jobId: jobA2,
        candidateId: amina.id,
        recruiterId: recruiterA,
        aiScore: 40,
      },
    });

    const result = await search();
    const rows = (result.candidates as any[]).filter((c) => c.fullName === "Amina Belkacem");

    expect(rows).toHaveLength(1);
    expect(result.total).toBe(3);

    // Both offers are on the row, so filtering on either one finds her.
    expect(rows[0].jobTitles.sort()).toEqual(["Comptable", "Développeur Front-End"]);
    // The better application supplies what is shown.
    expect(rows[0].aiScore).toBe(88);

    expect(names(await search({ jobId: jobA2 }))).toContain("Amina Belkacem");

    await prisma.application.deleteMany({
      where: { candidateId: amina.id, jobId: jobA2 },
    });
  });
});

describe("order and pages", () => {
  it("puts the best score first", async () => {
    expect(names(await search())).toEqual([
      "Amina Belkacem",
      "Sofiane Mansouri",
      "Karim Saïdi",
    ]);
  });

  it("pages, and counts people rather than applications", async () => {
    const first = await search({ perPage: 2, page: 1 });
    const second = await search({ perPage: 2, page: 2 });

    expect(first.candidates).toHaveLength(2);
    expect(second.candidates).toHaveLength(1);
    expect(first.total).toBe(3);
    expect(first.totalPages).toBe(2);
    expect(names(first).some((n) => names(second).includes(n))).toBe(false);
  });

  it("never ships a password hash or the CV document", async () => {
    const row = (await search()).candidates[0] as Record<string, unknown>;

    expect(JSON.stringify(row)).not.toContain("password");
    // The builder document is the whole CV and has no business in a list.
    expect(row).not.toHaveProperty("cvBuilderData");
    expect(row).toHaveProperty("hasCv");
  });
});

describe("totals", () => {
  it("reports the whole pipeline alongside the matching count", async () => {
    const result = await search({ q: "react" });

    // The screen's headline figures are about the recruiter's pipeline. If
    // they counted the filtered set, "candidats" would drop every time
    // somebody typed in the search box.
    expect(result.total).toBe(2);
    expect(result.totalAll).toBe(3);
  });

  it("raises the page cap for this endpoint", async () => {
    // One recruiter's own applicants behind a Corporate plan, and the screen
    // derives its filter dropdowns from the set it is given — a page of
    // twenty would quietly narrow them.
    expect((await search({ perPage: 1000 })).perPage).toBe(200);
  });
});
