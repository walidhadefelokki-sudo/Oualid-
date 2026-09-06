import { Request, Response, NextFunction } from "express";
import { FileAsset } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import {
  validateCvUpload,
  validateCvBuffer,
  resolveCvExtension,
} from "../middleware/cvUpload.middleware";
import {
  uploadCvObject,
  removeCvObject,
  createCvUploadTicket,
  downloadCvObject,
} from "../utils/supabaseStorage";
import { getCvAccessUrl, SUPABASE_URL_SCHEME } from "../services/cvFile.service";

/**
 * What the API returns about a stored CV.
 *
 * `url` is a signed link that expires in minutes, so it is generated per
 * request and never persisted. A client holding a page open past its lifetime
 * asks for the CV again rather than caching the link.
 */
const serializeResume = async (resume: FileAsset) => ({
  id: resume.id,
  url: await getCvAccessUrl(resume),
  fileName: resume.fileName,
  mimeType: resume.mimeType,
  extension: resume.extension,
  size: resume.size,
  uploadedAt: resume.createdAt,
});

/**
 * Releases the CV a candidate has just replaced — but only when nothing else
 * still points at it.
 *
 * Applications reference the exact FileAsset that was current when they were
 * submitted, and Application.cvId is ON DELETE SET NULL. Deleting the row
 * unconditionally (as this used to) therefore stripped the CV from every past
 * application that candidate had made, and left AI analysis dereferencing
 * null. A replaced-but-still-cited CV is kept; only a genuine orphan is
 * removed.
 */
const retireResume = async (resumeId: string): Promise<void> => {
  const citedByApplications = await prisma.application.count({
    where: { cvId: resumeId },
  });
  if (citedByApplications > 0) return;

  const asset = await prisma.fileAsset.findUnique({ where: { id: resumeId } });
  if (!asset) return;

  if (asset.provider === "supabase" && asset.publicId) {
    await removeCvObject(asset.publicId);
  }

  // Best effort: a row that will not delete is untidy, not broken.
  await prisma.fileAsset.delete({ where: { id: resumeId } }).catch(() => null);
};

/**
 * Attaches an already-stored object to the candidate's profile.
 *
 * The last step of both upload paths, so the multipart route and the
 * direct-to-storage route cannot drift apart in how they record a CV, clean up
 * after a failed write, or release the file being replaced.
 */
const finalizeCv = async (
  profileId: string,
  previousResumeId: string | null,
  storedPath: string,
  cv: { fileName: string; extension: string; mimeType: string; size: number }
): Promise<FileAsset> => {
  let resume: FileAsset;

  try {
    resume = await prisma.$transaction(async (tx) => {
      const asset = await tx.fileAsset.create({
        data: {
          // Not a fetchable address: the bucket is private, so readers mint a
          // signed URL from publicId. Stored in this deliberately non-HTTP
          // form so code that renders it blindly fails loudly.
          url: `${SUPABASE_URL_SCHEME}${storedPath}`,
          provider: "supabase",
          publicId: storedPath,
          fileName: cv.fileName,
          mimeType: cv.mimeType,
          extension: cv.extension,
          size: cv.size,
        },
      });

      await tx.candidateProfile.update({
        where: { id: profileId },
        data: { resumeId: asset.id },
      });

      return asset;
    });
  } catch (dbErr) {
    // The object is written but nothing references it. Remove it rather than
    // leave a stray copy of someone's CV in the bucket.
    await removeCvObject(storedPath);
    throw dbErr;
  }

  // Only now is the previous CV safe to release.
  if (previousResumeId && previousResumeId !== resume.id) {
    await retireResume(previousResumeId);
  }

  // Metadata only — never the file, never its contents.
  console.log(
    `CV stored candidate=${profileId} format=${cv.extension} bytes=${cv.size}`
  );

  return resume;
};

/** The candidate profile of the authenticated user, or a 404. */
const requireOwnCandidateProfile = async (req: Request) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { candidateProfile: true },
  });

  if (!user?.candidateProfile) {
    throw new AppError("Candidate profile not found.", 404);
  }

  return user.candidateProfile;
};

/**
 * Object names this server issues: a UUID under the candidate's own folder.
 *
 * The path comes back from the browser at confirm time, so it is untrusted
 * input. Matching it against the exact shape we hand out is what stops a
 * candidate confirming a path inside someone else's folder, or walking out of
 * the bucket with "..".
 */
const CV_OBJECT_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx)$/;

const assertOwnObjectPath = (path: unknown, profileId: string): string => {
  if (typeof path !== "string" || !path) {
    throw new AppError("Missing upload reference.", 400);
  }

  const segments = path.split("/");
  if (segments.length !== 2) {
    throw new AppError("Invalid upload reference.", 400);
  }

  const [folder, object] = segments;
  if (folder !== profileId || !CV_OBJECT_NAME.test(object)) {
    throw new AppError("Invalid upload reference.", 400);
  }

  return path;
};

