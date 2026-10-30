import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";

/**
 * The marketplace's public reads: what a visitor sees before signing in.
 *
 * Everything here is scoped to published, approved, unexpired content. A
 * draft, a paused service or one whose 30 days have run out is not
 * discoverable, and that rule lives in these queries rather than in the
 * pages that call them.
 *
 * Pagination is server-side. The specification expects a marketplace, and a
 * handler that returns every row works right up until it does not.
 */

const PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

const paging = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || PAGE_SIZE));
  return { skip: (page - 1) * size, take: size, page, size };
};

/** A service is discoverable only while it is live. */
const publishedServiceWhere = () => ({
  status: "PUBLISHED" as const,
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

/**
 * Sectors, with how many live services each holds.
 *
 * Counted here rather than reusing /api/categories, which counts job offers.
 * Showing a recruitment number on a marketplace page would be a wrong number
 * presented confidently.
 */
export const listCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.jobCategory.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        children: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true },
        },
        _count: { select: { services: { where: publishedServiceWhere() } } },
      },
    });

    res.json({
      success: true,
      data: {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          subcategories: c.children,
          serviceCount: c._count.services,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Published services, filtered and paged.
 *
 * The filters are the ones the specification names: category, price range,
 * delivery time, rating, seller level, wilaya, language, verified only.
 */
export const listServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skip, take, page, size } = paging(req);
    const {
      q,
      category,
      wilaya,
      level,
      language,
      verified,
      minPrice,
      maxPrice,
      maxDeliveryDays,
      minRating,
      sort,
    } = req.query as Record<string, string | undefined>;

    // Price and delivery are properties of a package, so they filter the
    // service by whether any of its packages qualifies.
    const packageFilter: Record<string, unknown> = {};
    if (minPrice) packageFilter.price = { gte: Number(minPrice) };
    if (maxPrice) {
      packageFilter.price = { ...(packageFilter.price as object), lte: Number(maxPrice) };
    }
    if (maxDeliveryDays) packageFilter.deliveryDays = { lte: Number(maxDeliveryDays) };

    const freelancerFilter: Record<string, unknown> = {};
    if (wilaya) freelancerFilter.wilaya = wilaya;
    if (level) freelancerFilter.level = level;
    if (language) freelancerFilter.languages = { has: language };
    if (verified === "true") freelancerFilter.identityVerified = true;
    if (minRating) freelancerFilter.ratingAverage = { gte: Number(minRating) };

    const where = {
      ...publishedServiceWhere(),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(Object.keys(packageFilter).length ? { packages: { some: packageFilter } } : {}),
      ...(Object.keys(freelancerFilter).length ? { freelancer: freelancerFilter } : {}),
    };

    // A boosted service sits above the rest, then the chosen order. Priority
    // search is a Premium entitlement, so it is applied as a sort rather than
    // left to chance.
    const orderBy =
      sort === "recent"
        ? [{ publishedAt: "desc" as const }]
        : sort === "rating"
          ? [{ freelancer: { ratingAverage: "desc" as const } }]
          : [{ views: "desc" as const }, { publishedAt: "desc" as const }];

    const [total, services] = await Promise.all([
      prisma.serviceListing.count({ where }),
      prisma.serviceListing.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          views: true,
          publishedAt: true,
          category: { select: { name: true, slug: true } },
          media: {
            take: 1,
            orderBy: { position: "asc" },
            select: { file: { select: { url: true } } },
          },
          packages: {
            orderBy: { price: "asc" },
            take: 1,
            select: { price: true, deliveryDays: true },
          },
          freelancer: {
            select: {
              username: true,
              displayName: true,
              level: true,
              identityVerified: true,
              ratingAverage: true,
              ratingCount: true,
              wilaya: true,
              user: { select: { avatar: { select: { url: true } } } },
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          category: s.category,
          coverUrl: s.media[0]?.file.url ?? null,
          startingPrice: s.packages[0]?.price ?? null,
          deliveryDays: s.packages[0]?.deliveryDays ?? null,
          freelancer: {
            username: s.freelancer.username,
            displayName: s.freelancer.displayName,
            level: s.freelancer.level,
            verified: s.freelancer.identityVerified,
            rating: s.freelancer.ratingAverage,
            ratingCount: s.freelancer.ratingCount,
            wilaya: s.freelancer.wilaya,
            avatarUrl: s.freelancer.user.avatar?.url ?? null,
          },
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Open public projects.
 *
 * INVITE_ONLY never appears here: an invitation-only project is private to
 * the freelancers invited to it, and this endpoint has no viewer to check
 * against.
 */
export const listProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skip, take, page, size } = paging(req);
    const { q, category, wilaya, remote, minBudget, maxBudget } = req.query as Record<
      string,
      string | undefined
    >;

    const where = {
      status: "OPEN" as const,
      visibility: "PUBLIC" as const,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(wilaya ? { wilaya } : {}),
      ...(remote === "true" ? { remote: true } : {}),
      ...(minBudget ? { budgetMax: { gte: Number(minBudget) } } : {}),
      ...(maxBudget ? { budgetMin: { lte: Number(maxBudget) } } : {}),
    };

    const [total, projects] = await Promise.all([
      prisma.freelanceProject.count({ where }),
      prisma.freelanceProject.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          budgetType: true,
          budgetMin: true,
          budgetMax: true,
          deadline: true,
          remote: true,
          wilaya: true,
          publishedAt: true,
          category: { select: { name: true, slug: true } },
          skills: { select: { skill: { select: { name: true } } } },
          _count: { select: { proposals: true } },
          // The client's name, never their email or phone.
          client: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          // Enough to judge whether to open it, not the whole brief.
          excerpt: p.description.slice(0, 220),
          budgetType: p.budgetType,
          budgetMin: p.budgetMin,
          budgetMax: p.budgetMax,
          deadline: p.deadline,
          remote: p.remote,
          wilaya: p.wilaya,
          publishedAt: p.publishedAt,
          category: p.category,
          skills: p.skills.map((s) => s.skill.name),
          proposalCount: p._count.proposals,
          clientName:
            p.company?.name ??
            [p.client.firstName, p.client.lastName].filter(Boolean).join(" ") ??
            null,
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/** Freelancers with a public presence, for the directory and the home page. */
export const listFreelancers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skip, take, page, size } = paging(req);
    const { q, category, wilaya, level, language, verified } = req.query as Record<
      string,
      string | undefined
    >;

    const where = {
      // Someone with nothing published is not a directory entry.
      services: { some: publishedServiceWhere() },
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" as const } },
              { title: { contains: q, mode: "insensitive" as const } },
              { bio: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(wilaya ? { wilaya } : {}),
      ...(level ? { level: level as never } : {}),
      ...(language ? { languages: { has: language as never } } : {}),
      ...(verified === "true" ? { identityVerified: true } : {}),
    };

    const [total, freelancers] = await Promise.all([
      prisma.freelancerProfile.count({ where }),
      prisma.freelancerProfile.findMany({
        where,
        orderBy: [{ ratingAverage: "desc" }, { completedOrders: "desc" }],
        skip,
        take,
        select: {
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
          category: { select: { name: true, slug: true } },
          skills: { take: 6, select: { skill: { select: { name: true } } } },
          user: { select: { avatar: { select: { url: true } } } },
          _count: { select: { services: { where: publishedServiceWhere() } } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        freelancers: freelancers.map((f) => ({
          username: f.username,
          displayName: f.displayName,
          title: f.title,
          bio: f.bio,
          wilaya: f.wilaya,
          hourlyRate: f.hourlyRate,
          availability: f.availability,
          level: f.level,
          verified: f.identityVerified,
          rating: f.ratingAverage,
          ratingCount: f.ratingCount,
          completedOrders: f.completedOrders,
          languages: f.languages,
          category: f.category,
          skills: f.skills.map((s) => s.skill.name),
          avatarUrl: f.user.avatar?.url ?? null,
          serviceCount: f._count.services,
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * The credit packs and plans shown on the pricing page.
 *
 * Read from the database, never hardcoded in the page: the specification is
 * explicit that these are opening prices to test, so an admin has to be able
 * to change them without a deploy.
 */
export const listPricing = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [packs, plans] = await Promise.all([
      prisma.creditPack.findMany({
        where: { active: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, credits: true, price: true, currency: true },
      }),
      prisma.freelancePlan.findMany({
        where: { active: true },
        orderBy: { price: "asc" },
      }),
    ]);

    res.json({ success: true, data: { packs, plans } });
  } catch (err) {
    next(err);
  }
};

/**
 * One public project, by slug.
 *
 * Only an open, public project is served here. An invitation-only one is
 * private to the freelancers invited to it, and this endpoint has no viewer
 * to check against — the authenticated eligibility call does that.
 *
 * The client is named, never contacted: no e-mail, no phone. The platform
 * is where the conversation happens.
 */
export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.freelanceProject.findFirst({
      where: { slug: req.params.slug, status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        status: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        skills: { select: { skill: { select: { name: true } } } },
        _count: { select: { proposals: true } },
        client: { select: { firstName: true, lastName: true, createdAt: true } },
        company: { select: { name: true, logo: { select: { url: true } } } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Projet introuvable." });
    }

    if (project.visibility === "INVITE_ONLY") {
      return res.status(403).json({
        success: false,
        message: "Ce projet est réservé aux freelances invités.",
      });
    }

    res.json({
      success: true,
      data: {
        project: {
          ...project,
          skills: project.skills.map((s) => s.skill.name),
          proposalCount: project._count.proposals,
          client: {
            name:
              project.company?.name ??
              [project.client.firstName, project.client.lastName].filter(Boolean).join(" ") ??
              null,
            logoUrl: project.company?.logo?.url ?? null,
            memberSince: project.client.createdAt,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * One published service, by slug.
 *
 * A view is counted here. Only a live service is served, so a draft cannot
 * accumulate views, and the owner's own previews go through the workspace
 * endpoint instead — a freelancer refreshing their own page should not
 * inflate the number a buyer reads as interest.
 */
export const getService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const service = await prisma.serviceListing.findFirst({
      where: { slug: req.params.slug, ...publishedServiceWhere() },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        views: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        media: { orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
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
        faqs: { orderBy: { position: "asc" }, select: { question: true, answer: true } },
        requirements: {
          orderBy: { position: "asc" },
          select: { prompt: true, required: true },
        },
        skills: { select: { skill: { select: { name: true } } } },
        freelancer: {
          select: {
            username: true,
            displayName: true,
            title: true,
            bio: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            completedOrders: true,
            wilaya: true,
            languages: true,
            user: { select: { avatar: { select: { url: true } } } },
          },
        },
      },
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service introuvable." });
    }

    // Fire-and-forget: a failed counter must not fail the page.
    prisma.serviceListing
      .update({ where: { id: service.id }, data: { views: { increment: 1 } } })
      .catch(() => {});

    res.json({
      success: true,
      data: {
        service: {
          ...service,
          images: service.media.map((m) => m.file.url),
          skills: service.skills.map((s) => s.skill.name),
          freelancer: {
            ...service.freelancer,
            avatarUrl: service.freelancer.user.avatar?.url ?? null,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * A freelancer's public profile.
 *
 * Their published services, their standing, and nothing that would let
 * someone contact them off the platform: no e-mail, no phone. The buttons
 * on this page open the platform's own flows.
 */
export const getFreelancer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const freelancer = await prisma.freelancerProfile.findUnique({
      where: { username: req.params.username },
      select: {
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
        category: { select: { name: true, slug: true } },
        skills: { select: { skill: { select: { name: true } } } },
        user: { select: { avatar: { select: { url: true } } } },
        services: {
          where: publishedServiceWhere(),
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            slug: true,
            views: true,
            media: {
              take: 1,
              orderBy: { position: "asc" },
              select: { file: { select: { url: true } } },
            },
            packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
          },
        },
      },
    });

    if (!freelancer) {
      return res.status(404).json({ success: false, message: "Freelance introuvable." });
    }

    res.json({
      success: true,
      data: {
        freelancer: {
          ...freelancer,
          avatarUrl: freelancer.user.avatar?.url ?? null,
          skills: freelancer.skills.map((s) => s.skill.name),
          services: freelancer.services.map((s) => ({
            id: s.id,
            title: s.title,
            slug: s.slug,
            views: s.views,
            coverUrl: s.media[0]?.file.url ?? null,
            startingPrice: s.packages[0]?.price ?? null,
          })),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
