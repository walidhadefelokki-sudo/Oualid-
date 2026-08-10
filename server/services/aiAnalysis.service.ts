import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

import candidateScoreService from "./candidateScore.service";
import preselectionService from "./preselection.service";

import { AIAnalysisStatus } from "@prisma/client";

import { askAI } from "./ai/openai.provider";
import { buildPrompt } from "./ai/prompt.builder";
import { parseAnalysis } from "./ai/analysis.parser";
import cvExtractionService from "./cvExtraction.service";

class AIAnalysisService {

  // ============================================================
  // Build Prompt
  // ============================================================

  private createPrompt(
    jobTitle: string,
    jobDescription: string,
    cvText: string
  ) {
    return buildPrompt({
      jobTitle,
      jobDescription,
      cvText,
    });
  }

  // ============================================================
  // Save / Update Analysis
  // ============================================================

  private async saveAnalysis(
    applicationId: string,
    candidateId: string,
    analysis: any
  ) {

    const existing =
      await prisma.aIAnalysis.findUnique({
        where: {
          applicationId,
        },
      });

    const data = {

      candidateId,

      status: AIAnalysisStatus.COMPLETED,

      overallScore:
        analysis.overallScore ?? 0,

      skillsScore:
        analysis.skillsScore ?? 0,

      experienceScore:
        analysis.experienceScore ?? 0,

      educationScore:
        analysis.educationScore ?? 0,

      languageScore:
        analysis.languageScore ?? 0,

      extractedSkills:
        analysis.extractedSkills ?? [],

      extractedLanguages:
        analysis.extractedLanguages ?? [],

      strengths:
        analysis.strengths ?? [],

      weaknesses:
        analysis.weaknesses ?? [],

      recommendations:
        analysis.recommendations ?? [],

      processedAt: new Date(),

    };

    if (existing) {

      return prisma.aIAnalysis.update({

        where: {
          applicationId,
        },

        data,

      });

    }

    return prisma.aIAnalysis.create({

      data: {

        applicationId,

        ...data,

      },

    });

  }

  // ============================================================
  // Update Application AI Score
  // ============================================================

  private async updateApplicationScore(
    applicationId: string,
    score: number
  ) {

    return prisma.application.update({

      where: {
        id: applicationId,
      },

      data: {

        aiScore: score,

      },

    });

  }

  // ============================================================
  // Read Application
  // ============================================================

  private async getApplication(
    applicationId: string
  ) {

    const application =
      await prisma.application.findUnique({

        where: {
          id: applicationId,
        },

        include: {

          candidate: true,

          job: true,

          cv: true,

          aianalysis: true,

        },

      });

    if (!application) {

      throw new AppError(
        "Application not found.",
        404
      );

    }

    if (!application.cv) {

      throw new AppError(
        "Candidate CV not found.",
        404
      );

    }

    return application;

  }
    // ============================================================
  // Analyze Application
  // ============================================================

