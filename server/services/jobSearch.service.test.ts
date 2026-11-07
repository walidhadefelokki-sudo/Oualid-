import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Job search, against a real database.
 *
 * Mocking here would prove nothing: every behaviour worth having is Postgres
 * behaviour — the accent-folding dictionary, prefix matching, relevance
 * ranking and trigram similarity. The point of these tests is the searches
 * that used to come back empty on a database that held the answer.
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
const search = await import("./jobSearch.service");

const TAG = "jobsearch-test";
const EMAIL = `${TAG}@example.invalid`;

let recruiterProfileId: string;
let companyId: string;
let otherCompanyId: string;
let categoryId: string;

/** Only the offers this file created, so a populated database cannot skew it. */
const ours = (jobs: any[]) => jobs.filter((j) => j.title.includes("[T]"));
const titles = (jobs: any[]) => ours(jobs).map((j) => j.title);

const makeJob = async (
  title: string,
  extra: Record<string, unknown> = {},
  company = companyId
) =>
  prisma.job.create({
    data: {
      recruiterId: recruiterProfileId,
      companyId: company,
      title,
      slug: `${TAG}-${Math.random().toString(36).slice(2, 10)}`,
      description: "Description par défaut.",
      location: "Alger",
      type: "FULL_TIME",
      experienceLevel: "MID",
      status: "PUBLISHED",
      ...extra,
    },
    select: { id: true, title: true },
  });

const wipe = async () => {
  await prisma.job.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.jobCategory.deleteMany({ where: { slug: `${TAG}-cat` } });
};

beforeAll(async () => {
  await wipe();

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: "x",
      role: "RECRUITER",
      recruiterProfile: { create: {} },
    },
    include: { recruiterProfile: true },
  });
  recruiterProfileId = user.recruiterProfile!.id;

  companyId = (
    await prisma.company.create({
      data: { name: "Makers Label", slug: `${TAG}-co`, plan: "FREE" },
    })
  ).id;

  otherCompanyId = (
    await prisma.company.create({
      data: { name: "Sonatrach Numérique", slug: `${TAG}-co2`, plan: "FREE" },
    })
  ).id;

  categoryId = (
    await prisma.jobCategory.create({
      data: { name: "Informatique", slug: `${TAG}-cat` },
    })
  ).id;

  await makeJob("[T] Développeur Full Stack Sénior", {
    description: "Nous cherchons quelqu'un à l'aise avec React et Node.",
    wilaya: "Alger",
    categoryId,
    experienceLevel: "SENIOR",
    salaryMin: 120000,
    salaryMax: 180000,
  });

  await makeJob("[T] Ingénieur Réseaux", {
    description: "Administration de réseaux, télétravail partiel possible.",
    wilaya: "Oran",
    remote: true,
    type: "CONTRACT",
  });

  await makeJob("[T] Comptable", {
    description: "Tenue de la comptabilité générale. Maîtrise d'Excel.",
    wilaya: "Constantine",
  });

  // Sits on the other company, to prove the employer's name is searchable.
  await makeJob("[T] Chargé de clientèle", {
    description: "Relation client en agence.",
    wilaya: "Alger",
  }, otherCompanyId);
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("buildTsQuery", () => {
  it("makes every word a required prefix, so word order does not matter", () => {
    expect(search.buildTsQuery("dev full")).toBe("dev:* & full:*");
    expect(search.buildTsQuery("  FULL   Dev ")).toBe("full:* & dev:*");
  });

  it("drops punctuation rather than escaping it", () => {
    // These are tsquery's own operators. Reaching the parser they would be a
    // syntax error, which the user would see as a failed search.
    expect(search.buildTsQuery("dev & | ! : * ( )")).toBe("dev:*");
    expect(search.buildTsQuery("c'est-à-dire")).toBe("est:* & dire:*");
  });

  it("ignores a query with nothing searchable in it", () => {
    expect(search.buildTsQuery("")).toBeNull();
    expect(search.buildTsQuery("   ")).toBeNull();
    expect(search.buildTsQuery("!!!")).toBeNull();
    // One letter is not a search, it is every job on the board.
    expect(search.buildTsQuery("a")).toBeNull();
  });
});

