import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { PreselectionStatus } from "@prisma/client";

class PreselectionService {
  // ============================================================
  // Minimum score required for automatic preselection
  // ============================================================

  private readonly MINIMUM_SCORE = 70;

  // ============================================================
  // Automatic Status
  // ============================================================

  private determineStatus(score: number | null) {
    if (!score) {
      return PreselectionStatus.PENDING;
    }

    if (score >= this.MINIMUM_SCORE) {
      return PreselectionStatus.SHORTLISTED;
    }

    return PreselectionStatus.REJECTED;
  }

  // ============================================================
  // Create or Update Preselection
  // ============================================================

  async createOrUpdatePreselection(
    applicationId: string
  ) {
    const application =
      await prisma.application.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          candidateScore: true,
          recruiter: true,
          preselections: true,
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    /* A CandidateScore row is written by the scoring pipeline, which has run
     * for almost no application — so requiring one here refused every
     * shortlist and every rejection with "Candidate score not found.", and the
     * recruiter's buttons simply did not work.
     *
     * The Application carries the same numbers, and they are the ones every
     * screen already displays. Taken from there when the row is absent. */
    const scores = application.candidateScore;

    const finalScore =
      scores?.finalScore ??
      application.finalScore ??
      application.aiScore ??
      0;

    const recruiterScore =
      scores?.recruiterScore ?? application.recruiterScore ?? null;

    const aiScore = scores?.aiScore ?? application.aiScore ?? null;

    const status =
      this.determineStatus(finalScore);

    // ---------------------------------------
    // Update existing preselection
    // ---------------------------------------

    const existingPreselection = application.preselections[0];

    if (existingPreselection) {
      return prisma.preselection.update({
        where: {
          id: existingPreselection.id,
        },
        data: {
          aiScore,
          recruiterScore,
          finalScore,
          status,
        },
      });
    }

    // ---------------------------------------
    // Create new preselection
    // ---------------------------------------

    return prisma.preselection.create({
      data: {
        applicationId,
        recruiterId:
          application.recruiterId,
        aiScore,
        recruiterScore,
        finalScore,
        status,
      },
    });
  }

  // ============================================================
  // Candidate
  // ============================================================

