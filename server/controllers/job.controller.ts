import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendJobMatchEmail } from "../utils/email";
import { getRecruiterPlan } from "../middleware/tier.middleware";

// Turns "Développeur Full Stack" into "developpeur-full-stack-a1b2c3" -
// the random suffix keeps the (unique) Job.slug collision-free without
// an extra DB round trip to check availability.
const slugify = (title: string) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${base || "job"}-${suffix}`;
};

export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, location, type, categoryId, categorySlug, wilaya, featured, limit } =
      req.query;

    // `featured=true` drives the "Postes à la une" section; any other value is
    // ignored rather than treated as false, so an accidental ?featured=maybe
    // still returns the full list instead of silently filtering it.
    const featuredOnly = featured === "true" ? true : undefined;

    // Bounded so a public endpoint cannot be asked for the entire table.
    const parsedLimit = Number(limit);
    const take = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 60)
      : undefined;

    const jobs = await prisma.job.findMany({
      where: {
        title: title ? { contains: title as string, mode: 'insensitive' } : undefined,
        location: location ? { contains: location as string, mode: 'insensitive' } : undefined,
        type: type as any,
        categoryId: categoryId ? (categoryId as string) : undefined,
        // Lets the frontend filter by the stable slug it already knows ("it",
        // "health", …) without first resolving it to a uuid.
        category: categorySlug ? { slug: categorySlug as string } : undefined,
        wilaya: wilaya ? { equals: wilaya as string, mode: 'insensitive' } : undefined,
        featured: featuredOnly,
        status: 'PUBLISHED',
      },
      include: {
        recruiter: true,
        company: true,
        category: true,
      },
      // Featured first so promoted postings lead any list they appear in.
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take,
    });

    res.status(200).json({
      status: "success",
      results: jobs.length,
      data: { jobs },
    });
  } catch (err) {
    next(err);
  }
};

export const getRecruiterJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { recruiterProfile: true },
    });

    if (!user?.recruiterProfile) {
      return next(new AppError("Recruiter profile not found", 404));
    }

    const jobs = await prisma.job.findMany({
      where: { recruiterId: user.recruiterProfile.id },
      include: {
        applications: {
          select: {
            status: true,
            aiScore: true,
            appliedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const jobCards = jobs.map((job) => {
      const applications = job.applications;
      const applicationsCount = applications.length;

      const newCandidatesCount = applications.filter(
        (a) => a.appliedAt >= oneWeekAgo
      ).length;

      const scored = applications.filter((a) => a.aiScore != null);
      const averageMatch =
        scored.length > 0
          ? Math.round(
              scored.reduce((sum, a) => sum + (a.aiScore ?? 0), 0) /
                scored.length
            )
          : null;

      return {
        id: job.id,
        title: job.title,
        location: job.location,
        publishedAt: job.publishedAt,
        status: job.status,
        applicationsCount,
        newCandidatesCount,
        averageMatch,
      };
    });

    res.status(200).json({
      status: "success",
      results: jobCards.length,
      data: { jobs: jobCards },
    });
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { recruiter: true, company: true, category: true },
    });

    if (!job) {
      return next(new AppError("Job not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new AppError("User not authenticated", 401));

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true },
    });

    if (!user?.recruiterProfile) {
      return next(new AppError("Only recruiters can post jobs", 403));
    }

    // A job must belong to a Company (required FK). Recruiters get one
    // created and linked via CompanyMember at registration time.
    const membership = await prisma.companyMember.findFirst({
      where: { recruiterId: user.recruiterProfile.id },
      include: { company: true },
    });
    if (!membership) {
      return next(new AppError("No company associated with this recruiter account", 400));
    }

    const plan = await getRecruiterPlan(req.user.id);
    const existingJobsCount = await prisma.job.count({
      where: { recruiterId: user.recruiterProfile.id }
    });

    // Enforce limits
    if (plan === 'FREE' && existingJobsCount >= 5) {
      return next(new AppError("Free plan limit reached (5 jobs). Please upgrade.", 403));
    }
    if (plan === 'PREMIUM' && existingJobsCount >= 20) {
      return next(new AppError("Premium plan limit reached (20 jobs). Please upgrade to Corporate.", 403));
    }

    const {
      title,
      description,
      location,
      wilaya,
      country,
      remote,
      type,
      experienceLevel,
      vacancies,
      salaryMin,
      salaryMax,
      currency,
      categoryId,
      featured,
    } = req.body;

    if (!title || !description || !location || !type || !experienceLevel) {
      return next(new AppError("title, description, location, type and experienceLevel are required", 400));
    }

    // Featured job limits
    let isFeatured = featured || false;
    if (isFeatured && plan === 'FREE') {
      isFeatured = false; // Free plan can't post featured jobs
    }
    if (isFeatured && plan === 'PREMIUM') {
      const featuredCount = await prisma.job.count({
        where: { recruiterId: user.recruiterProfile.id, featured: true }
      });
      if (featuredCount >= 5) {
        isFeatured = false;
      }
    }

    const job = await prisma.job.create({
      data: {
        title,
        slug: slugify(title),
        description,
        location,
        wilaya,
        country,
        remote: remote ?? false,
        type,
        experienceLevel,
        vacancies: vacancies ?? 1,
        salaryMin,
        salaryMax,
        currency: currency ?? "DZD",
        categoryId: categoryId || undefined,
        featured: isFeatured,
        recruiterId: user.recruiterProfile.id,
        companyId: membership.companyId,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Background: Notify matching candidates
    (async () => {
      try {
        const matchingCandidates = await prisma.candidateProfile.findMany({
          where: {
            skills: {
              hasSome: title.split(' ')
            }
          },
          include: { user: true }
        });

        for (const candidate of matchingCandidates) {
          await sendJobMatchEmail(
            candidate.user.email, 
            job.title, 
            membership.company.name, 
            job.id
          );
          
          // Also create an in-app notification
          await prisma.notification.create({
            data: {
              userId: candidate.userId,
              title: 'New Job Match!',
              message: `A new job matches your profile: ${job.title} at ${membership.company.name}`,
              type: 'INFO'
            }
          });
        }
      } catch (err) {
        console.error('Error in job match background task:', err);
      }
    })();

    res.status(201).json({
      status: "success",
      data: { job },
    });
  } catch (err) {
    next(err);
  }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) return next(new AppError("Job not found", 404));

    // Check ownership
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { recruiterProfile: true },
    });

    if (job.recruiterId !== user?.recruiterProfile?.id && req.user!.role !== 'ADMIN') {
      return next(new AppError("You stay in your lane! (Unauthorized)", 403));
    }

    const {
      title,
      description,
      location,
      wilaya,
      country,
      remote,
      type,
      experienceLevel,
      vacancies,
      salaryMin,
      salaryMax,
      currency,
      status,
      expiresAt,
      categoryId,
      featured,
    } = req.body;

    // "À la une" is a paid placement, so promoting an existing job goes
    // through the same plan rules as creating one — otherwise a FREE
    // recruiter could post normally and then PATCH featured:true.
    // `undefined` means "not sent", which leaves the current value alone.
    let nextFeatured: boolean | undefined = undefined;
    if (featured !== undefined) {
      const plan = await getRecruiterPlan(req.user!.id);
      nextFeatured = Boolean(featured);

      if (nextFeatured && plan === "FREE") {
        return next(
          new AppError("Featured jobs require a Premium or Corporate plan.", 403)
        );
      }

      if (nextFeatured && plan === "PREMIUM" && !job.featured) {
        const featuredCount = await prisma.job.count({
          where: { recruiterId: job.recruiterId, featured: true },
        });
        if (featuredCount >= 5) {
          return next(
            new AppError(
              "Premium plan allows 5 featured jobs. Upgrade to Corporate for more.",
              403
            )
          );
        }
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        location,
        wilaya,
        country,
        remote,
        type,
        experienceLevel,
        vacancies,
        salaryMin,
        salaryMax,
        currency,
        status,
        expiresAt,
        categoryId,
        featured: nextFeatured,
      },
    });

    res.status(200).json({
      status: "success",
      data: { job: updatedJob },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });

    if (!job) return next(new AppError("Job not found", 404));

    // Check ownership
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { recruiterProfile: true },
    });

    if (job.recruiterId !== user?.recruiterProfile?.id && req.user!.role !== 'ADMIN') {
      return next(new AppError("Unauthorized", 403));
    }

    await prisma.job.delete({ where: { id: req.params.id } });

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