describe("accents", () => {
  it("finds an accented offer from an unaccented query", async () => {
    // The reason this work exists: people type "developpeur".
    const { jobs } = await search.searchJobs({ q: "developpeur" });
    expect(titles(jobs)).toContain("[T] Développeur Full Stack Sénior");
  });

  it("finds it from the accented spelling too", async () => {
    const { jobs } = await search.searchJobs({ q: "Développeur" });
    expect(titles(jobs)).toContain("[T] Développeur Full Stack Sénior");
  });

  it("ignores case", async () => {
    const { jobs } = await search.searchJobs({ q: "INGENIEUR" });
    expect(titles(jobs)).toContain("[T] Ingénieur Réseaux");
  });
});

describe("what the term reaches", () => {
  it("matches a word that is only in the description", async () => {
    const { jobs } = await search.searchJobs({ q: "react" });
    expect(titles(jobs)).toEqual(["[T] Développeur Full Stack Sénior"]);
  });

  it("matches the employer's name", async () => {
    const { jobs } = await search.searchJobs({ q: "sonatrach" });
    expect(titles(jobs)).toContain("[T] Chargé de clientèle");
  });

  it("matches a partial word, for search as you type", async () => {
    const { jobs } = await search.searchJobs({ q: "compt" });
    expect(titles(jobs)).toContain("[T] Comptable");
  });

  it("requires every word, in any order", async () => {
    const both = await search.searchJobs({ q: "stack developpeur" });
    expect(titles(both.jobs)).toEqual(["[T] Développeur Full Stack Sénior"]);

    // "comptable" belongs to another offer, so together they match nothing —
    // and the similarity fallback must not quietly turn that into a hit.
    const neither = await search.searchJobs({ q: "developpeur comptable" });
    expect(ours(neither.jobs)).toHaveLength(0);
  });

  it("finds nothing for a term nobody advertises", async () => {
    const { jobs, didYouMean } = await search.searchJobs({ q: "astronaute" });
    expect(ours(jobs)).toHaveLength(0);
    expect(didYouMean).toBe(false);
  });
});

describe("typos", () => {
  it("falls back to similarity and says that it did", async () => {
    const { jobs, didYouMean } = await search.searchJobs({ q: "develeoppeur" });

    expect(titles(jobs)).toContain("[T] Développeur Full Stack Sénior");
    // Flagged, so the page can say the spelling was corrected instead of
    // presenting a guess as an answer.
    expect(didYouMean).toBe(true);
  });

  it("does not use similarity when the words already matched", async () => {
    const { didYouMean } = await search.searchJobs({ q: "comptable" });
    expect(didYouMean).toBe(false);
  });
});

