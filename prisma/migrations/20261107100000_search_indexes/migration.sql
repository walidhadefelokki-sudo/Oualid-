-- Search that works the way people actually type.
--
-- Until now a job search matched `title ILIKE '%term%'` and nothing else, so:
--
--   * "developpeur" found nothing, because the offer says "Développeur".
--     Algerian users type without accents constantly, and this is the single
--     biggest reason a search came back empty on a database that had the job.
--   * "react" found nothing unless the word was in the title, even where the
--     description was about nothing else.
--   * "dev full stack alger" found nothing, because the whole string was one
--     substring to look for.
--
-- The pieces below fix the engine rather than the symptom.

-- unaccent folds é→e; pg_trgm gives similarity, for typos.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

/* An IMMUTABLE unaccent.
 *
 * unaccent() is only STABLE, because in principle its dictionary could be
 * reloaded — so Postgres refuses it inside an index expression. Pinning the
 * dictionary with the two-argument form makes it genuinely immutable for a
 * fixed dictionary, which is the documented way round this.
 *
 * Built with dynamic SQL because the extension's schema is not the same
 * everywhere: a stock Postgres puts it in public, Supabase keeps extensions
 * in `extensions`. Hard-coding either one breaks on the other, and an
 * unqualified call inside an IMMUTABLE function would depend on whatever
 * search_path the caller happens to have.
 */
DO $outer$
DECLARE
  ext_schema text;
BEGIN
  SELECT n.nspname INTO ext_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'unaccent';

  EXECUTE format(
    $f$
    CREATE OR REPLACE FUNCTION public.dl_unaccent(text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE PARALLEL SAFE STRICT
    AS $body$ SELECT %I.unaccent(%L::regdictionary, $1) $body$
    $f$,
    ext_schema,
    ext_schema || '.unaccent'
  );
END
$outer$;

/* A French dictionary that unaccents first.
 *
 * Needed for the same immutability reason: `to_tsvector('french_unaccent', …)`
 * with a literal configuration name is indexable, where a call to unaccent()
 * in the expression would not be.
 *
 * Guarded so re-running against a database that already has it is not an
 * error.
 */
DO $$
DECLARE
  ext_schema text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'french_unaccent') THEN
    SELECT n.nspname INTO ext_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent';

    CREATE TEXT SEARCH CONFIGURATION public.french_unaccent ( COPY = pg_catalog.french );

    EXECUTE format(
      'ALTER TEXT SEARCH CONFIGURATION public.french_unaccent
         ALTER MAPPING FOR hword, hword_part, word
         WITH %I.unaccent, french_stem',
      ext_schema
    );
  END IF;
END
$$;

/* What a job search looks at.
 *
 * The offer's own text only: title, where it is, description. A company name
 * lives in another table and cannot join an index expression, so it is
 * matched separately against the trigram index below.
 *
 * Weighted, so relevance means something: a word in the title counts for more
 * than the same word buried in the description.
 */
CREATE INDEX IF NOT EXISTS "Job_search_idx" ON "Job"
USING GIN (
  (
    setweight(to_tsvector('public.french_unaccent', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('public.french_unaccent', coalesce(location, '')), 'B') ||
    setweight(to_tsvector('public.french_unaccent', coalesce(wilaya, '')), 'B') ||
    setweight(to_tsvector('public.french_unaccent', coalesce(description, '')), 'C')
  )
);

-- Typo tolerance, consulted only when the full-text search finds nothing, so
-- "develeoppeur" still reaches "Développeur".
CREATE INDEX IF NOT EXISTS "Job_title_trgm_idx" ON "Job"
USING GIN (public.dl_unaccent(title) public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Company_name_trgm_idx" ON "Company"
USING GIN (public.dl_unaccent(name) public.gin_trgm_ops);

/* Filters that were a sequential scan of every published offer. */
CREATE INDEX IF NOT EXISTS "Job_status_published_idx" ON "Job" ("status", "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "Job_wilaya_idx" ON "Job" ("wilaya");

/* The recruiter's CV directory.
 *
 * A recruiter searches their own applicants, so the candidate set is small and
 * plain accent-folded matching is enough — no tsvector needed. These trigram
 * indexes keep that matching off a sequential scan as the applicant count
 * grows.
 */
CREATE INDEX IF NOT EXISTS "CandidateProfile_title_trgm_idx" ON "CandidateProfile"
USING GIN (public.dl_unaccent(coalesce("currentJobTitle", '')) public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CandidateProfile_headline_trgm_idx" ON "CandidateProfile"
USING GIN (public.dl_unaccent(coalesce(headline, '')) public.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User"
USING GIN (
  public.dl_unaccent(coalesce("firstName", '') || ' ' || coalesce("lastName", '')) public.gin_trgm_ops
);

-- Skills are a text[]; this is what makes a search for "react" find the
-- candidates who listed it.
CREATE INDEX IF NOT EXISTS "CandidateProfile_skills_idx" ON "CandidateProfile"
USING GIN (skills);