  async getMyPreselection(
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
          preselections: true,
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
      );
    }

    return application.preselections[0];
  }

  // ============================================================
  // Recalculate
  // ============================================================

  async recalculate(
    applicationId: string
  ) {
    return this.createOrUpdatePreselection(
      applicationId
    );
  }
    // ============================================================
  // Recruiter reviews a candidate
  // ============================================================

  async reviewCandidate(
    applicationId: string,
    recruiterUserId: string,
    data: {
      status: PreselectionStatus;
      recruiterScore?: number;
      comment?: string;
    }
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

    const application =
      await prisma.application.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          candidateScore: true,
          preselections: true,
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

    if (!application.preselections[0]) {
      await this.createOrUpdatePreselection(
        applicationId
      );
    }

    const preselection =
      await prisma.preselection.findFirst({
        where: {
          applicationId,
        },
      });

    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }

    const recruiterScore =
      data.recruiterScore ??
      preselection.recruiterScore;

    /* The Application is what every screen reads — the preselection list, the
     * CV directory, the candidates table — so a decision recorded only in the
     * Preselection table was invisible everywhere. It is written to both.
     *
     * `status` is only moved forward. Shortlisting somebody already at
     * INTERVIEW or HIRED must not send them back to SHORTLISTED; a rejection
     * is a decision and always applies. */
    const shortlisted = data.status === PreselectionStatus.SHORTLISTED;
    const rejected = data.status === PreselectionStatus.REJECTED;
    const earlyStage =
      application.status === "PENDING" || application.status === "REVIEWING";

    return prisma.$transaction(async (tx) => {

      // updateMany, not update: there may be no row, and its absence is not a
      // reason to refuse the decision.
      await tx.candidateScore.updateMany({
        where: {
          applicationId,
        },
        data: {
          recruiterScore,
        },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: {
          isPreselected: shortlisted,
          preselectionStatus: data.status,
          ...(data.comment !== undefined
            ? { preselectionComment: data.comment }
            : {}),
          ...(rejected
            ? { status: "REJECTED" as const }
            : shortlisted && earlyStage
              ? { status: "SHORTLISTED" as const }
              : {}),
        },
      });

      return tx.preselection.update({
        where: {
          id: preselection.id,
        },
        data: {
          recruiterScore,
          status: data.status,
          comment: data.comment,
          reviewedAt: new Date(),
        },
      });

    });
  }

  // ============================================================
  // Shortlist Candidate
  // ============================================================

  async shortlistCandidate(
    applicationId: string,
    recruiterUserId: string,
    comment?: string
  ) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status:
          PreselectionStatus.SHORTLISTED,
        comment,
      }
    );
  }

  // ============================================================
  // Reject Candidate
  // ============================================================

  async rejectCandidate(
    applicationId: string,
    recruiterUserId: string,
    comment?: string
  ) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status:
          PreselectionStatus.REJECTED,
        comment,
      }
    );
  }

  // ============================================================
  // Get One Preselection
  // ============================================================

  async getPreselection(
    applicationId: string,
    recruiterUserId: string,
    role: string
  ) {
    const application =
      await prisma.application.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          preselections: {
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
          },
        },
      });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
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

    return application.preselections[0];
  }

  // ============================================================
  // Update Comment
  // ============================================================

  async updateComment(
    applicationId: string,
    recruiterUserId: string,
    comment: string
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

    const preselection =
      await prisma.preselection.findFirst({
        where: {
          applicationId,
          recruiterId:
            recruiter.recruiterProfile.id,
        },
      });

    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }

    return prisma.preselection.update({
      where: {
        id: preselection.id,
      },
      data: {
        comment,
        reviewedAt: new Date(),
      },
    });
  }
    // ============================================================
  // Recruiter Dashboard
  // ============================================================

  async getRecruiterPreselections(
    recruiterUserId: string,
    page = 1,
    limit = 10,
    status?: PreselectionStatus
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

    const where: any = {
      recruiterId: recruiter.recruiterProfile.id,
    };

    if (status) {
      where.status = status;
    }

    const [items, total] = await prisma.$transaction([

      prisma.preselection.findMany({
        where,
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  /* Selected, not `user: true`.
                   *
                   * That returned every User column — the bcrypt hash
                   * included — to any recruiter who opened this list. A
                   * password hash has no reason to leave the server: it is
                   * exactly what an offline cracking attempt needs if a token
                   * or a response is ever captured. */
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                      avatar: { select: { url: true } },
                    },
                  },
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

      prisma.preselection.count({
        where,
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

    const [
      total,
      shortlisted,
      rejected,
      pending,
      average,
    ] = await prisma.$transaction([

      prisma.preselection.count({
        where: {
          recruiterId:
            recruiter.recruiterProfile.id,
        },
      }),

      prisma.preselection.count({
        where: {
          recruiterId:
            recruiter.recruiterProfile.id,
          status:
            PreselectionStatus.SHORTLISTED,
        },
      }),

      prisma.preselection.count({
        where: {
          recruiterId:
            recruiter.recruiterProfile.id,
          status:
            PreselectionStatus.REJECTED,
        },
      }),

      prisma.preselection.count({
        where: {
          recruiterId:
            recruiter.recruiterProfile.id,
          status:
            PreselectionStatus.PENDING,
        },
      }),

      prisma.preselection.aggregate({
        where: {
          recruiterId:
            recruiter.recruiterProfile.id,
        },
        _avg: {
          finalScore: true,
        },
      }),

    ]);

    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore:
        average._avg.finalScore ?? 0,
    };
  }

  // ============================================================
  // Recruiter Ranking
  // ============================================================

  async getRanking(
    recruiterUserId: string,
    limit = 20
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

    return prisma.preselection.findMany({
      where: {
        recruiterId:
          recruiter.recruiterProfile.id,
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
      take: limit,
    });
  }

  // ============================================================
  // Admin
  // ============================================================

  async getAllPreselections(
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([

      prisma.preselection.findMany({
        include: {
          recruiter: true,
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
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.preselection.count(),

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

    const [
      total,
      shortlisted,
      rejected,
      pending,
      average,
    ] = await prisma.$transaction([

      prisma.preselection.count(),

      prisma.preselection.count({
        where: {
          status:
            PreselectionStatus.SHORTLISTED,
        },
      }),

      prisma.preselection.count({
        where: {
          status:
            PreselectionStatus.REJECTED,
        },
      }),

      prisma.preselection.count({
        where: {
          status:
            PreselectionStatus.PENDING,
        },
      }),

      prisma.preselection.aggregate({
        _avg: {
          finalScore: true,
        },
      }),

    ]);

    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore:
        average._avg.finalScore ?? 0,
    };
  }

  // ============================================================
  // Delete
  // ============================================================

  async deletePreselection(
    applicationId: string
  ) {
    const preselection =
      await prisma.preselection.findFirst({
        where: {
          applicationId,
        },
      });

    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }

    await prisma.preselection.delete({
      where: {
        id: preselection.id,
      },
    });

    return {
      success: true,
      message:
        "Preselection deleted successfully.",
    };
  }
  
}

export default new PreselectionService();