import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Searching job offers.
 *
 * What was here before was `title ILIKE '%term%'`, which failed in three ways
 * that each looked to the user like "there are no jobs":
 *
 *   "developpeur" found nothing, because the offer says "Développeur". People
 *   here type without accents constantly, so this was the common case.
 *
 *   "react" found nothing unless the word was in the title, however much the
 *   description was about it.
 *
 *   "dev full stack" found nothing, because the whole phrase was one
 *   substring to look for.
 *
 * Now: Postgres full-text search over a French dictionary that folds accents
 * first, with every word treated as a prefix and all of them required. Word
 * order does not matter, a partial word matches, and the terms can come from
 * the title, the description or the location.
 *
 * Relevance is real — the index weights a title match above a description one
 * — but featured offers still lead, because that placement is what a
 * recruiter's plan pays for.
 *
 * When that finds nothing, one more attempt with trigram similarity, so a
 * misspelling still reaches the offer. Only on an empty result, so the cost
 * is paid by searches that would otherwise have returned nothing at all.
 */

/** The text search configuration created by the search_indexes migration. */
const CONFIG = "public.french_unaccent";

/**
 * Below this, two words are not the same word misspelt.
 *
 * Measured against word_similarity, which scores the query against the
 * closest single word in the title rather than against the whole string.
 * Plain similarity() is useless here: "develeoppeur" against "Développeur
 * Full Stack Sénior" scores 0.29, because every other word in the title
 * dilutes it, while the word-level score is 0.67. An unrelated word
 * ("ingenieur") scores 0.2, so this sits between the two.
 */
const SIMILARITY_FLOOR = 0.45;

const MAX_TERMS = 10;
const MAX_PER_PAGE = 60;

export interface JobSearchParams {
  /** What the user typed. */
  q?: string | null;
  location?: string | null;
  wilaya?: string | null;
  type?: string | null;
  experienceLevel?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  remote?: boolean;
  featured?: boolean;
  /** Offers paying at least this much, including those that state no salary. */
  salaryMin?: number;
  page?: number;
  perPage?: number;
}

export interface JobSearchResult {
  jobs: unknown[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  /** True when the words matched nothing and similarity was used instead. */
  didYouMean: boolean;
}

/**
 * Turns what someone typed into a tsquery.
 *
 * Every word becomes a prefix and they are ANDed: "dev full" is
 * `dev:* & full:*`, which matches "Développeur Full Stack" whatever order the
 * words arrive in and before either is finished being typed.
 *
 * Punctuation is stripped rather than escaped. to_tsquery has its own
 * operators (& | ! : *) and a stray one is a syntax error that would surface
 * as a failed request; dropping them means a search can never be malformed.
 * Accents are left alone — the dictionary folds them.
 */
export const buildTsQuery = (raw: string): string | null => {
  const terms = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, MAX_TERMS);

  if (!terms.length) return null;

  // C++ and C# survive the filter above and must not reach tsquery as
  // operators.
  return terms.map((t) => `${t.replace(/[+#]/g, "")}:*`).filter(Boolean).join(" & ");
};

/** The filters that apply whether or not there is a search term. */
const filterSql = (p: JobSearchParams): Prisma.Sql[] => {
  const parts: Prisma.Sql[] = [Prisma.sql`j."status" = 'PUBLISHED'::"JobStatus"`];

  // An offer with a date in the past is not on the market any more. It was
  // being listed regardless.
  parts.push(Prisma.sql`(j."expiresAt" IS NULL OR j."expiresAt" > now())`);

  if (p.location) {
    parts.push(
      Prisma.sql`public.dl_unaccent(j."location") ILIKE public.dl_unaccent(${`%${p.location}%`})`
    );
  }
  if (p.wilaya) {
    parts.push(
      Prisma.sql`public.dl_unaccent(coalesce(j."wilaya", '')) ILIKE public.dl_unaccent(${p.wilaya})`
    );
  }
  if (p.type) parts.push(Prisma.sql`j."type" = ${p.type}::"JobType"`);
  if (p.experienceLevel) {
    parts.push(Prisma.sql`j."experienceLevel" = ${p.experienceLevel}::"ExperienceLevel"`);
  }
  if (p.categoryId) parts.push(Prisma.sql`j."categoryId" = ${p.categoryId}`);
  if (p.categorySlug) {
    parts.push(
      Prisma.sql`j."categoryId" IN (SELECT id FROM "JobCategory" WHERE slug = ${p.categorySlug})`
    );
  }
  if (p.remote === true) parts.push(Prisma.sql`j."remote" = true`);
  if (p.featured === true) parts.push(Prisma.sql`j."featured" = true`);

  /* An offer that states no salary is kept rather than dropped. Most do not
   * state one, and filtering them out would turn "at least 50 000" into "only
   * the few offers that publish a figure" — which reads as an empty market. */
  if (typeof p.salaryMin === "number" && Number.isFinite(p.salaryMin)) {
    parts.push(
      Prisma.sql`(j."salaryMax" IS NULL AND j."salaryMin" IS NULL
                  OR coalesce(j."salaryMax", j."salaryMin") >= ${Math.trunc(p.salaryMin)})`
    );
  }

  return parts;
};

/** The weighted document a search looks at. Mirrors Job_search_idx exactly,
 *  or the index is not used and this becomes a sequential scan. */
