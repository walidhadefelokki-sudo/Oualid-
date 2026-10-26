import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { AppError } from "../middleware/error.middleware";

/**
 * The team's weekly to-do board.
 *
 * A week is identified by its Monday, as a plain date. Everything here reads
 * and writes that same key, so a task created on Friday evening and a board
 * opened on Saturday morning agree about which week they are in.
 */

/** The Monday of the week containing `d`, at UTC midnight. */
const mondayOf = (d: Date): Date => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // getUTCDay: 0 is Sunday, so Sunday belongs to the week that began six
  // days earlier rather than starting a new one.
  const offset = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - offset);
  return copy;
};

/** Reads ?week=YYYY-MM-DD, falling back to the current week. */
const weekFrom = (raw: unknown): Date => {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return mondayOf(parsed);
  }
  return mondayOf(new Date());
};

const asIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/* ----------------------------------------------------------------- board */

/**
 * One week, grouped by member.
 *
 * Inactive members appear only if they still have tasks that week, so a
 * board for a past week keeps its shape after someone leaves.
 */
export const getBoard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekStart = weekFrom(req.query.week);

    const [members, tasks] = await Promise.all([
      prisma.teamMember.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true, active: true, position: true },
      }),
      prisma.teamTask.findMany({
        where: { weekStart },
        orderBy: [{ done: "asc" }, { position: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          memberId: true,
          title: true,
          note: true,
          priority: true,
          dueDate: true,
          done: true,
          doneAt: true,
          position: true,
        },
      }),
    ]);

    const byMember = new Map<string, typeof tasks>();
    for (const t of tasks) {
      if (!byMember.has(t.memberId)) byMember.set(t.memberId, []);
      byMember.get(t.memberId)!.push(t);
    }

    const columns = members
      .filter((m) => m.active || byMember.has(m.id))
      .map((m) => {
        const own = byMember.get(m.id) ?? [];
        return {
          member: m,
          tasks: own.map((t) => ({
            ...t,
            dueDate: t.dueDate ? asIsoDate(t.dueDate) : null,
          })),
          total: own.length,
          done: own.filter((t) => t.done).length,
        };
      });

    res.json({
      success: true,
      data: {
        weekStart: asIsoDate(weekStart),
        columns,
        total: tasks.length,
        done: tasks.filter((t) => t.done).length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* --------------------------------------------------------------- members */

export const listMembers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await prisma.teamMember.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        position: true,
        user: { select: { email: true } },
      },
    });
    res.json({ success: true, data: { members } });
  } catch (err) {
    next(err);
  }
};

export const createMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, userId } = req.body as Record<string, unknown>;
    const clean = String(name ?? "").trim();
    if (!clean) return next(new AppError("Le nom est obligatoire.", 400));

    const count = await prisma.teamMember.count();

    const member = await prisma.teamMember.create({
      data: {
        name: clean,
        role: role ? String(role).trim() : null,
        userId: userId ? String(userId) : null,
        position: count,
      },
      select: { id: true, name: true, role: true, active: true, position: true },
    });

    res.status(201).json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
};

export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, active, position } = req.body as Record<string, unknown>;

    if (name !== undefined && !String(name).trim()) {
      return next(new AppError("Le nom ne peut pas être vide.", 400));
    }

    const member = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(role !== undefined ? { role: role ? String(role).trim() : null } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(position !== undefined ? { position: Number(position) } : {}),
      },
      select: { id: true, name: true, role: true, active: true, position: true },
    });

    res.json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
};

/**
 * Removes a member.
 *
 * Refused while they have tasks: their history is the record of what the
 * team did, and deleting the person would take the weeks with them. Marking
 * them inactive is the way to stop assigning work.
 */
export const deleteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.teamTask.count({ where: { memberId: req.params.id } });
    if (tasks > 0) {
      return next(
        new AppError(
          `Ce membre a ${tasks} tâche(s) enregistrée(s). Désactivez-le plutôt que de le supprimer.`,
          409
        )
      );
    }

    await prisma.teamMember.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------------------------------------------- tasks */

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberId, title, note, week } = req.body as Record<string, unknown>;

    const clean = String(title ?? "").trim();
    if (!clean) return next(new AppError("La tâche ne peut pas être vide.", 400));
    if (!memberId) return next(new AppError("Choisissez un membre.", 400));

    const member = await prisma.teamMember.findUnique({
      where: { id: String(memberId) },
      select: { id: true },
    });
    if (!member) return next(new AppError("Membre introuvable.", 404));

    const weekStart = weekFrom(week);

    // Appended to that member's week rather than to the whole board, so the
    // order inside a column is the order they were added.
    const count = await prisma.teamTask.count({ where: { memberId: member.id, weekStart } });

    const task = await prisma.teamTask.create({
      data: {
        memberId: member.id,
        title: clean,
        note: note ? String(note).trim() : null,
        weekStart,
        position: count,
        createdById: req.user!.id,
      },
      select: {
        id: true,
        memberId: true,
        title: true,
        note: true,
        done: true,
        doneAt: true,
        position: true,
      },
    });

    res.status(201).json({ success: true, data: { task, weekStart: asIsoDate(weekStart) } });
  } catch (err) {
    next(err);
  }
};

