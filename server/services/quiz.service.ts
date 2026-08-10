import { QuizStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import candidateScoreService from "./candidateScore.service";
import cvExtractionService from "./cvExtraction.service";
import { generateQuizQuestions, evaluateAnswer } from "./ai/quiz.ai";

interface SubmittedAnswer {
  questionId: string;
  answer: string;
}

class QuizService {
  /**
   * Candidate: Return the existing quiz for this candidate, or generate a
   * new one from their CV if none exists yet.
   */
  async getOrGenerateQuiz(userId: string) {
    const existingQuiz = await prisma.quiz.findUnique({
      where: { candidateId: userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } },
      },
    });

    if (existingQuiz) {
      return existingQuiz;
    }

    const candidate = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { resume: true } } },
    });

    if (!candidate?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }

    if (!candidate.candidateProfile.resume) {
      throw new AppError(
        "Please upload a CV before generating your quiz.",
        400
      );
    }

    const cvText = await cvExtractionService.extractTextFromCV(
      candidate.candidateProfile.resume.url
    );

    if (!cvText || cvText.trim().length < 50) {
      throw new AppError(
        "Could not extract enough text from your CV to generate a quiz.",
        400
      );
    }

    const generated = await generateQuizQuestions(cvText);

    const quiz = await prisma.quiz.create({
      data: {
        candidateId: userId,
        status: QuizStatus.GENERATED,
        aiModel: "gemini-2.5-flash",
        questions: {
          create: generated.map((q, index) => ({
            order: index + 1,
            question: q.question,
            skill: q.skill,
            difficulty: q.difficulty,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } },
      },
    });

    return quiz;
  }

  /**
   * Candidate: Start (or resume) the quiz. Generates it on first call,
   * and flips status to IN_PROGRESS.
   */
  async startQuiz(userId: string) {
    const quiz = await this.getOrGenerateQuiz(userId);

    if (quiz.status === QuizStatus.GENERATED) {
      await prisma.quiz.update({
        where: { candidateId: userId },
        data: { status: QuizStatus.IN_PROGRESS },
      });
      quiz.status = QuizStatus.IN_PROGRESS;
    }

    return { quiz };
  }

  /**
   * Candidate: Get the quiz (generating it if needed).
   */
  async getQuiz(userId: string) {
    return this.getOrGenerateQuiz(userId);
  }

  /**
   * Candidate: Submit all answers, evaluate them, and calculate the score.
   */
  async submitQuiz(userId: string, answers: SubmittedAnswer[]) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new AppError("Answers are required.", 400);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { candidateId: userId },
      include: { questions: true, attempt: true },
    });

    if (!quiz) {
      throw new AppError("Quiz not found. Start the quiz first.", 404);
    }

    if (quiz.status === QuizStatus.SUBMITTED || quiz.status === QuizStatus.REVIEWED) {
      throw new AppError("This quiz has already been submitted.", 400);
    }

    const questionIds = new Set(quiz.questions.map((q) => q.id));

    for (const a of answers) {
      if (!questionIds.has(a.questionId)) {
        throw new AppError("Invalid question in submission.", 400);
      }
    }

    if (answers.length !== quiz.questions.length) {
      throw new AppError(
        `All ${quiz.questions.length} questions must be answered.`,
        400
      );
    }

    // Evaluate each answer with AI
    const evaluated = await Promise.all(
      answers.map(async (a) => {
        const question = quiz.questions.find((q) => q.id === a.questionId)!;
        const result = await evaluateAnswer(question.question, a.answer);
        return { ...a, ...result };
      })
    );

    const aiScore =
      evaluated.reduce((sum, e) => sum + e.score, 0) / evaluated.length;

    const attempt = await prisma.$transaction(async (tx) => {
      // Remove any previous in-progress attempt (e.g. retried after error)
      if (quiz.attempt) {
        await tx.quizAnswer.deleteMany({
          where: { attemptId: quiz.attempt.id },
        });
        await tx.quizAttempt.delete({ where: { id: quiz.attempt.id } });
      }

      const created = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          candidateId: userId,
          aiScore,
          submittedAt: new Date(),
          answers: {
            create: evaluated.map((e) => ({
              questionId: e.questionId,
              answer: e.answer,
              aiScore: e.score,
              aiFeedback: e.feedback,
            })),
          },
        },
        include: { answers: true },
      });

      await tx.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.SUBMITTED, submittedAt: new Date() },
      });

      return created;
    });

    // Quiz is candidate-level, but scoring is per-application (Application
    // caches a snapshot via Application.quizScore). Sync it onto every
    // application this candidate has, then recalculate each final score
    // through the single centralized scoring service.
    const candidateProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: { applications: { select: { id: true } } },
    });

    if (candidateProfile) {
      await prisma.application.updateMany({
        where: { candidateId: candidateProfile.id },
        data: { quizScore: aiScore },
      });

      await Promise.all(
        candidateProfile.applications.map((app) =>
          candidateScoreService.createOrUpdateScore(app.id).catch(() => null)
        )
      );
    }

    return { attempt, aiScore };
  }

  /**
   * Candidate: Get own attempt
   */
  async getMyAttempt(userId: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId: (await this.requireQuiz(userId)).id },
      include: { answers: { include: { question: true } } },
    });

    return attempt;
  }

  /**
   * Candidate: Delete own attempt so they can be re-evaluated
   * (does not delete the quiz/questions themselves).
   */
  async deleteAttempt(userId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { candidateId: userId },
      include: { attempt: true },
    });

    if (!quiz?.attempt) {
      throw new AppError("No attempt to delete.", 404);
    }

    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({ where: { attemptId: quiz.attempt.id } }),
      prisma.quizAttempt.delete({ where: { id: quiz.attempt.id } }),
      prisma.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.GENERATED, submittedAt: null },
      }),
    ]);

    return { success: true, message: "Attempt deleted successfully." };
  }

  /**
   * Recruiter/Admin: View a specific attempt by id.
   */
  async getAttemptById(attemptId: string, requesterUserId: string, role: string) {
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        candidate: { include: { candidateProfile: true } },
      },
    });

    if (!attempt) {
      throw new AppError("Attempt not found.", 404);
    }

    if (role !== "ADMIN") {
      const requester = await prisma.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true },
      });

      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }

      const candidateProfileId = attempt.candidate.candidateProfile?.id;

      const hasApplication =
        candidateProfileId &&
        (await prisma.application.findFirst({
          where: {
            candidateId: candidateProfileId,
            recruiterId: requester.recruiterProfile.id,
          },
          select: { id: true },
        }));

      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }

    return attempt;
  }

  /**
   * Recruiter: List attempts belonging to candidates who applied to
   * this recruiter's jobs.
   */
  async getRecruiterAttempts(recruiterUserId: string, page = 1, limit = 10) {
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }

    const skip = (page - 1) * limit;

    const where = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id },
          },
        },
      },
    };

    const [items, total] = await prisma.$transaction([
      prisma.quizAttempt.findMany({
        where,
        include: {
          answers: true,
          candidate: { include: { candidateProfile: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quizAttempt.count({ where }),
    ]);

    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Admin: List all attempts
   */
  async getAllAttempts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.quizAttempt.findMany({
        include: { answers: true, candidate: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quizAttempt.count(),
    ]);

    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getRecruiterStatistics(recruiterUserId: string) {
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }

    const baseWhere = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id },
          },
        },
      },
    };

    const [total, submitted] = await prisma.$transaction([
      prisma.quizAttempt.count({ where: baseWhere }),
      prisma.quizAttempt.count({
        where: { ...baseWhere, submittedAt: { not: null } },
      }),
    ]);

    return { total, submitted };
  }

  async getAdminStatistics() {
    const [total, submitted] = await prisma.$transaction([
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { submittedAt: { not: null } } }),
    ]);

    return { total, submitted };
  }

  private async requireQuiz(userId: string) {
    const quiz = await prisma.quiz.findUnique({ where: { candidateId: userId } });

    if (!quiz) {
      throw new AppError("Quiz not found.", 404);
    }

    return quiz;
  }
}

export default new QuizService();