const DOCUMENT = Prisma.sql`(
  setweight(to_tsvector('public.french_unaccent', coalesce(j.title, '')), 'A') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.location, '')), 'B') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.wilaya, '')), 'B') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.description, '')), 'C')
)`;

interface RankedRow {
  id: string;
  total: bigint;
}

/** Ranked ids for a text search, newest-first within equal relevance. */
const rankedIds = async (
  tsquery: string,
  params: JobSearchParams,
  skip: number,
  take: number
): Promise<RankedRow[]> => {
  const where = Prisma.join(filterSql(params), " AND ");

  return prisma.$queryRaw<RankedRow[]>`
    SELECT j.id,
           count(*) OVER() AS total
      FROM "Job" j
      LEFT JOIN "Company" c ON c.id = j."companyId"
     WHERE ${where}
       AND (
         ${DOCUMENT} @@ to_tsquery(${CONFIG}::regconfig, ${tsquery})
         -- The employer's name, which cannot live in the index expression
         -- because it is in another table. Backed by Company_name_trgm_idx.
         OR public.dl_unaccent(c.name) ILIKE public.dl_unaccent(${`%${params.q ?? ""}%`})
       )
     ORDER BY j."featured" DESC,
              ts_rank(${DOCUMENT}, to_tsquery(${CONFIG}::regconfig, ${tsquery})) DESC,
              j."publishedAt" DESC NULLS LAST,
              j."createdAt" DESC
     LIMIT ${take} OFFSET ${skip}`;
};

/** Ids by similarity, for a term the dictionary could not match at all. */
const similarIds = async (
  raw: string,
  params: JobSearchParams,
  skip: number,
  take: number
): Promise<RankedRow[]> => {
  const where = Prisma.join(filterSql(params), " AND ");

  return prisma.$queryRaw<RankedRow[]>`
    SELECT j.id,
           count(*) OVER() AS total
      FROM "Job" j
     WHERE ${where}
       AND word_similarity(public.dl_unaccent(${raw}), public.dl_unaccent(j.title))
             > ${SIMILARITY_FLOOR}
     ORDER BY word_similarity(public.dl_unaccent(${raw}), public.dl_unaccent(j.title)) DESC,
              j."featured" DESC,
              j."createdAt" DESC
     LIMIT ${take} OFFSET ${skip}`;
};

/** What every caller of the job list already expects back on each offer. */
const JOB_INCLUDE = {
  company: { select: { name: true, logo: { select: { url: true } } } },
  category: { select: { name: true, slug: true } },
} as const;

/**
 * The public job list.
 *
 * Without `q` this is an ordinary filtered page — no need to involve the text
 * search machinery in "show me everything in Alger".
 */
export const searchJobs = async (params: JobSearchParams): Promise<JobSearchResult> => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 20) || 20, 1), MAX_PER_PAGE);
  const skip = (page - 1) * perPage;

  const tsquery = params.q?.trim() ? buildTsQuery(params.q) : null;

  if (!tsquery) {
    const where = Prisma.join(filterSql(params), " AND ");

    const [rows, counted] = await Promise.all([
      prisma.$queryRaw<{ id: string }[]>`
        SELECT j.id FROM "Job" j
         WHERE ${where}
         ORDER BY j."featured" DESC,
                  j."publishedAt" DESC NULLS LAST,
                  j."createdAt" DESC
         LIMIT ${perPage} OFFSET ${skip}`,
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS total FROM "Job" j WHERE ${where}`,
    ]);

    const total = Number(counted[0]?.total ?? 0);

    return {
      jobs: await hydrate(rows.map((r) => r.id)),
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      didYouMean: false,
    };
  }

  let rows = await rankedIds(tsquery, params, skip, perPage);
  let didYouMean = false;

  /* Nothing matched the words. Try spelling, under two conditions.
   *
   * Only on the first page: a later page coming back empty means the results
   * ran out, not that the spelling was wrong.
   *
   * Only for a single word. A typo is one word misspelt; a query of several
   * words that matches nothing means that combination is not on the board, and
   * guessing at it is actively misleading — "developpeur comptable" scores
   * 0.55 against "Développeur Full Stack", so without this it would answer a
   * search for an accountant-developer with a developer job. */
  const singleTerm = tsquery.split("&").length === 1;

  if (!rows.length && page === 1 && singleTerm && params.q) {
    rows = await similarIds(params.q.trim(), params, 0, perPage);
    didYouMean = rows.length > 0;
  }

  const total = Number(rows[0]?.total ?? 0);

  return {
    jobs: await hydrate(rows.map((r) => r.id)),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    didYouMean,
  };
};

/**
 * Turns ranked ids into full records, in the order the ranking gave them.
 *
 * Two steps rather than one big raw query: the ranking is the part SQL has to
 * do, and the shape of an offer is already settled by every existing caller.
 * `IN (…)` returns rows in whatever order it likes, so the ranking is
 * reapplied here.
 */
const hydrate = async (ids: string[]) => {
  if (!ids.length) return [];

  const jobs = await prisma.job.findMany({
    where: { id: { in: ids } },
    include: JOB_INCLUDE,
  });

  const position = new Map(ids.map((id, i) => [id, i]));
  return jobs.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
};

export default { searchJobs, buildTsQuery };
