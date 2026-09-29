import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * The platform team's own diary.
 *
 * Separate from Interview, which belongs to a recruiter and hangs off an
 * application. These are the entries with nothing behind them — a partner
 * meeting, a demo, a deadline — and they are admin-only.
 */

const TYPES = ["MEETING", "INTERVIEW", "CALL", "DEMO", "DEADLINE", "OTHER"] as const;
const STATUSES = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"] as const;

const guestSelect = {
  id: true,
  name: true,
  email: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
} as const;

const eventSelect = {
  id: true,
  title: true,
  type: true,
  startsAt: true,
  endsAt: true,
  allDay: true,
  location: true,
  notes: true,
  status: true,
  createdAt: true,
  host: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
  guests: { select: guestSelect },
} as const;

/** Guests as the client sends them: either an account id, or a name/address. */
interface GuestInput {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
}

/**
 * Turns the client's guest list into rows.
 *
 * A guest with neither an account nor anything typed is dropped rather than
 * stored: an empty row would show as a blank attendee nobody can identify.
 */
const toGuestRows = (guests: unknown) => {
  if (!Array.isArray(guests)) return [];
  return (guests as GuestInput[])
    .map((g) => ({
      userId: g.userId?.trim() || null,
      name: g.name?.trim() || null,
      email: g.email?.trim().toLowerCase() || null,
    }))
    .filter((g) => g.userId || g.name || g.email)
    .slice(0, 50);
};

/** Shared validation for create and update. */
const readBody = (body: Record<string, unknown>) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = body.type as string | undefined;
  const status = body.status as string | undefined;

  if (type !== undefined && !TYPES.includes(type as never)) {
    throw new AppError(`type must be one of: ${TYPES.join(", ")}`, 400);
  }
  if (status !== undefined && !STATUSES.includes(status as never)) {
    throw new AppError(`status must be one of: ${STATUSES.join(", ")}`, 400);
  }

  const startsAt = body.startsAt ? new Date(body.startsAt as string) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt as string) : null;

  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new AppError("Date de début invalide.", 400);
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new AppError("Date de fin invalide.", 400);
  }
  // An entry that ends before it starts renders as a negative block and sorts
  // wrongly everywhere; refuse it rather than store it.
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new AppError("La fin ne peut pas précéder le début.", 400);
  }

  return { title, type, status, startsAt, endsAt };
};

/** Entries in a window, oldest first. Defaults to the current month. */
export const listSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to, type, status } = req.query as Record<string, string | undefined>;

    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;

    const events = await prisma.scheduleEvent.findMany({
      where: {
        type: type ? (type as never) : undefined,
        status: status ? (status as never) : undefined,
        // Overlap, not containment: a meeting that begins in the previous
        // month and runs into this one still belongs on this month's grid.
        ...(start && end
          ? { startsAt: { lte: end }, endsAt: { gte: start } }
          : {}),
      },
      orderBy: { startsAt: "asc" },
      take: 500,
      select: eventSelect,
    });

    res.status(200).json({ status: "success", results: events.length, data: { events } });
  } catch (err) {
    next(err);
  }
};

export const createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, type, status, startsAt, endsAt } = readBody(req.body ?? {});

    if (!title) return next(new AppError("Le titre est requis.", 400));
    if (!startsAt || !endsAt) {
      return next(new AppError("Les dates de début et de fin sont requises.", 400));
    }

    const event = await prisma.scheduleEvent.create({
      data: {
        title,
        type: (type as never) ?? undefined,
        status: (status as never) ?? undefined,
        startsAt,
        endsAt,
        allDay: Boolean(req.body?.allDay),
        location: (req.body?.location as string)?.trim() || null,
        notes: (req.body?.notes as string)?.trim() || null,
        hostId: (req.body?.hostId as string)?.trim() || req.user?.id || null,
        createdById: req.user?.id ?? null,
        guests: { create: toGuestRows(req.body?.guests) },
      },
      select: eventSelect,
    });

    res.status(201).json({ status: "success", data: { event } });
  } catch (err) {
    next(err);
  }
};

export const updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.scheduleEvent.findUnique({
      where: { id },
      select: { id: true, startsAt: true, endsAt: true },
    });
    if (!existing) return next(new AppError("Événement introuvable.", 404));

    const body = req.body ?? {};
    const { title, type, status, startsAt, endsAt } = readBody(body);

    // Validate the pair as it will end up, not only what this request carries:
    // moving just the end date must still land after the stored start.
    const nextStart = startsAt ?? existing.startsAt;
    const nextEnd = endsAt ?? existing.endsAt;
    if (nextEnd < nextStart) {
      return next(new AppError("La fin ne peut pas précéder le début.", 400));
    }

    const event = await prisma.scheduleEvent.update({
      where: { id },
      data: {
        title: title || undefined,
        type: (type as never) ?? undefined,
        status: (status as never) ?? undefined,
        startsAt: startsAt ?? undefined,
        endsAt: endsAt ?? undefined,
        allDay: typeof body.allDay === "boolean" ? body.allDay : undefined,
        location:
          body.location === undefined ? undefined : (body.location as string)?.trim() || null,
        notes: body.notes === undefined ? undefined : (body.notes as string)?.trim() || null,
        hostId: body.hostId === undefined ? undefined : (body.hostId as string) || null,
        // Guests are replaced wholesale when sent: the form edits the list as
        // a whole, and diffing it here would only invent a second source of
        // truth for what it already holds.
        ...(body.guests !== undefined
          ? { guests: { deleteMany: {}, create: toGuestRows(body.guests) } }
          : {}),
      },
      select: eventSelect,
    });

    res.status(200).json({ status: "success", data: { event } });
  } catch (err) {
    next(err);
  }
};

export const deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.scheduleEvent.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return next(new AppError("Événement introuvable.", 404));

    // Guests cascade; nothing else references an event.
    await prisma.scheduleEvent.delete({ where: { id } });

    res.status(200).json({ status: "success", data: { id } });
  } catch (err) {
    next(err);
  }
};
