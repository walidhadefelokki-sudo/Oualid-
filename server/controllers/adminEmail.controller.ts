import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import {
  BroadcastContent,
  fillPlaceholders,
  sendAdminBroadcastEmail,
  stripPlaceholders,
} from "../utils/email";

/**
 * Admin-composed mail to selected accounts.
 *
 * The caller sends user ids, never addresses: an endpoint that mailed
 * whatever address it was handed would be an open relay wearing the
 * platform's branding and passing its SPF and DKIM.
 *
 * One request sends one batch. A Vercel function is killed at 60 seconds and
 * this SMTP server takes roughly two seconds per message, so the dashboard
 * loops over small batches and shows progress rather than opening one long
 * request that would die halfway with no record of where it got to.
 */

/** Comfortably inside the 60s function limit at ~2s a message. */
const MAX_BATCH = 12;

/** The same cap, applied to a grouped send, where it is one message. */
const MAX_BCC = 200;

type Mode = "individual" | "grouped";

interface SendBody extends BroadcastContent {
  userIds: string[];
  mode: Mode;
}

const asContent = (body: SendBody): BroadcastContent => ({
  subject: body.subject.trim(),
  body: body.body,
  buttonLabel: body.buttonLabel?.trim() || null,
  buttonUrl: body.buttonUrl?.trim() || null,
});

export const sendBroadcast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userIds, mode = "individual" } = req.body as SendBody;
    const content = asContent(req.body as SendBody);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: "Aucun destinataire." });
    }
    if (!content.subject) {
      return res.status(400).json({ success: false, message: "L'objet est obligatoire." });
    }
    if (!content.body?.trim()) {
      return res.status(400).json({ success: false, message: "Le message est vide." });
    }
    if (content.buttonLabel && !content.buttonUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Le bouton a un libellé mais pas de lien." });
    }

    const limit = mode === "grouped" ? MAX_BCC : MAX_BATCH;
    if (userIds.length > limit) {
      return res.status(400).json({
        success: false,
        message: `Lot trop grand : ${userIds.length} destinataires pour un maximum de ${limit}.`,
      });
    }

    // Addresses come from the database, and a deleted account is not written
    // to however it was selected.
    const recipients = await prisma.user.findMany({
      where: { id: { in: userIds }, status: { not: "DELETED" } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Aucun destinataire valide." });
    }

    if (mode === "grouped") {
      /* One message to everyone. Placeholders cannot be filled per person, so
       * they are stripped rather than delivered as literal {{prenom}}. */
      const flat: BroadcastContent = {
        ...content,
        subject: stripPlaceholders(content.subject),
        body: stripPlaceholders(content.body),
      };

      const sent = await sendAdminBroadcastEmail("info@darlemploi.dz", flat, {
        bcc: recipients.map((r) => r.email),
      });

      return res.json({
        success: true,
        data: {
          mode,
          sent: sent ? recipients.length : 0,
          failed: sent ? 0 : recipients.length,
          results: recipients.map((r) => ({ id: r.id, email: r.email, ok: sent })),
        },
      });
    }

    // Individual: one message each, personalised, addressed only to them.
    const results: Array<{ id: string; email: string; ok: boolean; error?: string }> = [];

    for (const r of recipients) {
      try {
        const ok = await sendAdminBroadcastEmail(r.email, {
          ...content,
          subject: fillPlaceholders(content.subject, r),
          body: fillPlaceholders(content.body, r),
        });
        results.push({ id: r.id, email: r.email, ok });
      } catch (err) {
        results.push({
          id: r.id,
          email: r.email,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return res.json({
      success: true,
      data: {
        mode,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Sends the composed message to one address, so the admin can see it before
 * several hundred people do.
 */
export const sendBroadcastPreview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { to } = req.body as { to?: string };
    const content = asContent(req.body as SendBody);

    if (!to?.trim()) {
      return res.status(400).json({ success: false, message: "Adresse de test manquante." });
    }
    if (!content.subject || !content.body?.trim()) {
      return res.status(400).json({ success: false, message: "Objet ou message manquant." });
    }

    // Placeholders are shown filled with the admin's own details, so the test
    // reads the way a recipient's copy will.
    const admin = { email: to.trim(), firstName: "Test", lastName: "Dar L'Emploi" };

    const ok = await sendAdminBroadcastEmail(to.trim(), {
      ...content,
      subject: fillPlaceholders(content.subject, admin),
      body: fillPlaceholders(content.body, admin),
    });

    return res.json({ success: ok, data: { sent: ok } });
  } catch (err) {
    next(err);
  }
};