  async analyzeApplication(
    applicationId: string
  ) {

    // ---------------------------------------
    // Load application
    // ---------------------------------------

    const application =
      await this.getApplication(
        applicationId
      );

    // ---------------------------------------
    // Mark as processing
    // ---------------------------------------

    if (application.aianalysis) {

      await prisma.aIAnalysis.update({

        where: {
          applicationId,
        },

        data: {
          status:
            AIAnalysisStatus.PROCESSING,
        },

      });

    } else {

      await prisma.aIAnalysis.create({

        data: {

          applicationId,

          candidateId:
            application.candidateId,

          status:
            AIAnalysisStatus.PROCESSING,

        },

      });

    }

    try {

      // ---------------------------------------
      // Extract CV text
      // ---------------------------------------

      const cvText =
        await cvExtractionService.extractTextFromCV(
            application.cv!.url
        );

      // ---------------------------------------
      // Build prompt
      // ---------------------------------------

      const prompt =
        this.createPrompt(

          application.job.title,

          application.job.description,

          cvText

        );

      // ---------------------------------------
      // Ask Gemini
      // ---------------------------------------

      const aiResponse =
        await askAI(prompt);

      // ---------------------------------------
      // Parse JSON
      // ---------------------------------------

      const analysis =
        parseAnalysis(aiResponse);

      // ---------------------------------------
      // Save AI Analysis
      // ---------------------------------------

      const savedAnalysis =
        await this.saveAnalysis(

          applicationId,

          application.candidateId,

          analysis

        );

      // ---------------------------------------
      // Update application AI score
      // ---------------------------------------

      await this.updateApplicationScore(

        applicationId,

        analysis.overallScore

      );

      // ---------------------------------------
      // Update Candidate Score
      // ---------------------------------------

      await candidateScoreService
        .createOrUpdateScore(
          applicationId
        );

      // ---------------------------------------
      // Update Preselection
      // ---------------------------------------

      await preselectionService
        .createOrUpdatePreselection(
          applicationId
        );

      // ---------------------------------------
      // Return result
      // ---------------------------------------

      return savedAnalysis;

    } catch (error) {

      await prisma.aIAnalysis.update({

        where: {
          applicationId,
        },

        data: {
          status:
            AIAnalysisStatus.FAILED,
        },

      });

      throw error;

    }

  }
    // ============================================================
  // Get One Analysis
  // ============================================================

  async getAnalysis(
    applicationId: string
  ) {

    const analysis =
      await prisma.aIAnalysis.findUnique({

        where: {
          applicationId,
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

      });

    if (!analysis) {

      throw new AppError(
        "AI analysis not found.",
        404
      );

    }

    return analysis;

  }

  // ============================================================
  // Recruiter Dashboard
  // ============================================================

  async getRecruiterAnalyses(
    recruiterUserId: string,
    page = 1,
    limit = 10
  ) {

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

    const skip = (page - 1) * limit;

    const [items, total] =
      await prisma.$transaction([

        prisma.aIAnalysis.findMany({

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

            overallScore: "desc",

          },

          skip,

          take: limit,

        }),

        prisma.aIAnalysis.count({

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

        pages:
          Math.ceil(total / limit),

      },

    };

  }

  // ============================================================
  // Recruiter Statistics
  // ============================================================

  async getStatistics(
    recruiterUserId: string
  ) {

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

    const [

      total,

      average,

      highest,

      lowest,

    ] =
      await prisma.$transaction([

        prisma.aIAnalysis.count({

          where: {

            application: {

              recruiterId:
                recruiter.recruiterProfile.id,

            },

          },

        }),

        prisma.aIAnalysis.aggregate({

          where: {

            application: {

              recruiterId:
                recruiter.recruiterProfile.id,

            },

          },

          _avg: {

            overallScore: true,

          },

        }),

        prisma.aIAnalysis.findFirst({

          where: {

            application: {

              recruiterId:
                recruiter.recruiterProfile.id,

            },

          },

          orderBy: {

            overallScore: "desc",

          },

        }),

        prisma.aIAnalysis.findFirst({

          where: {

            application: {

              recruiterId:
                recruiter.recruiterProfile.id,

            },

          },

          orderBy: {

            overallScore: "asc",

          },

        }),

      ]);

    return {

      totalAnalyses: total,

      averageScore:
        average._avg.overallScore ?? 0,

      highestAnalysis: highest,

      lowestAnalysis: lowest,

    };

  }

  // ============================================================
  // Recalculate
  // ============================================================

  async recalculate(
    applicationId: string
  ) {

    return this.analyzeApplication(
      applicationId
    );

  }

  // ============================================================
  // Delete Analysis
  // ============================================================

  async deleteAnalysis(
    applicationId: string
  ) {

    const analysis =
      await prisma.aIAnalysis.findUnique({

        where: {
          applicationId,
        },

      });

    if (!analysis) {

      throw new AppError(
        "AI analysis not found.",
        404
      );

    }

    await prisma.aIAnalysis.delete({

      where: {
        applicationId,
      },

    });

    return {

      success: true,

      message:
        "AI analysis deleted successfully.",

    };

  }

}
export default new AIAnalysisService();
