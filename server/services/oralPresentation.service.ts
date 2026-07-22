import { Prisma, OralPresentationStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

interface UploadedFile {
  path?: string;
  filename?: string;
  mimetype?: string;
  size?: number;
  originalname?: string;
}

class OralPresentationService {
  /**
   * Upload or replace an oral presentation video
   */
  async uploadPresentation(
    applicationId: string,
    userId: string,
    file: UploadedFile
  ) {
    // ---------------------------------------
    // Validate upload
    // ---------------------------------------

    if (!file) {
      throw new AppError("Please upload a video.", 400);
    }

    // ---------------------------------------
    // Find candidate
    // ---------------------------------------

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        candidateProfile: true,
      },
    });

    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }

    // ---------------------------------------
    // Verify application ownership
    // ---------------------------------------

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id,
      },
      include: {
        oralPresentation: true,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found or you do not own it.",
        404
      );
    }

    // ---------------------------------------
    // Create FileAsset
    // ---------------------------------------

    const fileAsset = await prisma.fileAsset.create({
      data: {
        url: file.path || "",
        provider: "cloudinary",
        publicId: file.filename,
        mimeType: file.mimetype,
        extension: file.originalname?.split(".").pop(),
        size: file.size,
      },
    });

    // ---------------------------------------
    // Update existing presentation
    // ---------------------------------------

    if (application.oralPresentation) {
      const presentation =
        await prisma.oralPresentation.update({
          where: {
            applicationId,
          },
          data: {
            videoId: fileAsset.id,
            status: OralPresentationStatus.UPLOADED,
          },
          include: {
            video: true,
            application: true,
          },
        });

      return presentation;
    }

    // ---------------------------------------
    // Create new presentation
    // ---------------------------------------

    const presentation =
      await prisma.oralPresentation.create({
        data: {
          applicationId,
          videoId: fileAsset.id,
          status: OralPresentationStatus.UPLOADED,
        },
        include: {
          video: true,
          application: true,
        },
      });

    return presentation;
  }
    /**
   * Candidate: Get presentation by application
   */
  async getPresentationByApplication(
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
      throw new AppError("Candidate profile not found.", 404);
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found or access denied.",
        404
      );
    }

    const presentation = await prisma.oralPresentation.findUnique({
      where: {
        applicationId,
      },
      include: {
        video: true,
        application: {
          include: {
            job: true,
          },
        },
      },
    });

    return presentation;
  }

  /**
   * Recruiter/Admin: View presentation
   */
  async getPresentationById(
    presentationId: string,
    recruiterUserId: string,
    role: string
  ) {
    const presentation =
      await prisma.oralPresentation.findUnique({
        where: {
          id: presentationId,
        },
        include: {
          video: true,
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
      });

    if (!presentation) {
      throw new AppError(
        "Presentation not found.",
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
        recruiter.recruiterProfile.id !==
        presentation.application.recruiterId
      ) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }

    return presentation;
  }

  /**
   * Recruiter review
   */
  async updateRecruiterScore(
    presentationId: string,
    recruiterUserId: string,
    recruiterScore: number
  ) {
    if (
      recruiterScore < 0 ||
      recruiterScore > 100
    ) {
      throw new AppError(
        "Recruiter score must be between 0 and 100.",
        400
      );
    }

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

    const presentation =
      await prisma.oralPresentation.findUnique({
        where: {
          id: presentationId,
        },
        include: {
          application: true,
        },
      });

    if (!presentation) {
      throw new AppError(
        "Presentation not found.",
        404
      );
    }

    if (
      presentation.application.recruiterId !==
      recruiter.recruiterProfile.id
    ) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }

    return prisma.oralPresentation.update({
      where: {
        id: presentationId,
      },
      data: {
        recruiterScore,
        status: OralPresentationStatus.REVIEWED,
      },
      include: {
        video: true,
        application: true,
      },
    });
  }

  /**
   * Save AI transcript
   */
  async updateTranscript(
    presentationId: string,
    transcript: string
  ) {
    const presentation =
      await prisma.oralPresentation.findUnique({
        where: {
          id: presentationId,
        },
      });

    if (!presentation) {
      throw new AppError(
        "Presentation not found.",
        404
      );
    }

    return prisma.oralPresentation.update({
      where: {
        id: presentationId,
      },
      data: {
        transcript,
      },
    });
  }

  /**
   * Save AI score
   */
  async updateAIScore(
    presentationId: string,
    aiScore: number
  ) {
    if (aiScore < 0 || aiScore > 100) {
      throw new AppError(
        "AI score must be between 0 and 100.",
        400
      );
    }

    const presentation =
      await prisma.oralPresentation.findUnique({
        where: {
          id: presentationId,
        },
      });

    if (!presentation) {
      throw new AppError(
        "Presentation not found.",
        404
      );
    }

    return prisma.oralPresentation.update({
      where: {
        id: presentationId,
      },
      data: {
        aiScore,
      },
      include: {
        application: true,
        video: true,
      },
    });
  }
    /**
   * Candidate: Delete presentation
   */
  async deletePresentation(
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
      throw new AppError("Candidate profile not found.", 404);
    }

    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id,
      },
      include: {
        oralPresentation: true,
      },
    });

    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }

    if (!application.oralPresentation) {
      throw new AppError(
        "Presentation not found.",
        404
      );
    }

    await prisma.$transaction(async (tx) => {

      if (application.oralPresentation?.videoId) {
        await tx.fileAsset.delete({
          where: {
            id: application.oralPresentation.videoId,
          },
        });
      }

      await tx.oralPresentation.delete({
        where: {
          applicationId,
        },
      });

      await tx.application.update({
        where: {
          id: applicationId,
        },
        data: {
          oralPresentationScore: null,
        },
      });

    });

    return {
      success: true,
      message: "Presentation deleted successfully.",
    };
  }

  /**
   * Recruiter: List presentations
   */
  async getRecruiterPresentations(
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

      prisma.oralPresentation.findMany({
        where: {
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
        include: {
          video: true,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.oralPresentation.count({
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

  /**
   * Admin: List all presentations
   */
  async getAllPresentations(
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([

      prisma.oralPresentation.findMany({
        include: {
          video: true,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.oralPresentation.count(),

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

  /**
   * Recruiter dashboard statistics
   */
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
      pending,
      uploaded,
      reviewed,
    ] = await prisma.$transaction([

      prisma.oralPresentation.count({
        where: {
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
      }),

      prisma.oralPresentation.count({
        where: {
          status:
            OralPresentationStatus.PENDING,
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
      }),

      prisma.oralPresentation.count({
        where: {
          status:
            OralPresentationStatus.UPLOADED,
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
      }),

      prisma.oralPresentation.count({
        where: {
          status:
            OralPresentationStatus.REVIEWED,
          application: {
            recruiterId:
              recruiter.recruiterProfile.id,
          },
        },
      }),

    ]);

    return {
      total,
      pending,
      uploaded,
      reviewed,
    };
  }
}

export default new OralPresentationService();