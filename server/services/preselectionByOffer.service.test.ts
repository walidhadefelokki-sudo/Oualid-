import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Preselection grouped by offer, against a real database.
 *
 * The screen this feeds was wired to an empty stub, so there is no previous
 * behaviour to preserve — what these tests pin down is the shape the decision
 * needs: candidates under the offer they answered, ranked inside it, with the
 * counts that offer can be judged on, and nothing from another recruiter.
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
const service = await import("./preselectionByOffer.service");

const TAG = "presoffer-test";

let recruiterUserA: string;
let recruiterUserB: string;
let profileA: string;
let profileB: string;
let devJob: string;
let accountantJob: string;
let emptyJob: string;

const list = (over: Partial<Parameters<typeof service.listByOffer>[0]> = {}) =>
  service.listByOffer({ recruiterUserId: recruiterUserA, ...over });

/** The offer by title, from a result. */
const offer = (result: any, title: string) =>
  result.offers.find((o: any) => o.title === title);

const wipe = async () => {
  await prisma.job.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: TAG } } });
  await prisma.user.deleteMany({ where: { email: { contains: TAG } } });
  await prisma.fileAsset.deleteMany({ where: { provider: TAG } });
};

const makeRecruiter = async (label: string) => {
  const u = await prisma.user.create({
    data: {
      email: `${TAG}-rec-${label}@example.invalid`,
      password: "super-secret-hash",
      role: "RECRUITER",
      recruiterProfile: { create: {} },
    },
    include: { recruiterProfile: true },
  });

  const co = await prisma.company.create({
    data: { name: `Co ${label}`, slug: `${TAG}-co-${label}`, plan: "CORPORATE" },
  });

  return { userId: u.id, profileId: u.recruiterProfile!.id, companyId: co.id };
};

const makeJob = async (
  recruiterId: string,
  companyId: string,
  title: string,
  extra: Record<string, unknown> = {}
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
        publishedAt: new Date(),
        ...extra,
      },
      select: { id: true },
    })
  ).id;

const apply = async (opts: {
  label: string;
  firstName: string;
  lastName: string;
  jobId: string;
  recruiterId: string;
  aiScore?: number;
  status?: string;
  isPreselected?: boolean;
  skills?: string[];
  currentJobTitle?: string;
  yearsExperience?: number;
  cvBuilderData?: unknown;
  withCv?: boolean;
  analysis?: boolean;
}) => {
  const cv = opts.withCv
    ? await prisma.fileAsset.create({
        data: { url: "https://example.invalid/cv.pdf", provider: TAG, fileName: "cv.pdf" },
      })
    : null;

  const u = await prisma.user.create({
    data: {
      email: `${TAG}-${opts.label}@example.invalid`,
      password: "super-secret-hash",
      role: "CANDIDATE",
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: "0555112233",
      candidateProfile: {
        create: {
          skills: opts.skills ?? [],
          currentJobTitle: opts.currentJobTitle,
          yearsExperience: opts.yearsExperience,
          city: "Alger",
          resumeId: cv?.id,
          cvBuilderData: (opts.cvBuilderData ?? undefined) as never,
          linkedinUrl: "https://linkedin.test/x",
        },
      },
    },
    include: { candidateProfile: true },
  });

  const application = await prisma.application.create({
    data: {
      jobId: opts.jobId,
      candidateId: u.candidateProfile!.id,
      recruiterId: opts.recruiterId,
      aiScore: opts.aiScore,
      quizScore: 70,
      status: (opts.status ?? "PENDING") as never,
      isPreselected: opts.isPreselected ?? false,
      coverLetter: "Bonjour.",
    },
    select: { id: true },
  });

  if (opts.analysis) {
    await prisma.aIAnalysis.create({
      data: {
        applicationId: application.id,
        candidateId: u.candidateProfile!.id,
        strengths: ["React solide", "Bon communicant"],
        weaknesses: ["Peu d'expérience en management"],
        recommendations: ["À rencontrer"],
      },
    });
  }

  return u.candidateProfile!.id;
};

