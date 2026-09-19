import { ExperienceLevel } from "@prisma/client";
import prisma from "../utils/prisma";

/**
 * Offers ranked against a candidate's own profile.
 *
 * Deliberately a transparent score rather than a model: the candidate is told
 * *why* an offer is here ("Alger", "React, Node"), and a reason you can read is
 * worth more on a job board than a slightly better ordering you cannot.
 *
 * Everything is scored from what the candidate actually filled in. A profile
 * with nothing in it produces no matches rather than a random six, which the
 * caller turns back into the ordinary featured list.
 */

const WEIGHT = {
  skill: 10, // per skill found in the title or description
  titleWord: 8, // per meaningful word shared with their current job title
  wilaya: 12, // same wilaya — the strongest single signal in Algeria
  experience: 6, // seniority band matches their years
  recent: 3, // published in the last fortnight
};

/** Words too common to be evidence of anything. */
const STOPWORDS = new Set([
  "de", "du", "des", "la", "le", "les", "un", "une", "et", "en", "pour", "avec",
  "sur", "dans", "au", "aux", "chez", "par", "the", "and", "for", "with", "of",
  "junior", "senior", "stage", "cdi", "cdd", "h", "f",
]);

const normalise = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9؀-ۿ\s+#.]/g, " ");

const words = (value: string) =>
  normalise(value)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

/** Which seniority band a number of years falls into. */
const bandFor = (years: number): ExperienceLevel => {
  if (years <= 0) return "INTERN";
  if (years <= 2) return "JUNIOR";
  if (years <= 5) return "MID";
  if (years <= 10) return "SENIOR";
  return "LEAD";
};

export interface MatchedJob {
  job: any;
  score: number;
  /** Short, human phrases: what made this offer match. */
  reasons: string[];
}

export const getMatchedJobsForCandidate = async (
  userId: string,
  limit = 6
): Promise<MatchedJob[]> => {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: {
      skills: true,
      wilaya: true,
      city: true,
      currentJobTitle: true,
      yearsExperience: true,
    },
  });

  if (!profile) return [];

  const skills = (profile.skills ?? []).map((s) => normalise(s).trim()).filter(Boolean);
  const titleWords = profile.currentJobTitle ? words(profile.currentJobTitle) : [];
  const wilaya = profile.wilaya ? normalise(profile.wilaya).trim() : "";

  // Nothing to match on. Say so, rather than ranking by noise.
  if (!skills.length && !titleWords.length && !wilaya) return [];

  const band =
    profile.yearsExperience != null ? bandFor(profile.yearsExperience) : null;

  /* A bounded pool rather than the whole table: the scoring is in JS, so this
     is the one place that decides how much work it can be asked to do. */
  const jobs = await prisma.job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 200,
    include: {
      company: { select: { name: true, logo: { select: { url: true } } } },
      category: { select: { name: true } },
    },
  });

  const fortnightAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const scored = jobs.map((job) => {
    const haystack = normalise(`${job.title} ${job.description}`);
    const reasons: string[] = [];
    let score = 0;

    const hitSkills = skills.filter((s) => haystack.includes(s));
    if (hitSkills.length) {
      score += hitSkills.length * WEIGHT.skill;
      reasons.push(hitSkills.slice(0, 3).join(", "));
    }

    const hitTitle = titleWords.filter((w) => haystack.includes(w));
    if (hitTitle.length) {
      score += hitTitle.length * WEIGHT.titleWord;
      if (!hitSkills.length) reasons.push(hitTitle.slice(0, 2).join(", "));
    }

    if (wilaya) {
      const place = normalise(`${job.wilaya ?? ""} ${job.location ?? ""}`);
      if (place.includes(wilaya)) {
        score += WEIGHT.wilaya;
        reasons.push(profile.wilaya!);
      }
    }

    if (band && job.experienceLevel === band) {
      score += WEIGHT.experience;
    }

    if (job.publishedAt && job.publishedAt.getTime() > fortnightAgo) {
      score += WEIGHT.recent;
    }

    /* Relevance has to come from the work itself. Sharing a wilaya is worth
     * points once an offer is already relevant, but it cannot qualify one on
     * its own — without this a full-stack developer in Constantine was being
     * recommended a chauffeur, a cook and a veterinary assistant, all scoring
     * purely because they were also in Constantine. */
    const relevant = hitSkills.length > 0 || hitTitle.length > 0;

    return { job, score: relevant ? score : 0, reasons };
  });

  return scored
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || (b.job.publishedAt?.getTime() ?? 0) - (a.job.publishedAt?.getTime() ?? 0))
    .slice(0, limit);
};