/**
 * Confirms the caller may read this candidate's data. Admins always may; a
 * recruiter may only when the candidate has applied to one of their jobs.
 */
const assertCanViewCandidate = async (
  req: Request,
  candidateProfileId: string
): Promise<void> => {
  if (req.user!.role === "ADMIN") return;

  const recruiter = await prisma.recruiterProfile.findUnique({
    where: { userId: req.user!.id },
    select: { id: true },
  });

  if (!recruiter) {
    throw new AppError("Recruiter profile not found.", 403);
  }

  const hasApplied = await prisma.application.findFirst({
    where: { candidateId: candidateProfileId, job: { recruiterId: recruiter.id } },
    select: { id: true },
  });

  if (!hasApplied) {
    throw new AppError("You can only view candidates who applied to your jobs.", 403);
  }
};

/**
 * Candidate: Upload or replace the CV on their profile.
 *
 * This is the single CV used across job applications, AI analysis and quiz
 * generation. Order matters: the file is validated, then stored, and only a
 * confirmed store is recorded — so the profile can never point at an object
 * that was never written. If the database write fails afterwards, the
 * just-uploaded object is removed and the candidate keeps the CV they had.
 */
export const uploadCV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let storedPath: string | null = null;

  try {
    // Throws a 400 for the wrong format, an empty file, or bytes that do not
    // match the extension they claim.
    const cv = validateCvUpload(req.file);

    const profile = await requireOwnCandidateProfile(req);

    // Storage first. The folder is derived from the authenticated user's own
    // profile, so an upload cannot be aimed at another candidate.
    storedPath = await uploadCvObject({
      candidateProfileId: profile.id,
      buffer: cv.buffer,
      extension: cv.extension,
      mimeType: cv.mimeType,
    });

    const resume = await finalizeCv(profile.id, profile.resumeId, storedPath, cv);

    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(resume) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Update own profile (basic info on User + candidate-specific
 * fields on CandidateProfile). Called when the candidate saves changes
 * from their profile page.
 */
export const updateMyProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: true },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    const {
      firstName,
      lastName,
      phone,
      headline,
      bio,
      city,
      wilaya,
      country,
      currentJobTitle,
      yearsExperience,
      desiredSalary,
      availableImmediately,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
    } = req.body;

    // Fields that live on the User row
    const userData: Record<string, unknown> = {};
    if (firstName !== undefined) userData.firstName = firstName;
    if (lastName !== undefined) userData.lastName = lastName;

    // Fields that live on the CandidateProfile row
    const profileFieldData: Record<string, unknown> = {};
    if (phone !== undefined) profileFieldData.phone = phone;
    if (headline !== undefined) profileFieldData.headline = headline;
    if (bio !== undefined) profileFieldData.bio = bio;
    if (city !== undefined) profileFieldData.city = city;
    if (wilaya !== undefined) profileFieldData.wilaya = wilaya;
    if (country !== undefined) profileFieldData.country = country;
    if (currentJobTitle !== undefined) profileFieldData.currentJobTitle = currentJobTitle;
    if (yearsExperience !== undefined) profileFieldData.yearsExperience = yearsExperience;
    if (desiredSalary !== undefined) profileFieldData.desiredSalary = desiredSalary;
    if (availableImmediately !== undefined) profileFieldData.availableImmediately = availableImmediately;
    if (skills !== undefined) profileFieldData.skills = skills;
    if (linkedinUrl !== undefined) profileFieldData.linkedinUrl = linkedinUrl;
    if (githubUrl !== undefined) profileFieldData.githubUrl = githubUrl;
    if (portfolioUrl !== undefined) profileFieldData.portfolioUrl = portfolioUrl;

    const [updatedUser, updatedProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: userData,
      }),
      prisma.candidateProfile.update({
        where: { id: user.candidateProfile.id },
        data: profileFieldData,
        include: { resume: true },
      }),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        },
        candidateProfile: updatedProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Get own CV info.
 */
export const getMyCV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: { include: { resume: true } } },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    const resume = user.candidateProfile.resume;

    // Called again each time the candidate opens their CV, because the signed
    // link inside expires. This is the refresh, not only the initial load.
    res.status(200).json({
      status: "success",
      data: { resume: resume ? await serializeResume(resume) : null },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Get their saved CV Maker document.
 *
 * Returns `null` (not 404) when nothing has been saved yet, so the frontend
 * can simply fall back to its default/empty CV without special-casing errors.
 */
export const getMyCvBuilder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user!.id },
      select: { cvBuilderData: true, updatedAt: true },
    });

    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        cvBuilderData: profile.cvBuilderData ?? null,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: Save (create or replace) their CV Maker document.
 *
 * The whole document is replaced on every save — the CV Maker edits it as a
 * single unit, so there is no partial-update semantics to preserve.
 */
