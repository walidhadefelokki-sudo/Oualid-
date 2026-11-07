import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * The recruiter's CV directory.
 *
 * Scope is unchanged from what the screen has always promised — "les CV de
 * tous les candidats ayant postulé à vos offres" — so this searches the
 * recruiter's own applicants and nobody else's. It is not a CV bank over
 * every candidate on the platform: that would hand one paying recruiter the
 * phone number of every jobseeker who ever registered, which is a decision
 * for the business and not a side effect of making search better.
 *
 * What changes is where the work happens. The browser used to fetch the
 * recruiter's offers, then one request per offer for its applicants — fifty
 * offers meant fifty-one requests — assemble the whole applicant list in
 * memory, and filter it there with `String.includes`. So the search could not
 * see accents, could not look at skills, and got slower with every offer
 * posted.
 *
 * Now one request, matched in Postgres with the same accent-folding the job
 * search uses.
 */

const MAX_TERMS = 8;

/**
 * Larger than the public job list's cap, deliberately.
 *
 * This is one recruiter's own applicants behind a Corporate plan, not an open
 * endpoint over every row in the table, and the screen derives its filter
 * dropdowns and its headline counts from the set it holds — so handing it a
 * page of twenty would quietly narrow the filters to whatever happened to be
 * on that page.
 */
const MAX_PER_PAGE = 200;

export interface CvDirectoryParams {
  /** The recruiter's RecruiterProfile id, never a user id. */
  recruiterProfileId: string;
  q?: string | null;
  /** Only candidates who applied to this specific offer. */
  jobId?: string | null;
  wilaya?: string | null;
  minExperience?: number;
  /** Their best application must score at least this. */
  minScore?: number;
  hasCv?: boolean;
  availableNow?: boolean;
  preselectedOnly?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * Every word has to match something, but any field may be the thing it
 * matches.
 *
 * "react alger" means someone who knows React and is in Algiers, which is one
 * term against the skills and one against the city — so the terms are ANDed
 * while the fields within each term are ORed. A single `%react alger%`
 * substring, which is what the browser was doing, matches nobody.
 */
const searchSql = (q: string): Prisma.Sql | null => {
  const terms = q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, MAX_TERMS);

  if (!terms.length) return null;

  const perTerm = terms.map((term) => {
    const like = `%${term}%`;
    return Prisma.sql`(
      public.dl_unaccent(coalesce(u."firstName", '') || ' ' || coalesce(u."lastName", ''))
        ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp."currentJobTitle", '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.headline, '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.city, '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.wilaya, '')) ILIKE public.dl_unaccent(${like})
      OR EXISTS (
        SELECT 1 FROM unnest(cp.skills) AS s
         WHERE public.dl_unaccent(s) ILIKE public.dl_unaccent(${like})
      )
      OR public.dl_unaccent(j.title) ILIKE public.dl_unaccent(${like})
    )`;
  });

  return Prisma.join(perTerm, " AND ");
};

interface Row {
  id: string;
  total: bigint;
}

/**
 * The matching candidates, best score first.
 *
 * Grouped by candidate because one person can answer several of the same
 * recruiter's offers and belongs in the list once. `count(*) OVER ()` after
 * the grouping counts candidates rather than applications, which is what the
 * page total has to mean.
 */
