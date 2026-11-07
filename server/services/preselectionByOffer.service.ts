import prisma from "../utils/prisma";

/**
 * Preselection, one offer at a time.
 *
 * The screen used to be fed by `loadPreselectedCandidates = () => {}` — an
 * empty stub — so it was always empty whatever the recruiter had. And the rows
 * it was built for carried a name, a position and three scores, with no
 * mention of which offer the person had answered: a flat list mixing the
 * applicants to a developer post with the applicants to an accountant post,
 * ranked against each other, which is not a decision anybody can make.
 *
 * So the shape here is the offer, with its own candidates and its own counts
 * underneath. Comparing two candidates only means something inside one offer.
 *
 * `Application` is the source rather than the `Preselection` table: that table
 * is only ever written by the admin override and a manual recalculation, so it
 * is empty for almost every recruiter, while the application carries the
 * scores, the pipeline status and the preselection fields already.
 */

const MAX_SKILLS = 12;

export interface PreselectionByOfferParams {
  /** The signed-in recruiter's user id; their profile is resolved here. */
  recruiterUserId: string;
  /** One offer only. Omitted, every offer that has an applicant. */
  jobId?: string | null;
  /** Narrows the candidates, not the offers: an offer with none still shows. */
  status?: string | null;
  /** Only the candidates the recruiter has marked. */
  preselectedOnly?: boolean;
  q?: string | null;
}

/** What a recruiter is choosing between, ranked within one offer. */
const APPLICATION_SELECT = {
  id: true,
  status: true,
  preselectionStatus: true,
  isPreselected: true,
  preselectionScore: true,
  preselectionComment: true,
  aiScore: true,
  quizScore: true,
  oralPresentationScore: true,
  finalScore: true,
  coverLetter: true,
  appliedAt: true,
  updatedAt: true,
  cv: { select: { url: true, fileName: true } },
  // Why the score is what it is. A number with no reason behind it is not
  // something a recruiter can act on or defend.
  aianalysis: {
    select: { strengths: true, weaknesses: true, recommendations: true, overallScore: true },
  },
  candidate: {
    select: {
      id: true,
      headline: true,
      bio: true,
      currentJobTitle: true,
      city: true,
      wilaya: true,
      skills: true,
      yearsExperience: true,
      availableImmediately: true,
      desiredSalary: true,
      linkedinUrl: true,
      githubUrl: true,
      portfolioUrl: true,
      resumeId: true,
      cvBuilderData: true,
      user: {
        // Selected, never `user: true`. That returns every column including
        // the bcrypt hash, which is exactly what the recruiter list elsewhere
        // in this feature was doing.
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: { select: { url: true } },
        },
      },
      oralPresentation: { select: { videoId: true } },
    },
  },
} as const;

/**
 * The two lines of a CV worth putting in a list.
 *
 * The builder document is the whole CV and has no business being shipped per
 * row, but "more information" means something more than a score — the last
 * thing they did and the highest thing they studied is what a recruiter reads
 * first on paper.
 */
const cvHighlights = (data: unknown) => {
  if (!data || typeof data !== "object") return { lastRole: null, education: null, languages: [] };

  const d = data as Record<string, unknown>;
  const first = (key: string) => (Array.isArray(d[key]) ? (d[key] as unknown[])[0] : null);

  const experience = first("experiences") as Record<string, unknown> | null;
  const education = first("education") as Record<string, unknown> | null;

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const join = (parts: Array<string | null>) => {
    const kept = parts.filter(Boolean);
    return kept.length ? kept.join(" · ") : null;
  };

  return {
    lastRole: experience
      ? join([text(experience.title) ?? text(experience.position), text(experience.company)])
      : null,
    education: education
      ? join([text(education.degree) ?? text(education.title), text(education.school)])
      : null,
    languages: Array.isArray(d.languages)
      ? (d.languages as unknown[])
          .map((l) =>
            typeof l === "string" ? l : text((l as Record<string, unknown>)?.name)
          )
          .filter((l): l is string => Boolean(l))
          .slice(0, 6)
      : [],
  };
};

/** Opening the CV Maker and saving nothing leaves an empty object behind. */
const builderFilled = (data: unknown) =>
  !!data &&
  typeof data === "object" &&
  Object.values(data as Record<string, unknown>).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== ""
  );

type Application = Awaited<
  ReturnType<typeof prisma.application.findMany<{ select: typeof APPLICATION_SELECT }>>
>[number];