beforeAll(async () => {
  await wipe();

  const a = await makeRecruiter("a");
  const b = await makeRecruiter("b");
  recruiterUserA = a.userId;
  recruiterUserB = b.userId;
  profileA = a.profileId;
  profileB = b.profileId;

  devJob = await makeJob(profileA, a.companyId, "Développeur Full Stack");
  accountantJob = await makeJob(profileA, a.companyId, "Comptable");
  // Nobody answered this one.
  emptyJob = await makeJob(profileA, a.companyId, "Chauffeur livreur");

  const bJob = await makeJob(profileB, b.companyId, "Autre poste");

  await apply({
    label: "amina",
    firstName: "Amina",
    lastName: "Belkacem",
    jobId: devJob,
    recruiterId: profileA,
    aiScore: 91,
    status: "SHORTLISTED",
    isPreselected: true,
    skills: ["React", "Node", "SQL"],
    currentJobTitle: "Développeuse Front-End",
    yearsExperience: 5,
    withCv: true,
    analysis: true,
    cvBuilderData: {
      name: "Amina Belkacem",
      experiences: [{ title: "Développeuse", company: "Makers Label" }],
      education: [{ degree: "Master informatique", school: "USTHB" }],
      languages: [{ name: "Français" }, { name: "Anglais" }],
      skills: ["React"],
    },
  });

  await apply({
    label: "sofiane",
    firstName: "Sofiane",
    lastName: "Mansouri",
    jobId: devJob,
    recruiterId: profileA,
    aiScore: 74,
    status: "INTERVIEW",
    skills: ["Vue"],
    yearsExperience: 8,
  });

  // No score yet: the analysis has not run.
  await apply({
    label: "nadir",
    firstName: "Nadir",
    lastName: "Hamdi",
    jobId: devJob,
    recruiterId: profileA,
    status: "PENDING",
  });

  await apply({
    label: "karim",
    firstName: "Karim",
    lastName: "Saïdi",
    jobId: accountantJob,
    recruiterId: profileA,
    aiScore: 65,
    status: "HIRED",
    isPreselected: true,
    currentJobTitle: "Comptable",
  });

  await apply({
    label: "yacine",
    firstName: "Yacine",
    lastName: "Toumi",
    jobId: bJob,
    recruiterId: profileB,
    aiScore: 99,
  });
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("grouping", () => {
  it("puts each candidate under the offer they answered", async () => {
    const result = (await list())!;

    expect(offer(result, "Développeur Full Stack").candidates.map((c: any) => c.fullName)).toEqual(
      ["Amina Belkacem", "Sofiane Mansouri", "Nadir Hamdi"]
    );
    expect(offer(result, "Comptable").candidates.map((c: any) => c.fullName)).toEqual([
      "Karim Saïdi",
    ]);
  });

  it("ranks within an offer, not across them", async () => {
    const result = (await list())!;

    // Karim scores 65 and leads his own offer; he must not be ranked against
    // the developers, which is the comparison the old flat list invited.
    expect(offer(result, "Comptable").candidates[0].fullName).toBe("Karim Saïdi");
    expect(offer(result, "Développeur Full Stack").candidates[0].aiScore).toBe(91);
  });

  it("keeps an offer nobody answered", async () => {
    const result = (await list())!;
    const empty = offer(result, "Chauffeur livreur");

    // The offer that needs promoting or rewriting is exactly the one with no
    // applicants, so dropping it hides it when it matters most.
    expect(empty).toBeDefined();
    expect(empty.candidates).toHaveLength(0);
    expect(empty.counts.total).toBe(0);
  });

  it("lists offers with candidates before the empty ones", async () => {
    const result = (await list())!;
    const withOnes = result.offers.filter((o: any) => o.counts.total > 0).length;

    expect(result.offers.slice(0, withOnes).every((o: any) => o.counts.total > 0)).toBe(true);
  });

  it("shows nothing belonging to another recruiter", async () => {
    const result = (await list())!;
    const everyone = result.offers.flatMap((o: any) => o.candidates.map((c: any) => c.fullName));

    expect(everyone).not.toContain("Yacine Toumi");
    expect(result.offers.map((o: any) => o.title)).not.toContain("Autre poste");
  });

  it("gives the other recruiter their own offers", async () => {
    const result = (await service.listByOffer({ recruiterUserId: recruiterUserB }))!;
    expect(result.offers.map((o: any) => o.title)).toEqual(["Autre poste"]);
  });

  it("answers null for an account with no recruiter profile", async () => {
    const candidate = await prisma.user.findFirstOrThrow({
      where: { email: `${TAG}-amina@example.invalid` },
      select: { id: true },
    });

    expect(await service.listByOffer({ recruiterUserId: candidate.id })).toBeNull();
  });
});

describe("counts", () => {
  it("counts the pipeline per offer", async () => {
    const dev = offer((await list())!, "Développeur Full Stack").counts;

    expect(dev.total).toBe(3);
    expect(dev.preselected).toBe(1);
    expect(dev.shortlisted).toBe(1);
    expect(dev.interview).toBe(1);
    expect(dev.pending).toBe(1);
    expect(dev.withCv).toBe(1);
  });

  it("averages only the scored applications", async () => {
    const dev = offer((await list())!, "Développeur Full Stack").counts;

    // 91 and 74 — Nadir has no score yet. Counting him as zero would say the
    // shortlist is weak when it is simply not analysed.
    expect(dev.averageScore).toBe(Math.round((91 + 74) / 2));
  });

  it("reports null rather than zero when nothing is scored", async () => {
    expect(offer((await list())!, "Chauffeur livreur").counts.averageScore).toBeNull();
  });

  it("totals across every offer", async () => {
    const { totals } = (await list())!;

    expect(totals.offers).toBe(3);
    expect(totals.offersWithCandidates).toBe(2);
    expect(totals.candidates).toBe(4);
    expect(totals.preselected).toBe(2);
    expect(totals.hired).toBe(1);
  });
});

describe("what a candidate row carries", () => {
  it("carries enough to decide on, not just a name and a score", async () => {
    const amina = offer((await list())!, "Développeur Full Stack").candidates[0];

    expect(amina).toMatchObject({
      fullName: "Amina Belkacem",
      position: "Développeuse Front-End",
      experience: 5,
      location: "Alger",
      aiScore: 91,
      quizScore: 70,
      isPreselected: true,
      hasCv: true,
    });

    expect(amina.email).toContain("@");
    expect(amina.phone).toBe("0555112233");
    expect(amina.skills).toEqual(["React", "Node", "SQL"]);
    expect(amina.cvUrl).toBeNull(); // no cv attached to the application itself
    expect(amina.links.linkedin).toBe("https://linkedin.test/x");
    expect(amina.coverLetter).toBe("Bonjour.");
  });

  it("carries the reason behind the score", async () => {
    const amina = offer((await list())!, "Développeur Full Stack").candidates[0];

    // A number with nothing behind it is not something a recruiter can act on
    // or defend to anyone.
    expect(amina.strengths).toContain("React solide");
    expect(amina.weaknesses).toContain("Peu d'expérience en management");
    expect(amina.recommendations).toContain("À rencontrer");
  });

  it("pulls the last role and the top qualification out of the CV", async () => {
    const amina = offer((await list())!, "Développeur Full Stack").candidates[0];

    expect(amina.lastRole).toBe("Développeuse · Makers Label");
    expect(amina.education).toBe("Master informatique · USTHB");
    expect(amina.languages).toEqual(["Français", "Anglais"]);
  });

  it("copes with a candidate who filled in nothing", async () => {
    const nadir = offer((await list())!, "Développeur Full Stack").candidates[2];

    expect(nadir.fullName).toBe("Nadir Hamdi");
    expect(nadir.aiScore).toBe(0);
    expect(nadir.lastRole).toBeNull();
    expect(nadir.education).toBeNull();
    expect(nadir.skills).toEqual([]);
    expect(nadir.hasCv).toBe(false);
  });

  it("never ships a password hash or the CV document", async () => {
    const serialised = JSON.stringify((await list())!);

    expect(serialised).not.toContain("super-secret-hash");
    expect(serialised).not.toContain("password");
    // The builder document is the whole CV; only its highlights belong here.
    expect(serialised).not.toContain("cvBuilderData");
  });
});

describe("narrowing", () => {
  it("filters to one offer", async () => {
    const result = (await list({ jobId: accountantJob }))!;

    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].title).toBe("Comptable");
  });

  it("filters candidates by status while keeping the offers", async () => {
    const result = (await list({ status: "HIRED" }))!;

    expect(result.totals.candidates).toBe(1);
    // The offers stay listed: a recruiter filtering on "embauché" still needs
    // to see which offers produced nobody.
    expect(result.offers).toHaveLength(3);
    expect(offer(result, "Comptable").candidates[0].fullName).toBe("Karim Saïdi");
    expect(offer(result, "Développeur Full Stack").candidates).toHaveLength(0);
  });

  it("filters to the ones the recruiter marked", async () => {
    const result = (await list({ preselectedOnly: true }))!;

    expect(result.totals.candidates).toBe(2);
    expect(
      result.offers.flatMap((o: any) => o.candidates).every((c: any) => c.isPreselected)
    ).toBe(true);
  });

  it("searches a name, a job title or a skill", async () => {
    const byName = (await list({ q: "Mansouri" }))!;
    expect(byName.totals.candidates).toBe(1);

    const byTitle = (await list({ q: "Comptable" }))!;
    expect(byTitle.totals.candidates).toBe(1);

    const bySkill = (await list({ q: "React" }))!;
    expect(bySkill.totals.candidates).toBe(1);
  });

  it("leaves out a candidate whose account was deleted", async () => {
    await prisma.user.update({
      where: { email: `${TAG}-sofiane@example.invalid` },
      data: { status: "DELETED", deletedAt: new Date() },
    });

    const result = (await list())!;
    expect(
      result.offers.flatMap((o: any) => o.candidates.map((c: any) => c.fullName))
    ).not.toContain("Sofiane Mansouri");

    await prisma.user.update({
      where: { email: `${TAG}-sofiane@example.invalid` },
      data: { status: "PENDING", deletedAt: null },
    });
  });
});