const matchingCandidates = async (p: CvDirectoryParams, skip: number, take: number) => {
  const where: Prisma.Sql[] = [Prisma.sql`a."recruiterId" = ${p.recruiterProfileId}`];
  const having: Prisma.Sql[] = [];

  if (p.jobId) where.push(Prisma.sql`a."jobId" = ${p.jobId}`);

  if (p.wilaya) {
    // Either field: a candidate may have filled in one and not the other.
    where.push(Prisma.sql`(
      public.dl_unaccent(coalesce(cp.wilaya, '')) ILIKE public.dl_unaccent(${p.wilaya})
      OR public.dl_unaccent(coalesce(cp.city, '')) ILIKE public.dl_unaccent(${p.wilaya})
    )`);
  }

  if (typeof p.minExperience === "number" && Number.isFinite(p.minExperience)) {
    where.push(
      Prisma.sql`coalesce(cp."yearsExperience", 0) >= ${Math.trunc(p.minExperience)}`
    );
  }

  if (p.hasCv === true) {
    // An uploaded PDF or a CV built in the app. Either is a CV to read.
    where.push(Prisma.sql`(cp."resumeId" IS NOT NULL OR cp."cvBuilderData" IS NOT NULL)`);
  }

  if (p.availableNow === true) where.push(Prisma.sql`cp."availableImmediately" = true`);

  if (p.q?.trim()) {
    const text = searchSql(p.q);
    if (text) where.push(text);
  }

  /* Scores and preselection live on the application, so they are conditions on
   * the group: "their best application", not "every application". */
  if (typeof p.minScore === "number" && Number.isFinite(p.minScore)) {
    having.push(Prisma.sql`coalesce(max(a."aiScore"), 0) >= ${p.minScore}`);
  }
  if (p.preselectedOnly === true) {
    having.push(Prisma.sql`bool_or(coalesce(a."isPreselected", false)) = true`);
  }

  const whereSql = Prisma.join(where, " AND ");
  const havingSql = having.length
    ? Prisma.sql`HAVING ${Prisma.join(having, " AND ")}`
    : Prisma.empty;

  return prisma.$queryRaw<Row[]>`
    SELECT cp.id,
           count(*) OVER () AS total
      FROM "Application" a
      JOIN "CandidateProfile" cp ON cp.id = a."candidateId"
      JOIN "User" u ON u.id = cp."userId"
      JOIN "Job" j ON j.id = a."jobId"
     WHERE ${whereSql}
       -- A closed account is not a candidate to call.
       AND u."deletedAt" IS NULL
       AND u."status" <> 'DELETED'::"AccountStatus"
     GROUP BY cp.id
     ${havingSql}
     ORDER BY coalesce(max(a."aiScore"), 0) DESC,
              max(a."appliedAt") DESC
     LIMIT ${take} OFFSET ${skip}`;
};

/**
 * Fills in the rows the search chose.
 *
 * The scores a recruiter sorts on live in three places — the AI analysis on
 * the application, the quiz on the User, the oral presentation on the
 * CandidateProfile — so they are read together here rather than one query per
 * candidate.
 */
