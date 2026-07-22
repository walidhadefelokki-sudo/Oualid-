import prisma from "../../config/prisma";

export const getOrGenerateQuiz = async (candidateId: string) => {
  // Step 1: Check if the candidate already has a quiz
  const existingQuiz = await prisma.quiz.findUnique({
    where: {
      candidateId,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
      },
      attempt: {
        include: {
          answers: true,
        },
      },
    },
  });

  // If a quiz already exists, return it
  if (existingQuiz) {
    return existingQuiz;
  }

  // ----------------------------------------------------
// Step 2: Load candidate and CV
// ----------------------------------------------------

const candidate = await prisma.user.findUnique({
  where: {
    id: candidateId,
  },
  include: {
    candidateProfile: {
      include: {
        cv: true,
      },
    },
  },
});

if (!candidate?.candidateProfile) {
  throw new AppError(
    "Candidate profile not found.",
    404
  );
}

if (!candidate.candidateProfile.cv) {
  throw new AppError(
    "Candidate CV not found.",
    404
  );
}

};