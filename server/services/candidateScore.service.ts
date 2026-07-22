import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

class CandidateScoreService {
  // ============================================================
  // Score Weights
  // ============================================================

  private readonly WEIGHTS = {
    ai: 0.20,
    quiz: 0.20,
    oral: 0.20,
    interview: 0.20,
    recruiter: 0.20,
  };

  // ============================================================
  // Calculate Final Score
  // ============================================================

  private calculateFinalScore(data: {
    aiScore?: number | null;
    quizScore?: number | null;
    oralPresentationScore?: number | null;
    interviewScore?: number | null;
    recruiterScore?: number | null;
  }) {
    const ai = data.aiScore ?? 0;
    const quiz = data.quizScore ?? 0;
    const oral = data.oralPresentationScore ?? 0;
    const interview = data.interviewScore ?? 0;
    const recruiter = data.recruiterScore ?? 0;

    return (
      ai * this.WEIGHTS.ai +
      quiz * this.WEIGHTS.quiz +
      oral * this.WEIGHTS.oral +
      interview * this.WEIGHTS.interview +
      recruiter * this.WEIGHTS.recruiter
    );
  }

  // ============================================================
  // Create or Update Candidate Score
  // ============================================================

  async createOrUpdateScore(applicationId: string) {
    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        candidate: true,
        candidateScore: true,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    const scoreData = {
      aiScore: application.aiScore,
      quizScore: application.quizScore,
      oralPresentationScore:
        application.oralPresentationScore,
      recruiterScore: application.recruiterScore,
      interviewScore:
        application.candidateScore?.interviewScore ??
        null,
    };

    const finalScore =
      this.calculateFinalScore(scoreData);

    // ---------------------------------------------
    // Update existing record
    // ---------------------------------------------

    if (application.candidateScore) {
      return prisma.candidateScore.update({
        where: {
          applicationId,
        },
        data: {
          aiScore: scoreData.aiScore,
          quizScore: scoreData.quizScore,
          oralPresentationScore:
            scoreData.oralPresentationScore,
          recruiterScore:
            scoreData.recruiterScore,
          interviewScore:
            scoreData.interviewScore,
          finalScore,
        },
      });
    }

    // ---------------------------------------------
    // Create new record
    // ---------------------------------------------

    return prisma.candidateScore.create({
      data: {
        applicationId,
        candidateId: application.candidateId,
        aiScore: scoreData.aiScore,
        quizScore: scoreData.quizScore,
        oralPresentationScore:
          scoreData.oralPresentationScore,
        recruiterScore:
          scoreData.recruiterScore,
        interviewScore:
          scoreData.interviewScore,
        finalScore,
      },
    });
  }

  // ============================================================
  // Candidate
  // ============================================================