const hydrate = async (candidateIds: string[], recruiterProfileId: string) => {
  if (!candidateIds.length) return [];

  const applications = await prisma.application.findMany({
    where: { candidateId: { in: candidateIds }, recruiterId: recruiterProfileId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      candidateId: true,
      aiScore: true,
      isPreselected: true,
      oralPresentationScore: true,
      appliedAt: true,
      job: { select: { id: true, title: true, category: { select: { name: true } } } },
      candidate: {
        select: {
          id: true,
          userId: true,
          currentJobTitle: true,
          headline: true,
          city: true,
          wilaya: true,
          skills: true,
          yearsExperience: true,
          availableImmediately: true,
          resumeId: true,
          // Only whether there is one: the builder document is the whole CV
          // and has no business in a list.
          cvBuilderData: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: { select: { url: true } },
            },
          },
        },
      },
    },
  });

  const userIds = [...new Set(applications.map((a) => a.candidate.userId))];

  const [quizzes, presentations] = await Promise.all([
    prisma.quiz.findMany({
      where: { candidateId: { in: userIds } },
      select: { candidateId: true, attempt: { select: { aiScore: true } } },
    }),
    prisma.oralPresentation.findMany({
      where: { candidateId: { in: candidateIds } },
      select: { candidateId: true, videoId: true },
    }),
  ]);

  const quizByUser = new Map(quizzes.map((q) => [q.candidateId, q.attempt?.aiScore ?? null]));
  const hasPresentation = new Set(presentations.filter((p) => p.videoId).map((p) => p.candidateId));

  /* One row per person, with every offer they answered.
   *
   * The highest-scoring application supplies the details shown; the offers
   * accumulate across all of them, because somebody who answered three offers
   * has to be findable by filtering on any of the three. */
  const byCandidate = new Map<string, Record<string, unknown>>();

  for (const a of applications) {
    const c = a.candidate;
    const score = Math.round(a.aiScore ?? 0);
    const existing = byCandidate.get(c.id) as any;

    const jobIds = new Set<string>(existing?.jobIds ?? []);
    const jobTitles = new Set<string>(existing?.jobTitles ?? []);
    const sectors = new Set<string>(existing?.sectors ?? []);

    if (a.job?.id) jobIds.add(a.job.id);
    if (a.job?.title) jobTitles.add(a.job.title);
    if (a.job?.category?.name) sectors.add(a.job.category.name);

    const better = !existing || score > existing.aiScore;

    const base = better
      ? {
          id: c.id,
          fullName:
            `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim() || c.user.email,
          email: c.user.email,
          phone: c.user.phone ?? "",
          avatarUrl: c.user.avatar?.url ?? null,
          position: c.currentJobTitle || c.headline || a.job?.title || "",
          experience: c.yearsExperience ?? 0,
          location: c.city ?? c.wilaya ?? "",
          skills: c.skills ?? [],
          availableNow: c.availableImmediately,
          aiScore: score,
          quizScore: quizByUser.get(c.userId) != null
            ? Math.round(quizByUser.get(c.userId) as number)
            : undefined,
          oralPresentationScore: a.oralPresentationScore ?? undefined,
          hasPresentation: hasPresentation.has(c.id),
          hasCv: Boolean(c.resumeId) || isFilled(c.cvBuilderData),
          createdAt: a.appliedAt,
        }
      : existing;

    // Preselected anywhere counts: it is a decision about the person.
    const isPreselected = Boolean(existing?.isPreselected) || Boolean(a.isPreselected);

    byCandidate.set(c.id, {
      ...base,
      isPreselected,
      jobIds: [...jobIds],
      jobTitles: [...jobTitles],
      sectors: [...sectors],
    });
  }

  // Back into the order the search ranked them in; a Map preserves insertion
  // order, which is the order of the applications query, not the ranking.
  const position = new Map(candidateIds.map((id, i) => [id, i]));
  return [...byCandidate.values()].sort(
    (a: any, b: any) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)
  );
};

/** Opening the CV Maker and saving nothing leaves an empty object behind. */
const isFilled = (data: unknown) =>
  !!data &&
  typeof data === "object" &&
  Object.values(data as Record<string, unknown>).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
  );

export const searchCvDirectory = async (params: CvDirectoryParams) => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 24) || 24, 1), MAX_PER_PAGE);
  const skip = (page - 1) * perPage;

  const [rows, everyone] = await Promise.all([
    matchingCandidates(params, skip, perPage),
    // How many applicants the recruiter has in total, whatever the search
    // says. The screen's headline figures are about their pipeline, not about
    // the current query, and counting the filtered set there would make
    // "candidats" drop every time somebody typed.
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(DISTINCT a."candidateId") AS total
        FROM "Application" a
        JOIN "CandidateProfile" cp ON cp.id = a."candidateId"
        JOIN "User" u ON u.id = cp."userId"
       WHERE a."recruiterId" = ${params.recruiterProfileId}
         AND u."deletedAt" IS NULL
         AND u."status" <> 'DELETED'::"AccountStatus"`,
  ]);

  const total = Number(rows[0]?.total ?? 0);

  return {
    candidates: await hydrate(
      rows.map((r) => r.id),
      params.recruiterProfileId
    ),
    total,
    totalAll: Number(everyone[0]?.total ?? 0),
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
};

export default { searchCvDirectory };
