import { PortfolioSectionType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import plans from "./plans.service";

/**
 * The mini-portfolio: a one-page site at /@username, built from the profile
 * the freelancer already filled in.
 *
 * Two rules shape everything here. The page is assembled from what the
 * platform already knows — published services, real reviews, earned badges —
 * rather than retyped, so it cannot disagree with the rest of the site. And
 * the parts a freelancer writes are theirs; the parts the platform computes
 * are not editable, because a portfolio where anyone can type their own
 * rating is an advert, not a reference.
 */

export class PortfolioError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "PortfolioError";
  }
}

/** The templates on offer. The free plan gets the first one only. */
export const TEMPLATES = ["default", "minimal", "editorial", "bold"] as const;
export type Template = (typeof TEMPLATES)[number];

/** The order sections appear in when a portfolio has never been arranged. */
const DEFAULT_SECTIONS: PortfolioSectionType[] = [
  "HEADER",
  "ABOUT",
  "SKILLS",
  "FEATURED_PROJECTS",
  "SERVICES",
  "EXPERIENCE",
  "EDUCATION",
  "CERTIFICATES",
  "REVIEWS",
  "CONTACT",
];

/** At most three, as the specification sets out. */
const MAX_FEATURED = 3;

/** The freelancer's portfolio, created on first use. */
export const getOrCreate = async (freelancerId: string) => {
  const existing = await prisma.portfolio.findUnique({ where: { freelancerId } });
  if (existing) return existing;

  try {
    return await prisma.portfolio.create({ data: { freelancerId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const p = await prisma.portfolio.findUnique({ where: { freelancerId } });
      if (p) return p;
    }
    throw err;
  }
};

/**
 * The sections, in order, filling in any the portfolio has never seen.
 *
 * Returned rather than written: a section a freelancer has not touched has
 * no row, and creating ten rows the first time anyone opens the editor would
 * make "never arranged" indistinguishable from "arranged exactly this way".
 */
export const sectionsFor = async (portfolioId: string) => {
  const saved = await prisma.portfolioSection.findMany({
    where: { portfolioId },
    orderBy: { position: "asc" },
  });

  const byType = new Map(saved.map((s) => [s.type, s]));

  return DEFAULT_SECTIONS.map((type, i) => {
    const row = byType.get(type);
    return {
      type,
      visible: row?.visible ?? true,
      position: row?.position ?? i,
      content: row?.content ?? null,
    };
  }).sort((a, b) => a.position - b.position);
};

/** Saves the theme and which sections show, within what the plan allows. */
export const updateSettings = async (
  freelancerId: string,
  input: {
    template?: string;
    accentColor?: string;
    fontFamily?: string;
    defaultLanguage?: "FR" | "AR" | "EN";
    seoTitle?: string | null;
    seoDescription?: string | null;
    published?: boolean;
  }
) => {
  const portfolio = await getOrCreate(freelancerId);
  const entitlements = await plans.getEntitlements(freelancerId);

  if (input.template !== undefined) {
    if (!TEMPLATES.includes(input.template as Template)) {
      throw new PortfolioError("Modèle inconnu.");
    }
    /* The free plan has one template. Refused here rather than hidden in the
     * editor, because the editor is a courtesy and this is the rule. */
    if (input.template !== "default" && entitlements.tier === "FREE") {
      throw new PortfolioError(
        "Les autres modèles sont réservés aux formules Pro et Premium.",
        403
      );
    }
  }

  if (input.accentColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(input.accentColor)) {
    throw new PortfolioError("Couleur invalide.");
  }

  return prisma.portfolio.update({
    where: { id: portfolio.id },
    data: {
      ...(input.template !== undefined ? { template: input.template } : {}),
      ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
      ...(input.fontFamily !== undefined ? { fontFamily: input.fontFamily } : {}),
      ...(input.defaultLanguage !== undefined ? { defaultLanguage: input.defaultLanguage } : {}),
      ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle?.trim() || null } : {}),
      ...(input.seoDescription !== undefined
        ? { seoDescription: input.seoDescription?.trim() || null }
        : {}),
      ...(input.published !== undefined
        ? { published: input.published, publishedAt: input.published ? new Date() : null }
        : {}),
    },
  });
};

