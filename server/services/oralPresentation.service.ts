import { OralPresentationStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import candidateScoreService from "./candidateScore.service";

interface UploadedVideoMeta {
  url?: string;
  publicId?: string;
  mimeType?: string;
  extension?: string;
  size?: number;
}

class OralPresentationService {
  /**
   * Candidate: Upload or replace their profile presentation video.
   * One presentation per candidate profile (not per application).
   *
   * `meta` describes a video that the browser has already uploaded
   * directly to Cloudinary (see getUploadSignature) — we only ever
   * receive the resulting metadata here, never the file itself.
   */
  async uploadPresentation(userId: string, meta: UploadedVideoMeta) {
    if (!meta?.url) {
      throw new AppError("Please upload a video.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } },
    });

    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }

    const candidateId = user.candidateProfile.id;

    const fileAsset = await prisma.fileAsset.create({
      data: {
        url: meta.url,
        provider: "cloudinary",
        publicId: meta.publicId,
        mimeType: meta.mimeType,
        extension: meta.extension,
        size: meta.size,
      },
    });

    const existing = user.candidateProfile.oralPresentation;

    // Update existing presentation (and clean up the old video asset)
    if (existing) {
      const presentation = await prisma.oralPresentation.update({
        where: { candidateId },
        data: {
          videoId: fileAsset.id,
          status: OralPresentationStatus.UPLOADED,
        },
        include: { video: true },
      });

      if (existing.videoId && existing.videoId !== fileAsset.id) {
        await prisma.fileAsset
          .delete({ where: { id: existing.videoId } })
          .catch(() => null);
      }

      return presentation;
    }

    // Create new presentation
    const presentation = await prisma.oralPresentation.create({
      data: {
        candidateId,
        videoId: fileAsset.id,
        status: OralPresentationStatus.UPLOADED,
      },
      include: { video: true },
    });

    return presentation;
  }

  /**
   * Candidate: Get own presentation
   */
  async getMyPresentation(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true },
    });

    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }

    const presentation = await prisma.oralPresentation.findUnique({
      where: { candidateId: user.candidateProfile.id },
      include: { video: true },
    });

    return presentation;
  }

  /**
   * Recruiter/Admin: View a candidate's presentation.
   * A recruiter may only view it if the candidate has applied to one of
   * the recruiter's jobs.
   */
  async getPresentationByCandidateId(
    candidateId: string,
    requesterUserId: string,
    role: string
  ) {
    const presentation = await prisma.oralPresentation.findUnique({
      where: { candidateId },
      include: {
        video: true,
        candidate: { include: { user: true } },
      },
    });

    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }

    if (role !== "ADMIN") {
      const requester = await prisma.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true },
      });

      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }

      const hasApplication = await prisma.application.findFirst({
        where: {
          candidateId,
          recruiterId: requester.recruiterProfile.id,
        },
        select: { id: true },
      });

      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }

    return presentation;
  }

  /**
   * Recruiter: Score a candidate's presentation.
   * Same ownership rule as viewing: candidate must have applied to one
   * of the recruiter's jobs.
   */
  async updateRecruiterScore(
    candidateId: string,
    recruiterUserId: string,
    recruiterScore: number
  ) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError("Recruiter score must be between 0 and 100.", 400);
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true },
    });

    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }

    const presentation = await prisma.oralPresentation.findUnique({
      where: { candidateId },
    });

    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }

    const hasApplication = await prisma.application.findFirst({
      where: {
        candidateId,
        recruiterId: recruiter.recruiterProfile.id,
      },
      select: { id: true },
    });

    if (!hasApplication) {
      throw new AppError("Unauthorized.", 403);
    }

    const updated = await prisma.oralPresentation.update({
      where: { candidateId },
      data: {
        recruiterScore,
        status: OralPresentationStatus.REVIEWED,
      },
      include: { video: true },
    });

    // OralPresentation is candidate-level, but scoring is per-application
    // (Application caches a snapshot via Application.oralPresentationScore).
    // Sync it onto every application this candidate has, then recalculate
    // each final score through the single centralized scoring service.
    const applications = await prisma.application.findMany({
      where: { candidateId },
      select: { id: true },
    });

    await prisma.application.updateMany({
      where: { candidateId },
      data: { oralPresentationScore: recruiterScore },
    });

    await Promise.all(
      applications.map((app) =>
        candidateScoreService.createOrUpdateScore(app.id).catch(() => null)
      )
    );

    return updated;
  }

  /**
   * Candidate: Delete own presentation
   */
  async deletePresentation(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } },
    });

    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }

    const presentation = user.candidateProfile.oralPresentation;

    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.oralPresentation.delete({
        where: { candidateId: user.candidateProfile!.id },
      });

      if (presentation.videoId) {
        await tx.fileAsset.delete({ where: { id: presentation.videoId } });
      }
    });

    return { success: true, message: "Presentation deleted successfully." };
  }

  /**
   * Recruiter: List presentations belonging to candidates who applied
   * to this recruiter's jobs.
   */
  async getRecruiterPresentations(
    recruiterUserId: string,
    page = 1,
    limit = 10
  ) {
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
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id },
        },
      },
    };

    const [items, total] = await prisma.$transaction([
      prisma.oralPresentation.findMany({
        where,
        include: { video: true, candidate: { include: { user: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oralPresentation.count({ where }),
    ]);

    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Admin: List all presentations
   */
  async getAllPresentations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.oralPresentation.findMany({
        include: { video: true, candidate: { include: { user: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oralPresentation.count(),
    ]);

    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Recruiter dashboard statistics, scoped to candidates who applied
   * to this recruiter's jobs.
   */
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
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id },
        },
      },
    };

    const [total, pending, uploaded, reviewed] = await prisma.$transaction([
      prisma.oralPresentation.count({ where: baseWhere }),
      prisma.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.PENDING },
      }),
      prisma.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.UPLOADED },
      }),
      prisma.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.REVIEWED },
      }),
    ]);

    return { total, pending, uploaded, reviewed };
  }
}

export default new OralPresentationService();