export const saveMyCvBuilder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { cvBuilderData } = req.body;

    if (cvBuilderData === undefined || cvBuilderData === null) {
      return next(new AppError("cvBuilderData is required.", 400));
    }

    // Guard against a client sending a primitive/array: the CV Maker always
    // stores an object, and a wrong shape here would break loading later.
    if (typeof cvBuilderData !== "object" || Array.isArray(cvBuilderData)) {
      return next(new AppError("cvBuilderData must be an object.", 400));
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }

    const updated = await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { cvBuilderData },
      select: { cvBuilderData: true, updatedAt: true },
    });

    res.status(200).json({
      status: "success",
      data: { cvBuilderData: updated.cvBuilderData, updatedAt: updated.updatedAt },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Recruiter/Admin: the CV document for one candidate, in the same normalised
 * shape the candidate's own CV Maker uses — so both render through one
 * component and one design.
 *
 * Access is enforced here, not in the UI. A recruiter may only read a
 * candidate who has applied to one of *their* jobs; admins may read anyone.
 * Without this check any authenticated recruiter could enumerate every
 * candidate profile on the platform by id.
 */
export const getCandidateCvDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { candidateId } = req.params;

    const profile = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
      },
    });

    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }

    await assertCanViewCandidate(req, profile.id);

    // The CV Maker document is the richest source. Where the candidate has
    // not built one, fall back to the structured profile fields so the
    // recruiter still sees something real rather than an empty template.
    const built = (profile.cvBuilderData as Record<string, any> | null) ?? null;
    const fullName =
      [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ").trim();

    const document = {
      name: built?.name || fullName || profile.user.email,
      title: built?.title || profile.currentJobTitle || profile.headline || "",
      email: built?.email || profile.user.email || "",
      phone: built?.phone || profile.phone || "",
      address:
        built?.address ||
        [profile.city, profile.wilaya, profile.country].filter(Boolean).join(", "),
      summary: built?.summary || profile.bio || "",
      experiences: Array.isArray(built?.experiences) ? built.experiences : [],
      education: Array.isArray(built?.education) ? built.education : [],
      skills: Array.isArray(built?.skills) ? built.skills : profile.skills ?? [],
      languages: Array.isArray(built?.languages) ? built.languages : [],
    };

    res.status(200).json({
      status: "success",
      data: {
        document,
        photoUrl: profile.user.avatar?.url ?? null,
        // Lets the UI say "this candidate has not built a CV yet" instead of
        // silently showing a sparse document.
        hasBuiltCv: Boolean(built),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Recruiter/Admin: a short-lived link to one candidate's uploaded CV file.
 *
 * Distinct from /cv-document, which renders the in-app CV Maker record; this
 * serves the document the candidate actually uploaded. Authorisation is the
 * same and is checked here, on the server, so the link is minted only once the
 * caller has been shown to be entitled to it and grants nothing on its own
 * beyond a few minutes.
 */
export const getCandidateCvFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { candidateId } = req.params;

    const profile = await prisma.candidateProfile.findUnique({
      where: { id: candidateId },
      include: { resume: true },
    });

    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }

    await assertCanViewCandidate(req, profile.id);

    if (!profile.resume) {
      return next(new AppError("This candidate has not uploaded a CV.", 404));
    }

    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(profile.resume) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: start a direct-to-storage upload.
 *
 * Returns a one-time URL the browser PUTs the file to. Nothing is recorded
 * yet — an issued ticket that is never confirmed leaves the profile untouched,
 * so an abandoned upload cannot displace the CV the candidate already has.
 */
export const createCvUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName } = req.body as { fileName?: string };

    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Please choose a CV file to upload.", 400));
    }

    // Rejects a name that is not a CV before a place to upload to exists.
    const extension = resolveCvExtension(fileName);

    const profile = await requireOwnCandidateProfile(req);

    const ticket = await createCvUploadTicket({
      candidateProfileId: profile.id,
      extension,
    });

    res.status(200).json({
      status: "success",
      data: { path: ticket.path, signedUrl: ticket.signedUrl, token: ticket.token },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Candidate: confirm a direct upload and attach it to the profile.
 *
 * The bytes arrived without passing through this server, so they are read back
 * and checked here — size and file signature — exactly as a multipart upload
 * would have been. A file that fails is deleted rather than left in the bucket,
 * and the candidate keeps the CV they already had.
 */
export const confirmCvUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { path, fileName } = req.body as { path?: string; fileName?: string };

    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Missing file name.", 400));
    }

    const profile = await requireOwnCandidateProfile(req);

    // Untrusted input: only a path this server issued, in this candidate's own
    // folder, is accepted.
    const storedPath = assertOwnObjectPath(path, profile.id);

    let cv;
    try {
      const buffer = await downloadCvObject(storedPath);
      cv = validateCvBuffer(buffer, fileName);
    } catch (validationErr) {
      // Whatever was uploaded is not a usable CV. Do not keep it.
      await removeCvObject(storedPath);
      throw validationErr;
    }

    const resume = await finalizeCv(profile.id, profile.resumeId, storedPath, cv);

    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(resume) },
    });
  } catch (err) {
    next(err);
  }
};