/**
 * Edits a task, including ticking it.
 *
 * `doneAt` follows `done` rather than being sent by the caller: it records
 * when the box was ticked, and a client clock is not evidence of that.
 */
/** Everything about one task, for the detail panel. */
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.teamTask.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        memberId: true,
        title: true,
        note: true,
        priority: true,
        dueDate: true,
        done: true,
        doneAt: true,
        position: true,
        weekStart: true,
        createdAt: true,
        updatedAt: true,
        member: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!task) return next(new AppError("Tâche introuvable.", 404));

    res.json({
      success: true,
      data: {
        task: {
          ...task,
          weekStart: asIsoDate(task.weekStart),
          dueDate: task.dueDate ? asIsoDate(task.dueDate) : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, note, done, memberId, position, priority, dueDate } = req.body as Record<
      string,
      unknown
    >;

    if (title !== undefined && !String(title).trim()) {
      return next(new AppError("La tâche ne peut pas être vide.", 400));
    }
    if (priority !== undefined && !PRIORITIES.includes(priority as never)) {
      return next(new AppError("Priorité inconnue.", 400));
    }

    /* A deadline is read as a plain date at UTC midnight, matching how the
     * column is stored. Parsing it in the server's local timezone would move
     * it a day for anyone not in that timezone. */
    let due: Date | null | undefined;
    if (dueDate !== undefined) {
      if (!dueDate) due = null;
      else if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        due = new Date(`${dueDate}T00:00:00Z`);
      } else {
        return next(new AppError("Date d'échéance invalide.", 400));
      }
    }

    const task = await prisma.teamTask.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(note !== undefined ? { note: note ? String(note).trim() : null } : {}),
        ...(memberId !== undefined ? { memberId: String(memberId) } : {}),
        ...(position !== undefined ? { position: Number(position) } : {}),
        ...(priority !== undefined ? { priority: priority as never } : {}),
        ...(due !== undefined ? { dueDate: due } : {}),
        ...(done !== undefined
          ? { done: Boolean(done), doneAt: done ? new Date() : null }
          : {}),
      },
      select: {
        id: true,
        memberId: true,
        title: true,
        note: true,
        priority: true,
        dueDate: true,
        done: true,
        doneAt: true,
        position: true,
      },
    });

    res.json({
      success: true,
      data: { task: { ...task, dueDate: task.dueDate ? asIsoDate(task.dueDate) : null } },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.teamTask.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
};

/**
 * Copies a week's unfinished tasks into the next one.
 *
 * What is actually wanted at the end of a week: the things that did not get
 * done do not disappear, and nobody retypes them. Finished tasks stay where
 * they were, as the record of that week.
 */
export const carryOver = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const from = weekFrom((req.body as { week?: string }).week);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 7);

    const pending = await prisma.teamTask.findMany({
      where: { weekStart: from, done: false },
      select: { memberId: true, title: true, note: true, position: true },
    });

    if (pending.length === 0) {
      return res.json({ success: true, data: { copied: 0, weekStart: asIsoDate(to) } });
    }

    // Skips anything already carried over, so pressing the button twice does
    // not duplicate the list.
    const existing = await prisma.teamTask.findMany({
      where: { weekStart: to },
      select: { memberId: true, title: true },
    });
    const seen = new Set(existing.map((t) => `${t.memberId}::${t.title}`));

    const fresh = pending.filter((t) => !seen.has(`${t.memberId}::${t.title}`));

    if (fresh.length > 0) {
      await prisma.teamTask.createMany({
        data: fresh.map((t) => ({
          memberId: t.memberId,
          title: t.title,
          note: t.note,
          weekStart: to,
          position: t.position,
          createdById: req.user!.id,
        })),
      });
    }

    res.json({ success: true, data: { copied: fresh.length, weekStart: asIsoDate(to) } });
  } catch (err) {
    next(err);
  }
};