const shape = (a: Application) => {
  const c = a.candidate;
  const highlights = cvHighlights(c.cvBuilderData);

  return {
    applicationId: a.id,
    candidateId: c.id,

    fullName:
      `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim() || c.user.email,
    email: c.user.email,
    phone: c.user.phone ?? "",
    avatarUrl: c.user.avatar?.url ?? null,

    position: c.currentJobTitle || c.headline || "",
    headline: c.headline ?? null,
    summary: c.bio ?? null,
    location: c.city ?? c.wilaya ?? "",
    wilaya: c.wilaya ?? null,
    experience: c.yearsExperience ?? 0,
    // Capped: a candidate who listed forty skills would push everyone else
    // off the screen, and the rest are on their profile.
    skills: (c.skills ?? []).slice(0, MAX_SKILLS),
    skillsTotal: (c.skills ?? []).length,
    availableNow: c.availableImmediately,
    desiredSalary: c.desiredSalary ?? null,

    lastRole: highlights.lastRole,
    education: highlights.education,
    languages: highlights.languages,

    links: {
      linkedin: c.linkedinUrl ?? null,
      github: c.githubUrl ?? null,
      portfolio: c.portfolioUrl ?? null,
    },

    cvUrl: a.cv?.url ?? null,
    hasCv: Boolean(c.resumeId) || builderFilled(c.cvBuilderData),
    hasPresentation: Boolean(c.oralPresentation?.videoId),
    coverLetter: a.coverLetter ?? null,

    aiScore: Math.round(a.aiScore ?? 0),
    quizScore: a.quizScore != null ? Math.round(a.quizScore) : null,
    oralPresentationScore:
      a.oralPresentationScore != null ? Math.round(a.oralPresentationScore) : null,
    finalScore: a.finalScore != null ? Math.round(a.finalScore) : null,
    preselectionScore: a.preselectionScore != null ? Math.round(a.preselectionScore) : null,

    strengths: a.aianalysis?.strengths ?? [],
    weaknesses: a.aianalysis?.weaknesses ?? [],
    recommendations: a.aianalysis?.recommendations ?? [],

    status: a.status,
    preselectionStatus: a.preselectionStatus,
    isPreselected: a.isPreselected,
    preselectionComment: a.preselectionComment ?? null,

    appliedAt: a.appliedAt,
    updatedAt: a.updatedAt,
  };
};

/** Counts per offer, so each one says where it stands on its own. */
const countOf = (rows: ReturnType<typeof shape>[]) => {
  const by = (s: string) => rows.filter((r) => r.status === s).length;

  const scored = rows.filter((r) => r.aiScore > 0);

  return {
    total: rows.length,
    preselected: rows.filter((r) => r.isPreselected).length,
    pending: by("PENDING") + by("REVIEWING"),
    shortlisted: by("SHORTLISTED"),
    interview: by("INTERVIEW"),
    hired: by("HIRED"),
    rejected: by("REJECTED"),
    withCv: rows.filter((r) => r.hasCv).length,
    // Averaged over the scored ones only: counting an unscored application as
    // zero would make the average say the shortlist is weak when it is simply
    // not analysed yet.
    averageScore: scored.length
      ? Math.round(scored.reduce((sum, r) => sum + r.aiScore, 0) / scored.length)
      : null,
  };
};

export const listByOffer = async (params: PreselectionByOfferParams) => {
  const recruiter = await prisma.user.findUnique({
    where: { id: params.recruiterUserId },
    select: { recruiterProfile: { select: { id: true } } },
  });

  if (!recruiter?.recruiterProfile) return null;

  const term = params.q?.trim();

  const applications = await prisma.application.findMany({
    where: {
      recruiterId: recruiter.recruiterProfile.id,
      ...(params.jobId ? { jobId: params.jobId } : {}),
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.preselectedOnly ? { isPreselected: true } : {}),
      // A closed account is not a candidate to call.
      candidate: { user: { deletedAt: null, status: { not: "DELETED" } } },
      ...(term
        ? {
            OR: [
              { candidate: { user: { firstName: { contains: term, mode: "insensitive" } } } },
              { candidate: { user: { lastName: { contains: term, mode: "insensitive" } } } },
              { candidate: { currentJobTitle: { contains: term, mode: "insensitive" } } },
              { candidate: { headline: { contains: term, mode: "insensitive" } } },
              { candidate: { skills: { has: term } } },
            ],
          }
        : {}),
    },
    select: { ...APPLICATION_SELECT, jobId: true },
    /* Nulls last, explicitly.
     *
     * Postgres puts NULLs first in a DESC sort, so an application nobody has
     * analysed yet led the offer — above the best-scoring candidate. The
     * unscored ones belong at the bottom, newest first, which is also the
     * order in which they are worth looking at by hand. */
    orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { appliedAt: "desc" }],
  });

  /* Every offer the recruiter has, not only the ones with an applicant.
   *
   * An offer that nobody answered is a fact the recruiter needs — it is the
   * one that needs promoting or rewriting — and leaving it out of the list
   * makes it invisible at exactly the moment it matters. */
  const jobs = await prisma.job.findMany({
    where: {
      recruiterId: recruiter.recruiterProfile.id,
      ...(params.jobId ? { id: params.jobId } : {}),
    },
    select: {
      id: true,
      title: true,
      location: true,
      wilaya: true,
      type: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      expiresAt: true,
      category: { select: { name: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const byJob = new Map<string, ReturnType<typeof shape>[]>();
  for (const a of applications) {
    const list = byJob.get(a.jobId) ?? [];
    list.push(shape(a));
    byJob.set(a.jobId, list);
  }

  const offers = jobs.map((job) => {
    const candidates = byJob.get(job.id) ?? [];

    return {
      id: job.id,
      title: job.title,
      location: job.location,
      wilaya: job.wilaya,
      type: job.type,
      status: job.status,
      sector: job.category?.name ?? null,
      publishedAt: job.publishedAt,
      // Said per offer rather than worked out from a date in the UI: an
      // expired offer still collecting applications is worth noticing.
      expired: Boolean(job.expiresAt && job.expiresAt.getTime() < Date.now()),
      counts: countOf(candidates),
      candidates,
    };
  });

  /* Offers with candidates first, because that is what the screen is for;
   * the empty ones keep their own order below. */
  offers.sort((a, b) => b.counts.total - a.counts.total);

  const everyCandidate = offers.flatMap((o) => o.candidates);

  return {
    offers,
    totals: {
      offers: offers.length,
      offersWithCandidates: offers.filter((o) => o.counts.total > 0).length,
      candidates: everyCandidate.length,
      preselected: everyCandidate.filter((c) => c.isPreselected).length,
      ...(() => {
        const all = countOf(everyCandidate);
        return {
          pending: all.pending,
          shortlisted: all.shortlisted,
          interview: all.interview,
          hired: all.hired,
          rejected: all.rejected,
          averageScore: all.averageScore,
        };
      })(),
    },
  };
};



/* -------------------------------------------------------------------------- */
/*                        Corporate preselection, for staff                   */
/* -------------------------------------------------------------------------- */

/**
 * Candidatures waiting on a decision from the platform team.
 *
 * A CORPORATE company can have the preselection done for it, so these
 * applications sit at preselectionStatus PENDING until somebody here decides.
 * The admin screen used to list them flat — one row per application, name,
 * e-mail, "poste @ entreprise" and two buttons — so a reviewer judged
 * candidates for a developer post and an accountant post in one undifferentiated
 * column, with nothing to compare them on beyond a name.
 *
 * Grouped by offer and carrying the same detail as the recruiter's own screen,
 * because it is the same decision: ranked within the post, with the CV
 * highlights, the skills and the reasons behind the score.
 *
 * Unscoped by recruiter — that is the point of this one. It is reached only
 * through the admin "preselection" scope.
 */
export const listCorporatePendingByOffer = async () => {
  const applications = await prisma.application.findMany({
    where: {
      preselectionStatus: "PENDING",
      job: { company: { plan: "CORPORATE" } },
      candidate: { user: { deletedAt: null, status: { not: "DELETED" } } },
    },
    select: { ...APPLICATION_SELECT, jobId: true },
    // Nulls last, or an unanalysed application leads its offer. See listByOffer.
    orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { appliedAt: "asc" }],
  });

  if (!applications.length) {
    return { offers: [], totals: { offers: 0, candidates: 0, companies: 0 } };
  }

  const jobs = await prisma.job.findMany({
    where: { id: { in: [...new Set(applications.map((a) => a.jobId))] } },
    select: {
      id: true,
      title: true,
      location: true,
      wilaya: true,
      type: true,
      status: true,
      publishedAt: true,
      expiresAt: true,
      category: { select: { name: true } },
      company: { select: { name: true } },
    },
  });

  const byJob = new Map<string, ReturnType<typeof shape>[]>();
  for (const a of applications) {
    const list = byJob.get(a.jobId) ?? [];
    list.push(shape(a));
    byJob.set(a.jobId, list);
  }

  /* Only offers that actually have something waiting. Unlike the recruiter's
   * screen, an offer with nothing pending is not this reviewer's business —
   * they are working a queue, not managing a pipeline. */
  const offers = jobs
    .map((job) => {
      const candidates = byJob.get(job.id) ?? [];
      return {
        id: job.id,
        title: job.title,
        company: job.company?.name ?? null,
        location: job.location,
        wilaya: job.wilaya,
        type: job.type,
        status: job.status,
        sector: job.category?.name ?? null,
        publishedAt: job.publishedAt,
        expired: Boolean(job.expiresAt && job.expiresAt.getTime() < Date.now()),
        counts: countOf(candidates),
        candidates,
      };
    })
    .filter((o) => o.counts.total > 0)
    // The longest-waiting queue first: these are people expecting an answer.
    .sort((a, b) => b.counts.total - a.counts.total);

  return {
    offers,
    totals: {
      offers: offers.length,
      candidates: applications.length,
      companies: new Set(jobs.map((j) => j.company?.name).filter(Boolean)).size,
    },
  };
};

export default { listByOffer, listCorporatePendingByOffer };
