import { Request, Response, NextFunction } from "express";
import { PackageTier } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import publication, { ServiceValidationError } from "../services/servicePublication.service";
import { PlanLimitError } from "../services/plans.service";
import { InsufficientCreditsError } from "../services/credits.service";
import { validateServiceMedia } from "../middleware/mediaUpload.middleware";
import {
  SERVICE_MEDIA_BUCKET,
  SERVICE_MEDIA_MAX_COUNT,
  buildObjectPath,
  getPublicUrl,
  removeObject,
  uploadObject,
} from "../utils/supabaseStorage";

/**
 * The freelancer's own services.
 *
 * Every handler resolves the caller's FreelancerProfile and scopes the query
 * to it. Looking a service up by id alone and then comparing owners is the
 * same check written less safely — one forgotten comparison and any
 * freelancer can edit anyone's listing.
 */

const TIERS: PackageTier[] = ["BASIC", "STANDARD", "PREMIUM"];

/** The caller's freelancer id, or a 404 they can act on. */
const requireProfile = async (userId: string) => {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile.id;
};

/** Maps the service layer's errors onto status codes. */
const asHttpError = (err: unknown) => {
  if (err instanceof ServiceValidationError) return new AppError(err.message, 400);
  if (err instanceof PlanLimitError) return new AppError(err.message, 403);
  if (err instanceof InsufficientCreditsError) {
    return new AppError(
      `Crédits insuffisants : ${err.required} requis, ${err.available} disponibles.`,
      402
    );
  }
  return err;
};

/** A draft, created empty so the editor has something to save into. */
export const createDraft = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);
    const title = String((req.body as { title?: string }).title ?? "").trim();

    const service = await prisma.serviceListing.create({
      data: {
        freelancerId,
        title: title || "Nouveau service",
        slug: publication.slugify(title || "service"),
        description: "",
        status: "DRAFT",
      },
      select: { id: true },
    });

    res.status(201).json({ success: true, data: { id: service.id } });
  } catch (err) {
    next(err);
  }
};

/** One of the caller's services, with everything the editor needs. */
export const getMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);

    const service = await prisma.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        rejectionReason: true,
        views: true,
        publishedAt: true,
        expiresAt: true,
        categoryId: true,
        packages: {
          orderBy: { price: "asc" },
          select: {
            id: true,
            tier: true,
            name: true,
            description: true,
            price: true,
            deliveryDays: true,
            revisions: true,
            features: true,
          },
        },
        addons: { select: { id: true, name: true, price: true, extraDays: true } },
        faqs: { orderBy: { position: "asc" }, select: { id: true, question: true, answer: true } },
        requirements: {
          orderBy: { position: "asc" },
          select: { id: true, prompt: true, required: true },
        },
        skills: { select: { skill: { select: { name: true } } } },
        // The gallery, so the editor can show what is already there rather
        // than only what is being added now.
        media: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            file: { select: { id: true, url: true, fileName: true, size: true } },
          },
        },
      },
    });

    if (!service) return next(new AppError("Service introuvable.", 404));

    res.json({
      success: true,
      data: { service: { ...service, skills: service.skills.map((s) => s.skill.name) } },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Saves the editor's state.
 *
 * Packages, FAQs and requirements are replaced wholesale rather than
 * diffed: the editor sends the whole set each time, and reconciling
 * additions, edits and removals by id would be more code for the same
 * result.
 *
 * A published service can still be edited — its text and prices are the
 * freelancer's — but editing does not re-open moderation, and the status is
 * never taken from the request.
 */
export const updateMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);

    const existing = await prisma.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: { id: true, status: true },
    });
    if (!existing) return next(new AppError("Service introuvable.", 404));

    if (existing.status === "PENDING") {
      return next(
        new AppError("Ce service est en cours de validation et ne peut pas être modifié.", 409)
      );
    }

    const { title, description, categoryId, packages, faqs, requirements, skills } =
      req.body as Record<string, any>;

    await prisma.$transaction(async (tx) => {
      await tx.serviceListing.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title: String(title).trim() || "Nouveau service" } : {}),
          ...(description !== undefined ? { description: String(description) } : {}),
          ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        },
      });

      if (Array.isArray(packages)) {
        await tx.servicePackage.deleteMany({ where: { serviceId: existing.id } });
        for (const p of packages) {
          const tier = TIERS.includes(p.tier) ? (p.tier as PackageTier) : "BASIC";
          // A tier with no price is a tier the freelancer left empty.
          if (p.price === "" || p.price == null) continue;
          await tx.servicePackage.create({
            data: {
              serviceId: existing.id,
              tier,
              name: String(p.name ?? tier).trim() || tier,
              description: p.description ? String(p.description) : null,
              price: String(Number(p.price) || 0),
              deliveryDays: Math.max(1, Number(p.deliveryDays) || 1),
              revisions: Math.max(0, Number(p.revisions) || 0),
              features: Array.isArray(p.features)
                ? p.features.map(String).filter(Boolean).slice(0, 12)
                : [],
            },
          });
        }
      }

      if (Array.isArray(faqs)) {
        await tx.serviceFaq.deleteMany({ where: { serviceId: existing.id } });
        for (const [i, f] of faqs.slice(0, 15).entries()) {
          if (!f?.question?.trim() || !f?.answer?.trim()) continue;
          await tx.serviceFaq.create({
            data: {
              serviceId: existing.id,
              question: String(f.question).trim(),
              answer: String(f.answer).trim(),
              position: i,
            },
          });
        }
      }

      if (Array.isArray(requirements)) {
        await tx.serviceRequirement.deleteMany({ where: { serviceId: existing.id } });
        for (const [i, r] of requirements.slice(0, 15).entries()) {
          if (!r?.prompt?.trim()) continue;
          await tx.serviceRequirement.create({
            data: {
              serviceId: existing.id,
              prompt: String(r.prompt).trim(),
              required: r.required !== false,
              position: i,
            },
          });
        }
      }

      if (Array.isArray(skills)) {
        await tx.serviceSkill.deleteMany({ where: { serviceId: existing.id } });
        for (const raw of skills.slice(0, 15)) {
          const name = String(raw).trim();
          if (!name) continue;
          const skill = await tx.skill.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          });
          await tx.serviceSkill.create({
            data: { serviceId: existing.id, skillId: skill.id },
          });
        }
      }
    });

    res.json({ success: true, data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
};

/** Submits for moderation, which is where the credits are taken. */
export const submitMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);
    const result = await publication.submitForReview(freelancerId, req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};