describe("a recruiter's decision", () => {
  it("records a shortlist without a CandidateScore row, and shows it", async () => {
    const review = await import("./preselection.service");

    const application = await prisma.application.findFirstOrThrow({
      where: { candidate: { user: { email: `${TAG}-karim@example.invalid` } } },
      select: { id: true },
    });

    // The fixture hired him; this test is about the early-stage move, and the
    // one below covers not demoting somebody already further along.
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "PENDING", isPreselected: false },
    });

    // No CandidateScore exists for it: that row is written by a scoring
    // pipeline which has run for almost no application. Requiring one refused
    // every shortlist with "Candidate score not found." — the recruiter's
    // buttons did nothing at all.
    expect(
      await prisma.candidateScore.count({ where: { applicationId: application.id } })
    ).toBe(0);

    await review.default.shortlistCandidate(application.id, recruiterUserA, "Bon profil");

    const karim = offer((await list())!, "Comptable").candidates[0];

    // Written to the Application, which is what every screen reads — a
    // decision recorded only in the Preselection table was invisible.
    expect(karim.isPreselected).toBe(true);
    expect(karim.status).toBe("SHORTLISTED");
    expect(karim.preselectionComment).toBe("Bon profil");
  });

  it("does not demote somebody already further along", async () => {
    const review = await import("./preselection.service");

    const application = await prisma.application.findFirstOrThrow({
      where: { candidate: { user: { email: `${TAG}-karim@example.invalid` } } },
      select: { id: true },
    });

    await prisma.application.update({
      where: { id: application.id },
      data: { status: "HIRED" },
    });

    await review.default.shortlistCandidate(application.id, recruiterUserA);

    const karim = offer((await list())!, "Comptable").candidates[0];
    expect(karim.status).toBe("HIRED");
    expect(karim.isPreselected).toBe(true);
  });

  it("records a rejection, which always applies", async () => {
    const review = await import("./preselection.service");

    const application = await prisma.application.findFirstOrThrow({
      where: { candidate: { user: { email: `${TAG}-karim@example.invalid` } } },
      select: { id: true },
    });

    await review.default.rejectCandidate(application.id, recruiterUserA);

    const karim = offer((await list())!, "Comptable").candidates[0];
    expect(karim.status).toBe("REJECTED");
    expect(karim.isPreselected).toBe(false);
  });

  it("refuses a decision on another recruiter's application", async () => {
    const review = await import("./preselection.service");

    const application = await prisma.application.findFirstOrThrow({
      where: { candidate: { user: { email: `${TAG}-karim@example.invalid` } } },
      select: { id: true },
    });

    await expect(
      review.default.shortlistCandidate(application.id, recruiterUserB)
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
