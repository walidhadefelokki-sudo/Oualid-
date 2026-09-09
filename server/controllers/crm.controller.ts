import { Request, Response, NextFunction } from "express";
import { LeadStatus, LeadSource, Prisma, Role } from "@prisma/client";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * CRM for the admin console: leads, and the relationship history behind every
 * recruiter and candidate.
 *
 * Every route here is already behind `protect` + `restrictTo("ADMIN")` in
 * crm.routes.ts, so these handlers do not repeat the check.
 */

const LEAD_STATUSES = Object.values(LeadStatus);
const LEAD_SOURCES = Object.values(LeadSource);

/** Author and owner details worth showing, and nothing more. */
const STAFF_SELECT = {
  select: { id: true, email: true, firstName: true, lastName: true },
} as const;

const leadInclude = {
  owner: STAFF_SELECT,
  convertedUser: STAFF_SELECT,
  crmNotes: {
    orderBy: { createdAt: "desc" as const },
    include: { author: STAFF_SELECT },
  },
} satisfies Prisma.LeadInclude;

/* -------------------------------------------------------------------------- */
/*                                   Leads                                    */
/* -------------------------------------------------------------------------- */

export const listLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };

    const where: Prisma.LeadWhereInput = {};

    if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
      where.status = status as LeadStatus;
    }

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: "insensitive" } },
        { contactName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [leads, byStatus] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: [{ updatedAt: "desc" }],
        take: 200,
      }),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
    ]);

    // The pipeline counts every stage, including the empty ones — a board with
    // a missing column reads as a bug rather than as "nothing here yet".
    const pipeline = LEAD_STATUSES.map((s) => ({
      status: s,
      count: byStatus.find((b) => b.status === s)?._count ?? 0,
    }));

    res.status(200).json({ status: "success", data: { leads, pipeline } });
  } catch (err) {
    next(err);
  }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyName, contactName, email, phone, status, source, notes, nextActionAt } =
      req.body as Record<string, string | undefined>;

    if (!companyName?.trim()) {
      return next(new AppError("A company name is required.", 400));
    }

    const lead = await prisma.lead.create({
      data: {
        companyName: companyName.trim(),
        contactName: contactName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        status: LEAD_STATUSES.includes(status as LeadStatus) ? (status as LeadStatus) : undefined,
        source: LEAD_SOURCES.includes(source as LeadSource) ? (source as LeadSource) : undefined,
        notes: notes?.trim() || null,
        nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        // Whoever creates it owns it until reassigned.
        ownerId: req.user!.id,
      },
      include: leadInclude,
    });

    res.status(201).json({ status: "success", data: { lead } });
  } catch (err) {
    next(err);
  }
};

export const updateLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = req.body as Record<string, string | null | undefined>;

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Lead not found.", 404));

    const data: Prisma.LeadUpdateInput = {};

    // Only fields actually sent are touched, so a partial edit cannot blank
    // out everything the form did not include.
    if (body.companyName !== undefined) {
      if (!body.companyName?.trim()) return next(new AppError("A company name is required.", 400));
      data.companyName = body.companyName.trim();
    }
    if (body.contactName !== undefined) data.contactName = body.contactName?.trim() || null;
    if (body.email !== undefined) data.email = body.email?.trim() || null;
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.nextActionAt !== undefined) {
      data.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null;
    }

    if (body.status !== undefined) {
      if (!LEAD_STATUSES.includes(body.status as LeadStatus)) {
        return next(new AppError("Unknown lead status.", 400));
      }
      data.status = body.status as LeadStatus;
    }

    if (body.source !== undefined) {
      if (!LEAD_SOURCES.includes(body.source as LeadSource)) {
        return next(new AppError("Unknown lead source.", 400));
      }
      data.source = body.source as LeadSource;
    }

    if (body.ownerId !== undefined) {
      data.owner = body.ownerId ? { connect: { id: body.ownerId } } : { disconnect: true };
    }

    const lead = await prisma.lead.update({ where: { id }, data, include: leadInclude });

    res.status(200).json({ status: "success", data: { lead } });
  } catch (err) {
    next(err);
  }
};

export const deleteLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Lead not found.", 404));

    // Notes cascade with the lead — they have no meaning without it.
    await prisma.lead.delete({ where: { id } });

    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};

/**
 * Links a lead to the account they created, without losing the history.
 *
 * The lead is kept rather than deleted: the conversation that led to the
 * signup is often the most useful thing in the record.
 */
export const convertLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId?: string };

    if (!userId) return next(new AppError("A user id is required.", 400));

    const [lead, user] = await Promise.all([
      prisma.lead.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!lead) return next(new AppError("Lead not found.", 404));
    if (!user) return next(new AppError("User not found.", 404));

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        convertedUserId: user.id,
        convertedAt: new Date(),
        status: LeadStatus.WON,
      },
      include: leadInclude,
    });

    res.status(200).json({ status: "success", data: { lead: updated } });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/*                                   Notes                                    */
/* -------------------------------------------------------------------------- */

export const addNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body, leadId, subjectId } = req.body as Record<string, string | undefined>;

    if (!body?.trim()) return next(new AppError("A note cannot be empty.", 400));

    // Exactly one target: a note attached to both a lead and a person, or to
    // neither, has no meaningful place in either timeline.
    if (Boolean(leadId) === Boolean(subjectId)) {
      return next(new AppError("Attach the note to either a lead or a person.", 400));
    }

    if (leadId && !(await prisma.lead.findUnique({ where: { id: leadId } }))) {
      return next(new AppError("Lead not found.", 404));
    }
    if (subjectId && !(await prisma.user.findUnique({ where: { id: subjectId } }))) {
      return next(new AppError("User not found.", 404));
    }

    const note = await prisma.crmNote.create({
      data: {
        body: body.trim(),
        authorId: req.user!.id,
        leadId: leadId ?? null,
        subjectId: subjectId ?? null,
      },
      include: { author: STAFF_SELECT },
    });

    res.status(201).json({ status: "success", data: { note } });
  } catch (err) {
    next(err);
  }
};

export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await prisma.crmNote.findUnique({ where: { id } });
    if (!note) return next(new AppError("Note not found.", 404));

    await prisma.crmNote.delete({ where: { id } });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/*                        Recruiters & candidates                             */
/* -------------------------------------------------------------------------- */

/**
 * The people side of the CRM: every recruiter or candidate, with enough
 * context to hold a conversation about them and their note history.
 */
export const listContacts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, search } = req.query as { role?: string; search?: string };

    const wanted =
      role === "RECRUITER" || role === "CANDIDATE" ? (role as Role) : undefined;

    const where: Prisma.UserWhereInput = {
      role: wanted ?? { in: [Role.RECRUITER, Role.CANDIDATE] },
      deletedAt: null,
    };

    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      // Selected explicitly — a CRM list has no business carrying password
      // hashes to the browser.
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        candidateProfile: {
          select: { id: true, currentJobTitle: true, city: true, wilaya: true, resumeId: true },
        },
        recruiterProfile: {
          select: {
            id: true,
            companies: {
              select: { company: { select: { id: true, name: true, plan: true } } },
            },
          },
        },
        crmNotesAbout: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: STAFF_SELECT },
        },
        _count: { select: { crmNotesAbout: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.status(200).json({ status: "success", data: { contacts: users } });
  } catch (err) {
    next(err);
  }
};
