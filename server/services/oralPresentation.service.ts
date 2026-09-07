import { OralPresentationStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import candidateScoreService from "./candidateScore.service";
import { destroyCloudinaryAsset } from "../utils/cloudinary";
import {
  PRESENTATION_BUCKET,
  VIDEO_URL_TTL_SECONDS,
  createSignedUrl,
  createSignedUrls,
  removeObject,
} from "../utils/supabaseStorage";

interface StoredVideo {
  path: string;
  fileName: string;
  mimeType: string;
  extension: string;
  size: number;
}

/**
 * Candidate fields a recruiter is allowed to see.
 *
 * Selected explicitly rather than `user: true`, which returned the whole User
 * row — the bcrypt password hash included — to every recruiter who opened a
 * presentation.
 */
const SAFE_CANDIDATE_USER = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    avatar: { select: { url: true } },
  },
} as const;

type VideoAsset = {
  provider: string;
  publicId: string | null;
  url: string;
} | null;

/**
 * A URL the browser can actually play.
 *
 * Presentations live in a private bucket, so there is no durable link — one is
 * signed per request. Videos uploaded before the move to private storage are
 * still Cloudinary-hosted behind a permanent public URL, and must keep working:
 * candidates are not going to re-record.
 */
const playableUrl = async (video: VideoAsset): Promise<string | null> => {
  if (!video) return null;
  if (video.provider !== "supabase") return video.url;
  if (!video.publicId) return null;
  return createSignedUrl(PRESENTATION_BUCKET, video.publicId, VIDEO_URL_TTL_SECONDS);
};

const withPlayableVideo = async <T extends { video?: VideoAsset } | null>(
  presentation: T
): Promise<T> => {
  if (!presentation?.video) return presentation;
  const url = await playableUrl(presentation.video);
  return { ...presentation, video: { ...presentation.video, url } } as T;
};

/**
 * Signs a whole page of results in one call — row-by-row signing would mean a
 * network round trip per candidate.
 */
const withPlayableVideos = async <T extends { video?: VideoAsset }>(
  items: T[]
): Promise<T[]> => {
  const paths = items
    .filter((i) => i.video?.provider === "supabase" && i.video.publicId)
    .map((i) => i.video!.publicId!);

  const signed = await createSignedUrls(
    PRESENTATION_BUCKET,
    paths,
    VIDEO_URL_TTL_SECONDS
  );

  return items.map((item) => {
    if (!item.video) return item;
    const url =
      item.video.provider === "supabase"
        ? signed.get(item.video.publicId ?? "") ?? null
        : item.video.url;
    return { ...item, video: { ...item.video, url } };
  });
};

class OralPresentationService {
  /**
   * Candidate: Upload or replace their profile presentation video.
   * One presentation per candidate profile (not per application).
   *
   * `meta` describes a video that the browser has already uploaded
   * directly to Cloudinary (see getUploadSignature) — we only ever
   * receive the resulting metadata here, never the file itself.
   */
  /**
   * Attaches an already-stored, already-validated video to the candidate's
   * presentation.
   *
   * Called only from the confirm endpoint, which checks that the object exists,
   * sits in this candidate's own folder, is within the size limit and really is
   * the video format it claims. The previous version took a URL straight from
   * the browser and saved it, so a candidate could point their "presentation"
   * at any video on the internet.
   */
  async savePresentation(userId: string, video: StoredVideo) {
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
        // Not a fetchable address: the bucket is private, so readers sign a
        // URL from publicId. Stored in this deliberately non-HTTP form so code
        // that renders it blindly fails loudly.
        url: `supabase://${PRESENTATION_BUCKET}/${video.path}`,
        provider: "supabase",
        publicId: video.path,
        fileName: video.fileName,
        mimeType: video.mimeType,
        extension: video.extension,
        size: video.size,
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
        const previous = await prisma.fileAsset.findUnique({
          where: { id: existing.videoId },
        });

        // The video itself, not just its row — an orphan costs storage, and a
        // legacy Cloudinary one stays publicly reachable by URL forever.
        if (previous?.provider === "supabase" && previous.publicId) {
          await removeObject(PRESENTATION_BUCKET, previous.publicId);
        } else if (previous?.provider === "cloudinary") {
          await destroyCloudinaryAsset(previous.publicId, "video");
        }

        await prisma.fileAsset
          .delete({ where: { id: existing.videoId } })
          .catch(() => null);
      }

      return withPlayableVideo(presentation);
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

    return withPlayableVideo(presentation);
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

    return withPlayableVideo(presentation);
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
        candidate: { include: { user: SAFE_CANDIDATE_USER } },
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

    return withPlayableVideo(presentation);
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

    const video = presentation.videoId
      ? await prisma.fileAsset.findUnique({ where: { id: presentation.videoId } })
      : null;

    await prisma.$transaction(async (tx) => {
      await tx.oralPresentation.delete({
        where: { candidateId: user.candidateProfile!.id },
      });

      if (presentation.videoId) {
        await tx.fileAsset.delete({ where: { id: presentation.videoId } });
      }
    });

    // After the transaction commits: a delete the candidate asked for should
    // remove the file too, but a storage hiccup must not roll back a database
    // change the user has already been told about.
    if (video?.provider === "supabase" && video.publicId) {
      await removeObject(PRESENTATION_BUCKET, video.publicId);
    } else if (video?.provider === "cloudinary") {
      await destroyCloudinaryAsset(video.publicId, "video");
    }

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
        include: { video: true, candidate: { include: { user: SAFE_CANDIDATE_USER } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oralPresentation.count({ where }),
    ]);

    return {
      items: await withPlayableVideos(items),
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
        include: { video: true, candidate: { include: { user: SAFE_CANDIDATE_USER } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.oralPresentation.count(),
    ]);

    return {
      items: await withPlayableVideos(items),
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