/**
 * Pause and resume.
 *
 * Pausing frees the plan slot, which is the point: the free tier allows one
 * live service, and swapping which one is live should not cost another
 * publication.
 */
export const pauseMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);
    const done = await prisma.serviceListing.updateMany({
      where: { id: req.params.id, freelancerId, status: "PUBLISHED" },
      data: { status: "PAUSED" },
    });
    if (done.count === 0) return next(new AppError("Ce service n'est pas en ligne.", 409));
    res.json({ success: true, data: { status: "PAUSED" } });
  } catch (err) {
    next(err);
  }
};

export const resumeMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);

    const service = await prisma.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId, status: "PAUSED" },
      select: { id: true, expiresAt: true },
    });
    if (!service) return next(new AppError("Ce service n'est pas en pause.", 409));

    // Resuming re-occupies a slot, so the plan has to allow it.
    const { assertCanPublishService } = await import("../services/plans.service");
    try {
      await assertCanPublishService(freelancerId);
    } catch (err) {
      return next(asHttpError(err));
    }

    // An expired window is not reopened by resuming: that would be a free
    // publication. It goes back to the author to submit again.
    const expired = service.expiresAt && service.expiresAt <= new Date();

    await prisma.serviceListing.update({
      where: { id: service.id },
      data: { status: expired ? "EXPIRED" : "PUBLISHED" },
    });

    res.json({ success: true, data: { status: expired ? "EXPIRED" : "PUBLISHED" } });
  } catch (err) {
    next(err);
  }
};

/** Deletes a service that never went anywhere. */
export const deleteMyService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancerId = await requireProfile(req.user!.id);

    const service = await prisma.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: { id: true, status: true, _count: { select: { orders: true } } },
    });
    if (!service) return next(new AppError("Service introuvable.", 404));

    // An order points at the service it was bought from. Removing it would
    // leave buyers with a contract referring to nothing.
    if (service._count.orders > 0) {
      return next(
        new AppError(
          "Ce service a des commandes et ne peut pas être supprimé. Mettez-le en pause.",
          409
        )
      );
    }
    if (service.status === "PENDING") {
      return next(new AppError("Ce service est en cours de validation.", 409));
    }

    await prisma.serviceListing.delete({ where: { id: service.id } });
    res.json({ success: true, data: { id: service.id } });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   media                                    */
/* -------------------------------------------------------------------------- */

/** The service, if this freelancer owns it. Scoped, never compared after. */
const ownedService = async (serviceId: string, userId: string) => {
  const freelancerId = await requireProfile(userId);

  const service = await prisma.serviceListing.findFirst({
    where: { id: serviceId, freelancerId },
    select: { id: true, _count: { select: { media: true } } },
  });

  // 404 rather than 403: a service nobody told you about should not be
  // distinguishable from one that does not exist.
  if (!service) throw new AppError("Service introuvable.", 404);

  return service;
};

/** What the editor needs back after any change to the gallery. */
const galleryOf = (serviceId: string) =>
  prisma.serviceMedia.findMany({
    where: { serviceId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      file: { select: { id: true, url: true, fileName: true, size: true } },
    },
  });