/** Replaces the arrangement wholesale: the editor sends the whole list. */
export const saveSections = async (
  freelancerId: string,
  sections: Array<{ type: string; visible?: boolean; content?: unknown }>
) => {
  const portfolio = await getOrCreate(freelancerId);

  const known = sections.filter((s) =>
    DEFAULT_SECTIONS.includes(s.type as PortfolioSectionType)
  );

  await prisma.$transaction(
    known.map((s, i) =>
      prisma.portfolioSection.upsert({
        where: {
          portfolioId_type: {
            portfolioId: portfolio.id,
            type: s.type as PortfolioSectionType,
          },
        },
        update: {
          visible: s.visible !== false,
          position: i,
          content: (s.content ?? undefined) as Prisma.InputJsonValue | undefined,
        },
        create: {
          portfolioId: portfolio.id,
          type: s.type as PortfolioSectionType,
          visible: s.visible !== false,
          position: i,
          content: (s.content ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })
    )
  );

  return sectionsFor(portfolio.id);
};

/* ------------------------------------------------------------- projects */

export interface ProjectInput {
  title: string;
  description?: string | null;
  categoryId?: string | null;
  role?: string | null;
  tools?: string[];
  clientName?: string | null;
  externalUrl?: string | null;
  videoUrl?: string | null;
  completedAt?: string | null;
  featured?: boolean;
}

/** Only the two hosts the specification names. */
const isAllowedVideo = (url: string) =>
  /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//.test(url);

const assertVideoAllowed = async (freelancerId: string, videoUrl?: string | null) => {
  if (!videoUrl) return;
  if (!isAllowedVideo(videoUrl)) {
    throw new PortfolioError("Seuls les liens YouTube et Vimeo sont acceptés.");
  }
  const entitlements = await plans.getEntitlements(freelancerId);
  if (entitlements.tier === "FREE") {
    throw new PortfolioError(
      "Les vidéos dans les réalisations sont réservées aux formules Pro et Premium.",
      403
    );
  }
};

export const addProject = async (freelancerId: string, input: ProjectInput) => {
  if (!input.title?.trim()) throw new PortfolioError("Le titre est obligatoire.");

  const portfolio = await getOrCreate(freelancerId);
  const entitlements = await plans.getEntitlements(freelancerId);

  const count = await prisma.portfolioProject.count({ where: { portfolioId: portfolio.id } });

  if (entitlements.maxPortfolioProjects !== null && count >= entitlements.maxPortfolioProjects) {
    throw new PortfolioError(
      `La formule ${entitlements.planName} permet ${entitlements.maxPortfolioProjects} réalisations. ` +
        `Supprimez-en une ou changez de formule.`,
      403
    );
  }

  await assertVideoAllowed(freelancerId, input.videoUrl);

  if (input.featured) await assertFeaturedRoom(portfolio.id);

  return prisma.portfolioProject.create({
    data: {
      portfolioId: portfolio.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      categoryId: input.categoryId || null,
      role: input.role?.trim() || null,
      tools: Array.isArray(input.tools) ? input.tools.map(String).slice(0, 12) : [],
      clientName: input.clientName?.trim() || null,
      externalUrl: input.externalUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      featured: Boolean(input.featured),
      position: count,
    },
  });
};

const assertFeaturedRoom = async (portfolioId: string, excludeId?: string) => {
  const featured = await prisma.portfolioProject.count({
    where: { portfolioId, featured: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (featured >= MAX_FEATURED) {
    throw new PortfolioError(
      `Trois réalisations peuvent être mises à la une. Retirez-en une d'abord.`
    );
  }
};

export const updateProject = async (
  freelancerId: string,
  projectId: string,
  input: Partial<ProjectInput>
) => {
  const portfolio = await getOrCreate(freelancerId);

  const existing = await prisma.portfolioProject.findFirst({
    where: { id: projectId, portfolioId: portfolio.id },
    select: { id: true, featured: true },
  });
  if (!existing) throw new PortfolioError("Réalisation introuvable.", 404);

  if (input.videoUrl !== undefined) await assertVideoAllowed(freelancerId, input.videoUrl);
  if (input.featured && !existing.featured) await assertFeaturedRoom(portfolio.id, projectId);

  return prisma.portfolioProject.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId || null } : {}),
      ...(input.role !== undefined ? { role: input.role?.trim() || null } : {}),
      ...(input.tools !== undefined
        ? { tools: (input.tools ?? []).map(String).slice(0, 12) }
        : {}),
      ...(input.clientName !== undefined
        ? { clientName: input.clientName?.trim() || null }
        : {}),
      ...(input.externalUrl !== undefined
        ? { externalUrl: input.externalUrl?.trim() || null }
        : {}),
      ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl?.trim() || null } : {}),
      ...(input.completedAt !== undefined
        ? { completedAt: input.completedAt ? new Date(input.completedAt) : null }
        : {}),
      ...(input.featured !== undefined ? { featured: Boolean(input.featured) } : {}),
    },
  });
};

