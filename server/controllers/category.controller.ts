import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * Public: list every activity sector, each with the number of jobs currently
 * published in it.
 *
 * Powers the "Opportunités par domaine" grid on the landing page. The count is
 * restricted to PUBLISHED jobs so a domain never advertises drafts or closed
 * postings. Categories with no jobs are still returned — the grid shows all
 * eight domains and lets the UI say "aucune offre" rather than hiding one.
 */
export const getAllCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.jobCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: {
          select: { jobs: { where: { status: "PUBLISHED" } } },
        },
      },
    });

    res.status(200).json({
      status: "success",
      results: categories.length,
      data: {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          icon: c.icon,
          jobCount: c._count.jobs,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Public: one sector plus its most recent published jobs.
 *
 * This is what the domain popup opens with — it needs the sector's own detail
 * and a preview list in a single round trip. Looked up by slug because the
 * frontend addresses domains by the stable slug ("it", "health", …) that its
 * translations and icons are keyed on, not by a generated uuid.
 */
export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    // Cap the preview: the popup shows a handful of recent openings, and an
    // unbounded include would grow without limit as a sector fills up.
    const limitParam = Number(req.query.limit);
    const take = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.trunc(limitParam), 1), 20)
      : 6;

    const category = await prisma.jobCategory.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, description: true, icon: true },
    });

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    const [jobs, jobCount] = await Promise.all([
      prisma.job.findMany({
        where: { categoryId: category.id, status: "PUBLISHED" },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        take,
        select: {
          id: true,
          title: true,
          location: true,
          wilaya: true,
          type: true,
          remote: true,
          featured: true,
          salaryMin: true,
          salaryMax: true,
          currency: true,
          createdAt: true,
          publishedAt: true,
          company: { select: { name: true, logo: { select: { url: true } } } },
        },
      }),
      prisma.job.count({ where: { categoryId: category.id, status: "PUBLISHED" } }),
    ]);

    res.status(200).json({
      status: "success",
      data: { category: { ...category, jobCount }, jobs },
    });
  } catch (err) {
    next(err);
  }
};
