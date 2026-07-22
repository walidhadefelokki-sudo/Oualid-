import { CandidateRanking } from "../types/ranking";

///////////////////////////////////////////////////////////////
// WEIGHTS
///////////////////////////////////////////////////////////////

export const RANKING_WEIGHTS = {

  cv: 0.35,

  quiz: 0.25,

  presentation: 0.20,

  experience: 0.10,

  skills: 0.10,

};

///////////////////////////////////////////////////////////////
// TYPES
///////////////////////////////////////////////////////////////

export interface RankingScoreBreakdown {

  cvScore: number;

  quizScore: number;

  presentationScore: number;

  experienceScore: number;

  skillsScore: number;

  finalScore: number;

}

///////////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////////

function clamp(

  value: number,

  min = 0,

  max = 100

): number {

  return Math.min(

    Math.max(value, min),

    max

  );

}

///////////////////////////////////////////////////////////////
// EXPERIENCE SCORE
///////////////////////////////////////////////////////////////

export function calculateExperienceScore(

  years: number

): number {

  if (years <= 0) return 20;

  if (years <= 1) return 40;

  if (years <= 3) return 60;

  if (years <= 5) return 75;

  if (years <= 8) return 90;

  return 100;

}

///////////////////////////////////////////////////////////////
// SKILLS SCORE
///////////////////////////////////////////////////////////////

export function calculateSkillsScore(

  skills: string[] = [],

  requiredSkills: string[] = []

): number {

  if (requiredSkills.length === 0)

    return 100;

  const normalizedCandidate =

    skills.map(skill =>

      skill.toLowerCase()

    );

  const matches =

    requiredSkills.filter(skill =>

      normalizedCandidate.includes(

        skill.toLowerCase()

      )

    ).length;

  return clamp(

    (matches /

      requiredSkills.length) *

      100

  );

}

///////////////////////////////////////////////////////////////
// FINAL AI SCORE
///////////////////////////////////////////////////////////////

export function calculateAIScore(

  candidate: CandidateRanking,

  requiredSkills: string[] = []

): RankingScoreBreakdown {

  const cvScore =

    clamp(candidate.cvScore ?? 0);

  const quizScore =

    clamp(candidate.quizScore ?? 0);

  const presentationScore =

    clamp(

      candidate.presentationScore ?? 0

    );

  const experienceScore =

    calculateExperienceScore(

      candidate.experienceYears

    );

  const skillsScore =

    calculateSkillsScore(

      candidate.skills ?? [],

      requiredSkills

    );

  const finalScore =

    (

      cvScore *

        RANKING_WEIGHTS.cv +

      quizScore *

        RANKING_WEIGHTS.quiz +

      presentationScore *

        RANKING_WEIGHTS.presentation +

      experienceScore *

        RANKING_WEIGHTS.experience +

      skillsScore *

        RANKING_WEIGHTS.skills

    );

  return {

    cvScore,

    quizScore,

    presentationScore,

    experienceScore,

    skillsScore,

    finalScore:

      Number(

        finalScore.toFixed(2)

      ),

  };

}

///////////////////////////////////////////////////////////////
// UPDATE RANKING
///////////////////////////////////////////////////////////////

export function rankCandidates(

  candidates: CandidateRanking[],

  requiredSkills: string[] = []

): CandidateRanking[] {

  const ranked =

    candidates.map(candidate => {

      const score =

        calculateAIScore(

          candidate,

          requiredSkills

        );

      return {

        ...candidate,

        aiScore:

          score.finalScore,

      };

    });

  ranked.sort(

    (a, b) =>

      b.aiScore - a.aiScore

  );

  return ranked.map(

    (

      candidate,

      index

    ) => ({

      ...candidate,

      rankingPosition:

        index + 1,

    })

  );

}

///////////////////////////////////////////////////////////////
// TOP CANDIDATES
///////////////////////////////////////////////////////////////

export function getTopCandidates(

  candidates: CandidateRanking[],

  count = 5

): CandidateRanking[] {

  return [...candidates]

    .sort(

      (a, b) =>

        b.aiScore - a.aiScore

    )

    .slice(0, count);

}

///////////////////////////////////////////////////////////////
// PRESELECTION
///////////////////////////////////////////////////////////////

export function shouldPreselect(

  candidate: CandidateRanking,

  minimumScore = 85

): boolean {

  return candidate.aiScore >= minimumScore;

}

///////////////////////////////////////////////////////////////
// STATISTICS
///////////////////////////////////////////////////////////////

export function averageAIScore(

  candidates: CandidateRanking[]

): number {

  if (candidates.length === 0)

    return 0;

  const total =

    candidates.reduce(

      (sum, candidate) =>

        sum +

        candidate.aiScore,

      0

    );

  return Number(

    (total /

      candidates.length).toFixed(2)

  );

}

///////////////////////////////////////////////////////////////
// RANK LABEL
///////////////////////////////////////////////////////////////

export function getRankLabel(

  score: number

): string {

  if (score >= 95)

    return "Outstanding";

  if (score >= 90)

    return "Excellent";

  if (score >= 80)

    return "Very Good";

  if (score >= 70)

    return "Good";

  if (score >= 60)

    return "Average";

  return "Needs Improvement";

}