export const removeProject = async (freelancerId: string, projectId: string) => {
  const portfolio = await getOrCreate(freelancerId);
  const done = await prisma.portfolioProject.deleteMany({
    where: { id: projectId, portfolioId: portfolio.id },
  });
  if (done.count === 0) throw new PortfolioError("Réalisation introuvable.", 404);
  return { id: projectId };
};

/* --------------------------------------------------------------- public */

/**
 * The published page.
 *
 * Returns null for a portfolio that has not been published, so an
 * unfinished page is not reachable by guessing a handle.
 */
export const publicPage = async (username: string) => {
  const freelancer = await prisma.freelancerProfile.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
      username: true,
      displayName: true,
      title: true,
      bio: true,
      wilaya: true,
      hourlyRate: true,
      availability: true,
      level: true,
      identityVerified: true,
      ratingAverage: true,
      ratingCount: true,
      completedOrders: true,
      languages: true,
      createdAt: true,
      skills: { select: { skill: { select: { name: true } } } },
      user: { select: { avatar: { select: { url: true } } } },
      portfolio: {
        select: {
          id: true,
          published: true,
          template: true,
          accentColor: true,
          fontFamily: true,
          defaultLanguage: true,
          seoTitle: true,
          seoDescription: true,
          cover: { select: { url: true } },
          projects: {
            orderBy: [{ featured: "desc" }, { position: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              role: true,
              tools: true,
              clientName: true,
              externalUrl: true,
              videoUrl: true,
              completedAt: true,
              featured: true,
              category: { select: { name: true } },
              cover: { select: { url: true } },
              media: { orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
            },
          },
        },
      },
    },
  });

  if (!freelancer?.portfolio?.published) return null;

  const now = new Date();

  const [services, reviews, entitlements] = await Promise.all([
    prisma.serviceListing.findMany({
      where: {
        freelancerId: freelancer.id,
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        media: { take: 1, orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
        packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
      },
    }),
    prisma.freelanceReview.findMany({
      where: { targetId: freelancer.userId, state: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: { select: { firstName: true } },
      },
    }),
    plans.getEntitlements(freelancer.id),
  ]);

  const sections = await sectionsFor(freelancer.portfolio.id);

  // Counted after the page is assembled, and never for a preview.
  prisma.portfolio
    .update({ where: { id: freelancer.portfolio.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return {
    freelancer: {
      username: freelancer.username,
      displayName: freelancer.displayName,
      title: freelancer.title,
      bio: freelancer.bio,
      wilaya: freelancer.wilaya,
      hourlyRate: freelancer.hourlyRate,
      availability: freelancer.availability,
      level: freelancer.level,
      verified: freelancer.identityVerified,
      rating: freelancer.ratingAverage,
      ratingCount: freelancer.ratingCount,
      completedOrders: freelancer.completedOrders,
      languages: freelancer.languages,
      memberSince: freelancer.createdAt,
      skills: freelancer.skills.map((s) => s.skill.name),
      avatarUrl: freelancer.user.avatar?.url ?? null,
    },
    theme: {
      template: freelancer.portfolio.template,
      accentColor: freelancer.portfolio.accentColor,
      fontFamily: freelancer.portfolio.fontFamily,
      defaultLanguage: freelancer.portfolio.defaultLanguage,
      coverUrl: freelancer.portfolio.cover?.url ?? null,
    },
    seo: {
      title: freelancer.portfolio.seoTitle,
      description: freelancer.portfolio.seoDescription,
    },
    sections,
    projects: freelancer.portfolio.projects.map((p) => ({
      ...p,
      coverUrl: p.cover?.url ?? null,
      gallery: p.media.map((m) => m.file.url),
    })),
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      coverUrl: s.media[0]?.file.url ?? null,
      startingPrice: s.packages[0]?.price ?? null,
    })),
    reviews,
    /* "Réalisé avec Dar L'emploi" is removed only on a plan that pays for
     * it. Decided here, not in the page, so the page cannot simply omit it. */
    showBranding: !entitlements.removableBranding,
  };
};

export default {
  getOrCreate,
  sectionsFor,
  updateSettings,
  saveSections,
  addProject,
  updateProject,
  removeProject,
  publicPage,
  TEMPLATES,
  PortfolioError,
};
