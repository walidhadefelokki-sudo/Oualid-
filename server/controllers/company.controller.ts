import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { validateAvatarUpload } from "../middleware/mediaUpload.middleware";
import {
  AVATAR_BUCKET,
  buildObjectPath,
  getPublicUrl,
  removeObject,
  uploadObject,
} from "../utils/supabaseStorage";
import { destroyCloudinaryAsset } from "../utils/cloudinary";

/**
 * The recruiter's own company profile.
 *
 * There were no company endpoints at all: the profile page rendered hardcoded
 * values ("TechDz Solutions", "techdz.com") and its Save button called the
 * candidate profile update, so a recruiter editing their company was writing
 * to a candidate record that did not exist for them.
 */

const companySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  website: true,
  industry: true,
  size: true,
  foundedYear: true,
  country: true,
  city: true,
  address: true,
  plan: true,
  verified: true,
  logo: { select: { id: true, url: true } },
} satisfies Prisma.CompanySelect;

/**
 * Resolves the caller's company and their role in it.
 *
 * A recruiter reaches their company through RecruiterProfile → CompanyMember,
 * and the membership carries the role, so editing rights are decided by the
 * relationship rather than by anything the client sends.
 */
const resolveMembership = async (userId: string) => {
  const membership = await prisma.companyMember.findFirst({
    where: { recruiter: { userId } },
    orderBy: { createdAt: "asc" },
    include: { company: { select: companySelect } },
  });

  if (!membership) {
    throw new AppError("No company is attached to this account.", 404);
  }

  return membership;
};

export const getMyCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await resolveMembership(req.user!.id);

    res.status(200).json({
      status: "success",
      data: { company: membership.company, memberRole: membership.role },
    });
  } catch (err) {
    next(err);
  }
};

export const updateMyCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const membership = await resolveMembership(req.user!.id);

    // Only an owner edits the company. On a multi-account plan the other
    // members are recruiters working under it, not administrators of it.
    if (membership.role !== "OWNER" && req.user!.role !== "ADMIN") {
      return next(new AppError("Only the company owner can edit this profile.", 403));
    }

    const body = req.body as Record<string, unknown>;
    const data: Prisma.CompanyUpdateInput = {};

    const text = (value: unknown) => {
      const v = typeof value === "string" ? value.trim() : "";
      return v.length ? v : null;
    };

    // Only fields actually sent are touched, so a partial save cannot blank
    // out everything the form did not include.
    if (body.name !== undefined) {
      const name = text(body.name);
      if (!name) return next(new AppError("The company name is required.", 400));
      data.name = name;
    }
    if (body.description !== undefined) data.description = text(body.description);
    if (body.industry !== undefined) data.industry = text(body.industry);
    if (body.size !== undefined) data.size = text(body.size);
    if (body.country !== undefined) data.country = text(body.country);
    if (body.city !== undefined) data.city = text(body.city);
    if (body.address !== undefined) data.address = text(body.address);

    if (body.website !== undefined) {
      const website = text(body.website);
      if (website && !/^https?:\/\/\S+\.\S+/.test(website)) {
        return next(new AppError("The website must be a full URL, starting with http:// or https://", 400));
      }
      data.website = website;
    }

    if (body.foundedYear !== undefined) {
      const year = Number(body.foundedYear);
      if (body.foundedYear === null || body.foundedYear === "") {
        data.foundedYear = null;
      } else if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear()) {
        return next(new AppError("Enter a valid founding year.", 400));
      } else {
        data.foundedYear = year;
      }
    }

    const company = await prisma.company.update({
      where: { id: membership.companyId },
      data,
      select: companySelect,
    });

    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};

/**
 * Uploads or replaces the company logo.
 *
 * Proxied through this server rather than uploaded directly: a logo is capped
 * at 4 MB, comfortably under the ~4.5 MB a Vercel function accepts as a request
 * body, and handling the bytes here means the file signature is checked before
 * anything is stored rather than after.
 */
export const updateMyCompanyLogo = async (req: Request, res: Response, next: NextFunction) => {
  let storedPath: string | null = null;

  try {
    const membership = await resolveMembership(req.user!.id);

    if (membership.role !== "OWNER" && req.user!.role !== "ADMIN") {
      return next(new AppError("Only the company owner can change the logo.", 403));
    }

    // Throws a 400 for the wrong format, an empty file, or bytes that do not
    // match the extension they claim.
    const image = validateAvatarUpload(req.file);

    const previousLogoId = membership.company.logo?.id ?? null;

    storedPath = await uploadObject({
      bucket: AVATAR_BUCKET,
      path: buildObjectPath(`company-${membership.companyId}`, image.extension),
      buffer: image.buffer,
      mimeType: image.mimeType,
    });

    let company;
    try {
      company = await prisma.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({
          data: {
            url: getPublicUrl(AVATAR_BUCKET, storedPath!),
            provider: "supabase",
            publicId: storedPath!,
            fileName: image.fileName,
            mimeType: image.mimeType,
            extension: image.extension,
            size: image.size,
          },
        });

        return tx.company.update({
          where: { id: membership.companyId },
          data: { logoId: asset.id },
          select: companySelect,
        });
      });
    } catch (dbErr) {
      // Written but unreferenced. Remove it rather than leave a stray file.
      await removeObject(AVATAR_BUCKET, storedPath);
      throw dbErr;
    }

    // Only now is the old logo safe to release.
    if (previousLogoId && previousLogoId !== company.logo?.id) {
      const previous = await prisma.fileAsset.findUnique({ where: { id: previousLogoId } });

      if (previous?.provider === "supabase" && previous.publicId) {
        await removeObject(AVATAR_BUCKET, previous.publicId);
      } else if (previous?.provider === "cloudinary") {
        await destroyCloudinaryAsset(previous.publicId, "image");
      }

      await prisma.fileAsset.delete({ where: { id: previousLogoId } }).catch(() => null);
    }

    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};