  async getMyScore(
    applicationId: string,
    userId: string
  ) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        candidateProfile: true,
      },
    });

    if (!user?.candidateProfile) {
      throw new AppError(
        "Candidate profile not found.",
        404
      );
    }

    const application =
      await prisma.application.findFirst({
        where: {
          id: applicationId,
          candidateId:
            user.candidateProfile.id,
        },
        include: {
          candidateScore: true,
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }

    return application.candidateScore;
  }
    // ============================================================
  // Recruiter updates interview score
  // ============================================================

  async updateInterviewScore(
    applicationId: string,
    recruiterUserId: string,
    interviewScore: number
  ) {
    if (interviewScore < 0 || interviewScore > 100) {
      throw new AppError(
        "Interview score must be between 0 and 100.",
        400
      );
    }

    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterUserId,
      },
      include: {
        recruiterProfile: true,
      },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }

    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        candidateScore: true,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (
      application.recruiterId !==
      recruiter.recruiterProfile.id
    ) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }

    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }

    const current =
      await prisma.candidateScore.findUnique({
        where: {
          applicationId,
        },
      });

    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }

    const finalScore =
      this.calculateFinalScore({
        aiScore: current.aiScore,
        quizScore: current.quizScore,
        oralPresentationScore:
          current.oralPresentationScore,
        recruiterScore:
          current.recruiterScore,
        interviewScore,
      });

    return prisma.candidateScore.update({
      where: {
        applicationId,
      },
      data: {
        interviewScore,
        finalScore,
      },
    });
  }

  // ============================================================
  // Recruiter updates recruiter evaluation
  // ============================================================

  async updateRecruiterScore(
    applicationId: string,
    recruiterUserId: string,
    recruiterScore: number
  ) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError(
        "Recruiter score must be between 0 and 100.",
        400
      );
    }

    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterUserId,
      },
      include: {
        recruiterProfile: true,
      },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }

    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        candidateScore: true,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (
      application.recruiterId !==
      recruiter.recruiterProfile.id
    ) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }

    await prisma.application.update({
      where: {
        id: applicationId,
      },
      data: {
        recruiterScore,
      },
    });

    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }

    const current =
      await prisma.candidateScore.findUnique({
        where: {
          applicationId,
        },
      });

    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }

    const finalScore =
      this.calculateFinalScore({
        aiScore: current.aiScore,
        quizScore: current.quizScore,
        oralPresentationScore:
          current.oralPresentationScore,
        interviewScore:
          current.interviewScore,
        recruiterScore,
      });

    return prisma.candidateScore.update({
      where: {
        applicationId,
      },
      data: {
        recruiterScore,
        finalScore,
      },
    });
  }

  // ============================================================
  // Recruiter views one candidate score
  // ============================================================

  async getCandidateScore(
    applicationId: string,
    recruiterUserId: string,
    role: string
  ) {
    const application = await prisma.application.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        candidateScore: {
          include: {
            candidate: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (role !== "ADMIN") {
      const recruiter =
        await prisma.user.findUnique({
          where: {
            id: recruiterUserId,
          },
          include: {
            recruiterProfile: true,
          },
        });

      if (!recruiter?.recruiterProfile) {
        throw new AppError(
          "Recruiter profile not found.",
          404
        );
      }

      if (
        application.recruiterId !==
        recruiter.recruiterProfile.id
      ) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }

    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }

    return application.candidateScore;
  }
    // ============================================================
  // Recruiter Dashboard
  // ============================================================

  async getRecruiterScores(
    recruiterUserId: string,
    page = 1,
    limit = 10
  ) {
    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterUserId,
      },
      include: {
        recruiterProfile: true,
      },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }

    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([

      prisma.candidateScore.findMany({
        where: {
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true,
                },
              },
              job: true,
            },
          },
        },
        orderBy: {
          finalScore: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.candidateScore.count({
        where: {
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
      }),

    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // Recruiter Statistics
  // ============================================================

  async getRecruiterStatistics(
    recruiterUserId: string
  ) {
    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterUserId,
      },
      include: {
        recruiterProfile: true,
      },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }

    const [total, average, highest, lowest] =
      await prisma.$transaction([

        prisma.candidateScore.count({
          where: {
            application: {
              recruiterId:
                recruiter.recruiterProfile.id,
            },
          },
        }),

        prisma.candidateScore.aggregate({
          where: {
            application: {
              recruiterId:
                recruiter.recruiterProfile.id,
            },
          },
          _avg: {
            finalScore: true,
          },
        }),

        prisma.candidateScore.findFirst({
          where: {
            application: {
              recruiterId:
                recruiter.recruiterProfile.id,
            },
          },
          orderBy: {
            finalScore: "desc",
          },
          include: {
            application: {
              include: {
                candidate: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        }),

        prisma.candidateScore.findFirst({
          where: {
            application: {
              recruiterId:
                recruiter.recruiterProfile.id,
            },
          },
          orderBy: {
            finalScore: "asc",
          },
          include: {
            application: {
              include: {
                candidate: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        }),

      ]);

    return {
      totalCandidates: total,
      averageScore:
        average._avg.finalScore ?? 0,
      highestCandidate: highest,
      lowestCandidate: lowest,
    };
  }

  // ============================================================
  // Admin
  // ============================================================

  async getAllScores(
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([

      prisma.candidateScore.findMany({
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true,
                },
              },
              recruiter: true,
              job: true,
            },
          },
        },
        orderBy: {
          finalScore: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.candidateScore.count(),

    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // Admin Statistics
  // ============================================================

  async getAdminStatistics() {

    const [total, average] =
      await prisma.$transaction([

        prisma.candidateScore.count(),

        prisma.candidateScore.aggregate({
          _avg: {
            finalScore: true,
          },
        }),

      ]);

    return {
      totalCandidates: total,
      averageScore:
        average._avg.finalScore ?? 0,
    };
  }

  // ============================================================
  // Recalculate
  // ============================================================

  async recalculate(
    applicationId: string
  ) {
    return this.createOrUpdateScore(
      applicationId
    );
  }

  // ============================================================
  // Delete Candidate Score
  // ============================================================

  async deleteScore(
    applicationId: string
  ) {
    const score =
      await prisma.candidateScore.findUnique({
        where: {
          applicationId,
        },
      });

    if (!score) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }

    await prisma.candidateScore.delete({
      where: {
        applicationId,
      },
    });

    return {
      success: true,
      message:
        "Candidate score deleted successfully.",
    };
  }

}

export default new CandidateScoreService();