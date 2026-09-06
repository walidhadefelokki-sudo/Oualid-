import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";
import aiAnalysisService from "../services/aiAnalysis.service";

export const applyToJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, coverLetter } = req.body;
    const candidateId = req.user!.id;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return next(new AppError("Job not found", 404));
    }

    const user = await prisma.user.findUnique({
      where: { id: candidateId },
      include: { candidateProfile: true },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Only candidates can apply to jobs", 403));
    }

    // Check if already applied
    const existingApplication = await prisma.application.findFirst({
      where: { jobId, candidateId: user.candidateProfile.id },
    });

    if (existingApplication) {
      return next(new AppError("You have already applied for this job", 400));
    }

    if (!user.candidateProfile.resumeId) {
      return next(
        new AppError(
          "Please upload your CV to your profile before applying.",
          400
        )
      );
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: user.candidateProfile.id,
        recruiterId: job.recruiterId,
        coverLetter,
        cvId: user.candidateProfile.resumeId,
      },
    });

    // Run AI analysis in the background
      aiAnalysisService
        .analyzeApplication(application.id)
        .catch((error) => {
          console.error(
            "AI Analysis Error:",
            error
          );
        });

    res.status(201).json({
      status: "success",
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { candidateProfile: true },
    });

    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found", 404));
    }

    const applications = await prisma.application.findMany({
      where: { candidateId: user.candidateProfile.id },
      include: { job: { include: { recruiter: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    res.status(200).json({
      status: "success",
      results: applications.length,
      data: { applications },
    });
  } catch (err) {
    next(err);
  }
};

export const getJobApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { recruiter: true },
    });

    if (!job) return next(new AppError("Job not found", 404));

    // Check if user is the recruiter who posted the job
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { recruiterProfile: true },
    });

    if (job.recruiterId !== user?.recruiterProfile?.id && req.user!.role !== 'ADMIN') {
      return next(new AppError("Unauthorized", 403));
    }

    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: {
          include: {
            // Selected explicitly rather than `user: true`, which returned the
            // whole User row — including the bcrypt password hash — to every
            // recruiter who opened a job's applicants. avatarUrl is also
            // resolved here; the client was reading a field that never existed.
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                avatar: { select: { url: true } },
              },
            },
          },
        },
        cv: true,
        aianalysis: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    // Quiz + oral presentation are candidate-level (not application-level),
    // so fetch them per unique candidate and attach.
    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidateUserIds = [
      ...new Set(applications.map((a) => a.candidate.userId)),
    ];

    const [quizzes, presentations] = await Promise.all([
      prisma.quiz.findMany({
        where: { candidateId: { in: candidateUserIds } },
        include: { attempt: true },
      }),
      prisma.oralPresentation.findMany({
        where: { candidateId: { in: candidateIds } },
        include: { video: true },
      }),
    ]);

    const quizByUserId = new Map(quizzes.map((q) => [q.candidateId, q]));
    const presentationByCandidateId = new Map(
      presentations.map((p) => [p.candidateId, p])
    );

    const enriched = applications.map((application) => ({
      ...application,
      candidate: {
        ...application.candidate,
        user: {
          ...application.candidate.user,
          avatarUrl: application.candidate.user.avatar?.url ?? null,
        },
      },
      quiz: quizByUserId.get(application.candidate.userId) ?? null,
      oralPresentation:
        presentationByCandidateId.get(application.candidateId) ?? null,
    }));

    res.status(200).json({
      status: "success",
      results: enriched.length,
      data: { applications: enriched },
    });
  } catch (err) {
    next(err);
  }
};

export const updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { include: { recruiter: true } } },
    });

    if (!application) return next(new AppError("Application not found", 404));

    // Check ownership
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { recruiterProfile: true },
    });

    if (application.job.recruiterId !== user?.recruiterProfile?.id && req.user!.role !== 'ADMIN') {
      return next(new AppError("Unauthorized", 403));
    }

    const updatedApplication = await prisma.application.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({
      status: "success",
      data: { application: updatedApplication },
    });
  } catch (err) {
    next(err);
  }
};