/**
 * Adds pictures to a service.
 *
 * A marketplace selling design, photography and craft work showed every
 * service as a coloured initial, because nothing could put an image on one.
 * The reading side was already there — every card does
 * `coverUrl: media[0]?.file.url` — so the first picture becomes the cover
 * everywhere at once.
 *
 * Published services included: a freelancer who photographs their work after
 * it goes live should not have to unpublish to show it.
 */
export const addServiceMedia = async (req: Request, res: Response, next: NextFunction) => {
  const stored: string[] = [];

  try {
    const service = await ownedService(req.params.id, req.user!.id);
    const images = validateServiceMedia(req.files as Express.Multer.File[] | undefined);

    const room = SERVICE_MEDIA_MAX_COUNT - service._count.media;
    if (images.length > room) {
      return next(
        new AppError(
          room <= 0
            ? `Ce service a déjà ${SERVICE_MEDIA_MAX_COUNT} images. Supprimez-en une d'abord.`
            : `Il ne reste de la place que pour ${room} image(s).`,
          400
        )
      );
    }

    /* Storage first, every file, before a single row is written: a gallery
     * must never point at an object that was never stored. */
    for (const image of images) {
      stored.push(
        await uploadObject({
          bucket: SERVICE_MEDIA_BUCKET,
          path: buildObjectPath(service.id, image.extension),
          buffer: image.buffer,
          mimeType: image.mimeType,
        })
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Appended after what is already there, so an upload never reshuffles
        // a cover the freelancer chose.
        const last = await tx.serviceMedia.findFirst({
          where: { serviceId: service.id },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        let position = (last?.position ?? -1) + 1;

        for (let i = 0; i < images.length; i += 1) {
          const image = images[i];
          const asset = await tx.fileAsset.create({
            data: {
              url: getPublicUrl(SERVICE_MEDIA_BUCKET, stored[i]),
              provider: "supabase",
              publicId: stored[i],
              fileName: image.fileName,
              mimeType: image.mimeType,
              extension: image.extension,
              size: image.size,
            },
          });

          await tx.serviceMedia.create({
            data: { serviceId: service.id, fileId: asset.id, position },
          });

          position += 1;
        }
      });
    } catch (dbErr) {
      // Written but unreferenced. Remove them rather than leave stray files
      // nothing will ever point at or clean up.
      await Promise.all(stored.map((path) => removeObject(SERVICE_MEDIA_BUCKET, path)));
      throw dbErr;
    }

    res.status(201).json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};

/**
 * Removes one picture.
 *
 * The remaining ones are renumbered from zero, so positions stay a sequence
 * rather than developing holes that make "first is the cover" depend on which
 * gaps happen to exist.
 */
export const removeServiceMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await ownedService(req.params.id, req.user!.id);

    const media = await prisma.serviceMedia.findFirst({
      where: { id: req.params.mediaId, serviceId: service.id },
      select: { id: true, file: { select: { id: true, publicId: true } } },
    });

    if (!media) return next(new AppError("Image introuvable.", 404));

    await prisma.$transaction(async (tx) => {
      await tx.serviceMedia.delete({ where: { id: media.id } });
      // The FileAsset goes too; nothing else references a service picture.
      await tx.fileAsset.delete({ where: { id: media.file.id } }).catch(() => undefined);

      const rest = await tx.serviceMedia.findMany({
        where: { serviceId: service.id },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      for (let i = 0; i < rest.length; i += 1) {
        await tx.serviceMedia.update({ where: { id: rest[i].id }, data: { position: i } });
      }
    });

    /* After the row is gone, not before. A failed delete that had already
     * removed the object would leave a gallery pointing at nothing. */
    if (media.file.publicId) {
      await removeObject(SERVICE_MEDIA_BUCKET, media.file.publicId);
    }

    res.json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};

/**
 * Reorders the gallery.
 *
 * Which picture is first is the one presentation decision a freelancer gets
 * on a card, so it is worth an endpoint rather than "delete and re-upload in
 * the right order".
 *
 * The whole order is sent, not a move: a list of ids is unambiguous, where
 * "move index 2 to 0" has to be applied against the exact state the client
 * last saw.
 */
export const reorderServiceMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await ownedService(req.params.id, req.user!.id);
    const { order } = req.body as { order?: unknown };

    if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
      return next(new AppError("Envoyez « order » : la liste des identifiants.", 400));
    }

    const current = await prisma.serviceMedia.findMany({
      where: { serviceId: service.id },
      select: { id: true },
    });

    const known = new Set(current.map((m) => m.id));
    const asked = [...new Set(order as string[])];

    /* Every picture, exactly once. A partial list would leave the rest at
     * positions that no longer mean anything, and an id from another service
     * would be a way to learn whether it exists. */
    if (asked.length !== known.size || asked.some((id) => !known.has(id))) {
      return next(
        new AppError("La liste doit contenir toutes les images de ce service, une fois chacune.", 400)
      );
    }

    await prisma.$transaction(
      asked.map((id, position) =>
        prisma.serviceMedia.update({ where: { id }, data: { position } })
      )
    );

    res.json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};
