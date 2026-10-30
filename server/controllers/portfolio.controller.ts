import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import portfolios, { PortfolioError } from "../services/portfolio.service";
import plans from "../services/plans.service";

/**
 * The mini-portfolio: the freelancer's editor, and the published page.
 */

const asHttpError = (err: unknown) =>
  err instanceof PortfolioError ? new AppError(err.message, err.status) : err;

const requireFreelancer = async (userId: string) => {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true, username: true },
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile;
};

/** Everything the editor needs: settings, sections, realisations, limits. */
export const getMyPortfolio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    const portfolio = await portfolios.getOrCreate(profile.id);

    const [sections, projects, entitlements] = await Promise.all([
      portfolios.sectionsFor(portfolio.id),
      prisma.portfolioProject.findMany({
        where: { portfolioId: portfolio.id },
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
          cover: { select: { url: true } },
        },
      }),
      plans.getEntitlements(profile.id),
    ]);

    res.json({
      success: true,
      data: {
        username: profile.username,
        portfolio: {
          published: portfolio.published,
          template: portfolio.template,
          accentColor: portfolio.accentColor,
          fontFamily: portfolio.fontFamily,
          defaultLanguage: portfolio.defaultLanguage,
          seoTitle: portfolio.seoTitle,
          seoDescription: portfolio.seoDescription,
          views: portfolio.views,
        },
        sections,
        projects,
        limits: {
          maxProjects: entitlements.maxPortfolioProjects,
          usedProjects: projects.length,
          allTemplates: entitlements.tier !== "FREE",
          video: entitlements.tier !== "FREE",
          removableBranding: entitlements.removableBranding,
          customSubdomain: entitlements.customSubdomain,
          planName: entitlements.planName,
          /* Statistics are a paid feature; the free plan sees the page but
           * not the numbers. */
          stats: entitlements.stats,
        },
      },
    });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    const updated = await portfolios.updateSettings(profile.id, req.body ?? {});
    res.json({ success: true, data: { portfolio: updated } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const saveSections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    const { sections } = req.body as { sections?: unknown };
    if (!Array.isArray(sections)) return next(new AppError("Sections manquantes.", 400));

    const saved = await portfolios.saveSections(profile.id, sections as never);
    res.json({ success: true, data: { sections: saved } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const addProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    const project = await portfolios.addProject(profile.id, req.body ?? {});
    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    const project = await portfolios.updateProject(profile.id, req.params.id, req.body ?? {});
    res.json({ success: true, data: { project } });
  } catch (err) {
    next(asHttpError(err));
  }
};

export const removeProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await requireFreelancer(req.user!.id);
    res.json({ success: true, data: await portfolios.removeProject(profile.id, req.params.id) });
  } catch (err) {
    next(asHttpError(err));
  }
};

/** Public: the published page at /@username. */
export const getPublicPortfolio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = await portfolios.publicPage(req.params.username);
    if (!page) {
      // Not published and not existing are the same answer: a draft should
      // not be discoverable by trying handles.
      return res.status(404).json({ success: false, message: "Portfolio introuvable." });
    }
    res.json({ success: true, data: page });
  } catch (err) {
    next(asHttpError(err));
  }
};