describe("filters", () => {
  it("combines a term with a wilaya", async () => {
    const hit = await search.searchJobs({ q: "ingenieur", wilaya: "Oran" });
    expect(titles(hit.jobs)).toEqual(["[T] Ingénieur Réseaux"]);

    const miss = await search.searchJobs({ q: "ingenieur", wilaya: "Alger" });
    expect(ours(miss.jobs)).toHaveLength(0);
  });

  it("matches a wilaya without its accents", async () => {
    const { jobs } = await search.searchJobs({ wilaya: "constantine" });
    expect(titles(jobs)).toContain("[T] Comptable");
  });

  it("filters on type, experience and remote", async () => {
    expect(titles((await search.searchJobs({ type: "CONTRACT" })).jobs)).toEqual([
      "[T] Ingénieur Réseaux",
    ]);
    expect(titles((await search.searchJobs({ remote: true })).jobs)).toEqual([
      "[T] Ingénieur Réseaux",
    ]);
    expect(titles((await search.searchJobs({ experienceLevel: "SENIOR" })).jobs)).toEqual([
      "[T] Développeur Full Stack Sénior",
    ]);
  });

  it("filters on category slug", async () => {
    const { jobs } = await search.searchJobs({ categorySlug: `${TAG}-cat` });
    expect(titles(jobs)).toEqual(["[T] Développeur Full Stack Sénior"]);
  });

  it("keeps offers that state no salary when a floor is given", async () => {
    const { jobs } = await search.searchJobs({ salaryMin: 100000 });

    // Most offers publish no figure. Dropping them would turn "at least
    // 100 000" into "only the few offers that say", which reads as an empty
    // market rather than a filtered one.
    expect(titles(jobs)).toContain("[T] Développeur Full Stack Sénior");
    expect(titles(jobs)).toContain("[T] Comptable");
  });

  it("excludes an offer whose stated salary is below the floor", async () => {
    const low = await makeJob("[T] Stage marketing", {
      salaryMin: 20000,
      salaryMax: 25000,
    });

    const { jobs } = await search.searchJobs({ salaryMin: 100000 });
    expect(titles(jobs)).not.toContain("[T] Stage marketing");

    await prisma.job.delete({ where: { id: low.id } });
  });
});

describe("what is published", () => {
  it("leaves out an offer that is not published", async () => {
    const draft = await makeJob("[T] Brouillon secret", { status: "DRAFT" });

    const { jobs } = await search.searchJobs({ q: "brouillon" });
    expect(ours(jobs)).toHaveLength(0);

    await prisma.job.delete({ where: { id: draft.id } });
  });

  it("leaves out an offer that has expired", async () => {
    const expired = await makeJob("[T] Offre expirée", {
      expiresAt: new Date(Date.now() - 86_400_000),
    });

    // It was being listed before: nothing looked at expiresAt.
    const { jobs } = await search.searchJobs({ q: "expiree" });
    expect(ours(jobs)).toHaveLength(0);

    await prisma.job.delete({ where: { id: expired.id } });
  });
});

describe("ranking and pages", () => {
  it("puts a featured offer first", async () => {
    const promoted = await makeJob("[T] Comptable junior", {
      description: "Comptabilité.",
      featured: true,
    });

    const { jobs } = await search.searchJobs({ q: "comptable" });
    expect(titles(jobs)[0]).toBe("[T] Comptable junior");

    await prisma.job.delete({ where: { id: promoted.id } });
  });

  it("ranks a title match above a description-only match", async () => {
    const inDescription = await makeJob("[T] Assistant administratif", {
      description: "Travaille avec le comptable de l'agence.",
    });

    const { jobs } = await search.searchJobs({ q: "comptable" });
    const seen = titles(jobs);

    expect(seen.indexOf("[T] Comptable")).toBeLessThan(
      seen.indexOf("[T] Assistant administratif")
    );

    await prisma.job.delete({ where: { id: inDescription.id } });
  });

  it("reports a total that is larger than the page", async () => {
    const { jobs, total, page, perPage, totalPages } = await search.searchJobs({
      perPage: 2,
    });

    expect(jobs).toHaveLength(2);
    expect(total).toBeGreaterThanOrEqual(4);
    expect(page).toBe(1);
    expect(perPage).toBe(2);
    expect(totalPages).toBe(Math.ceil(total / 2));
  });

  it("gives a different page different offers", async () => {
    const first = await search.searchJobs({ perPage: 2, page: 1 });
    const second = await search.searchJobs({ perPage: 2, page: 2 });

    const ids = (r: typeof first) => r.jobs.map((j: any) => j.id);
    expect(ids(first).some((id) => ids(second).includes(id))).toBe(false);
  });

  it("caps the page size, so the endpoint cannot be asked for the table", async () => {
    const { perPage } = await search.searchJobs({ perPage: 5000 });
    expect(perPage).toBe(60);
  });

  it("treats a nonsense page as the first one", async () => {
    const { page } = await search.searchJobs({ page: -3 });
    expect(page).toBe(1);
  });
});
