import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendJobMatchEmail } from "../utils/email";

export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, location, type, category } = req.query;

    const jobs = await prisma.job.findMany({
      where: {
        title: title ? { contains: title as string, mode: 'insensitive' } : undefined,
        location: location ? { contains: location as string, mode: 'insensitive' } : undefined,
        type: type as string,
        category: category as string,
      },
      include: {
        recruiter: true,
      },
      orderBy: { createdAt: 'desc' },
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

export const getJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { recruiter: true },
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

    const { plan } = user.recruiterProfile;
    const existingJobsCount = await prisma.job.count({
      where: { recruiterId: user.recruiterProfile.id }
    });

    // Enforce limits
    if (plan === 'BASIC' && existingJobsCount >= 5) {
      return next(new AppError("Basic plan limit reached (5 jobs). Please upgrade.", 403));
    }
    if (plan === 'PRO' && existingJobsCount >= 20) {
      return next(new AppError("Pro plan limit reached (20 jobs). Please upgrade to Enterprise.", 403));
    }

    const { title, description, location, type, salary, category, requirements, responsibilities, featured } = req.body;

    // Featured job limits
    let isFeatured = featured || false;
    if (isFeatured && plan === 'BASIC') {
      isFeatured = false; // Basic can't post featured jobs
    }
    if (isFeatured && plan === 'PRO') {
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
        description,
        location,
        type,
        salary,
        category,
        requirements,
        responsibilities,
        featured: isFeatured,
        recruiterId: user.recruiterProfile.id,
      },
    });

    // Background: Notify matching candidates
    (async () => {
      try {
        const matchingCandidates = await prisma.candidateProfile.findMany({
          where: {
            jobMatchNotifications: true,
            skills: {
              hasSome: [category, ...(title.split(' '))]
            }
          },
          include: { user: true }
        });

        for (const candidate of matchingCandidates) {
          await sendJobMatchEmail(
            candidate.user.email, 
            job.title, 
            user.recruiterProfile!.companyName, 
            job.id
          );
          
          // Also create an in-app notification
          await prisma.notification.create({
            data: {
              userId: candidate.userId,
              title: 'New Job Match!',
              message: `A new job matches your profile: ${job.title} at ${user.recruiterProfile!.companyName}`,
              type: 'job_match'
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

    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body,
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
