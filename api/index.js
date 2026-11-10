// GENERATED FILE - DO NOT EDIT. Run: npm run build:api
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// server/utils/prisma.ts
var prisma_exports = {};
__export(prisma_exports, {
  default: () => prisma_default
});
import { PrismaClient } from "@prisma/client";
var globalForPrisma, prisma, prisma_default;
var init_prisma = __esm({
  "server/utils/prisma.ts"() {
    globalForPrisma = globalThis;
    prisma = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = prisma;
    }
    prisma_default = prisma;
  }
});

// server/services/credits.service.ts
var credits_service_exports = {};
__export(credits_service_exports, {
  InsufficientCreditsError: () => InsufficientCreditsError,
  default: () => credits_service_default,
  getBalance: () => getBalance,
  getCreditCosts: () => getCreditCosts,
  getOrCreateWallet: () => getOrCreateWallet,
  grant: () => grant,
  history: () => history,
  move: () => move,
  refundFor: () => refundFor,
  spend: () => spend
});
import { CreditEntryType, Prisma as Prisma2 } from "@prisma/client";
var InsufficientCreditsError, getOrCreateWallet, getBalance, move, spend, grant, refundFor, history, getCreditCosts, credits_service_default;
var init_credits_service = __esm({
  "server/services/credits.service.ts"() {
    init_prisma();
    InsufficientCreditsError = class extends Error {
      constructor(required, available) {
        super(`Insufficient credits: ${required} required, ${available} available`);
        this.required = required;
        this.available = available;
        this.name = "InsufficientCreditsError";
      }
    };
    getOrCreateWallet = async (userId, tx = prisma_default) => {
      const existing = await tx.creditWallet.findUnique({ where: { userId } });
      if (existing) return existing;
      try {
        return await tx.creditWallet.create({ data: { userId } });
      } catch (err) {
        if (err instanceof Prisma2.PrismaClientKnownRequestError && err.code === "P2002") {
          const wallet = await tx.creditWallet.findUnique({ where: { userId } });
          if (wallet) return wallet;
        }
        throw err;
      }
    };
    getBalance = async (userId) => {
      const wallet = await prisma_default.creditWallet.findUnique({
        where: { userId },
        select: { balance: true }
      });
      return wallet?.balance ?? 0;
    };
    move = async (input) => {
      const { userId, delta, type, idempotencyKey, referenceType, referenceId, note, createdById } = input;
      if (!Number.isInteger(delta)) throw new Error("Credit delta must be a whole number");
      if (delta === 0) throw new Error("Credit delta must not be zero");
      if (idempotencyKey) {
        const seen = await prisma_default.creditLedgerEntry.findUnique({
          where: { idempotencyKey },
          select: { id: true, balanceAfter: true }
        });
        if (seen) return { balance: seen.balanceAfter, entryId: seen.id, replayed: true };
      }
      try {
        return await prisma_default.$transaction(
          async (tx) => {
            const wallet = await getOrCreateWallet(userId, tx);
            const next = wallet.balance + delta;
            if (next < 0) throw new InsufficientCreditsError(Math.abs(delta), wallet.balance);
            const entry = await tx.creditLedgerEntry.create({
              data: {
                walletId: wallet.id,
                type,
                delta,
                balanceAfter: next,
                idempotencyKey,
                referenceType,
                referenceId,
                note,
                createdById
              },
              select: { id: true }
            });
            await tx.creditWallet.update({
              where: { id: wallet.id },
              data: { balance: next }
            });
            return { balance: next, entryId: entry.id, replayed: false };
          },
          { isolationLevel: Prisma2.TransactionIsolationLevel.Serializable }
        );
      } catch (err) {
        if (idempotencyKey && err instanceof Prisma2.PrismaClientKnownRequestError && err.code === "P2002") {
          const winner = await prisma_default.creditLedgerEntry.findUnique({
            where: { idempotencyKey },
            select: { id: true, balanceAfter: true }
          });
          if (winner) return { balance: winner.balanceAfter, entryId: winner.id, replayed: true };
        }
        throw err;
      }
    };
    spend = async (input) => {
      if (input.amount <= 0) throw new Error("Spend amount must be positive");
      return move({ ...input, delta: -input.amount });
    };
    grant = async (input) => {
      if (input.amount <= 0) throw new Error("Grant amount must be positive");
      return move({ ...input, delta: input.amount });
    };
    refundFor = async (referenceType, referenceId, note) => {
      const original = await prisma_default.creditLedgerEntry.findFirst({
        where: { referenceType, referenceId, delta: { lt: 0 } },
        orderBy: { createdAt: "asc" },
        select: { id: true, delta: true, wallet: { select: { userId: true } } }
      });
      if (!original) return null;
      return grant({
        userId: original.wallet.userId,
        amount: Math.abs(original.delta),
        type: CreditEntryType.REFUND,
        // Derived from the entry being refunded, so a second attempt to refund
        // the same spend is a replay rather than a second payout.
        idempotencyKey: `refund:${original.id}`,
        referenceType,
        referenceId,
        note
      });
    };
    history = async (userId, page = 1, pageSize = 25) => {
      const wallet = await prisma_default.creditWallet.findUnique({
        where: { userId },
        select: { id: true, balance: true }
      });
      if (!wallet) return { balance: 0, entries: [], total: 0, page, pageSize, totalPages: 1 };
      const [total, entries] = await Promise.all([
        prisma_default.creditLedgerEntry.count({ where: { walletId: wallet.id } }),
        prisma_default.creditLedgerEntry.findMany({
          where: { walletId: wallet.id },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            type: true,
            delta: true,
            balanceAfter: true,
            note: true,
            referenceType: true,
            referenceId: true,
            createdAt: true
          }
        })
      ]);
      return {
        balance: wallet.balance,
        entries,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      };
    };
    getCreditCosts = async () => {
      const keys = [
        "freelance.credits.servicePublication",
        "freelance.credits.proposal",
        "freelance.service.durationDays",
        "freelance.trial.services",
        "freelance.trial.proposals"
      ];
      const rows = await prisma_default.platformSetting.findMany({ where: { key: { in: keys } } });
      const read = (key, fallback) => {
        const raw = rows.find((r) => r.key === key)?.value;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : fallback;
      };
      return {
        servicePublication: read("freelance.credits.servicePublication", 10),
        proposal: read("freelance.credits.proposal", 2),
        serviceDurationDays: read("freelance.service.durationDays", 30),
        trialServices: read("freelance.trial.services", 1),
        trialProposals: read("freelance.trial.proposals", 5)
      };
    };
    credits_service_default = {
      getOrCreateWallet,
      getBalance,
      move,
      spend,
      grant,
      refundFor,
      history,
      getCreditCosts,
      InsufficientCreditsError
    };
  }
});

// server/services/plans.service.ts
var plans_service_exports = {};
__export(plans_service_exports, {
  PlanLimitError: () => PlanLimitError,
  assertCanPublishService: () => assertCanPublishService,
  consumeProposalQuota: () => consumeProposalQuota,
  default: () => plans_service_default,
  getEntitlements: () => getEntitlements,
  resolveProposalCharge: () => resolveProposalCharge
});
import { FreelancePlanTier } from "@prisma/client";
var FREE_FALLBACK, statsFor, monthAfter, currentPeriod, getEntitlements, PlanLimitError, assertCanPublishService, resolveProposalCharge, consumeProposalQuota, plans_service_default;
var init_plans_service = __esm({
  "server/services/plans.service.ts"() {
    init_prisma();
    FREE_FALLBACK = {
      tier: FreelancePlanTier.FREE,
      name: "Gratuit",
      maxActiveServices: 1,
      monthlyProposals: null,
      maxPortfolioProjects: 6,
      prioritySearch: false,
      removableBranding: false,
      customSubdomain: false,
      weeklyBoosts: 0
    };
    statsFor = (tier) => tier === "PREMIUM" || tier === "AGENCY" ? "full" : tier === "PRO" ? "basic" : "none";
    monthAfter = (d) => {
      const end = new Date(d);
      end.setMonth(end.getMonth() + 1);
      return end;
    };
    currentPeriod = (startedAt) => {
      const now = /* @__PURE__ */ new Date();
      if (now < monthAfter(startedAt)) return { periodStartedAt: startedAt, rolled: false };
      const next = new Date(startedAt);
      while (now >= monthAfter(next)) next.setMonth(next.getMonth() + 1);
      return { periodStartedAt: next, rolled: true };
    };
    getEntitlements = async (freelancerId) => {
      const now = /* @__PURE__ */ new Date();
      const subscription = await prisma_default.freelanceSubscription.findFirst({
        where: { freelancerId, status: "ACTIVE", endsAt: { gt: now } },
        orderBy: { endsAt: "desc" },
        include: { plan: true }
      });
      let proposalsUsed = subscription?.proposalsUsedThisPeriod ?? 0;
      if (subscription) {
        const { periodStartedAt, rolled } = currentPeriod(subscription.periodStartedAt);
        if (rolled) {
          await prisma_default.freelanceSubscription.update({
            where: { id: subscription.id },
            data: { periodStartedAt, proposalsUsedThisPeriod: 0 }
          });
          proposalsUsed = 0;
        }
      }
      const plan = subscription?.plan ?? await prisma_default.freelancePlan.findUnique({
        where: { tier: FreelancePlanTier.FREE }
      });
      const p = plan ?? FREE_FALLBACK;
      const tier = p.tier;
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      const [activeServices, portfolioProjects, boostsUsedThisWeek] = await Promise.all([
        prisma_default.serviceListing.count({
          where: {
            freelancerId,
            // A paused or expired listing is not occupying a slot.
            status: "PUBLISHED",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
          }
        }),
        prisma_default.portfolioProject.count({ where: { portfolio: { freelancerId } } }),
        prisma_default.boost.count({ where: { freelancerId, createdAt: { gte: weekAgo } } })
      ]);
      const monthlyProposals = p.monthlyProposals ?? null;
      return {
        tier,
        planName: p.name,
        subscriptionId: subscription?.id ?? null,
        renewsAt: subscription?.endsAt ?? null,
        maxActiveServices: p.maxActiveServices ?? null,
        activeServices,
        canPublishService: p.maxActiveServices == null || activeServices < p.maxActiveServices,
        monthlyProposals,
        proposalsUsedThisPeriod: proposalsUsed,
        proposalsRemaining: monthlyProposals == null ? null : Math.max(0, monthlyProposals - proposalsUsed),
        maxPortfolioProjects: p.maxPortfolioProjects ?? null,
        portfolioProjects,
        prioritySearch: p.prioritySearch,
        removableBranding: p.removableBranding,
        customSubdomain: p.customSubdomain,
        weeklyBoosts: p.weeklyBoosts,
        boostsUsedThisWeek,
        stats: statsFor(tier)
      };
    };
    PlanLimitError = class extends Error {
      constructor(message, limit, used) {
        super(message);
        this.limit = limit;
        this.used = used;
        this.name = "PlanLimitError";
      }
    };
    assertCanPublishService = async (freelancerId) => {
      const e = await getEntitlements(freelancerId);
      if (!e.canPublishService) {
        throw new PlanLimitError(
          `La formule ${e.planName} permet ${e.maxActiveServices} service(s) en ligne. Mettez un service en pause ou changez de formule.`,
          e.maxActiveServices,
          e.activeServices
        );
      }
      return e;
    };
    resolveProposalCharge = async (freelancerId) => {
      const e = await getEntitlements(freelancerId);
      if (e.subscriptionId && e.proposalsRemaining !== null && e.proposalsRemaining > 0) {
        return { method: "quota", subscriptionId: e.subscriptionId };
      }
      return { method: "credits", subscriptionId: null };
    };
    consumeProposalQuota = async (subscriptionId) => {
      await prisma_default.freelanceSubscription.update({
        where: { id: subscriptionId },
        data: { proposalsUsedThisPeriod: { increment: 1 } }
      });
    };
    plans_service_default = {
      getEntitlements,
      assertCanPublishService,
      resolveProposalCharge,
      consumeProposalQuota,
      PlanLimitError
    };
  }
});

// server/app.ts
import express4 from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv3 from "dotenv";
import cookieParser from "cookie-parser";

// server/config/passport.ts
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

// server/config/oauth.ts
import dotenv from "dotenv";
dotenv.config();
var getFrontendUrl = () => (process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5000").replace(/\/$/, "");
var getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL?.trim();
  if (!clientId || !clientSecret || !callbackUrl) {
    return null;
  }
  return { clientId, clientSecret, callbackUrl };
};
var getGoogleConfigError = () => {
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_CALLBACK_URL"].filter((key) => !process.env[key]?.trim());
  if (missing.length === 0) return null;
  return `Google sign-in is not configured: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set.`;
};
var isGoogleOAuthConfigured = () => getGoogleOAuthConfig() !== null;

// server/config/passport.ts
function configureGoogleStrategy() {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return false;
  }
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackUrl,
        // Only what is needed to identify the person (§10). No Drive, Gmail,
        // Contacts or Calendar.
        scope: ["profile", "email"]
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false, {
              message: "Google did not provide an email address for this account."
            });
          }
          const emailVerified = profile.emails?.[0]?.verified === true || profile._json?.email_verified === true;
          const identity = {
            providerAccountId: profile.id,
            email: email.toLowerCase(),
            emailVerified,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            picture: profile.photos?.[0]?.value
          };
          return done(null, identity);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  return true;
}
var passport_default = passport;

// server/routes/auth.routes.ts
import { Router } from "express";

// server/controllers/auth.controller.ts
init_prisma();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// server/utils/companyName.ts
var companyNameFrom = (companyName, email) => {
  const given = typeof companyName === "string" ? companyName.trim() : "";
  if (given) return given;
  const local = email.split("@")[0]?.trim();
  return local || "Entreprise";
};

// server/middleware/error.middleware.ts
var errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Error] ${err.message}`);
  res.status(statusCode).json({
    status: "error",
    statusCode,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : void 0
  });
};
var AppError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
};

// server/utils/email.ts
import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv2 from "dotenv";
dotenv2.config();
var resendApiKey = process.env.RESEND_API_KEY?.trim();
var resend = resendApiKey ? new Resend(resendApiKey) : null;
var smtpHost = process.env.SMTP_HOST?.trim();
var smtpPort = Number(process.env.SMTP_PORT) || 465;
var smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : smtpPort === 465;
var transporter = smtpHost ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
var emailTransportName = smtpHost ? `smtp:${smtpHost}:${smtpPort}` : resend ? "resend" : "gmail";
var APP_URL = process.env.APP_URL || "https://www.darlemploi.dz";
var FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_USER;
var FROM_NAME = "Dar L'Emploi";
var FROM_REGISTER = process.env.EMAIL_FROM_REGISTER?.trim() || FROM_ADDRESS;
var FROM_INFO = process.env.EMAIL_FROM_INFO?.trim() || FROM_ADDRESS;
var formatDate = (date2 = /* @__PURE__ */ new Date()) => date2.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
var detailRow = (icon, label, value) => `
  <tr>
    <td style="padding:6px 0;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      <span style="display:inline-block;width:22px;">${icon}</span>
      <strong style="color:${BRAND.navy};">${label}</strong>&nbsp;${value}
    </td>
  </tr>`;
var detailBlock = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
    <tr><td style="padding:18px 20px;"><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
  </table>`;
var iconList = (items) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    ${items.map(
  ([icon, text]) => `<tr><td style="padding:5px 0;color:${BRAND.ink};font-size:15px;line-height:1.6;">
          <span style="display:inline-block;width:24px;">${icon}</span>${text}</td></tr>`
).join("")}
  </table>`;
var BRAND = {
  navy: "#173E7D",
  orange: "#F68D58",
  ink: "#2B3442",
  muted: "#6B7686",
  rule: "#E4E8EE",
  ground: "#F5F7FA"
};
var layout = (heading, body) => `
<div style="margin:0;padding:0;background:${BRAND.ground};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.ground};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.rule};border-radius:12px;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

          <tr>
            <td style="background:${BRAND.navy};padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">Dar L'emploi</p>
              <p style="margin:4px 0 0;color:#AFC3E4;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Plateforme de recrutement</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;color:${BRAND.navy};font-size:22px;font-weight:700;line-height:1.3;">${heading}</h1>
              ${body}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;background:#FAFBFC;border-top:1px solid ${BRAND.rule};">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">
                Dar L'emploi &middot; Saint Jean, Constantine, Alg&eacute;rie<br>
                <a href="tel:+213542982346" style="color:${BRAND.muted};text-decoration:none;">+213 (0)542 98 23 46</a>
              </p>
              <p style="margin:10px 0 0;color:#9BA5B4;font-size:11px;">
                &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Dar L'emploi. Tous droits r&eacute;serv&eacute;s.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>`;
var button = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:${BRAND.navy};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;
var secondaryButton = (href, label) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="border:1.5px solid ${BRAND.navy};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:12px 26px;color:${BRAND.navy};font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;
var escapeForEmail = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var paragraph = (text) => `<p style="margin:0 0 14px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${text}</p>`;
var sendEmail = async (to, subject, html, options = {}) => {
  const requested = options.from ?? FROM_ADDRESS;
  const from = `"${FROM_NAME}" <${requested}>`;
  if (smtpHost) {
    const attempt = async (sender) => transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
      ...options.text ? { text: options.text } : {},
      ...options.replyTo ? { replyTo: options.replyTo } : {},
      ...options.bcc?.length ? { bcc: options.bcc } : {}
    });
    try {
      const info = await attempt(from);
      console.log(`Mail to ${to} sent via ${smtpHost}: ${info.messageId}`);
      return true;
    } catch (error) {
      const detail2 = error instanceof Error ? error.message : String(error);
      const senderRejected = /Verification failed for|No Such User Here|Sender address rejected|\b550\b/i.test(detail2);
      if (senderRejected && requested !== FROM_ADDRESS && FROM_ADDRESS) {
        console.warn(
          `Sender ${requested} was rejected by ${smtpHost} \u2014 it is not a mailbox on this domain. Retrying as ${FROM_ADDRESS}. Fix EMAIL_FROM_REGISTER / EMAIL_FROM_INFO.`
        );
        try {
          const info = await attempt(`"${FROM_NAME}" <${FROM_ADDRESS}>`);
          console.log(`Mail to ${to} sent via ${smtpHost} as ${FROM_ADDRESS}: ${info.messageId}`);
          return true;
        } catch (retryError) {
          console.error(`Retry as ${FROM_ADDRESS} also failed:`, retryError);
        }
      } else {
        console.error(`SMTP send to ${to} failed via ${smtpHost}:`, error);
      }
      if (!resend) return false;
      console.warn("Falling back to Resend.");
    }
  }
  if (resend) {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...options.text ? { text: options.text } : {},
      ...options.replyTo ? { replyTo: options.replyTo } : {},
      ...options.bcc?.length ? { bcc: options.bcc } : {}
    });
    if (error) {
      console.error(
        `Email to ${to} was NOT sent (Resend ${error.name}): ${error.message}`
      );
      return false;
    }
    console.log("Message sent via Resend: %s", data?.id);
    return true;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("--- Email simulation (no SMTP_HOST, no RESEND_API_KEY) ---");
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("----------------------------------------------------------");
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...options.text ? { text: options.text } : {},
      ...options.replyTo ? { replyTo: options.replyTo } : {},
      ...options.bcc?.length ? { bcc: options.bcc } : {}
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error(`Email to ${to} was NOT sent:`, error);
    return false;
  }
};
var confirmBlock = (verifyUrl) => verifyUrl ? `
    ${paragraph(
  `Avant tout, confirmez votre adresse e-mail. Ce lien est valable 48&nbsp;heures.`
)}
    ${button(verifyUrl, "Confirmer mon adresse e-mail")}` : "";
var confirmLines = (verifyUrl) => verifyUrl ? [
  "Avant tout, confirmez votre adresse e-mail (lien valable 48 heures) :",
  verifyUrl,
  ""
] : [];
var sendCandidateWelcomeEmail = async (email, firstName, verifyUrl) => {
  const greeting = firstName?.trim() || "et bienvenue";
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(`<strong>Bienvenue sur Dar L'Emploi&nbsp;!</strong>`)}
    ${confirmBlock(verifyUrl)}
    ${paragraph(
    `Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez maintenant d&eacute;couvrir des opportunit&eacute;s professionnelles adapt&eacute;es &agrave; votre profil et postuler en quelques clics.`
  )}

    ${iconList([
    ["&#128188;", "Explorez les offres"],
    ["&#127919;", "Trouvez celles qui correspondent &agrave; votre profil"],
    ["&#9889;", "Postulez simplement et rapidement"]
  ])}

    ${paragraph(
    `Une premi&egrave;re &eacute;tape&nbsp;: compl&eacute;tez votre profil et ajoutez votre CV. Les recruteurs ne voient que les candidats qui en ont un.`
  )}

    ${button(`${APP_URL}/dashboard?tab=profile`, "Compl&eacute;tez votre profil et t&eacute;l&eacute;versez votre CV")}

    ${paragraph(`Vous n'avez pas encore de CV&nbsp;? Cr&eacute;ez-en un gratuitement en quelques minutes.`)}

    ${secondaryButton(`${APP_URL}/dashboard?tab=cv-maker`, "Cr&eacute;er mon CV avec CV Maker")}

    ${paragraph(`&Agrave; bient&ocirc;t sur Dar L'Emploi,`)}`;
  const text = [
    `Bonjour ${greeting},`,
    "",
    "Bienvenue sur Dar L'Emploi !",
    "",
    ...confirmLines(verifyUrl),
    "Votre compte a \xE9t\xE9 cr\xE9\xE9 avec succ\xE8s. Vous pouvez maintenant d\xE9couvrir des opportunit\xE9s professionnelles adapt\xE9es \xE0 votre profil et postuler en quelques clics.",
    "",
    "- Explorez les offres",
    "- Trouvez celles qui correspondent \xE0 votre profil",
    "- Postulez simplement et rapidement",
    "",
    "Une premi\xE8re \xE9tape : compl\xE9tez votre profil et ajoutez votre CV. Les recruteurs ne voient que les candidats qui en ont un.",
    `${APP_URL}/dashboard?tab=profile`,
    "",
    "Vous n'avez pas encore de CV ? Cr\xE9ez-en un gratuitement en quelques minutes :",
    `${APP_URL}/dashboard?tab=cv-maker`,
    "",
    "\xC0 bient\xF4t sur Dar L'Emploi,"
  ].join("\n");
  return sendEmail(
    email,
    "Bienvenue sur Dar L'Emploi \u2014 Votre recherche commence maintenant \u{1F680}",
    layout("Bienvenue sur Dar L'Emploi", body),
    { from: FROM_REGISTER, text }
  );
};
var sendRecruiterWelcomeEmail = async (email, companyName, verifyUrl) => {
  const greeting = companyName?.trim() || "et bienvenue";
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(`<strong>Bienvenue sur Dar L'Emploi&nbsp;!</strong>`)}
    ${confirmBlock(verifyUrl)}
    ${paragraph(
    `Votre compte entreprise a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&egrave;s maintenant publier votre premi&egrave;re offre d'emploi <strong>gratuitement</strong> et commencer &agrave; recevoir des candidatures de profils correspondant &agrave; vos besoins.`
  )}

    ${iconList([
    ["&#128640;", "Votre premi&egrave;re offre est offerte"],
    ["&#128101;", "Recevez des candidatures qualifi&eacute;es"],
    ["&#9889;", "G&eacute;rez vos recrutements simplement depuis votre espace entreprise"]
  ])}

    ${paragraph(`Votre prochain collaborateur est peut-&ecirc;tre d&eacute;j&agrave; sur Dar L'Emploi.`)}

    ${button(
    `${APP_URL}/dashboard?tab=post-job`,
    "Publier votre premi&egrave;re offre gratuitement"
  )}

    ${paragraph(`Merci de votre confiance.`)}`;
  const text = [
    `Bonjour ${greeting},`,
    "",
    "Bienvenue sur Dar L'Emploi !",
    "",
    ...confirmLines(verifyUrl),
    "Votre compte entreprise a \xE9t\xE9 cr\xE9\xE9 avec succ\xE8s. Vous pouvez d\xE8s maintenant publier votre premi\xE8re offre d'emploi gratuitement et commencer \xE0 recevoir des candidatures de profils correspondant \xE0 vos besoins.",
    "",
    "- Votre premi\xE8re offre est offerte",
    "- Recevez des candidatures qualifi\xE9es",
    "- G\xE9rez vos recrutements simplement depuis votre espace entreprise",
    "",
    "Votre prochain collaborateur est peut-\xEAtre d\xE9j\xE0 sur Dar L'Emploi.",
    "",
    "Publier votre premi\xE8re offre gratuitement :",
    `${APP_URL}/dashboard?tab=post-job`,
    "",
    "Merci de votre confiance."
  ].join("\n");
  return sendEmail(
    email,
    "Bienvenue sur Dar L'Emploi \u2014 Votre premi\xE8re offre est gratuite \u{1F389}",
    layout("Bienvenue sur Dar L'Emploi", body),
    { from: FROM_REGISTER, text }
  );
};
var signature = () => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;border-top:1px solid ${BRAND.rule};">
    <tr>
      <td style="padding-top:18px;">
        <p style="margin:0;color:${BRAND.navy};font-size:15px;font-weight:700;">L'&eacute;quipe Dar L'Emploi</p>
        <p style="margin:4px 0 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">
          <a href="${APP_URL}" style="color:${BRAND.navy};text-decoration:none;">www.darlemploi.dz</a>
          &nbsp;&middot;&nbsp;
          <a href="mailto:info@darlemploi.dz" style="color:${BRAND.muted};text-decoration:none;">info@darlemploi.dz</a>
        </p>
      </td>
    </tr>
  </table>`;
var bodyToParagraphs = (body) => body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).map((block) => paragraph(escapeForEmail(block).replace(/\n/g, "<br>"))).join("");
var stripPlaceholders = (template) => fillPlaceholders(template, { email: "", firstName: "", lastName: "" }).replace(/[ \t]+([,.;:!?])/g, "$1").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/gm, "");
var fillPlaceholders = (template, recipient) => template.replace(/\{\{\s*prenom\s*\}\}/gi, recipient.firstName?.trim() || "").replace(/\{\{\s*nom\s*\}\}/gi, recipient.lastName?.trim() || "").replace(/\{\{\s*email\s*\}\}/gi, recipient.email);
var sendAdminBroadcastEmail = async (to, content, options = {}) => {
  const hasButton = Boolean(content.buttonLabel?.trim() && content.buttonUrl?.trim());
  const html = layout(
    escapeForEmail(content.subject),
    `${bodyToParagraphs(content.body)}
     ${hasButton ? button(content.buttonUrl.trim(), escapeForEmail(content.buttonLabel.trim())) : ""}
     ${signature()}`
  );
  const text = [
    content.body.trim(),
    "",
    ...hasButton ? [`${content.buttonLabel.trim()} : ${content.buttonUrl.trim()}`, ""] : [],
    "L'\xE9quipe Dar L'Emploi",
    "www.darlemploi.dz \xB7 info@darlemploi.dz"
  ].join("\n");
  return sendEmail(to, content.subject, html, {
    from: FROM_INFO,
    replyTo: "info@darlemploi.dz",
    text,
    ...options.bcc?.length ? { bcc: options.bcc } : {}
  });
};
var sendWelcomeEmail = async (email, name2, role, verifyUrl) => role === "RECRUITER" ? sendRecruiterWelcomeEmail(email, name2, verifyUrl) : sendCandidateWelcomeEmail(email, name2, verifyUrl);
var sendVerifyEmail = async (email, firstName, verifyUrl) => {
  if (!verifyUrl) return false;
  const greeting = firstName?.trim() || "bonjour";
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
    `Confirmez votre adresse e-mail pour activer votre compte Dar L'Emploi. Ce lien est valable 48&nbsp;heures.`
  )}
    ${button(verifyUrl, "Confirmer mon adresse e-mail")}
    ${paragraph(
    `Si vous n'avez pas cr&eacute;&eacute; de compte sur Dar L'Emploi, ignorez simplement ce message.`
  )}`;
  const text = [
    `Bonjour ${greeting},`,
    "",
    "Confirmez votre adresse e-mail pour activer votre compte Dar L'Emploi.",
    "Ce lien est valable 48 heures :",
    verifyUrl,
    "",
    "Si vous n'avez pas cr\xE9\xE9 de compte sur Dar L'Emploi, ignorez simplement ce message."
  ].join("\n");
  return sendEmail(
    email,
    "Confirmez votre adresse e-mail \u2014 Dar L'Emploi",
    layout("Confirmez votre adresse", body),
    { from: FROM_REGISTER, text }
  );
};
var sendApplicationSentEmail = async (email, details) => {
  const greeting = details.firstName?.trim() || "et merci";
  const city = details.city?.trim() || "Non pr&eacute;cis&eacute;e";
  const date2 = formatDate(details.appliedAt);
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
    `Votre candidature pour le poste de &laquo;&nbsp;<strong>${details.jobTitle}</strong>&nbsp;&raquo; aupr&egrave;s de <strong>${details.company}</strong> a bien &eacute;t&eacute; envoy&eacute;e.`
  )}

    ${detailBlock(
    detailRow("&#128204;", "Poste", details.jobTitle) + detailRow("&#127970;", "Entreprise", details.company) + detailRow("&#128205;", "Localisation", city) + detailRow("&#128197;", "Date", date2)
  )}

    ${paragraph(
    `Votre profil a &eacute;t&eacute; transmis &agrave; l'entreprise. Si celle-ci souhaite poursuivre le processus de recrutement, elle pourra vous contacter directement.`
  )}
    ${paragraph(`En attendant, continuez &agrave; explorer les opportunit&eacute;s disponibles sur Dar L'Emploi.`)}

    ${button(APP_URL, "Voir d'autres offres")}

    ${paragraph(
    `<em>Une candidature aujourd'hui peut devenir une opportunit&eacute; demain.</em><br>Bonne chance&nbsp;! &#127808;`
  )}`;
  const text = [
    `Bonjour ${greeting},`,
    "",
    `Votre candidature pour le poste de \xAB ${details.jobTitle} \xBB aupr\xE8s de ${details.company} a bien \xE9t\xE9 envoy\xE9e.`,
    "",
    `Poste : ${details.jobTitle}`,
    `Entreprise : ${details.company}`,
    `Localisation : ${details.city ?? "Non pr\xE9cis\xE9e"}`,
    `Date : ${date2}`,
    "",
    "Votre profil a \xE9t\xE9 transmis \xE0 l'entreprise. Si celle-ci souhaite poursuivre le processus de recrutement, elle pourra vous contacter directement.",
    "",
    "En attendant, continuez \xE0 explorer les opportunit\xE9s disponibles sur Dar L'Emploi.",
    APP_URL,
    "",
    "Bonne chance !"
  ].join("\n");
  return sendEmail(
    email,
    `Candidature envoy\xE9e avec succ\xE8s \u2014 ${details.jobTitle} \u2705`,
    layout("Candidature envoy&eacute;e", body),
    { from: FROM_INFO, text }
  );
};
var COVER_LETTER_PREVIEW = 400;
var sendNewApplicationEmail = async (email, details) => {
  const escaped = (value, fallback) => {
    const trimmed = value?.trim();
    return trimmed ? escapeForEmail(trimmed) : fallback;
  };
  const greeting = escaped(details.recruiterFirstName, "bonjour");
  const candidate = escaped(details.candidateName, "Un candidat");
  const jobTitle = escapeForEmail(details.jobTitle);
  const company = escaped(details.company, "votre entreprise");
  const city = escaped(details.city, "Non pr\xE9cis\xE9e");
  const date2 = formatDate(details.appliedAt);
  const letter = details.coverLetter?.trim();
  const preview = letter ? escapeForEmail(
    letter.length > COVER_LETTER_PREVIEW ? `${letter.slice(0, COVER_LETTER_PREVIEW)}\u2026` : letter
  ).replace(/\n/g, "<br>") : null;
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
    `<strong>${candidate}</strong> vient de postuler &agrave; votre offre &laquo;&nbsp;<strong>${jobTitle}</strong>&nbsp;&raquo;.`
  )}

    ${detailBlock(
    detailRow("&#128100;", "Candidat", candidate) + detailRow("&#128204;", "Poste", jobTitle) + detailRow("&#127970;", "Entreprise", company) + detailRow("&#128205;", "Localisation", city) + detailRow("&#128197;", "Re&ccedil;ue le", date2)
  )}

    ${preview ? paragraph(
    `<strong style="color:#173E7D;">Lettre de motivation</strong><br><em>${preview}</em>`
  ) : ""}

    ${paragraph(
    `Son CV et son analyse de correspondance vous attendent dans votre espace recruteur.`
  )}

    ${button(`${APP_URL}/dashboard?tab=candidates`, "Voir la candidature")}

    ${paragraph(
    `<em>Les candidats qui re&ccedil;oivent une r&eacute;ponse rapide sont ceux qui restent disponibles.</em>`
  )}`;
  const text = [
    `Bonjour ${details.recruiterFirstName?.trim() || "bonjour"},`,
    "",
    `${details.candidateName} vient de postuler \xE0 votre offre \xAB ${details.jobTitle} \xBB.`,
    "",
    `Candidat : ${details.candidateName}`,
    `Poste : ${details.jobTitle}`,
    `Entreprise : ${details.company ?? "votre entreprise"}`,
    `Localisation : ${details.city ?? "Non pr\xE9cis\xE9e"}`,
    `Re\xE7ue le : ${date2}`,
    ...letter ? [
      "",
      "Lettre de motivation :",
      letter.length > COVER_LETTER_PREVIEW ? `${letter.slice(0, COVER_LETTER_PREVIEW)}\u2026` : letter
    ] : [],
    "",
    "Son CV et son analyse de correspondance vous attendent dans votre espace recruteur :",
    `${APP_URL}/dashboard?tab=candidates`
  ].join("\n");
  return sendEmail(
    email,
    `Nouvelle candidature \u2014 ${details.jobTitle} \u{1F4E9}`,
    layout("Nouvelle candidature", body),
    { from: FROM_INFO, text }
  );
};
var sendJobPublishedEmail = async (email, details) => {
  const greeting = details.companyName?.trim() || "et merci";
  const city = details.city?.trim() || "Non pr&eacute;cis&eacute;e";
  const date2 = formatDate(details.publishedAt);
  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
    `Votre offre &laquo;&nbsp;<strong>${details.jobTitle}</strong>&nbsp;&raquo; a &eacute;t&eacute; publi&eacute;e avec succ&egrave;s sur Dar L'Emploi.`
  )}
    ${paragraph(`Elle est maintenant visible par les candidats correspondant &agrave; vos crit&egrave;res.`)}

    <p style="margin:0 0 6px;color:${BRAND.navy};font-size:15px;font-weight:700;">D&eacute;tails de votre offre</p>
    ${detailBlock(
    detailRow("&#128204;", "Poste", details.jobTitle) + detailRow("&#128205;", "Localisation", city) + detailRow("&#128197;", "Date de publication", date2)
  )}

    ${paragraph(
    `Vous pouvez suivre les candidatures et consulter les profils des candidats directement depuis votre espace entreprise.`
  )}

    ${button(APP_URL, "Voir mes candidatures")}

    ${paragraph(
    `Dar L'Emploi vous accompagne pour trouver le bon profil, simplement et rapidement.<br>Merci de votre confiance.`
  )}`;
  const text = [
    `Bonjour ${greeting},`,
    "",
    `Votre offre \xAB ${details.jobTitle} \xBB a \xE9t\xE9 publi\xE9e avec succ\xE8s sur Dar L'Emploi.`,
    "Elle est maintenant visible par les candidats correspondant \xE0 vos crit\xE8res.",
    "",
    "D\xE9tails de votre offre",
    `Poste : ${details.jobTitle}`,
    `Localisation : ${details.city ?? "Non pr\xE9cis\xE9e"}`,
    `Date de publication : ${date2}`,
    "",
    "Vous pouvez suivre les candidatures et consulter les profils des candidats directement depuis votre espace entreprise.",
    APP_URL,
    "",
    "Merci de votre confiance."
  ].join("\n");
  return sendEmail(
    email,
    "Votre offre d'emploi est publi\xE9e avec succ\xE8s \u2705",
    layout("Offre publi&eacute;e", body),
    { from: FROM_INFO, text }
  );
};
var sendJobMatchEmail = async (email, jobTitle, company, jobId) => {
  const body = `
    ${paragraph(`Une nouvelle offre correspond &agrave; votre profil&nbsp;:`)}

    ${detailBlock(
    detailRow("&#128204;", "Poste", jobTitle) + detailRow("&#127970;", "Entreprise", company)
  )}

    ${button(`${APP_URL}/jobs/${jobId}`, `Voir l'offre`)}`;
  const text = [
    "Une nouvelle offre correspond \xE0 votre profil :",
    "",
    `Poste : ${jobTitle}`,
    `Entreprise : ${company}`,
    "",
    `${APP_URL}/jobs/${jobId}`
  ].join("\n");
  return sendEmail(
    email,
    `Nouvelle offre : ${jobTitle} chez ${company}`,
    layout("Une offre pour vous", body),
    { from: FROM_INFO, text }
  );
};
var CORPORATE_INBOX = process.env.CORPORATE_CONTACT_EMAIL?.trim() || "walidelhadefelokki@darlemploi.dz";
var sendCorporateEnquiryEmail = async (enquiry) => {
  const body = `
    ${paragraph(
    `Une entreprise souhaite &ecirc;tre contact&eacute;e au sujet du plan <strong>Corporate</strong>.`
  )}

    ${detailBlock(
    detailRow("&#127970;", "Entreprise", escapeForEmail(enquiry.companyName)) + detailRow("&#128100;", "Contact", escapeForEmail(enquiry.contactName)) + detailRow("&#9993;", "Email", escapeForEmail(enquiry.email)) + (enquiry.phone ? detailRow("&#128222;", "T&eacute;l&eacute;phone", escapeForEmail(enquiry.phone)) : "") + (enquiry.teamSize ? detailRow("&#128101;", "Taille", escapeForEmail(enquiry.teamSize)) : "") + detailRow("&#128197;", "Re&ccedil;u le", formatDate())
  )}

    ${enquiry.message ? `<p style="margin:0 0 10px;color:${BRAND.navy};font-size:15px;font-weight:700;">Message</p>
           <div style="background:#F5F7FA;padding:16px;border-radius:8px;white-space:pre-wrap;color:${BRAND.ink};font-size:15px;line-height:1.6;">${escapeForEmail(
    enquiry.message
  )}</div>` : ""}

    ${paragraph(
    `<span style="color:${BRAND.muted};font-size:13px;">R&eacute;pondez directement &agrave; cet email pour joindre l'entreprise.</span>`
  )}`;
  const text = [
    "Nouvelle demande Corporate",
    "",
    `Entreprise : ${enquiry.companyName}`,
    `Contact    : ${enquiry.contactName}`,
    `Email      : ${enquiry.email}`,
    enquiry.phone ? `T\xE9l\xE9phone  : ${enquiry.phone}` : "",
    enquiry.teamSize ? `Taille     : ${enquiry.teamSize}` : "",
    `Re\xE7u le    : ${formatDate()}`,
    "",
    enquiry.message ? `Message :
${enquiry.message}` : ""
  ].filter(Boolean).join("\n");
  return sendEmail(
    CORPORATE_INBOX,
    `Demande Corporate \u2014 ${enquiry.companyName}`,
    layout("Nouvelle demande Corporate", body),
    { from: FROM_INFO, replyTo: enquiry.email, text }
  );
};
var sendCorporateEnquiryAck = async (enquiry) => {
  const body = `
    ${paragraph(`Bonjour <strong>${escapeForEmail(enquiry.contactName)}</strong>,`)}
    ${paragraph(
    `Merci pour votre int&eacute;r&ecirc;t pour le plan <strong>Corporate</strong> de Dar L'Emploi. Nous avons bien re&ccedil;u votre demande pour <strong>${escapeForEmail(
      enquiry.companyName
    )}</strong>.`
  )}
    ${paragraph(
    `Notre &eacute;quipe vous recontactera tr&egrave;s prochainement pour construire une offre adapt&eacute;e &agrave; vos besoins de recrutement.`
  )}

    ${iconList([
    ["&#128640;", "Publication illimit&eacute;e"],
    ["&#129302;", "Filtrage par IA Gemini"],
    ["&#128218;", "R&eacute;pertoire CV complet & support d&eacute;di&eacute;"]
  ])}

    ${paragraph(`&Agrave; tr&egrave;s bient&ocirc;t,<br>L'&eacute;quipe Dar L'Emploi`)}`;
  const text = [
    `Bonjour ${enquiry.contactName},`,
    "",
    "Merci pour votre int\xE9r\xEAt pour le plan Corporate de Dar L'Emploi.",
    `Nous avons bien re\xE7u votre demande pour ${enquiry.companyName}.`,
    "",
    "Notre \xE9quipe vous recontactera tr\xE8s prochainement.",
    "",
    "\xC0 tr\xE8s bient\xF4t,",
    "L'\xE9quipe Dar L'Emploi"
  ].join("\n");
  return sendEmail(
    enquiry.email,
    "Votre demande Corporate \u2014 Dar L'Emploi",
    layout("Demande bien re&ccedil;ue", body),
    { from: FROM_INFO, text }
  );
};
var deliverEmail = async (label, send3, timeoutMs = 8e3) => {
  let timer;
  try {
    await Promise.race([
      send3(),
      new Promise((_, reject2) => {
        timer = setTimeout(() => reject2(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } catch (err) {
    console.error(`${label} email failed:`, err instanceof Error ? err.message : err);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// server/services/emailVerification.service.ts
init_prisma();
import crypto from "crypto";
var TTL_MS = 48 * 60 * 60 * 1e3;
var digest = (raw) => crypto.createHash("sha256").update(raw).digest("hex");
var issueEmailVerificationToken = async (userId) => {
  const raw = crypto.randomBytes(32).toString("base64url");
  await prisma_default.$transaction([
    prisma_default.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma_default.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: digest(raw),
        expiresAt: new Date(Date.now() + TTL_MS)
      }
    })
  ]);
  return raw;
};
var consumeEmailVerificationToken = async (raw) => {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "invalid" };
  const record = await prisma_default.emailVerificationToken.findUnique({
    where: { tokenHash: digest(raw) },
    include: { user: { select: { id: true, email: true, status: true, emailVerified: true } } }
  });
  if (!record || !record.user) return { ok: false, reason: "invalid" };
  if (record.usedAt) {
    return record.user.emailVerified ? { ok: true, email: record.user.email, alreadyVerified: true } : { ok: false, reason: "invalid" };
  }
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  await prisma_default.$transaction([
    prisma_default.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: /* @__PURE__ */ new Date() }
    }),
    prisma_default.user.update({
      where: { id: record.user.id },
      data: {
        emailVerified: true,
        ...record.user.status === "PENDING" ? { status: "ACTIVE" } : {}
      },
      // Named so the write does not return every column; see the note in
      // auth.controller on why an implicit select is a liability here.
      select: { id: true }
    })
  ]);
  return { ok: true, email: record.user.email, alreadyVerified: record.user.emailVerified };
};
var verificationUrl = (token) => {
  const base = (process.env.APP_URL || "https://www.darlemploi.dz").replace(/\/$/, "");
  return `${base}/?verifier=${encodeURIComponent(token)}`;
};

// server/utils/adminAccess.ts
init_prisma();
var columnsPresent = null;
var adminColumnsReady = async () => {
  if (columnsPresent !== null) return columnsPresent;
  try {
    const rows = await prisma_default.$queryRaw`
      SELECT count(*) AS n
        FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'User'
         AND column_name IN ('isSuperAdmin', 'adminScopes')`;
    columnsPresent = Number(rows[0]?.n ?? 0) === 2;
  } catch {
    columnsPresent = false;
  }
  if (!columnsPresent) {
    console.warn(
      "[admin] isSuperAdmin / adminScopes are missing from the database. Every administrator is treated as unrestricted until `prisma migrate deploy` has run. Admin limits are NOT in force."
    );
  }
  return columnsPresent;
};
var readAdminAccess = async (userId) => {
  const base = await prisma_default.user.findUnique({
    where: { id: userId },
    // Named explicitly, so this query works on either schema.
    select: { role: true, status: true, deletedAt: true }
  });
  if (!base) return null;
  if (!await adminColumnsReady()) {
    return {
      ...base,
      // The pre-migration state: an administrator was an administrator.
      isSuperAdmin: base.role === "ADMIN",
      adminScopes: [],
      enforced: false
    };
  }
  const withAccess = await prisma_default.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, adminScopes: true }
  });
  return {
    ...base,
    isSuperAdmin: Boolean(withAccess?.isSuperAdmin),
    adminScopes: withAccess?.adminScopes ?? [],
    enforced: true
  };
};

// server/utils/passwordPolicy.ts
var MIN_PASSWORD_LENGTH = 10;
var checkPassword = (value) => {
  if (typeof value !== "string" || !value) {
    return { ok: false, message: "Mot de passe manquant." };
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caract\xE8res.`
    };
  }
  if (value.trim().length === 0) {
    return { ok: false, message: "Le mot de passe ne peut pas \xEAtre compos\xE9 d'espaces." };
  }
  return { ok: true };
};

// server/middleware/tier.middleware.ts
init_prisma();
var TIER_ORDER = ["FREE", "PREMIUM", "CORPORATE"];
async function getRecruiterPlan(userId) {
  const membership = await prisma_default.companyMember.findFirst({
    where: { recruiter: { userId } },
    include: { company: true },
    orderBy: { createdAt: "asc" }
  });
  return membership?.company.plan ?? "FREE";
}
var requireRecruiterTier = (minimumPlan) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }
      if (req.user.role === "ADMIN") {
        return next();
      }
      if (req.user.role !== "RECRUITER") {
        return next(new AppError("Recruiters only.", 403));
      }
      const plan = await getRecruiterPlan(req.user.id);
      if (TIER_ORDER.indexOf(plan) < TIER_ORDER.indexOf(minimumPlan)) {
        return next(
          new AppError(
            `This feature requires the ${minimumPlan} plan or higher.`,
            403
          )
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// server/controllers/auth.controller.ts
import crypto4 from "crypto";

// server/utils/jwt.ts
import crypto2 from "crypto";
var devSecret = null;
function getJwtSecret() {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.trim().length > 0) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is not set. Refusing to sign or verify tokens with a default secret in production \u2014 set JWT_SECRET in the environment."
    );
  }
  if (!devSecret) {
    devSecret = crypto2.randomBytes(48).toString("hex");
    console.warn(
      "\u26A0\uFE0F  JWT_SECRET is not set. Using a random per-process secret for development \u2014 every restart invalidates existing sessions. Set JWT_SECRET in your .env to keep sessions across restarts."
    );
  }
  return devSecret;
}

// server/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var destroyCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, err);
  }
};

// server/middleware/mediaUpload.middleware.ts
import multer from "multer";

// server/utils/supabaseStorage.ts
import { createClient } from "@supabase/supabase-js";
import crypto3 from "crypto";
var CV_BUCKET = process.env.SUPABASE_CV_BUCKET?.trim() || "cvs";
var AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET?.trim() || "avatars";
var PRESENTATION_BUCKET = process.env.SUPABASE_PRESENTATION_BUCKET?.trim() || "presentations";
var SERVICE_MEDIA_BUCKET = process.env.SUPABASE_SERVICE_MEDIA_BUCKET?.trim() || "service-media";
var MESSAGE_ATTACHMENT_BUCKET = process.env.SUPABASE_MESSAGE_BUCKET?.trim() || "message-attachments";
var SIGNED_URL_TTL_SECONDS = 300;
var VIDEO_URL_TTL_SECONDS = 2 * 60 * 60;
var CV_MAX_BYTES = 10 * 1024 * 1024;
var AVATAR_MAX_BYTES = 4 * 1024 * 1024;
var SERVICE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
var SERVICE_MEDIA_MAX_COUNT = 8;
var MESSAGE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
var MESSAGE_ATTACHMENT_MAX_COUNT = 5;
var VIDEO_MAX_BYTES = 50 * 1024 * 1024;
var BUCKETS = {
  [CV_BUCKET]: { public: false, fileSizeLimit: CV_MAX_BYTES },
  [PRESENTATION_BUCKET]: { public: false, fileSizeLimit: VIDEO_MAX_BYTES },
  [AVATAR_BUCKET]: { public: true, fileSizeLimit: AVATAR_MAX_BYTES },
  [SERVICE_MEDIA_BUCKET]: { public: true, fileSizeLimit: SERVICE_MEDIA_MAX_BYTES },
  [MESSAGE_ATTACHMENT_BUCKET]: {
    public: false,
    fileSizeLimit: MESSAGE_ATTACHMENT_MAX_BYTES
  }
};
var cachedClient = null;
var getClient = () => {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new AppError(
      "File storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      500
    );
  }
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cachedClient;
};
var bucketReady = /* @__PURE__ */ new Map();
var ensureBucket = async (bucket) => {
  const pending = bucketReady.get(bucket);
  if (pending) return pending;
  const settings = BUCKETS[bucket];
  if (!settings) {
    throw new AppError(`Unknown storage bucket: ${bucket}`, 500);
  }
  const task = (async () => {
    const storage = getClient().storage;
    const config = { ...settings, allowedMimeTypes: null };
    const { error } = await storage.createBucket(bucket, config);
    if (!error) return;
    if (!/already exists/i.test(error.message)) {
      throw new AppError(`Could not prepare storage: ${error.message}`, 500);
    }
    const { error: updateError } = await storage.updateBucket(bucket, config);
    if (updateError) {
      throw new AppError(
        `Could not verify storage settings: ${updateError.message}`,
        500
      );
    }
  })();
  bucketReady.set(bucket, task);
  try {
    await task;
  } catch (err) {
    bucketReady.delete(bucket);
    throw err;
  }
};
var buildObjectPath = (ownerId, extension) => `${ownerId}/${crypto3.randomUUID()}.${extension}`;
var OBJECT_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/;
var uploadObject = async (params) => {
  const { bucket, path, buffer, mimeType } = params;
  await ensureBucket(bucket);
  const { error } = await getClient().storage.from(bucket).upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) {
    throw new AppError(`Upload failed: ${error.message}`, 502);
  }
  return path;
};
var createUploadTicket = async (params) => {
  const { bucket, path } = params;
  await ensureBucket(bucket);
  const { data, error } = await getClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    throw new AppError(
      `Could not start the upload: ${error?.message ?? "unknown error"}`,
      502
    );
  }
  return { path, token: data.token, signedUrl: data.signedUrl };
};
var createSignedUrl = async (bucket, path, expiresIn = SIGNED_URL_TTL_SECONDS) => {
  const { data, error } = await getClient().storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new AppError(
      `Could not generate link: ${error?.message ?? "unknown error"}`,
      502
    );
  }
  return data.signedUrl;
};
var createSignedUrls = async (bucket, paths, expiresIn = SIGNED_URL_TTL_SECONDS) => {
  const result = /* @__PURE__ */ new Map();
  if (paths.length === 0) return result;
  const { data, error } = await getClient().storage.from(bucket).createSignedUrls(paths, expiresIn);
  if (error || !data) {
    console.error(`Batch signing failed for ${bucket}:`, error?.message);
    return result;
  }
  for (const entry of data) {
    if (entry.signedUrl && entry.path) result.set(entry.path, entry.signedUrl);
  }
  return result;
};
var getPublicUrl = (bucket, path) => getClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
var downloadObject = async (bucket, path) => {
  const { data, error } = await getClient().storage.from(bucket).download(path);
  if (error || !data) {
    throw new AppError(
      `Could not read from storage: ${error?.message ?? "unknown error"}`,
      502
    );
  }
  return Buffer.from(await data.arrayBuffer());
};
var downloadObjectHead = async (bucket, path, bytes = 4096) => {
  const signed = await createSignedUrl(bucket, path, 60);
  const response = await fetch(signed, {
    headers: { Range: `bytes=0-${bytes - 1}` }
  });
  if (!response.ok && response.status !== 206) {
    throw new AppError(
      `Could not read from storage (HTTP ${response.status}).`,
      502
    );
  }
  return Buffer.from(await response.arrayBuffer());
};
var getObjectSize = async (bucket, path) => {
  const lastSlash = path.lastIndexOf("/");
  const folder = lastSlash === -1 ? "" : path.slice(0, lastSlash);
  const name2 = path.slice(lastSlash + 1);
  const { data, error } = await getClient().storage.from(bucket).list(folder, { search: name2, limit: 100 });
  if (error || !data) return null;
  const match = data.find((entry) => entry.name === name2);
  if (!match) return null;
  return match.metadata?.size ?? null;
};
var removeObject = async (bucket, path) => {
  try {
    const { error } = await getClient().storage.from(bucket).remove([path]);
    if (error) {
      console.error(`Cleanup failed for ${bucket}/${path}: ${error.message}`);
    }
  } catch (err) {
    console.error(`Cleanup failed for ${bucket}/${path}:`, err);
  }
};
var uploadCvObject = async (params) => uploadObject({
  bucket: CV_BUCKET,
  path: buildObjectPath(params.candidateProfileId, params.extension),
  buffer: params.buffer,
  mimeType: params.mimeType
});
var createCvUploadTicket = async (params) => createUploadTicket({
  bucket: CV_BUCKET,
  path: buildObjectPath(params.candidateProfileId, params.extension)
});
var createSignedCvUrl = (path, expiresIn) => createSignedUrl(CV_BUCKET, path, expiresIn);
var downloadCvObject = (path) => downloadObject(CV_BUCKET, path);
var removeCvObject = (path) => removeObject(CV_BUCKET, path);

// server/middleware/mediaUpload.middleware.ts
var AVATAR_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
var AVATAR_MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};
var avatarMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 }
}).single("avatar");
var handleAvatarUpload = (req, res, next) => {
  avatarMemoryUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Your photo must be smaller than 4 MB.", 400));
      }
      return next(new AppError(`Upload failed: ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};
var hasImageSignature = (buffer, extension) => {
  switch (extension) {
    case "jpg":
    case "jpeg":
      return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    case "png":
      return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "gif": {
      const head = buffer.subarray(0, 6).toString("latin1");
      return head === "GIF87a" || head === "GIF89a";
    }
    // RIFF container with a WEBP fourcc at offset 8.
    case "webp":
      return buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
    default:
      return false;
  }
};
var validateAvatarUpload = (file) => {
  if (!file) {
    throw new AppError("Please choose an image to upload.", 400);
  }
  if (file.buffer.length === 0) {
    throw new AppError("That file is empty. Please choose another image.", 400);
  }
  const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
  if (!AVATAR_EXTENSIONS.includes(extension)) {
    throw new AppError("Your photo must be a JPG, PNG, WEBP or GIF image.", 400);
  }
  const typed = extension;
  if (!hasImageSignature(file.buffer, typed)) {
    throw new AppError(
      "This file is not a valid image. Please choose another photo.",
      400
    );
  }
  return {
    buffer: file.buffer,
    extension: typed,
    // From our own table, not the request: the browser-supplied MIME type is
    // never stored or served back.
    mimeType: AVATAR_MIME_TYPES[typed],
    fileName: file.originalname,
    size: file.buffer.length
  };
};
var VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi"];
var VIDEO_MIME_TYPES = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo"
};
var resolveVideoExtension = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!VIDEO_EXTENSIONS.includes(extension)) {
    throw new AppError(
      "Your presentation must be an MP4, MOV, WEBM, MKV or AVI video.",
      400
    );
  }
  return extension;
};
var videoMimeType = (extension) => VIDEO_MIME_TYPES[extension];
var hasVideoSignature = (head, extension) => {
  switch (extension) {
    // ISO base media: a size field, then the "ftyp" box type at offset 4.
    // Covers MP4 and QuickTime alike.
    case "mp4":
    case "mov":
      return head.subarray(4, 8).toString("latin1") === "ftyp";
    // EBML header, shared by WebM and Matroska.
    case "webm":
    case "mkv":
      return head.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
    // RIFF container with an AVI fourcc at offset 8.
    case "avi":
      return head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 11).toString("latin1") === "AVI";
    default:
      return false;
  }
};
var assertVideoSize = (size) => {
  if (size === null) {
    throw new AppError(
      "That upload could not be found. Please try again.",
      400
    );
  }
  if (size === 0) {
    throw new AppError("That file is empty. Please choose another video.", 400);
  }
  if (size > VIDEO_MAX_BYTES) {
    throw new AppError("Your presentation must be smaller than 50 MB.", 400);
  }
  return size;
};
var serviceMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SERVICE_MEDIA_MAX_BYTES, files: SERVICE_MEDIA_MAX_COUNT }
}).array("media", SERVICE_MEDIA_MAX_COUNT);
var handleServiceMediaUpload = (req, res, next) => {
  serviceMediaUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError("Chaque image doit faire moins de 5 Mo.", 400)
        );
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(
          new AppError(
            `${SERVICE_MEDIA_MAX_COUNT} images au maximum par envoi.`,
            400
          )
        );
      }
      return next(new AppError(`Envoi impossible : ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};
var validateServiceMedia = (files) => {
  if (!files || files.length === 0) {
    throw new AppError("Choisissez au moins une image.", 400);
  }
  return files.map((file, index) => {
    const where = files.length > 1 ? ` (image ${index + 1})` : "";
    if (file.buffer.length === 0) {
      throw new AppError(`Ce fichier est vide${where}.`, 400);
    }
    const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
    if (!AVATAR_EXTENSIONS.includes(extension)) {
      throw new AppError(
        `Les images doivent \xEAtre au format JPG, PNG, WEBP ou GIF${where}.`,
        400
      );
    }
    const typed = extension;
    if (!hasImageSignature(file.buffer, typed)) {
      throw new AppError(
        `Ce fichier n'est pas une image valide${where}.`,
        400
      );
    }
    return {
      buffer: file.buffer,
      extension,
      mimeType: AVATAR_MIME_TYPES[typed],
      fileName: file.originalname,
      size: file.buffer.length
    };
  });
};
var ATTACHMENT_EXTENSIONS = [
  ...AVATAR_EXTENSIONS,
  "pdf"
];
var attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MESSAGE_ATTACHMENT_MAX_BYTES,
    files: MESSAGE_ATTACHMENT_MAX_COUNT
  }
}).array("attachments", MESSAGE_ATTACHMENT_MAX_COUNT);
var handleMessageAttachments = (req, res, next) => {
  attachmentUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Chaque fichier doit faire moins de 10 Mo.", 400));
      }
      if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
        return next(
          new AppError(
            `${MESSAGE_ATTACHMENT_MAX_COUNT} fichiers au maximum par message.`,
            400
          )
        );
      }
      return next(new AppError(`Envoi impossible : ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};
var hasPdfSignature = (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";
var validateMessageAttachments = (files) => {
  if (!files || files.length === 0) return [];
  return files.map((file, index) => {
    const where = files.length > 1 ? ` (fichier ${index + 1})` : "";
    if (file.buffer.length === 0) {
      throw new AppError(`Ce fichier est vide${where}.`, 400);
    }
    const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
    if (!ATTACHMENT_EXTENSIONS.includes(extension)) {
      throw new AppError(
        `Seules les images et les PDF peuvent \xEAtre envoy\xE9s${where}.`,
        400
      );
    }
    const isPdf = extension === "pdf";
    const valid = isPdf ? hasPdfSignature(file.buffer) : hasImageSignature(file.buffer, extension);
    if (!valid) {
      throw new AppError(
        `Ce fichier ne correspond pas \xE0 son extension${where}.`,
        400
      );
    }
    return {
      buffer: file.buffer,
      extension,
      mimeType: isPdf ? "application/pdf" : AVATAR_MIME_TYPES[extension],
      fileName: file.originalname,
      size: file.buffer.length
    };
  });
};

// server/controllers/auth.controller.ts
var signToken = (id, role) => {
  return jwt.sign({ id, role }, getJwtSecret(), {
    expiresIn: "30d"
  });
};
var mapPlanToTier = (plan) => {
  switch (plan) {
    case "PREMIUM":
      return "paid";
    case "CORPORATE":
      return "corporate";
    default:
      return "free";
  }
};
var slugify = (name2) => {
  const base = name2.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = crypto4.randomBytes(3).toString("hex");
  return `${base || "company"}-${suffix}`;
};
var createCompanyForRecruiter = async (recruiterProfileId, companyName) => {
  await prisma_default.company.create({
    data: {
      name: companyName,
      slug: slugify(companyName),
      plan: "FREE",
      members: {
        create: {
          role: "OWNER",
          recruiter: { connect: { id: recruiterProfileId } }
        }
      }
    }
  });
};
var register = async (req, res, next) => {
  try {
    const { email, password, role, firstName, lastName, companyName, plan, source } = req.body;
    const signupSource = source === "FREELANCE" ? "FREELANCE" : "JOBS";
    const existingUser = await prisma_default.user.findUnique({
      where: { email },
      select: { id: true, password: true }
    });
    if (existingUser) {
      if (existingUser.password === null) {
        return next(
          new AppError(
            "This email is already registered with Google. Please continue with Google.",
            400
          )
        );
      }
      return next(new AppError("Email already in use", 400));
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma_default.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        signupSource,
        candidateProfile: role === "CANDIDATE" ? { create: {} } : void 0,
        recruiterProfile: role === "RECRUITER" ? { create: {} } : void 0
      },
      /* select, not include.
       *
       * `include` returns every scalar column alongside the relations, so a
       * column added by a migration that has not run yet refuses the insert —
       * which is how registration broke along with sign-in. */
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerified: true,
        candidateProfile: { select: { id: true } },
        recruiterProfile: { select: { id: true } }
      }
    });
    if (role === "RECRUITER" && user.recruiterProfile) {
      await createCompanyForRecruiter(user.recruiterProfile.id, companyNameFrom(companyName, email));
    }
    const greeting = user.role === "RECRUITER" ? companyNameFrom(companyName, email) : `${firstName ?? ""} ${lastName ?? ""}`.trim() || email;
    const verifyUrl = verificationUrl(await issueEmailVerificationToken(user.id));
    await deliverEmail(
      "Welcome",
      () => sendWelcomeEmail(email, greeting, user.role, verifyUrl)
    );
    const token = signToken(user.id, user.role);
    const recruiterTier = user.role === "RECRUITER" ? mapPlanToTier(await getRecruiterPlan(user.id)) : void 0;
    res.status(201).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          // Sent so the client can show the "confirm your address" reminder
          // without a second round trip to /auth/me.
          emailVerified: user.emailVerified,
          recruiterTier
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }
    const user = await prisma_default.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        status: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        emailVerified: true
      }
    });
    if (user && user.password === null) {
      return next(
        new AppError(
          "This account uses Google sign-in. Please continue with Google.",
          401
        )
      );
    }
    if (!user || !await bcrypt.compare(password, user.password)) {
      return next(new AppError("Incorrect email or password", 401));
    }
    if (user.status === "SUSPENDED") {
      return next(
        new AppError("Ce compte est suspendu. Contactez le support.", 403)
      );
    }
    if (user.status === "DELETED" || user.deletedAt) {
      return next(new AppError("Ce compte n'existe plus.", 403));
    }
    const token = signToken(user.id, user.role);
    const recruiterTier = user.role === "RECRUITER" ? mapPlanToTier(await getRecruiterPlan(user.id)) : void 0;
    res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          // Sent so the client can show the "confirm your address" reminder
          // without a second round trip to /auth/me.
          emailVerified: user.emailVerified,
          recruiterTier
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError("Lien de confirmation incomplet.", 400));
    const result = await consumeEmailVerificationToken(token);
    if (result.ok === false) {
      return next(
        new AppError(
          result.reason === "expired" ? "Ce lien de confirmation a expir\xE9. Connectez-vous pour en recevoir un nouveau." : "Ce lien de confirmation n'est pas valide.",
          400
        )
      );
    }
    res.status(200).json({
      status: "success",
      data: { email: result.email, alreadyVerified: result.alreadyVerified }
    });
  } catch (err) {
    next(err);
  }
};
var resendVerification = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, emailVerified: true }
    });
    if (!user) return next(new AppError("User not found", 404));
    if (user.emailVerified) {
      return res.status(200).json({
        status: "success",
        data: { sent: false, alreadyVerified: true }
      });
    }
    const verifyUrl = verificationUrl(await issueEmailVerificationToken(user.id));
    await deliverEmail(
      "Verify",
      () => sendVerifyEmail(user.email, user.firstName, verifyUrl)
    );
    res.status(200).json({ status: "success", data: { sent: true, alreadyVerified: false } });
  } catch (err) {
    next(err);
  }
};
var getMe = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("User not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        phone: true,
        preferredLanguage: true,
        createdAt: true,
        candidateProfile: true,
        recruiterProfile: true,
        avatar: true
      }
    });
    if (!user) return next(new AppError("User not found", 404));
    const recruiterTier = user.role === "RECRUITER" ? mapPlanToTier(await getRecruiterPlan(user.id)) : void 0;
    const access = user.role === "ADMIN" ? await readAdminAccess(user.id) : null;
    res.status(200).json({
      status: "success",
      data: {
        user: {
          ...user,
          recruiterTier,
          ...access ? {
            isSuperAdmin: access.isSuperAdmin,
            adminScopes: access.adminScopes
          } : {}
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyAvatar = async (req, res, next) => {
  let storedPath = null;
  try {
    const image = validateAvatarUpload(req.file);
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id }
    });
    if (!user) {
      return next(new AppError("User not found.", 404));
    }
    const previousAvatarId = user.avatarId;
    storedPath = await uploadObject({
      bucket: AVATAR_BUCKET,
      path: buildObjectPath(user.id, image.extension),
      buffer: image.buffer,
      mimeType: image.mimeType
    });
    let updatedUser;
    try {
      updatedUser = await prisma_default.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({
          data: {
            url: getPublicUrl(AVATAR_BUCKET, storedPath),
            provider: "supabase",
            publicId: storedPath,
            fileName: image.fileName,
            mimeType: image.mimeType,
            extension: image.extension,
            size: image.size
          }
        });
        return tx.user.update({
          where: { id: user.id },
          data: { avatarId: asset.id },
          include: { avatar: true }
        });
      });
    } catch (dbErr) {
      await removeObject(AVATAR_BUCKET, storedPath);
      throw dbErr;
    }
    if (previousAvatarId && previousAvatarId !== updatedUser.avatarId) {
      const previous = await prisma_default.fileAsset.findUnique({
        where: { id: previousAvatarId }
      });
      if (previous?.provider === "supabase" && previous.publicId) {
        await removeObject(AVATAR_BUCKET, previous.publicId);
      } else if (previous?.provider === "cloudinary") {
        await destroyCloudinaryAsset(previous.publicId, "image");
      }
      await prisma_default.fileAsset.delete({ where: { id: previousAvatarId } }).catch(() => null);
    }
    res.status(200).json({
      status: "success",
      data: {
        avatarUrl: updatedUser.avatar?.url
      }
    });
  } catch (err) {
    next(err);
  }
};
var changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      // Named explicitly; see the note on the login query.
      select: { id: true, email: true, password: true }
    });
    if (!user) return next(new AppError("Compte introuvable.", 404));
    if (user.password === null) {
      return next(
        new AppError(
          "Ce compte se connecte avec Google et n'a pas de mot de passe.",
          400
        )
      );
    }
    if (!currentPassword || !await bcrypt.compare(currentPassword, user.password)) {
      return next(new AppError("Mot de passe actuel incorrect.", 401));
    }
    const verdict = checkPassword(newPassword);
    if (!verdict.ok) return next(new AppError(verdict.message, 400));
    if (await bcrypt.compare(newPassword, user.password)) {
      return next(
        new AppError("Le nouveau mot de passe est identique \xE0 l'ancien.", 400)
      );
    }
    await prisma_default.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 12) },
      select: { id: true }
    });
    res.status(200).json({ status: "success", message: "Mot de passe modifi\xE9." });
  } catch (err) {
    next(err);
  }
};

// server/controllers/googleAuth.controller.ts
import crypto6 from "crypto";
import jwt2 from "jsonwebtoken";
import passport2 from "passport";

// server/services/oauth.service.ts
init_prisma();
import crypto5 from "crypto";
var OAUTH_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  status: true,
  deletedAt: true,
  emailVerified: true,
  recruiterProfile: { select: { id: true } }
};
var PROVIDER = "google";
var slugify2 = (name2) => {
  const base = name2.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "company"}-${crypto5.randomBytes(3).toString("hex")}`;
};
async function findOrCreateUserFromGoogle(identity, requestedRole) {
  const existingAccount = await prisma_default.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId
      }
    },
    select: { user: { select: OAUTH_USER_SELECT } }
  });
  if (existingAccount) {
    return { user: existingAccount.user, outcome: "returning" };
  }
  const existingUser = await prisma_default.user.findUnique({
    where: { email: identity.email },
    select: OAUTH_USER_SELECT
  });
  if (existingUser) {
    if (!identity.emailVerified) {
      throw new Error(
        "An account already exists with this email. Sign in with your password, or verify this address with Google before linking."
      );
    }
    await prisma_default.account.create({
      data: {
        userId: existingUser.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email
      }
    });
    const promoted = !existingUser.emailVerified || existingUser.status === "PENDING" ? await prisma_default.user.update({
      where: { id: existingUser.id },
      data: {
        emailVerified: true,
        ...existingUser.status === "PENDING" ? { status: "ACTIVE" } : {}
      },
      select: OAUTH_USER_SELECT
    }) : existingUser;
    return { user: promoted, outcome: "linked_existing" };
  }
  const user = await prisma_default.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: identity.email,
        // No local password: the column is nullable precisely so this stays
        // honest rather than storing an unusable placeholder hash.
        password: null,
        role: requestedRole,
        // Mirrors the password path: ACTIVE means the address is confirmed,
        // and here Google has confirmed it. In the rare case Google reports an
        // unverified address the account starts PENDING like any other, and
        // the dashboard banner offers the confirmation link.
        status: identity.emailVerified ? "ACTIVE" : "PENDING",
        emailVerified: identity.emailVerified,
        firstName: identity.firstName || void 0,
        lastName: identity.lastName || void 0,
        candidateProfile: requestedRole === "CANDIDATE" ? { create: {} } : void 0,
        recruiterProfile: requestedRole === "RECRUITER" ? { create: {} } : void 0
      },
      // select, not include: include returns every scalar column, and one
      // added by a pending migration refuses the insert.
      select: OAUTH_USER_SELECT
    });
    await tx.account.create({
      data: {
        userId: created.id,
        provider: PROVIDER,
        providerAccountId: identity.providerAccountId,
        providerEmail: identity.email
      }
    });
    if (requestedRole === "RECRUITER" && created.recruiterProfile) {
      const fallbackName = companyNameFrom(void 0, identity.email);
      await tx.company.create({
        data: {
          name: fallbackName,
          slug: slugify2(fallbackName),
          plan: "FREE",
          members: {
            create: { role: "OWNER", recruiter: { connect: { id: created.recruiterProfile.id } } }
          }
        }
      });
    }
    return created;
  });
  return { user, outcome: "created" };
}

// server/controllers/googleAuth.controller.ts
var STATE_COOKIE = "dl_oauth_state";
var HANDOFF_COOKIE = "dl_oauth_handoff";
var isProduction = () => process.env.NODE_ENV === "production";
var cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
  maxAge: maxAgeMs,
  path: "/"
});
var failRedirect = (res, code, next) => {
  const base = getFrontendUrl();
  const callback = next?.startsWith("/freelance") ? `${base}/freelance/auth/callback` : `${base}/auth/callback`;
  return res.redirect(`${callback}?error=${encodeURIComponent(code)}`);
};
var googleAuthStart = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return next(new AppError(getGoogleConfigError() ?? "Google sign-in is unavailable.", 503));
  }
  const requestedRole = req.query.role === "employer" ? "RECRUITER" : "CANDIDATE";
  const requestedNext = typeof req.query.next === "string" && req.query.next.startsWith("/") && !req.query.next.startsWith("//") ? req.query.next : void 0;
  const nonce = crypto6.randomBytes(24).toString("hex");
  const state = jwt2.sign({ nonce, role: requestedRole, next: requestedNext }, getJwtSecret(), {
    expiresIn: "10m"
  });
  res.cookie(STATE_COOKIE, nonce, cookieOptions(10 * 60 * 1e3));
  passport2.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
    state
  })(req, res, next);
};
var googleAuthCallback = (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return failRedirect(res, "not_configured");
  }
  const stateToken = typeof req.query.state === "string" ? req.query.state : "";
  const cookieNonce = req.cookies?.[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: "/" });
  let stateRole = "CANDIDATE";
  let stateNext;
  try {
    const decoded = jwt2.verify(stateToken, getJwtSecret());
    if (!cookieNonce || decoded.nonce !== cookieNonce) {
      console.warn("Google OAuth: state nonce mismatch \u2014 possible CSRF, rejecting");
      return failRedirect(res, "invalid_state");
    }
    stateRole = decoded.role === "RECRUITER" ? "RECRUITER" : "CANDIDATE";
    stateNext = typeof decoded.next === "string" && decoded.next.startsWith("/") && !decoded.next.startsWith("//") ? decoded.next : void 0;
  } catch {
    console.warn("Google OAuth: state token invalid or expired, rejecting");
    return failRedirect(res, "invalid_state");
  }
  passport2.authenticate(
    "google",
    { session: false },
    async (err, identity, info) => {
      try {
        if (err) {
          console.error("Google OAuth: provider error \u2014", err.message);
          return failRedirect(res, "provider_error", stateNext);
        }
        if (!identity) {
          console.warn("Google OAuth: no identity returned \u2014", info?.message ?? "cancelled by user");
          return failRedirect(res, info?.message ? "no_email" : "cancelled", stateNext);
        }
        const { user, outcome } = await findOrCreateUserFromGoogle(identity, stateRole);
        console.info(
          `Google OAuth: ${outcome} \u2014 user ${user.id} (${user.role})`
        );
        const token = jwt2.sign({ id: user.id, role: user.role }, getJwtSecret(), {
          expiresIn: "30d"
        });
        res.cookie(HANDOFF_COOKIE, token, cookieOptions(60 * 1e3));
        const base = getFrontendUrl();
        const callback = stateNext?.startsWith("/freelance") ? `${base}/freelance/auth/callback` : `${base}/auth/callback`;
        return res.redirect(
          stateNext ? `${callback}?next=${encodeURIComponent(stateNext)}` : callback
        );
      } catch (error) {
        const isLinkingRefusal = error?.message?.includes("already exists with this email");
        console.error("Google OAuth: callback failed \u2014", error?.message);
        return failRedirect(res, isLinkingRefusal ? "email_in_use" : "server_error", stateNext);
      }
    }
  )(req, res, next);
};
var googleAuthSession = async (req, res, next) => {
  try {
    const token = req.cookies?.[HANDOFF_COOKIE];
    res.clearCookie(HANDOFF_COOKIE, { path: "/" });
    if (!token) {
      return next(new AppError("No pending Google sign-in. Please try again.", 401));
    }
    let decoded;
    try {
      decoded = jwt2.verify(token, getJwtSecret());
    } catch {
      return next(new AppError("Your sign-in expired. Please try again.", 401));
    }
    const prisma2 = (await Promise.resolve().then(() => (init_prisma(), prisma_exports))).default;
    const user = await prisma2.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true,
        firstName: true,
        lastName: true,
        emailVerified: true
      }
    });
    if (!user) {
      return next(new AppError("Account no longer exists.", 401));
    }
    const recruiterTier = user.role === "RECRUITER" ? await getRecruiterPlan(user.id) : void 0;
    res.status(200).json({
      status: "success",
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          recruiterTier: recruiterTier === "PREMIUM" ? "paid" : recruiterTier === "CORPORATE" ? "corporate" : recruiterTier ? "free" : void 0
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var googleAuthStatus = (_req, res) => {
  const reason = getGoogleConfigError();
  res.status(200).json({
    status: "success",
    data: { googleSignInReady: reason === null, reason }
  });
};

// server/middleware/auth.middleware.ts
import jwt3 from "jsonwebtoken";
var protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }
  try {
    const decoded = jwt3.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError("Not authorized to access this route", 401));
  }
};

// server/routes/auth.routes.ts
var router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerification);
router.get("/google", googleAuthStart);
router.get("/google/callback", googleAuthCallback);
router.post("/google/session", googleAuthSession);
router.get("/google/status", googleAuthStatus);
router.get("/me", protect, getMe);
router.patch("/me/avatar", protect, handleAvatarUpload, updateMyAvatar);
router.patch("/me/password", protect, changeMyPassword);
var auth_routes_default = router;

// server/routes/job.routes.ts
import { Router as Router2 } from "express";

// server/controllers/job.controller.ts
init_prisma();
import crypto7 from "crypto";

// server/services/notification.service.ts
init_prisma();
import { NotificationType } from "@prisma/client";
var notify = async (input) => {
  try {
    await prisma_default.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? NotificationType.INFO
      }
    });
  } catch (err) {
    console.error(`Notification for user ${input.userId} failed:`, err);
  }
};
var notifyMany = async (inputs) => {
  if (inputs.length === 0) return;
  try {
    await prisma_default.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        title: i.title,
        message: i.message,
        type: i.type ?? NotificationType.INFO
      }))
    });
  } catch (err) {
    console.error(`Batch of ${inputs.length} notifications failed:`, err);
  }
};
var statusNotification = (status, jobTitle, company) => {
  switch (status) {
    case "REVIEWING":
      return {
        title: "Votre candidature est en cours d'examen",
        message: `${company} examine votre candidature pour le poste de \xAB ${jobTitle} \xBB.`,
        type: NotificationType.INFO
      };
    case "SHORTLISTED":
      return {
        title: "Vous \xEAtes pr\xE9s\xE9lectionn\xE9(e) !",
        message: `${company} a retenu votre profil pour le poste de \xAB ${jobTitle} \xBB.`,
        type: NotificationType.SUCCESS
      };
    case "INTERVIEW":
      return {
        title: "Entretien propos\xE9",
        message: `${company} souhaite vous rencontrer pour le poste de \xAB ${jobTitle} \xBB.`,
        type: NotificationType.SUCCESS
      };
    case "HIRED":
      return {
        title: "F\xE9licitations, vous \xEAtes recrut\xE9(e) !",
        message: `${company} vous a retenu(e) pour le poste de \xAB ${jobTitle} \xBB.`,
        type: NotificationType.SUCCESS
      };
    case "REJECTED":
      return {
        title: "Candidature non retenue",
        message: `${company} n'a pas retenu votre candidature pour \xAB ${jobTitle} \xBB. Continuez, d'autres opportunit\xE9s vous attendent.`,
        type: NotificationType.WARNING
      };
    default:
      return null;
  }
};
var notifyApplicationStatus = async (params) => {
  const content = statusNotification(params.status, params.jobTitle, params.company);
  if (!content) return;
  await notify({ userId: params.candidateUserId, ...content });
};
var notifyNewApplication = async (params) => {
  await notify({
    userId: params.recruiterUserId,
    title: "Nouvelle candidature",
    message: `${params.candidateName} a postul\xE9 au poste de \xAB ${params.jobTitle} \xBB.`,
    type: NotificationType.INFO
  });
};
var notifyJobMatch = async (params) => {
  await notifyMany(
    params.candidateUserIds.map((userId) => ({
      userId,
      title: "Nouvelle offre pour vous",
      message: `\xAB ${params.jobTitle} \xBB chez ${params.company} correspond \xE0 votre profil.`,
      type: NotificationType.INFO
    }))
  );
};

// server/services/postingQuota.service.ts
init_prisma();
var FREE_JOB_ALLOWANCE = 1;
var getPostingQuota = async (companyId) => {
  const company = await prisma_default.company.findUnique({
    where: { id: companyId },
    select: { plan: true, postingCredits: true }
  });
  if (!company) {
    throw new AppError("No company associated with this recruiter account.", 400);
  }
  const used = await prisma_default.job.count({ where: { companyId } });
  if (company.plan === "CORPORATE") {
    return {
      plan: company.plan,
      used,
      remaining: null,
      credits: company.postingCredits,
      canPublish: true,
      reason: null
    };
  }
  if (company.plan === "FREE") {
    const remaining = Math.max(FREE_JOB_ALLOWANCE - used, 0);
    return {
      plan: company.plan,
      used,
      remaining,
      credits: company.postingCredits,
      canPublish: remaining > 0,
      reason: remaining > 0 ? null : "Votre offre gratuite est d\xE9j\xE0 publi\xE9e. Achetez un pack d'annonces ou passez au plan Corporate pour publier davantage."
    };
  }
  return {
    plan: company.plan,
    used,
    remaining: company.postingCredits,
    credits: company.postingCredits,
    canPublish: company.postingCredits > 0,
    reason: company.postingCredits > 0 ? null : "Vous n'avez plus d'annonce disponible. Achetez un pack pour publier une nouvelle offre."
  };
};
var consumePosting = async (companyId) => {
  const quota = await getPostingQuota(companyId);
  if (!quota.canPublish) {
    throw new AppError(quota.reason ?? "Publication limit reached.", 403);
  }
  if (quota.plan !== "PREMIUM") {
    return { refund: async () => {
    } };
  }
  const claimed = await prisma_default.company.updateMany({
    where: { id: companyId, postingCredits: { gt: 0 } },
    data: { postingCredits: { decrement: 1 } }
  });
  if (claimed.count === 0) {
    throw new AppError(
      "Vous n'avez plus d'annonce disponible. Achetez un pack pour publier une nouvelle offre.",
      403
    );
  }
  return {
    refund: async () => {
      await prisma_default.company.update({ where: { id: companyId }, data: { postingCredits: { increment: 1 } } }).catch((err) => console.error(`Could not refund a posting credit to ${companyId}:`, err));
    }
  };
};
var grantPostings = async (companyId, amount) => {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1e3) {
    throw new AppError("The number of postings must be a whole number between 1 and 1000.", 400);
  }
  return prisma_default.company.update({
    where: { id: companyId },
    data: { postingCredits: { increment: amount } },
    select: { id: true, name: true, plan: true, postingCredits: true }
  });
};
var setPostings = async (companyId, credits) => {
  if (!Number.isInteger(credits) || credits < 0 || credits > 1e3) {
    throw new AppError("The number of postings must be a whole number between 0 and 1000.", 400);
  }
  return prisma_default.company.update({
    where: { id: companyId },
    data: { postingCredits: credits },
    select: { id: true, name: true, plan: true, postingCredits: true }
  });
};

// server/services/jobMatch.service.ts
init_prisma();
var WEIGHT = {
  skill: 10,
  // per skill found in the title or description
  titleWord: 8,
  // per meaningful word shared with their current job title
  wilaya: 12,
  // same wilaya — the strongest single signal in Algeria
  experience: 6,
  // seniority band matches their years
  recent: 3
  // published in the last fortnight
};
var STOPWORDS = /* @__PURE__ */ new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "un",
  "une",
  "et",
  "en",
  "pour",
  "avec",
  "sur",
  "dans",
  "au",
  "aux",
  "chez",
  "par",
  "the",
  "and",
  "for",
  "with",
  "of",
  "junior",
  "senior",
  "stage",
  "cdi",
  "cdd",
  "h",
  "f"
]);
var normalise = (value) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ\s+#.]/g, " ");
var words = (value) => normalise(value).split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
var bandFor = (years) => {
  if (years <= 0) return "INTERN";
  if (years <= 2) return "JUNIOR";
  if (years <= 5) return "MID";
  if (years <= 10) return "SENIOR";
  return "LEAD";
};
var getMatchedJobsForCandidate = async (userId, limit = 6) => {
  const profile = await prisma_default.candidateProfile.findUnique({
    where: { userId },
    select: {
      skills: true,
      wilaya: true,
      city: true,
      currentJobTitle: true,
      yearsExperience: true
    }
  });
  if (!profile) return [];
  const skills = (profile.skills ?? []).map((s) => normalise(s).trim()).filter(Boolean);
  const titleWords = profile.currentJobTitle ? words(profile.currentJobTitle) : [];
  const wilaya = profile.wilaya ? normalise(profile.wilaya).trim() : "";
  if (!skills.length && !titleWords.length && !wilaya) return [];
  const band = profile.yearsExperience != null ? bandFor(profile.yearsExperience) : null;
  const jobs = await prisma_default.job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 200,
    include: {
      company: { select: { name: true, logo: { select: { url: true } } } },
      category: { select: { name: true } }
    }
  });
  const fortnightAgo = Date.now() - 14 * 24 * 60 * 60 * 1e3;
  const scored = jobs.map((job) => {
    const haystack = normalise(`${job.title} ${job.description}`);
    const reasons = [];
    let score = 0;
    const hitSkills = skills.filter((s) => haystack.includes(s));
    if (hitSkills.length) {
      score += hitSkills.length * WEIGHT.skill;
      reasons.push(hitSkills.slice(0, 3).join(", "));
    }
    const hitTitle = titleWords.filter((w) => haystack.includes(w));
    if (hitTitle.length) {
      score += hitTitle.length * WEIGHT.titleWord;
      if (!hitSkills.length) reasons.push(hitTitle.slice(0, 2).join(", "));
    }
    if (wilaya) {
      const place = normalise(`${job.wilaya ?? ""} ${job.location ?? ""}`);
      if (place.includes(wilaya)) {
        score += WEIGHT.wilaya;
        reasons.push(profile.wilaya);
      }
    }
    if (band && job.experienceLevel === band) {
      score += WEIGHT.experience;
    }
    if (job.publishedAt && job.publishedAt.getTime() > fortnightAgo) {
      score += WEIGHT.recent;
    }
    const relevant = hitSkills.length > 0 || hitTitle.length > 0;
    return { job, score: relevant ? score : 0, reasons };
  });
  return scored.filter((m) => m.score > 0).sort((a, b) => b.score - a.score || (b.job.publishedAt?.getTime() ?? 0) - (a.job.publishedAt?.getTime() ?? 0)).slice(0, limit);
};

// server/services/jobSearch.service.ts
init_prisma();
import { Prisma } from "@prisma/client";
var CONFIG = "public.french_unaccent";
var SIMILARITY_FLOOR = 0.45;
var MAX_TERMS = 10;
var MAX_PER_PAGE = 60;
var buildTsQuery = (raw) => {
  const terms = raw.toLowerCase().replace(/[^\p{L}\p{N}\s+#]/gu, " ").split(/\s+/).filter((t) => t.length >= 2).slice(0, MAX_TERMS);
  if (!terms.length) return null;
  return terms.map((t) => `${t.replace(/[+#]/g, "")}:*`).filter(Boolean).join(" & ");
};
var filterSql = (p) => {
  const parts = [Prisma.sql`j."status" = 'PUBLISHED'::"JobStatus"`];
  parts.push(Prisma.sql`(j."expiresAt" IS NULL OR j."expiresAt" > now())`);
  if (p.location) {
    parts.push(
      Prisma.sql`public.dl_unaccent(j."location") ILIKE public.dl_unaccent(${`%${p.location}%`})`
    );
  }
  if (p.wilaya) {
    parts.push(
      Prisma.sql`public.dl_unaccent(coalesce(j."wilaya", '')) ILIKE public.dl_unaccent(${p.wilaya})`
    );
  }
  if (p.type) parts.push(Prisma.sql`j."type" = ${p.type}::"JobType"`);
  if (p.experienceLevel) {
    parts.push(Prisma.sql`j."experienceLevel" = ${p.experienceLevel}::"ExperienceLevel"`);
  }
  if (p.categoryId) parts.push(Prisma.sql`j."categoryId" = ${p.categoryId}`);
  if (p.categorySlug) {
    parts.push(
      Prisma.sql`j."categoryId" IN (SELECT id FROM "JobCategory" WHERE slug = ${p.categorySlug})`
    );
  }
  if (p.remote === true) parts.push(Prisma.sql`j."remote" = true`);
  if (p.featured === true) parts.push(Prisma.sql`j."featured" = true`);
  if (typeof p.salaryMin === "number" && Number.isFinite(p.salaryMin)) {
    parts.push(
      Prisma.sql`(j."salaryMax" IS NULL AND j."salaryMin" IS NULL
                  OR coalesce(j."salaryMax", j."salaryMin") >= ${Math.trunc(p.salaryMin)})`
    );
  }
  return parts;
};
var DOCUMENT = Prisma.sql`(
  setweight(to_tsvector('public.french_unaccent', coalesce(j.title, '')), 'A') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.location, '')), 'B') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.wilaya, '')), 'B') ||
  setweight(to_tsvector('public.french_unaccent', coalesce(j.description, '')), 'C')
)`;
var rankedIds = async (tsquery, params, skip, take) => {
  const where = Prisma.join(filterSql(params), " AND ");
  return prisma_default.$queryRaw`
    SELECT j.id,
           count(*) OVER() AS total
      FROM "Job" j
      LEFT JOIN "Company" c ON c.id = j."companyId"
     WHERE ${where}
       AND (
         ${DOCUMENT} @@ to_tsquery(${CONFIG}::regconfig, ${tsquery})
         -- The employer's name, which cannot live in the index expression
         -- because it is in another table. Backed by Company_name_trgm_idx.
         OR public.dl_unaccent(c.name) ILIKE public.dl_unaccent(${`%${params.q ?? ""}%`})
       )
     ORDER BY j."featured" DESC,
              ts_rank(${DOCUMENT}, to_tsquery(${CONFIG}::regconfig, ${tsquery})) DESC,
              j."publishedAt" DESC NULLS LAST,
              j."createdAt" DESC
     LIMIT ${take} OFFSET ${skip}`;
};
var similarIds = async (raw, params, skip, take) => {
  const where = Prisma.join(filterSql(params), " AND ");
  return prisma_default.$queryRaw`
    SELECT j.id,
           count(*) OVER() AS total
      FROM "Job" j
     WHERE ${where}
       AND word_similarity(public.dl_unaccent(${raw}), public.dl_unaccent(j.title))
             > ${SIMILARITY_FLOOR}
     ORDER BY word_similarity(public.dl_unaccent(${raw}), public.dl_unaccent(j.title)) DESC,
              j."featured" DESC,
              j."createdAt" DESC
     LIMIT ${take} OFFSET ${skip}`;
};
var JOB_INCLUDE = {
  company: { select: { name: true, logo: { select: { url: true } } } },
  category: { select: { name: true, slug: true } }
};
var searchJobs = async (params) => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 20) || 20, 1), MAX_PER_PAGE);
  const skip = (page - 1) * perPage;
  const tsquery = params.q?.trim() ? buildTsQuery(params.q) : null;
  if (!tsquery) {
    const where = Prisma.join(filterSql(params), " AND ");
    const [rows2, counted] = await Promise.all([
      prisma_default.$queryRaw`
        SELECT j.id FROM "Job" j
         WHERE ${where}
         ORDER BY j."featured" DESC,
                  j."publishedAt" DESC NULLS LAST,
                  j."createdAt" DESC
         LIMIT ${perPage} OFFSET ${skip}`,
      prisma_default.$queryRaw`
        SELECT count(*) AS total FROM "Job" j WHERE ${where}`
    ]);
    const total2 = Number(counted[0]?.total ?? 0);
    return {
      jobs: await hydrate(rows2.map((r) => r.id)),
      total: total2,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total2 / perPage)),
      didYouMean: false
    };
  }
  let rows = await rankedIds(tsquery, params, skip, perPage);
  let didYouMean = false;
  const singleTerm = tsquery.split("&").length === 1;
  if (!rows.length && page === 1 && singleTerm && params.q) {
    rows = await similarIds(params.q.trim(), params, 0, perPage);
    didYouMean = rows.length > 0;
  }
  const total = Number(rows[0]?.total ?? 0);
  return {
    jobs: await hydrate(rows.map((r) => r.id)),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    didYouMean
  };
};
var hydrate = async (ids) => {
  if (!ids.length) return [];
  const jobs = await prisma_default.job.findMany({
    where: { id: { in: ids } },
    include: JOB_INCLUDE
  });
  const position = new Map(ids.map((id, i) => [id, i]));
  return jobs.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
};

// server/controllers/job.controller.ts
var slugify3 = (title) => {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const suffix = crypto7.randomBytes(3).toString("hex");
  return `${base || "job"}-${suffix}`;
};
var getAllJobs = async (req, res, next) => {
  try {
    const {
      q,
      title,
      location,
      type,
      experienceLevel,
      categoryId,
      categorySlug,
      wilaya,
      remote,
      salaryMin,
      featured,
      limit,
      page,
      perPage
    } = req.query;
    const str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
    const featuredOnly = featured === "true" ? true : void 0;
    const remoteOnly = remote === "true" ? true : void 0;
    const salaryFloor = Number(salaryMin);
    const parsedLimit = Number(limit);
    const size = Number(perPage) || (Number.isFinite(parsedLimit) ? parsedLimit : void 0);
    const result = await searchJobs({
      q: str(q) ?? str(title),
      location: str(location),
      wilaya: str(wilaya),
      type: str(type),
      experienceLevel: str(experienceLevel),
      categoryId: str(categoryId),
      categorySlug: str(categorySlug),
      remote: remoteOnly,
      featured: featuredOnly,
      salaryMin: Number.isFinite(salaryFloor) ? salaryFloor : void 0,
      page: Number(page) || 1,
      perPage: size
    });
    res.status(200).json({
      status: "success",
      results: result.jobs.length,
      data: {
        jobs: result.jobs,
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
        // True when nothing matched the words and the results below came from
        // similarity instead, so the page can say so rather than presenting a
        // guess as an answer.
        didYouMean: result.didYouMean
      }
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterJobs = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (!user?.recruiterProfile) {
      return next(new AppError("Recruiter profile not found", 404));
    }
    const jobs = await prisma_default.job.findMany({
      where: { recruiterId: user.recruiterProfile.id },
      include: {
        // The sector, so the CV directory can group candidates by the kind of
        // work they applied for rather than only by the individual offer.
        category: { select: { name: true } },
        applications: {
          select: {
            status: true,
            aiScore: true,
            appliedAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const jobCards = jobs.map((job) => {
      const applications = job.applications;
      const applicationsCount = applications.length;
      const newCandidatesCount = applications.filter(
        (a) => a.appliedAt >= oneWeekAgo
      ).length;
      const scored = applications.filter((a) => a.aiScore != null);
      const averageMatch = scored.length > 0 ? Math.round(
        scored.reduce((sum, a) => sum + (a.aiScore ?? 0), 0) / scored.length
      ) : null;
      return {
        id: job.id,
        title: job.title,
        location: job.location,
        sector: job.category?.name ?? null,
        publishedAt: job.publishedAt,
        status: job.status,
        applicationsCount,
        newCandidatesCount,
        averageMatch
      };
    });
    res.status(200).json({
      status: "success",
      results: jobCards.length,
      data: { jobs: jobCards }
    });
  } catch (err) {
    next(err);
  }
};
var getJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({
      where: { id: req.params.id },
      include: { recruiter: true, company: true, category: true }
    });
    if (!job) {
      return next(new AppError("Job not found", 404));
    }
    res.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
    res.status(200).json({
      status: "success",
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};
var createJob = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("User not authenticated", 401));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (!user?.recruiterProfile) {
      return next(new AppError("Only recruiters can post jobs", 403));
    }
    const membership = await prisma_default.companyMember.findFirst({
      where: { recruiterId: user.recruiterProfile.id },
      include: { company: true }
    });
    if (!membership) {
      return next(new AppError("No company associated with this recruiter account", 400));
    }
    const plan = await getRecruiterPlan(req.user.id);
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
      featured
    } = req.body;
    if (!title || !description || !location || !type || !experienceLevel) {
      return next(new AppError("title, description, location, type and experienceLevel are required", 400));
    }
    const posting = await consumePosting(membership.companyId);
    let isFeatured = featured || false;
    if (isFeatured && plan === "FREE") {
      isFeatured = false;
    }
    if (isFeatured && plan === "PREMIUM") {
      const featuredCount = await prisma_default.job.count({
        where: { recruiterId: user.recruiterProfile.id, featured: true }
      });
      if (featuredCount >= 5) {
        isFeatured = false;
      }
    }
    let job;
    try {
      job = await prisma_default.job.create({
        data: {
          title,
          slug: slugify3(title),
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
          categoryId: categoryId || void 0,
          featured: isFeatured,
          recruiterId: user.recruiterProfile.id,
          companyId: membership.companyId,
          status: "PUBLISHED",
          publishedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (createErr) {
      await posting.refund();
      throw createErr;
    }
    await deliverEmail(
      "Job published",
      () => sendJobPublishedEmail(user.email, {
        companyName: membership.company.name,
        jobTitle: job.title,
        city: job.location,
        publishedAt: job.publishedAt ?? void 0
      })
    );
    (async () => {
      try {
        const matchingCandidates2 = await prisma_default.candidateProfile.findMany({
          where: {
            skills: {
              hasSome: title.split(" ")
            }
          },
          include: { user: true }
        });
        await notifyJobMatch({
          candidateUserIds: matchingCandidates2.map((c) => c.userId),
          jobTitle: job.title,
          company: membership.company.name
        });
        for (const candidate of matchingCandidates2) {
          await sendJobMatchEmail(
            candidate.user.email,
            job.title,
            membership.company.name,
            job.id
          );
        }
      } catch (err) {
        console.error("Error in job match background task:", err);
      }
    })();
    res.status(201).json({
      status: "success",
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};
var updateJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({ where: { id: req.params.id } });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
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
      featured
    } = req.body;
    let nextFeatured = void 0;
    if (featured !== void 0) {
      const plan = await getRecruiterPlan(req.user.id);
      nextFeatured = Boolean(featured);
      if (nextFeatured && plan === "FREE") {
        return next(
          new AppError("Featured jobs require a Premium or Corporate plan.", 403)
        );
      }
      if (nextFeatured && plan === "PREMIUM" && !job.featured) {
        const featuredCount = await prisma_default.job.count({
          where: { recruiterId: job.recruiterId, featured: true }
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
    const updatedJob = await prisma_default.job.update({
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
        featured: nextFeatured
      }
    });
    res.status(200).json({
      status: "success",
      data: { job: updatedJob }
    });
  } catch (err) {
    next(err);
  }
};
var deleteJob = async (req, res, next) => {
  try {
    const job = await prisma_default.job.findUnique({ where: { id: req.params.id } });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    await prisma_default.job.delete({ where: { id: req.params.id } });
    res.status(204).json({
      status: "success",
      data: null
    });
  } catch (err) {
    next(err);
  }
};
var getMatchedJobs = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 20);
    const matches2 = await getMatchedJobsForCandidate(req.user.id, limit);
    res.status(200).json({
      status: "success",
      results: matches2.length,
      data: {
        jobs: matches2.map(({ job, reasons }) => ({
          id: job.id,
          title: job.title,
          slug: job.slug,
          description: job.description,
          location: job.location,
          wilaya: job.wilaya,
          remote: job.remote,
          type: job.type,
          experienceLevel: job.experienceLevel,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          featured: job.featured,
          urgent: job.urgent,
          publishedAt: job.publishedAt,
          createdAt: job.createdAt,
          company: job.company,
          category: job.category,
          /** Why this one matched — short, human phrases. */
          matchReasons: reasons
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/middleware/role.middleware.ts
var restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};

// server/routes/job.routes.ts
var router2 = Router2();
router2.get("/", getAllJobs);
router2.get("/recruiter/mine", protect, restrictTo("RECRUITER", "ADMIN"), getRecruiterJobs);
router2.get(
  "/me/recommended",
  protect,
  restrictTo("CANDIDATE", "ADMIN"),
  getMatchedJobs
);
router2.get("/:id", getJob);
router2.use(protect);
router2.post("/", restrictTo("RECRUITER", "ADMIN"), createJob);
router2.patch("/:id", restrictTo("RECRUITER", "ADMIN"), updateJob);
router2.delete("/:id", restrictTo("RECRUITER", "ADMIN"), deleteJob);
var job_routes_default = router2;

// server/routes/category.routes.ts
import { Router as Router3 } from "express";

// server/controllers/category.controller.ts
init_prisma();
var getAllCategories = async (_req, res, next) => {
  try {
    const categories = await prisma_default.jobCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: {
          select: { jobs: { where: { status: "PUBLISHED" } } }
        }
      }
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
          jobCount: c._count.jobs
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const limitParam = Number(req.query.limit);
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 20) : 6;
    const category = await prisma_default.jobCategory.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, description: true, icon: true }
    });
    if (!category) {
      return next(new AppError("Category not found", 404));
    }
    const [jobs, jobCount] = await Promise.all([
      prisma_default.job.findMany({
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
          company: { select: { name: true, logo: { select: { url: true } } } }
        }
      }),
      prisma_default.job.count({ where: { categoryId: category.id, status: "PUBLISHED" } })
    ]);
    res.status(200).json({
      status: "success",
      data: { category: { ...category, jobCount }, jobs }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/category.routes.ts
var router3 = Router3();
router3.get("/", getAllCategories);
router3.get("/:slug", getCategoryBySlug);
var category_routes_default = router3;

// server/routes/freelance.routes.ts
import { Router as Router4 } from "express";

// server/controllers/freelancePublic.controller.ts
init_prisma();
var PAGE_SIZE = 24;
var MAX_PAGE_SIZE = 48;
var paging = (req) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || PAGE_SIZE));
  return { skip: (page - 1) * size, take: size, page, size };
};
var publishedServiceWhere = () => ({
  status: "PUBLISHED",
  OR: [{ expiresAt: null }, { expiresAt: { gt: /* @__PURE__ */ new Date() } }]
});
var listCategories = async (_req, res, next) => {
  try {
    const categories = await prisma_default.jobCategory.findMany({
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
          select: { id: true, name: true, slug: true }
        },
        _count: { select: { services: { where: publishedServiceWhere() } } }
      }
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
          serviceCount: c._count.services
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listServices = async (req, res, next) => {
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
      sort
    } = req.query;
    const packageFilter = {};
    if (minPrice) packageFilter.price = { gte: Number(minPrice) };
    if (maxPrice) {
      packageFilter.price = { ...packageFilter.price, lte: Number(maxPrice) };
    }
    if (maxDeliveryDays) packageFilter.deliveryDays = { lte: Number(maxDeliveryDays) };
    const freelancerFilter = {};
    if (wilaya) freelancerFilter.wilaya = wilaya;
    if (level) freelancerFilter.level = level;
    if (language) freelancerFilter.languages = { has: language };
    if (verified === "true") freelancerFilter.identityVerified = true;
    if (minRating) freelancerFilter.ratingAverage = { gte: Number(minRating) };
    const where = {
      ...publishedServiceWhere(),
      ...q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      } : {},
      ...category ? { category: { slug: category } } : {},
      ...Object.keys(packageFilter).length ? { packages: { some: packageFilter } } : {},
      ...Object.keys(freelancerFilter).length ? { freelancer: freelancerFilter } : {}
    };
    const orderBy = sort === "recent" ? [{ publishedAt: "desc" }] : sort === "rating" ? [{ freelancer: { ratingAverage: "desc" } }] : [{ views: "desc" }, { publishedAt: "desc" }];
    const [total, services] = await Promise.all([
      prisma_default.serviceListing.count({ where }),
      prisma_default.serviceListing.findMany({
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
            select: { file: { select: { url: true } } }
          },
          packages: {
            orderBy: { price: "asc" },
            take: 1,
            select: { price: true, deliveryDays: true }
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
              user: { select: { avatar: { select: { url: true } } } }
            }
          }
        }
      })
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
            avatarUrl: s.freelancer.user.avatar?.url ?? null
          }
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listProjects = async (req, res, next) => {
  try {
    const { skip, take, page, size } = paging(req);
    const { q, category, wilaya, remote, minBudget, maxBudget } = req.query;
    const where = {
      status: "OPEN",
      visibility: "PUBLIC",
      ...q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      } : {},
      ...category ? { category: { slug: category } } : {},
      ...wilaya ? { wilaya } : {},
      ...remote === "true" ? { remote: true } : {},
      ...minBudget ? { budgetMax: { gte: Number(minBudget) } } : {},
      ...maxBudget ? { budgetMin: { lte: Number(maxBudget) } } : {}
    };
    const [total, projects] = await Promise.all([
      prisma_default.freelanceProject.count({ where }),
      prisma_default.freelanceProject.findMany({
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
          company: { select: { name: true } }
        }
      })
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
          clientName: p.company?.name ?? [p.client.firstName, p.client.lastName].filter(Boolean).join(" ") ?? null
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listFreelancers = async (req, res, next) => {
  try {
    const { skip, take, page, size } = paging(req);
    const { q, category, wilaya, level, language, verified } = req.query;
    const where = {
      // Someone with nothing published is not a directory entry.
      services: { some: publishedServiceWhere() },
      ...q ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } }
        ]
      } : {},
      ...category ? { category: { slug: category } } : {},
      ...wilaya ? { wilaya } : {},
      ...level ? { level } : {},
      ...language ? { languages: { has: language } } : {},
      ...verified === "true" ? { identityVerified: true } : {}
    };
    const [total, freelancers] = await Promise.all([
      prisma_default.freelancerProfile.count({ where }),
      prisma_default.freelancerProfile.findMany({
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
          _count: { select: { services: { where: publishedServiceWhere() } } }
        }
      })
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
          serviceCount: f._count.services
        })),
        page,
        pageSize: size,
        total,
        totalPages: Math.max(1, Math.ceil(total / size))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listPricing = async (_req, res, next) => {
  try {
    const [packs, plans] = await Promise.all([
      prisma_default.creditPack.findMany({
        where: { active: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, credits: true, price: true, currency: true }
      }),
      prisma_default.freelancePlan.findMany({
        where: { active: true },
        orderBy: { price: "asc" }
      })
    ]);
    res.json({ success: true, data: { packs, plans } });
  } catch (err) {
    next(err);
  }
};
var getProject = async (req, res, next) => {
  try {
    const project = await prisma_default.freelanceProject.findFirst({
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
        company: { select: { name: true, logo: { select: { url: true } } } }
      }
    });
    if (!project) {
      return res.status(404).json({ success: false, message: "Projet introuvable." });
    }
    if (project.visibility === "INVITE_ONLY") {
      return res.status(403).json({
        success: false,
        message: "Ce projet est r\xE9serv\xE9 aux freelances invit\xE9s."
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
            name: project.company?.name ?? [project.client.firstName, project.client.lastName].filter(Boolean).join(" ") ?? null,
            logoUrl: project.company?.logo?.url ?? null,
            memberSince: project.client.createdAt
          }
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var getService = async (req, res, next) => {
  try {
    const service = await prisma_default.serviceListing.findFirst({
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
            features: true
          }
        },
        addons: { select: { id: true, name: true, price: true, extraDays: true } },
        faqs: { orderBy: { position: "asc" }, select: { question: true, answer: true } },
        requirements: {
          orderBy: { position: "asc" },
          select: { prompt: true, required: true }
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
            user: { select: { avatar: { select: { url: true } } } }
          }
        }
      }
    });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service introuvable." });
    }
    prisma_default.serviceListing.update({ where: { id: service.id }, data: { views: { increment: 1 } } }).catch(() => {
    });
    res.json({
      success: true,
      data: {
        service: {
          ...service,
          images: service.media.map((m) => m.file.url),
          skills: service.skills.map((s) => s.skill.name),
          freelancer: {
            ...service.freelancer,
            avatarUrl: service.freelancer.user.avatar?.url ?? null
          }
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var getFreelancer = async (req, res, next) => {
  try {
    const freelancer = await prisma_default.freelancerProfile.findUnique({
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
              select: { file: { select: { url: true } } }
            },
            packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } }
          }
        }
      }
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
            startingPrice: s.packages[0]?.price ?? null
          }))
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/controllers/freelancer.controller.ts
init_prisma();
import { CreditEntryType as CreditEntryType2 } from "@prisma/client";
init_credits_service();
init_plans_service();
var slugifyUsername = (raw) => raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30);
var uniqueUsername = async (base) => {
  const root = base || "freelance";
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n}`;
    const taken = await prisma_default.freelancerProfile.findUnique({
      where: { username: candidate },
      select: { id: true }
    });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
};
var getActivationDraft = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        candidateProfile: {
          select: {
            headline: true,
            bio: true,
            city: true,
            wilaya: true,
            skills: true,
            currentJobTitle: true,
            yearsExperience: true,
            linkedinUrl: true,
            portfolioUrl: true
          }
        },
        freelancerProfile: { select: { username: true } }
      }
    });
    if (!user) return next(new AppError("User not found", 404));
    if (user.freelancerProfile) {
      return res.json({
        success: true,
        data: { alreadyActive: true, username: user.freelancerProfile.username }
      });
    }
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const c = user.candidateProfile;
    res.json({
      success: true,
      data: {
        alreadyActive: false,
        suggested: {
          username: await uniqueUsername(slugifyUsername(fullName || user.email.split("@")[0])),
          displayName: fullName || user.email.split("@")[0],
          title: c?.currentJobTitle ?? c?.headline ?? null,
          bio: c?.bio ?? null,
          wilaya: c?.wilaya ?? c?.city ?? null,
          skills: c?.skills ?? [],
          linkedin: c?.linkedinUrl ?? null,
          portfolio: c?.portfolioUrl ?? null
        },
        /** Shown so the user knows where the suggestions came from. */
        source: c ? "cv" : "account"
      }
    });
  } catch (err) {
    next(err);
  }
};
var activate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existing = await prisma_default.freelancerProfile.findUnique({
      where: { userId },
      select: { username: true }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Un profil freelance existe d\xE9j\xE0 pour ce compte.",
        data: { username: existing.username }
      });
    }
    const { username, displayName, title, bio, wilaya, categoryId, languages, hourlyRate, skills } = req.body;
    const handle = slugifyUsername(String(username ?? ""));
    if (!handle || handle.length < 3) {
      return next(new AppError("Nom d'utilisateur invalide (3 caract\xE8res minimum).", 400));
    }
    if (!String(displayName ?? "").trim()) {
      return next(new AppError("Le nom affich\xE9 est obligatoire.", 400));
    }
    const taken = await prisma_default.freelancerProfile.findUnique({
      where: { username: handle },
      select: { id: true }
    });
    if (taken) return next(new AppError("Ce nom d'utilisateur est d\xE9j\xE0 pris.", 409));
    const costs = await credits_service_default.getCreditCosts();
    const profile = await prisma_default.$transaction(async (tx) => {
      const created = await tx.freelancerProfile.create({
        data: {
          userId,
          username: handle,
          displayName: String(displayName).trim(),
          title: title ? String(title).trim() : null,
          bio: bio ? String(bio).trim() : null,
          wilaya: wilaya ? String(wilaya).trim() : null,
          categoryId: categoryId ? String(categoryId) : null,
          hourlyRate: hourlyRate != null ? String(hourlyRate) : null,
          languages: Array.isArray(languages) ? languages : [],
          trialClaimedAt: /* @__PURE__ */ new Date()
        },
        select: { id: true, username: true }
      });
      if (Array.isArray(skills)) {
        for (const raw of skills.slice(0, 20)) {
          const name2 = String(raw).trim();
          if (!name2) continue;
          const skill = await tx.skill.upsert({
            where: { name: name2 },
            update: {},
            create: { name: name2 },
            select: { id: true }
          });
          await tx.freelancerSkill.create({
            data: { freelancerId: created.id, skillId: skill.id }
          });
        }
      }
      await tx.portfolio.create({ data: { freelancerId: created.id } });
      return created;
    });
    const trialCredits = costs.trialProposals * costs.proposal;
    if (trialCredits > 0) {
      await credits_service_default.grant({
        userId,
        amount: trialCredits,
        type: CreditEntryType2.TRIAL_GRANT,
        idempotencyKey: `trial:${profile.id}`,
        note: `Essai gratuit : ${costs.trialProposals} propositions`
      });
    }
    res.status(201).json({
      success: true,
      data: { username: profile.username, credits: await credits_service_default.getBalance(userId) }
    });
  } catch (err) {
    next(err);
  }
};
var getMyWorkspace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
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
        category: { select: { id: true, name: true } },
        skills: { select: { skill: { select: { name: true } } } },
        portfolio: { select: { published: true } }
      }
    });
    if (!profile) {
      return res.json({ success: true, data: { active: false } });
    }
    const now = /* @__PURE__ */ new Date();
    const [
      published,
      pending,
      drafts,
      expired,
      proposalsSent,
      proposalsShortlisted,
      activeOrders,
      completedOrders,
      balance
    ] = await Promise.all([
      prisma_default.serviceListing.count({
        where: {
          freelancerId: profile.id,
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
        }
      }),
      prisma_default.serviceListing.count({ where: { freelancerId: profile.id, status: "PENDING" } }),
      prisma_default.serviceListing.count({ where: { freelancerId: profile.id, status: "DRAFT" } }),
      prisma_default.serviceListing.count({
        where: { freelancerId: profile.id, status: "PUBLISHED", expiresAt: { lte: now } }
      }),
      prisma_default.proposal.count({ where: { freelancerId: profile.id } }),
      prisma_default.proposal.count({ where: { freelancerId: profile.id, status: "SHORTLISTED" } }),
      prisma_default.freelanceOrder.count({
        where: {
          freelancerId: profile.id,
          status: { in: ["CREATED", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED"] }
        }
      }),
      prisma_default.freelanceOrder.count({ where: { freelancerId: profile.id, status: "COMPLETED" } }),
      credits_service_default.getBalance(userId)
    ]);
    res.json({
      success: true,
      data: {
        active: true,
        profile: {
          ...profile,
          skills: profile.skills.map((s) => s.skill.name),
          portfolioPublished: profile.portfolio?.published ?? false
        },
        stats: {
          published,
          pending,
          drafts,
          expired,
          proposalsSent,
          proposalsShortlisted,
          activeOrders,
          completedOrders
        },
        wallet: { balance, costs: await credits_service_default.getCreditCosts() },
        // What the plan allows, computed server-side. The page uses it to
        // show limits; the handlers use it to enforce them.
        entitlements: await plans_service_default.getEntitlements(profile.id)
      }
    });
  } catch (err) {
    next(err);
  }
};
var getWallet = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await credits_service_default.history(req.user.id, page);
    res.json({ success: true, data: { ...data, costs: await credits_service_default.getCreditCosts() } });
  } catch (err) {
    next(err);
  }
};
var listMyServices = async (req, res, next) => {
  try {
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) return next(new AppError("Aucun profil freelance.", 404));
    const services = await prisma_default.serviceListing.findMany({
      where: { freelancerId: profile.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        rejectionReason: true,
        views: true,
        publishedAt: true,
        expiresAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        media: { take: 1, orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
        packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } },
        _count: { select: { orders: true } }
      }
    });
    res.json({
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          status: s.status,
          rejectionReason: s.rejectionReason,
          views: s.views,
          publishedAt: s.publishedAt,
          expiresAt: s.expiresAt,
          updatedAt: s.updatedAt,
          category: s.category?.name ?? null,
          coverUrl: s.media[0]?.file.url ?? null,
          startingPrice: s.packages[0]?.price ?? null,
          orderCount: s._count.orders
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listMyProposals = async (req, res, next) => {
  try {
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) return next(new AppError("Aucun profil freelance.", 404));
    const proposals = await prisma_default.proposal.findMany({
      where: { freelancerId: profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        price: true,
        deliveryDays: true,
        status: true,
        viewedAt: true,
        createdAt: true,
        project: { select: { title: true, slug: true, status: true } }
      }
    });
    res.json({ success: true, data: { proposals } });
  } catch (err) {
    next(err);
  }
};
var listMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId },
      select: { id: true }
    });
    const orders = await prisma_default.freelanceOrder.findMany({
      where: {
        OR: [{ clientId: userId }, ...profile ? [{ freelancerId: profile.id }] : []]
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        status: true,
        agreedPrice: true,
        currency: true,
        deliveryDueAt: true,
        createdAt: true,
        clientId: true,
        service: { select: { title: true } },
        project: { select: { title: true } },
        freelancer: { select: { displayName: true, username: true } },
        client: { select: { firstName: true, lastName: true } }
      }
    });
    res.json({
      success: true,
      data: {
        orders: orders.map((o) => ({
          ...o,
          // Which side of the order this viewer is on decides what the page
          // offers them to do.
          role: o.clientId === userId ? "client" : "freelancer"
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyProfile = async (req, res, next) => {
  try {
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) return next(new AppError("Aucun profil freelance.", 404));
    const { displayName, title, bio, wilaya, categoryId, hourlyRate, availability, languages } = req.body;
    if (displayName !== void 0 && !String(displayName).trim()) {
      return next(new AppError("Le nom affich\xE9 ne peut pas \xEAtre vide.", 400));
    }
    const updated = await prisma_default.freelancerProfile.update({
      where: { id: profile.id },
      data: {
        ...displayName !== void 0 ? { displayName: String(displayName).trim() } : {},
        ...title !== void 0 ? { title: title ? String(title).trim() : null } : {},
        ...bio !== void 0 ? { bio: bio ? String(bio).trim() : null } : {},
        ...wilaya !== void 0 ? { wilaya: wilaya ? String(wilaya).trim() : null } : {},
        ...categoryId !== void 0 ? { categoryId: categoryId ? String(categoryId) : null } : {},
        ...hourlyRate !== void 0 ? { hourlyRate: hourlyRate != null && hourlyRate !== "" ? String(hourlyRate) : null } : {},
        ...availability !== void 0 ? { availability } : {},
        ...Array.isArray(languages) ? { languages } : {}
      },
      select: { id: true }
    });
    res.json({ success: true, data: { id: updated.id } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/service.controller.ts
init_prisma();

// server/services/servicePublication.service.ts
init_prisma();
init_credits_service();
init_plans_service();
import { CreditEntryType as CreditEntryType3, ServiceStatus } from "@prisma/client";
var ServiceValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ServiceValidationError";
  }
};
var slugify4 = (title) => {
  const base = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "service"}-${suffix}`;
};
var assertReadyForReview = (service) => {
  if (service.title.trim().length < 10) {
    throw new ServiceValidationError("Le titre doit faire au moins 10 caract\xE8res.");
  }
  if (service.description.trim().length < 60) {
    throw new ServiceValidationError("La description doit faire au moins 60 caract\xE8res.");
  }
  if (service.packages.length === 0) {
    throw new ServiceValidationError("Ajoutez au moins une formule avec un prix.");
  }
  for (const p of service.packages) {
    if (Number(p.price) <= 0) {
      throw new ServiceValidationError("Chaque formule doit avoir un prix sup\xE9rieur \xE0 z\xE9ro.");
    }
    if (p.deliveryDays <= 0) {
      throw new ServiceValidationError("Chaque formule doit avoir un d\xE9lai de livraison.");
    }
  }
};
var submitForReview = async (freelancerId, serviceId, userId) => {
  const service = await prisma_default.serviceListing.findFirst({
    where: { id: serviceId, freelancerId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      packages: { select: { price: true, deliveryDays: true } }
    }
  });
  if (!service) throw new ServiceValidationError("Service introuvable.");
  if (service.status === "PENDING") {
    throw new ServiceValidationError("Ce service est d\xE9j\xE0 en attente de validation.");
  }
  if (service.status === "PUBLISHED") {
    throw new ServiceValidationError("Ce service est d\xE9j\xE0 en ligne.");
  }
  assertReadyForReview(service);
  await plans_service_default.assertCanPublishService(freelancerId);
  const costs = await credits_service_default.getCreditCosts();
  const previousStatus = service.status;
  const claimed = await prisma_default.serviceListing.updateMany({
    where: { id: service.id, freelancerId, status: { in: ["DRAFT", "REJECTED"] } },
    data: {
      status: ServiceStatus.PENDING,
      rejectionReason: null,
      publicationAttempts: { increment: 1 }
    }
  });
  if (claimed.count === 0) {
    throw new ServiceValidationError("Ce service est d\xE9j\xE0 en attente de validation.");
  }
  const { publicationAttempts } = await prisma_default.serviceListing.findUniqueOrThrow({
    where: { id: service.id },
    select: { publicationAttempts: true }
  });
  try {
    const charge = await credits_service_default.spend({
      userId,
      amount: costs.servicePublication,
      type: CreditEntryType3.SERVICE_PUBLICATION,
      idempotencyKey: `service-publication:${service.id}:${publicationAttempts}`,
      referenceType: "service",
      referenceId: service.id,
      note: `Publication : ${service.title.slice(0, 60)}`
    });
    return { status: ServiceStatus.PENDING, balance: charge.balance, charged: !charge.replayed };
  } catch (err) {
    await prisma_default.serviceListing.updateMany({
      where: { id: service.id, status: ServiceStatus.PENDING },
      data: { status: previousStatus, publicationAttempts: { decrement: 1 } }
    });
    throw err;
  }
};
var approve = async (serviceId, moderatorId) => {
  const service = await prisma_default.serviceListing.findUnique({
    where: { id: serviceId },
    select: { id: true, freelancerId: true, status: true }
  });
  if (!service) throw new ServiceValidationError("Service introuvable.");
  if (service.status !== "PENDING") {
    throw new ServiceValidationError("Ce service n'est pas en attente de validation.");
  }
  await plans_service_default.assertCanPublishService(service.freelancerId);
  const costs = await credits_service_default.getCreditCosts();
  const now = /* @__PURE__ */ new Date();
  const expiresAt = new Date(now.getTime() + costs.serviceDurationDays * 864e5);
  const [updated] = await prisma_default.$transaction([
    prisma_default.serviceListing.update({
      where: { id: service.id },
      data: { status: ServiceStatus.PUBLISHED, publishedAt: now, expiresAt }
    }),
    prisma_default.moderationRecord.create({
      data: {
        entityType: "service",
        entityId: service.id,
        state: "APPROVED",
        moderatorId
      }
    })
  ]);
  return updated;
};
var reject = async (serviceId, moderatorId, reason) => {
  if (!reason?.trim()) {
    throw new ServiceValidationError("Un motif est obligatoire pour refuser un service.");
  }
  const service = await prisma_default.serviceListing.findUnique({
    where: { id: serviceId },
    select: { id: true, status: true }
  });
  if (!service) throw new ServiceValidationError("Service introuvable.");
  if (service.status !== "PENDING") {
    throw new ServiceValidationError("Ce service n'est pas en attente de validation.");
  }
  await prisma_default.$transaction([
    prisma_default.serviceListing.update({
      where: { id: service.id },
      data: { status: ServiceStatus.REJECTED, rejectionReason: reason.trim() }
    }),
    prisma_default.moderationRecord.create({
      data: {
        entityType: "service",
        entityId: service.id,
        state: "REJECTED",
        reason: reason.trim(),
        moderatorId
      }
    })
  ]);
  const refund = await credits_service_default.refundFor(
    "service",
    service.id,
    "Remboursement : service refus\xE9 par la mod\xE9ration"
  );
  return { refunded: refund?.replayed === false, balance: refund?.balance ?? null };
};
var servicePublication_service_default = { submitForReview, approve, reject, slugify: slugify4, ServiceValidationError };

// server/controllers/service.controller.ts
init_plans_service();
init_credits_service();
var TIERS = ["BASIC", "STANDARD", "PREMIUM"];
var requireProfile = async (userId) => {
  const profile = await prisma_default.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile.id;
};
var asHttpError = (err) => {
  if (err instanceof ServiceValidationError) return new AppError(err.message, 400);
  if (err instanceof PlanLimitError) return new AppError(err.message, 403);
  if (err instanceof InsufficientCreditsError) {
    return new AppError(
      `Cr\xE9dits insuffisants : ${err.required} requis, ${err.available} disponibles.`,
      402
    );
  }
  return err;
};
var createDraft = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const title = String(req.body.title ?? "").trim();
    const service = await prisma_default.serviceListing.create({
      data: {
        freelancerId,
        title: title || "Nouveau service",
        slug: servicePublication_service_default.slugify(title || "service"),
        description: "",
        status: "DRAFT"
      },
      select: { id: true }
    });
    res.status(201).json({ success: true, data: { id: service.id } });
  } catch (err) {
    next(err);
  }
};
var getMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const service = await prisma_default.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        rejectionReason: true,
        views: true,
        publishedAt: true,
        expiresAt: true,
        categoryId: true,
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
            features: true
          }
        },
        addons: { select: { id: true, name: true, price: true, extraDays: true } },
        faqs: { orderBy: { position: "asc" }, select: { id: true, question: true, answer: true } },
        requirements: {
          orderBy: { position: "asc" },
          select: { id: true, prompt: true, required: true }
        },
        skills: { select: { skill: { select: { name: true } } } },
        // The gallery, so the editor can show what is already there rather
        // than only what is being added now.
        media: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            file: { select: { id: true, url: true, fileName: true, size: true } }
          }
        }
      }
    });
    if (!service) return next(new AppError("Service introuvable.", 404));
    res.json({
      success: true,
      data: { service: { ...service, skills: service.skills.map((s) => s.skill.name) } }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const existing = await prisma_default.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: { id: true, status: true }
    });
    if (!existing) return next(new AppError("Service introuvable.", 404));
    if (existing.status === "PENDING") {
      return next(
        new AppError("Ce service est en cours de validation et ne peut pas \xEAtre modifi\xE9.", 409)
      );
    }
    const { title, description, categoryId, packages, faqs, requirements, skills } = req.body;
    await prisma_default.$transaction(async (tx) => {
      await tx.serviceListing.update({
        where: { id: existing.id },
        data: {
          ...title !== void 0 ? { title: String(title).trim() || "Nouveau service" } : {},
          ...description !== void 0 ? { description: String(description) } : {},
          ...categoryId !== void 0 ? { categoryId: categoryId || null } : {}
        }
      });
      if (Array.isArray(packages)) {
        await tx.servicePackage.deleteMany({ where: { serviceId: existing.id } });
        for (const p of packages) {
          const tier = TIERS.includes(p.tier) ? p.tier : "BASIC";
          if (p.price === "" || p.price == null) continue;
          await tx.servicePackage.create({
            data: {
              serviceId: existing.id,
              tier,
              name: String(p.name ?? tier).trim() || tier,
              description: p.description ? String(p.description) : null,
              price: String(Number(p.price) || 0),
              deliveryDays: Math.max(1, Number(p.deliveryDays) || 1),
              revisions: Math.max(0, Number(p.revisions) || 0),
              features: Array.isArray(p.features) ? p.features.map(String).filter(Boolean).slice(0, 12) : []
            }
          });
        }
      }
      if (Array.isArray(faqs)) {
        await tx.serviceFaq.deleteMany({ where: { serviceId: existing.id } });
        for (const [i, f] of faqs.slice(0, 15).entries()) {
          if (!f?.question?.trim() || !f?.answer?.trim()) continue;
          await tx.serviceFaq.create({
            data: {
              serviceId: existing.id,
              question: String(f.question).trim(),
              answer: String(f.answer).trim(),
              position: i
            }
          });
        }
      }
      if (Array.isArray(requirements)) {
        await tx.serviceRequirement.deleteMany({ where: { serviceId: existing.id } });
        for (const [i, r] of requirements.slice(0, 15).entries()) {
          if (!r?.prompt?.trim()) continue;
          await tx.serviceRequirement.create({
            data: {
              serviceId: existing.id,
              prompt: String(r.prompt).trim(),
              required: r.required !== false,
              position: i
            }
          });
        }
      }
      if (Array.isArray(skills)) {
        await tx.serviceSkill.deleteMany({ where: { serviceId: existing.id } });
        for (const raw of skills.slice(0, 15)) {
          const name2 = String(raw).trim();
          if (!name2) continue;
          const skill = await tx.skill.upsert({
            where: { name: name2 },
            update: {},
            create: { name: name2 },
            select: { id: true }
          });
          await tx.serviceSkill.create({
            data: { serviceId: existing.id, skillId: skill.id }
          });
        }
      }
    });
    res.json({ success: true, data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
};
var submitMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const result = await servicePublication_service_default.submitForReview(freelancerId, req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError(err));
  }
};
var pauseMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const done = await prisma_default.serviceListing.updateMany({
      where: { id: req.params.id, freelancerId, status: "PUBLISHED" },
      data: { status: "PAUSED" }
    });
    if (done.count === 0) return next(new AppError("Ce service n'est pas en ligne.", 409));
    res.json({ success: true, data: { status: "PAUSED" } });
  } catch (err) {
    next(err);
  }
};
var resumeMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const service = await prisma_default.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId, status: "PAUSED" },
      select: { id: true, expiresAt: true }
    });
    if (!service) return next(new AppError("Ce service n'est pas en pause.", 409));
    const { assertCanPublishService: assertCanPublishService2 } = await Promise.resolve().then(() => (init_plans_service(), plans_service_exports));
    try {
      await assertCanPublishService2(freelancerId);
    } catch (err) {
      return next(asHttpError(err));
    }
    const expired = service.expiresAt && service.expiresAt <= /* @__PURE__ */ new Date();
    await prisma_default.serviceListing.update({
      where: { id: service.id },
      data: { status: expired ? "EXPIRED" : "PUBLISHED" }
    });
    res.json({ success: true, data: { status: expired ? "EXPIRED" : "PUBLISHED" } });
  } catch (err) {
    next(err);
  }
};
var deleteMyService = async (req, res, next) => {
  try {
    const freelancerId = await requireProfile(req.user.id);
    const service = await prisma_default.serviceListing.findFirst({
      where: { id: req.params.id, freelancerId },
      select: { id: true, status: true, _count: { select: { orders: true } } }
    });
    if (!service) return next(new AppError("Service introuvable.", 404));
    if (service._count.orders > 0) {
      return next(
        new AppError(
          "Ce service a des commandes et ne peut pas \xEAtre supprim\xE9. Mettez-le en pause.",
          409
        )
      );
    }
    if (service.status === "PENDING") {
      return next(new AppError("Ce service est en cours de validation.", 409));
    }
    await prisma_default.serviceListing.delete({ where: { id: service.id } });
    res.json({ success: true, data: { id: service.id } });
  } catch (err) {
    next(err);
  }
};
var ownedService = async (serviceId, userId) => {
  const freelancerId = await requireProfile(userId);
  const service = await prisma_default.serviceListing.findFirst({
    where: { id: serviceId, freelancerId },
    select: { id: true, _count: { select: { media: true } } }
  });
  if (!service) throw new AppError("Service introuvable.", 404);
  return service;
};
var galleryOf = (serviceId) => prisma_default.serviceMedia.findMany({
  where: { serviceId },
  orderBy: { position: "asc" },
  select: {
    id: true,
    position: true,
    file: { select: { id: true, url: true, fileName: true, size: true } }
  }
});
var addServiceMedia = async (req, res, next) => {
  const stored = [];
  try {
    const service = await ownedService(req.params.id, req.user.id);
    const images = validateServiceMedia(req.files);
    const room = SERVICE_MEDIA_MAX_COUNT - service._count.media;
    if (images.length > room) {
      return next(
        new AppError(
          room <= 0 ? `Ce service a d\xE9j\xE0 ${SERVICE_MEDIA_MAX_COUNT} images. Supprimez-en une d'abord.` : `Il ne reste de la place que pour ${room} image(s).`,
          400
        )
      );
    }
    for (const image of images) {
      stored.push(
        await uploadObject({
          bucket: SERVICE_MEDIA_BUCKET,
          path: buildObjectPath(service.id, image.extension),
          buffer: image.buffer,
          mimeType: image.mimeType
        })
      );
    }
    try {
      await prisma_default.$transaction(async (tx) => {
        const last = await tx.serviceMedia.findFirst({
          where: { serviceId: service.id },
          orderBy: { position: "desc" },
          select: { position: true }
        });
        let position = (last?.position ?? -1) + 1;
        for (let i = 0; i < images.length; i += 1) {
          const image = images[i];
          const asset = await tx.fileAsset.create({
            data: {
              url: getPublicUrl(SERVICE_MEDIA_BUCKET, stored[i]),
              provider: "supabase",
              publicId: stored[i],
              fileName: image.fileName,
              mimeType: image.mimeType,
              extension: image.extension,
              size: image.size
            }
          });
          await tx.serviceMedia.create({
            data: { serviceId: service.id, fileId: asset.id, position }
          });
          position += 1;
        }
      });
    } catch (dbErr) {
      await Promise.all(stored.map((path) => removeObject(SERVICE_MEDIA_BUCKET, path)));
      throw dbErr;
    }
    res.status(201).json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};
var removeServiceMedia = async (req, res, next) => {
  try {
    const service = await ownedService(req.params.id, req.user.id);
    const media = await prisma_default.serviceMedia.findFirst({
      where: { id: req.params.mediaId, serviceId: service.id },
      select: { id: true, file: { select: { id: true, publicId: true } } }
    });
    if (!media) return next(new AppError("Image introuvable.", 404));
    await prisma_default.$transaction(async (tx) => {
      await tx.serviceMedia.delete({ where: { id: media.id } });
      await tx.fileAsset.delete({ where: { id: media.file.id } }).catch(() => void 0);
      const rest = await tx.serviceMedia.findMany({
        where: { serviceId: service.id },
        orderBy: { position: "asc" },
        select: { id: true }
      });
      for (let i = 0; i < rest.length; i += 1) {
        await tx.serviceMedia.update({ where: { id: rest[i].id }, data: { position: i } });
      }
    });
    if (media.file.publicId) {
      await removeObject(SERVICE_MEDIA_BUCKET, media.file.publicId);
    }
    res.json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};
var reorderServiceMedia = async (req, res, next) => {
  try {
    const service = await ownedService(req.params.id, req.user.id);
    const { order } = req.body;
    if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
      return next(new AppError("Envoyez \xAB order \xBB : la liste des identifiants.", 400));
    }
    const current = await prisma_default.serviceMedia.findMany({
      where: { serviceId: service.id },
      select: { id: true }
    });
    const known = new Set(current.map((m) => m.id));
    const asked = [...new Set(order)];
    if (asked.length !== known.size || asked.some((id) => !known.has(id))) {
      return next(
        new AppError("La liste doit contenir toutes les images de ce service, une fois chacune.", 400)
      );
    }
    await prisma_default.$transaction(
      asked.map(
        (id, position) => prisma_default.serviceMedia.update({ where: { id }, data: { position } })
      )
    );
    res.json({ success: true, data: { media: await galleryOf(service.id) } });
  } catch (err) {
    next(asHttpError(err));
  }
};

// server/controllers/project.controller.ts
init_prisma();
import { FreelanceProjectStatus } from "@prisma/client";
var MIN_TITLE = 10;
var MIN_DESCRIPTION = 60;
var assertReadyForReview2 = (p) => {
  if (p.title.trim().length < MIN_TITLE) {
    throw new AppError(`Le titre doit faire au moins ${MIN_TITLE} caract\xE8res.`, 400);
  }
  if (p.description.trim().length < MIN_DESCRIPTION) {
    throw new AppError(`La description doit faire au moins ${MIN_DESCRIPTION} caract\xE8res.`, 400);
  }
  const min = p.budgetMin == null ? null : Number(p.budgetMin);
  const max = p.budgetMax == null ? null : Number(p.budgetMax);
  if (min == null && max == null) {
    throw new AppError("Indiquez un budget, m\xEAme approximatif.", 400);
  }
  if (min != null && max != null && min > max) {
    throw new AppError("Le budget minimum d\xE9passe le maximum.", 400);
  }
};
var findOwn = (userId, id) => prisma_default.freelanceProject.findFirst({
  where: { id, clientId: userId },
  select: { id: true, status: true, title: true }
});
var createDraft2 = async (req, res, next) => {
  try {
    const title = String(req.body.title ?? "").trim();
    const project = await prisma_default.freelanceProject.create({
      data: {
        clientId: req.user.id,
        title: title || "Nouveau projet",
        slug: slugify4(title || "projet"),
        description: "",
        status: "DRAFT"
      },
      select: { id: true }
    });
    res.status(201).json({ success: true, data: { id: project.id } });
  } catch (err) {
    next(err);
  }
};
var listMine = async (req, res, next) => {
  try {
    const projects = await prisma_default.freelanceProject.findMany({
      where: { clientId: req.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        rejectionReason: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        _count: { select: { proposals: true } }
      }
    });
    res.json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          ...p,
          category: p.category?.name ?? null,
          proposalCount: p._count.proposals
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var getMine = async (req, res, next) => {
  try {
    const project = await prisma_default.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        rejectionReason: true,
        categoryId: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        skills: { select: { skill: { select: { name: true } } } },
        _count: { select: { proposals: true } }
      }
    });
    if (!project) return next(new AppError("Projet introuvable.", 404));
    res.json({
      success: true,
      data: {
        project: {
          ...project,
          skills: project.skills.map((s) => s.skill.name),
          proposalCount: project._count.proposals
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var updateMine = async (req, res, next) => {
  try {
    const existing = await findOwn(req.user.id, req.params.id);
    if (!existing) return next(new AppError("Projet introuvable.", 404));
    if (existing.status === "PENDING") {
      return next(new AppError("Ce projet est en cours de validation.", 409));
    }
    const {
      title,
      description,
      categoryId,
      budgetType,
      budgetMin,
      budgetMax,
      deadline,
      remote,
      wilaya,
      visibility,
      skills
    } = req.body;
    await prisma_default.$transaction(async (tx) => {
      await tx.freelanceProject.update({
        where: { id: existing.id },
        data: {
          ...title !== void 0 ? { title: String(title).trim() || "Nouveau projet" } : {},
          ...description !== void 0 ? { description: String(description) } : {},
          ...categoryId !== void 0 ? { categoryId: categoryId || null } : {},
          ...budgetType !== void 0 ? { budgetType: budgetType === "HOURLY" ? "HOURLY" : "FIXED" } : {},
          ...budgetMin !== void 0 ? { budgetMin: budgetMin === "" || budgetMin == null ? null : String(Number(budgetMin)) } : {},
          ...budgetMax !== void 0 ? { budgetMax: budgetMax === "" || budgetMax == null ? null : String(Number(budgetMax)) } : {},
          ...deadline !== void 0 ? { deadline: deadline ? new Date(deadline) : null } : {},
          ...remote !== void 0 ? { remote: Boolean(remote) } : {},
          ...wilaya !== void 0 ? { wilaya: wilaya ? String(wilaya).trim() : null } : {},
          ...visibility !== void 0 ? {
            visibility: visibility === "INVITE_ONLY" ? "INVITE_ONLY" : "PUBLIC"
          } : {}
        }
      });
      if (Array.isArray(skills)) {
        await tx.projectSkill.deleteMany({ where: { projectId: existing.id } });
        for (const raw of skills.slice(0, 15)) {
          const name2 = String(raw).trim();
          if (!name2) continue;
          const skill = await tx.skill.upsert({
            where: { name: name2 },
            update: {},
            create: { name: name2 },
            select: { id: true }
          });
          await tx.projectSkill.create({ data: { projectId: existing.id, skillId: skill.id } });
        }
      }
    });
    res.json({ success: true, data: { id: existing.id } });
  } catch (err) {
    next(err);
  }
};
var submitMine = async (req, res, next) => {
  try {
    const project = await prisma_default.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
      select: {
        id: true,
        title: true,
        description: true,
        budgetMin: true,
        budgetMax: true,
        status: true
      }
    });
    if (!project) return next(new AppError("Projet introuvable.", 404));
    if (project.status === "PENDING") {
      return next(new AppError("Ce projet est d\xE9j\xE0 en attente de validation.", 409));
    }
    if (project.status === "OPEN") {
      return next(new AppError("Ce projet est d\xE9j\xE0 publi\xE9.", 409));
    }
    assertReadyForReview2(project);
    const claimed = await prisma_default.freelanceProject.updateMany({
      where: { id: project.id, clientId: req.user.id, status: { in: ["DRAFT", "REJECTED"] } },
      data: { status: FreelanceProjectStatus.PENDING, rejectionReason: null }
    });
    if (claimed.count === 0) {
      return next(new AppError("Ce projet est d\xE9j\xE0 en attente de validation.", 409));
    }
    res.json({ success: true, data: { status: "PENDING" } });
  } catch (err) {
    next(err);
  }
};
var closeMine = async (req, res, next) => {
  try {
    const done = await prisma_default.freelanceProject.updateMany({
      where: {
        id: req.params.id,
        clientId: req.user.id,
        status: { in: ["OPEN", "IN_PROGRESS", "PENDING"] }
      },
      data: { status: FreelanceProjectStatus.CLOSED }
    });
    if (done.count === 0) return next(new AppError("Ce projet ne peut pas \xEAtre cl\xF4tur\xE9.", 409));
    res.json({ success: true, data: { status: "CLOSED" } });
  } catch (err) {
    next(err);
  }
};
var deleteMine = async (req, res, next) => {
  try {
    const project = await prisma_default.freelanceProject.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
      select: { id: true, status: true, _count: { select: { proposals: true } } }
    });
    if (!project) return next(new AppError("Projet introuvable.", 404));
    if (project._count.proposals > 0) {
      return next(
        new AppError(
          "Ce projet a re\xE7u des propositions et ne peut pas \xEAtre supprim\xE9. Cl\xF4turez-le.",
          409
        )
      );
    }
    if (project.status === "PENDING") {
      return next(new AppError("Ce projet est en cours de validation.", 409));
    }
    await prisma_default.freelanceProject.delete({ where: { id: project.id } });
    res.json({ success: true, data: { id: project.id } });
  } catch (err) {
    next(err);
  }
};
var listProposalsReceived = async (req, res, next) => {
  try {
    const project = await findOwn(req.user.id, req.params.id);
    if (!project) return next(new AppError("Projet introuvable.", 404));
    const proposals = await prisma_default.proposal.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        coverLetter: true,
        price: true,
        deliveryDays: true,
        status: true,
        createdAt: true,
        freelancer: {
          select: {
            username: true,
            displayName: true,
            title: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            completedOrders: true,
            wilaya: true
          }
        }
      }
    });
    res.json({ success: true, data: { project, proposals } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/proposal.controller.ts
init_prisma();

// server/services/proposal.service.ts
init_prisma();
init_credits_service();
init_plans_service();
import { CreditEntryType as CreditEntryType4, ProposalStatus } from "@prisma/client";
var ProposalError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "ProposalError";
  }
};
var submit = async (input) => {
  const { projectId, freelancerId, userId, coverLetter, price, deliveryDays } = input;
  if (!coverLetter?.trim()) throw new ProposalError("La lettre de motivation est obligatoire.");
  if (coverLetter.trim().length < 40) {
    throw new ProposalError("La lettre de motivation doit faire au moins 40 caract\xE8res.");
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new ProposalError("Indiquez un prix sup\xE9rieur \xE0 z\xE9ro.");
  }
  if (!Number.isInteger(deliveryDays) || deliveryDays <= 0) {
    throw new ProposalError("Indiquez un d\xE9lai en jours.");
  }
  const project = await prisma_default.freelanceProject.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, visibility: true, clientId: true, title: true }
  });
  if (!project) throw new ProposalError("Projet introuvable.", 404);
  if (project.status !== "OPEN") {
    throw new ProposalError("Ce projet n'accepte plus de propositions.", 409);
  }
  const freelancer = await prisma_default.freelancerProfile.findUnique({
    where: { id: freelancerId },
    select: { userId: true }
  });
  if (!freelancer) throw new ProposalError("Profil freelance introuvable.", 404);
  if (project.clientId === freelancer.userId) {
    throw new ProposalError("Vous ne pouvez pas r\xE9pondre \xE0 votre propre projet.", 403);
  }
  if (project.visibility === "INVITE_ONLY") {
    const invited = await prisma_default.projectInvite.findUnique({
      where: { projectId_freelancerId: { projectId, freelancerId } },
      select: { projectId: true }
    });
    if (!invited) throw new ProposalError("Ce projet est sur invitation uniquement.", 403);
  }
  const existing = await prisma_default.proposal.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId } },
    select: { id: true, status: true }
  });
  if (existing) {
    throw new ProposalError("Vous avez d\xE9j\xE0 r\xE9pondu \xE0 ce projet.", 409);
  }
  const charge = await plans_service_default.resolveProposalCharge(freelancerId);
  const costs = await credits_service_default.getCreditCosts();
  if (charge.method === "credits") {
    const balance = await credits_service_default.getBalance(userId);
    if (balance < costs.proposal) {
      throw new credits_service_default.InsufficientCreditsError(costs.proposal, balance);
    }
  }
  let proposal;
  try {
    proposal = await prisma_default.proposal.create({
      data: {
        projectId,
        freelancerId,
        coverLetter: coverLetter.trim(),
        price: String(price),
        deliveryDays
      },
      select: { id: true, status: true, createdAt: true }
    });
  } catch (err) {
    throw new ProposalError("Vous avez d\xE9j\xE0 r\xE9pondu \xE0 ce projet.", 409);
  }
  try {
    if (charge.method === "quota") {
      await plans_service_default.consumeProposalQuota(charge.subscriptionId);
      return { proposal, charged: "quota", balance: await credits_service_default.getBalance(userId) };
    }
    const spent = await credits_service_default.spend({
      userId,
      amount: costs.proposal,
      type: CreditEntryType4.PROPOSAL_SUBMISSION,
      idempotencyKey: `proposal:${proposal.id}`,
      referenceType: "proposal",
      referenceId: proposal.id,
      note: `Proposition : ${project.title.slice(0, 60)}`
    });
    return { proposal, charged: "credits", balance: spent.balance };
  } catch (err) {
    await prisma_default.proposal.delete({ where: { id: proposal.id } }).catch(() => {
    });
    throw err;
  }
};
var withdraw = async (proposalId, freelancerId) => {
  const done = await prisma_default.proposal.updateMany({
    where: {
      id: proposalId,
      freelancerId,
      status: { in: ["SENT", "VIEWED", "SHORTLISTED"] }
    },
    data: { status: ProposalStatus.WITHDRAWN, decidedAt: /* @__PURE__ */ new Date() }
  });
  if (done.count === 0) {
    throw new ProposalError("Cette proposition ne peut plus \xEAtre retir\xE9e.", 409);
  }
  return { status: ProposalStatus.WITHDRAWN };
};
var markViewed = async (proposalId, clientId) => {
  await prisma_default.proposal.updateMany({
    where: {
      id: proposalId,
      status: ProposalStatus.SENT,
      project: { clientId }
    },
    data: { status: ProposalStatus.VIEWED, viewedAt: /* @__PURE__ */ new Date() }
  });
};
var decide = async (proposalId, clientId, decision) => {
  const proposal = await prisma_default.proposal.findFirst({
    where: { id: proposalId, project: { clientId } },
    select: {
      id: true,
      status: true,
      price: true,
      deliveryDays: true,
      freelancerId: true,
      project: { select: { id: true, status: true, title: true } }
    }
  });
  if (!proposal) throw new ProposalError("Proposition introuvable.", 404);
  if (proposal.status === "WITHDRAWN") {
    throw new ProposalError("Cette proposition a \xE9t\xE9 retir\xE9e.", 409);
  }
  if (decision !== "SELECTED") {
    const updated = await prisma_default.proposal.update({
      where: { id: proposal.id },
      data: {
        status: decision,
        ...decision === "SHORTLISTED" ? { shortlistedAt: /* @__PURE__ */ new Date() } : {},
        ...decision === "REJECTED" ? { decidedAt: /* @__PURE__ */ new Date() } : {}
      },
      select: { id: true, status: true }
    });
    return { proposal: updated, order: null };
  }
  const reference2 = `PRJ-${Date.now().toString(36).toUpperCase()}`;
  const [, , , order] = await prisma_default.$transaction([
    prisma_default.proposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.SELECTED, decidedAt: /* @__PURE__ */ new Date() }
    }),
    prisma_default.proposal.updateMany({
      where: {
        projectId: proposal.project.id,
        id: { not: proposal.id },
        status: { in: ["SENT", "VIEWED", "SHORTLISTED"] }
      },
      data: { status: ProposalStatus.REJECTED, decidedAt: /* @__PURE__ */ new Date() }
    }),
    prisma_default.freelanceProject.update({
      where: { id: proposal.project.id },
      data: { status: "IN_PROGRESS" }
    }),
    prisma_default.freelanceOrder.create({
      data: {
        reference: reference2,
        clientId,
        freelancerId: proposal.freelancerId,
        projectId: proposal.project.id,
        agreedPrice: proposal.price,
        deliveryDueAt: new Date(Date.now() + proposal.deliveryDays * 864e5),
        status: "CREATED"
      },
      select: { id: true, reference: true, status: true }
    })
  ]);
  return { proposal: { id: proposal.id, status: ProposalStatus.SELECTED }, order };
};
var proposal_service_default = { submit, withdraw, markViewed, decide, ProposalError };

// server/controllers/proposal.controller.ts
init_credits_service();
var asHttpError2 = (err) => {
  if (err instanceof ProposalError) return new AppError(err.message, err.status);
  if (err instanceof InsufficientCreditsError) {
    return new AppError(
      `Cr\xE9dits insuffisants : ${err.required} requis, ${err.available} disponibles.`,
      402
    );
  }
  return err;
};
var requireFreelancer = async (userId) => {
  const profile = await prisma_default.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true }
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile.id;
};
var submitProposal = async (req, res, next) => {
  try {
    const freelancerId = await requireFreelancer(req.user.id);
    const { projectId, coverLetter, price, deliveryDays } = req.body;
    const result = await proposal_service_default.submit({
      projectId: String(projectId ?? ""),
      freelancerId,
      userId: req.user.id,
      coverLetter: String(coverLetter ?? ""),
      price: Number(price),
      deliveryDays: Math.trunc(Number(deliveryDays))
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(asHttpError2(err));
  }
};
var withdrawProposal = async (req, res, next) => {
  try {
    const freelancerId = await requireFreelancer(req.user.id);
    const result = await proposal_service_default.withdraw(req.params.id, freelancerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError2(err));
  }
};
var getProposalEligibility = async (req, res, next) => {
  try {
    const profile = await prisma_default.freelancerProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) {
      return res.json({
        success: true,
        data: { canPropose: false, reason: "no-profile" }
      });
    }
    const project = await prisma_default.freelanceProject.findUnique({
      where: { id: req.params.projectId },
      select: { id: true, status: true, visibility: true, clientId: true }
    });
    if (!project) return next(new AppError("Projet introuvable.", 404));
    const existing = await prisma_default.proposal.findUnique({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: profile.id } },
      select: { id: true, status: true }
    });
    const plans = await Promise.resolve().then(() => (init_plans_service(), plans_service_exports));
    const creditsService = await Promise.resolve().then(() => (init_credits_service(), credits_service_exports));
    const [charge, costs, balance, entitlements] = await Promise.all([
      plans.resolveProposalCharge(profile.id),
      creditsService.getCreditCosts(),
      creditsService.getBalance(req.user.id),
      plans.getEntitlements(profile.id)
    ]);
    const invited = project.visibility === "PUBLIC" ? true : Boolean(
      await prisma_default.projectInvite.findUnique({
        where: { projectId_freelancerId: { projectId: project.id, freelancerId: profile.id } },
        select: { projectId: true }
      })
    );
    const reason = existing ? "already-proposed" : project.clientId === req.user.id ? "own-project" : project.status !== "OPEN" ? "closed" : !invited ? "not-invited" : charge.method === "credits" && balance < costs.proposal ? "insufficient-credits" : null;
    res.json({
      success: true,
      data: {
        canPropose: reason === null,
        reason,
        existing,
        method: charge.method,
        creditCost: costs.proposal,
        balance,
        proposalsRemaining: entitlements.proposalsRemaining,
        planName: entitlements.planName
      }
    });
  } catch (err) {
    next(asHttpError2(err));
  }
};
var getProposalForClient = async (req, res, next) => {
  try {
    await proposal_service_default.markViewed(req.params.id, req.user.id);
    const proposal = await prisma_default.proposal.findFirst({
      where: { id: req.params.id, project: { clientId: req.user.id } },
      select: {
        id: true,
        coverLetter: true,
        price: true,
        deliveryDays: true,
        status: true,
        createdAt: true,
        viewedAt: true,
        shortlistedAt: true,
        project: { select: { id: true, title: true, status: true } },
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
            hourlyRate: true,
            languages: true,
            skills: { select: { skill: { select: { name: true } } } }
            // The address is deliberately absent: the client talks to the
            // freelancer through the platform, and a proposal is not a
            // reason to hand over a contact detail.
          }
        }
      }
    });
    if (!proposal) return next(new AppError("Proposition introuvable.", 404));
    res.json({
      success: true,
      data: {
        proposal: {
          ...proposal,
          freelancer: {
            ...proposal.freelancer,
            skills: proposal.freelancer.skills.map((s) => s.skill.name)
          }
        }
      }
    });
  } catch (err) {
    next(asHttpError2(err));
  }
};
var DECISIONS = ["SHORTLISTED", "REJECTED", "SELECTED"];
var decideProposal = async (req, res, next) => {
  try {
    const { decision } = req.body;
    if (!DECISIONS.includes(decision)) {
      return next(new AppError("D\xE9cision inconnue.", 400));
    }
    const result = await proposal_service_default.decide(req.params.id, req.user.id, decision);
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError2(err));
  }
};

// server/services/order.service.ts
init_prisma();
import { FreelanceOrderStatus } from "@prisma/client";
var OrderError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "OrderError";
  }
};
var sideOf = async (orderId, userId) => {
  const order = await prisma_default.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancerId: true,
      freelancer: { select: { userId: true } }
    }
  });
  if (!order) throw new OrderError("Commande introuvable.", 404);
  const side = order.clientId === userId ? "client" : order.freelancer.userId === userId ? "freelancer" : null;
  if (!side) throw new OrderError("Commande introuvable.", 404);
  return { order, side };
};
var eventFor = (orderId, actorId, from, to, note) => prisma_default.orderEvent.create({
  data: { orderId, actorId, fromStatus: from, toStatus: to, note: note ?? null }
});
var start = async (orderId, userId) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "freelancer") throw new OrderError("Seul le freelance peut d\xE9marrer.", 403);
  if (order.status !== "CREATED") throw new OrderError("Cette commande a d\xE9j\xE0 d\xE9marr\xE9.", 409);
  const [updated] = await prisma_default.$transaction([
    prisma_default.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.IN_PROGRESS },
      select: { id: true, status: true }
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.IN_PROGRESS)
  ]);
  return updated;
};
var deliver = async (orderId, userId, message, fileIds = []) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "freelancer") throw new OrderError("Seul le freelance peut livrer.", 403);
  if (!["CREATED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(order.status)) {
    throw new OrderError("Cette commande n'attend pas de livraison.", 409);
  }
  const attempt = await prisma_default.orderDelivery.count({ where: { orderId: order.id } });
  const [, delivery] = await prisma_default.$transaction([
    prisma_default.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.DELIVERED }
    }),
    prisma_default.orderDelivery.create({
      data: {
        orderId: order.id,
        message: message?.trim() || null,
        attempt: attempt + 1,
        files: fileIds.length ? { create: fileIds.map((fileId) => ({ fileId })) } : void 0
      },
      select: { id: true, attempt: true, createdAt: true }
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.DELIVERED)
  ]);
  return delivery;
};
var requestRevision = async (orderId, userId, reason) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "client") throw new OrderError("Seul le client peut demander une r\xE9vision.", 403);
  if (order.status !== "DELIVERED") {
    throw new OrderError("Aucune livraison \xE0 r\xE9viser.", 409);
  }
  if (!reason?.trim()) {
    throw new OrderError("Indiquez ce qui doit \xEAtre revu.");
  }
  const latest = await prisma_default.orderDelivery.findFirst({
    where: { orderId: order.id },
    orderBy: { attempt: "desc" },
    select: { id: true }
  });
  await prisma_default.$transaction([
    prisma_default.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.REVISION_REQUESTED }
    }),
    ...latest ? [
      prisma_default.orderDelivery.update({
        where: { id: latest.id },
        data: { revisionRequested: true, revisionNote: reason.trim() }
      })
    ] : [],
    eventFor(
      order.id,
      userId,
      order.status,
      FreelanceOrderStatus.REVISION_REQUESTED,
      reason.trim()
    )
  ]);
  return { status: FreelanceOrderStatus.REVISION_REQUESTED };
};
var accept = async (orderId, userId) => {
  const { order, side } = await sideOf(orderId, userId);
  if (side !== "client") throw new OrderError("Seul le client peut cl\xF4turer.", 403);
  if (order.status !== "DELIVERED") {
    throw new OrderError("Cette commande n'a pas \xE9t\xE9 livr\xE9e.", 409);
  }
  const now = /* @__PURE__ */ new Date();
  const latest = await prisma_default.orderDelivery.findFirst({
    where: { orderId: order.id },
    orderBy: { attempt: "desc" },
    select: { id: true }
  });
  const [updated] = await prisma_default.$transaction([
    prisma_default.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.COMPLETED, completedAt: now },
      select: { id: true, status: true, completedAt: true, projectId: true }
    }),
    ...latest ? [prisma_default.orderDelivery.update({ where: { id: latest.id }, data: { acceptedAt: now } })] : [],
    prisma_default.freelancerProfile.update({
      where: { id: order.freelancerId },
      data: { completedOrders: { increment: 1 } }
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.COMPLETED)
  ]);
  if (updated.projectId) {
    await prisma_default.freelanceProject.updateMany({
      where: { id: updated.projectId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED" }
    });
  }
  return updated;
};
var cancel = async (orderId, userId, reason) => {
  const { order } = await sideOf(orderId, userId);
  if (!["CREATED", "IN_PROGRESS"].includes(order.status)) {
    throw new OrderError(
      "Cette commande a d\xE9j\xE0 une livraison. Ouvrez un litige plut\xF4t que de l'annuler.",
      409
    );
  }
  if (!reason?.trim()) throw new OrderError("Indiquez le motif de l'annulation.");
  await prisma_default.$transaction([
    prisma_default.freelanceOrder.update({
      where: { id: order.id },
      data: { status: FreelanceOrderStatus.CANCELLED }
    }),
    eventFor(order.id, userId, order.status, FreelanceOrderStatus.CANCELLED, reason.trim())
  ]);
  return { status: FreelanceOrderStatus.CANCELLED };
};
var detail = async (orderId, userId) => {
  const { side } = await sideOf(orderId, userId);
  const order = await prisma_default.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      agreedPrice: true,
      currency: true,
      deliveryDueAt: true,
      createdAt: true,
      completedAt: true,
      service: { select: { title: true, slug: true } },
      package: { select: { tier: true, name: true, revisions: true } },
      project: { select: { title: true, slug: true } },
      client: { select: { firstName: true, lastName: true } },
      freelancer: { select: { username: true, displayName: true } },
      addons: { select: { name: true, price: true } },
      deliveries: {
        orderBy: { attempt: "desc" },
        select: {
          id: true,
          message: true,
          attempt: true,
          revisionRequested: true,
          revisionNote: true,
          acceptedAt: true,
          createdAt: true,
          files: { select: { file: { select: { url: true, fileName: true } } } }
        }
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });
  return {
    side,
    order: {
      ...order,
      clientName: [order.client.firstName, order.client.lastName].filter(Boolean).join(" ") || null,
      deliveries: order.deliveries.map((d) => ({
        ...d,
        files: d.files.map((f) => f.file)
      }))
    }
  };
};
var orderService = async (clientId, packageId, addonIds = []) => {
  const pkg = await prisma_default.servicePackage.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      price: true,
      deliveryDays: true,
      service: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          freelancerId: true,
          freelancer: { select: { userId: true } }
        }
      }
    }
  });
  if (!pkg) throw new OrderError("Formule introuvable.", 404);
  const live = pkg.service.status === "PUBLISHED" && (!pkg.service.expiresAt || pkg.service.expiresAt > /* @__PURE__ */ new Date());
  if (!live) throw new OrderError("Ce service n'est plus disponible.", 409);
  if (pkg.service.freelancer.userId === clientId) {
    throw new OrderError("Vous ne pouvez pas commander votre propre service.", 403);
  }
  const addons = addonIds.length ? await prisma_default.serviceAddon.findMany({
    where: { id: { in: addonIds }, serviceId: pkg.service.id },
    select: { id: true, name: true, price: true, extraDays: true }
  }) : [];
  const total = addons.reduce((sum, a) => sum + Number(a.price), Number(pkg.price));
  const days = addons.reduce((sum, a) => sum + a.extraDays, pkg.deliveryDays);
  const order = await prisma_default.freelanceOrder.create({
    data: {
      reference: `SRV-${Date.now().toString(36).toUpperCase()}`,
      clientId,
      freelancerId: pkg.service.freelancerId,
      serviceId: pkg.service.id,
      packageId: pkg.id,
      agreedPrice: String(total),
      deliveryDueAt: new Date(Date.now() + days * 864e5),
      status: FreelanceOrderStatus.CREATED,
      addons: addons.length ? { create: addons.map((a) => ({ addonId: a.id, name: a.name, price: a.price })) } : void 0
    },
    select: { id: true, reference: true, status: true, agreedPrice: true }
  });
  await eventFor(order.id, clientId, FreelanceOrderStatus.CREATED, FreelanceOrderStatus.CREATED, "Commande pass\xE9e");
  return order;
};
var order_service_default = {
  start,
  deliver,
  requestRevision,
  accept,
  cancel,
  detail,
  sideOf,
  orderService,
  OrderError
};

// server/controllers/order.controller.ts
var asHttpError3 = (err) => err instanceof OrderError ? new AppError(err.message, err.status) : err;
var getOrder = async (req, res, next) => {
  try {
    res.json({ success: true, data: await order_service_default.detail(req.params.id, req.user.id) });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var startOrder = async (req, res, next) => {
  try {
    res.json({ success: true, data: await order_service_default.start(req.params.id, req.user.id) });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var deliverOrder = async (req, res, next) => {
  try {
    const { message, fileIds } = req.body;
    const delivery = await order_service_default.deliver(
      req.params.id,
      req.user.id,
      String(message ?? ""),
      Array.isArray(fileIds) ? fileIds.map(String).slice(0, 20) : []
    );
    res.status(201).json({ success: true, data: { delivery } });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var requestRevision2 = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await order_service_default.requestRevision(req.params.id, req.user.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var acceptOrder = async (req, res, next) => {
  try {
    res.json({ success: true, data: await order_service_default.accept(req.params.id, req.user.id) });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await order_service_default.cancel(req.params.id, req.user.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError3(err));
  }
};
var createFromService = async (req, res, next) => {
  try {
    const { packageId, addonIds } = req.body;
    if (!packageId) return next(new AppError("Choisissez une formule.", 400));
    const order = await order_service_default.orderService(
      req.user.id,
      String(packageId),
      Array.isArray(addonIds) ? addonIds.map(String).slice(0, 10) : []
    );
    res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    next(asHttpError3(err));
  }
};

// server/services/review.service.ts
init_prisma();
import { Prisma as Prisma3 } from "@prisma/client";
var ReviewError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "ReviewError";
  }
};
var inRange = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
var recomputeRating = async (freelancerUserId) => {
  const profile = await prisma_default.freelancerProfile.findUnique({
    where: { userId: freelancerUserId },
    select: { id: true }
  });
  if (!profile) return;
  const agg = await prisma_default.freelanceReview.aggregate({
    where: { targetId: freelancerUserId, state: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true }
  });
  await prisma_default.freelancerProfile.update({
    where: { id: profile.id },
    data: {
      ratingAverage: agg._count.rating > 0 ? new Prisma3.Decimal((agg._avg.rating ?? 0).toFixed(2)) : null,
      ratingCount: agg._count.rating
    }
  });
};
var leave = async (orderId, authorId, input) => {
  if (!inRange(input.rating)) throw new ReviewError("La note doit \xEAtre comprise entre 1 et 5.");
  for (const [name2, value] of [
    ["qualit\xE9", input.qualityRating],
    ["communication", input.communicationRating],
    ["respect des d\xE9lais", input.deadlineRating]
  ]) {
    if (value !== void 0 && value !== null && !inRange(value)) {
      throw new ReviewError(`La note de ${name2} doit \xEAtre comprise entre 1 et 5.`);
    }
  }
  const order = await prisma_default.freelanceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancer: { select: { userId: true } }
    }
  });
  if (!order) throw new ReviewError("Commande introuvable.", 404);
  const isClient = order.clientId === authorId;
  const isFreelancer = order.freelancer.userId === authorId;
  if (!isClient && !isFreelancer) throw new ReviewError("Commande introuvable.", 404);
  if (order.status !== "COMPLETED") {
    throw new ReviewError("Vous pourrez laisser un avis une fois la commande termin\xE9e.", 409);
  }
  const targetId = isClient ? order.freelancer.userId : order.clientId;
  try {
    const review = await prisma_default.freelanceReview.create({
      data: {
        orderId: order.id,
        authorId,
        targetId,
        rating: input.rating,
        qualityRating: input.qualityRating ?? null,
        communicationRating: input.communicationRating ?? null,
        deadlineRating: input.deadlineRating ?? null,
        comment: input.comment?.trim() || null
      },
      select: { id: true, rating: true, comment: true, createdAt: true }
    });
    if (isClient) await recomputeRating(targetId);
    return review;
  } catch (err) {
    if (err instanceof Prisma3.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ReviewError("Vous avez d\xE9j\xE0 laiss\xE9 un avis sur cette commande.", 409);
    }
    throw err;
  }
};
var reply = async (reviewId, userId, response) => {
  if (!response?.trim()) throw new ReviewError("La r\xE9ponse ne peut pas \xEAtre vide.");
  const review = await prisma_default.freelanceReview.findUnique({
    where: { id: reviewId },
    select: { id: true, targetId: true, response: true }
  });
  if (!review) throw new ReviewError("Avis introuvable.", 404);
  if (review.targetId !== userId) {
    throw new ReviewError("Seule la personne concern\xE9e peut r\xE9pondre.", 403);
  }
  if (review.response) {
    throw new ReviewError("Vous avez d\xE9j\xE0 r\xE9pondu \xE0 cet avis.", 409);
  }
  return prisma_default.freelanceReview.update({
    where: { id: review.id },
    data: { response: response.trim(), respondedAt: /* @__PURE__ */ new Date() },
    select: { id: true, response: true, respondedAt: true }
  });
};
var pendingFor = async (orderId, userId) => {
  const order = await prisma_default.freelanceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, clientId: true, freelancer: { select: { userId: true } } }
  });
  if (!order) return { canReview: false, reason: "not-found", existing: null };
  const isParty = order.clientId === userId || order.freelancer.userId === userId;
  if (!isParty) return { canReview: false, reason: "not-found", existing: null };
  const existing = await prisma_default.freelanceReview.findUnique({
    where: { orderId_authorId: { orderId, authorId: userId } },
    select: { id: true, rating: true, comment: true, response: true }
  });
  if (existing) return { canReview: false, reason: "already", existing };
  if (order.status !== "COMPLETED") {
    return { canReview: false, reason: "not-completed", existing: null };
  }
  return { canReview: true, reason: null, existing: null };
};
var publicFor = async (username, page = 1, pageSize = 10) => {
  const profile = await prisma_default.freelancerProfile.findUnique({
    where: { username },
    select: { userId: true, ratingAverage: true, ratingCount: true }
  });
  if (!profile) return null;
  const where = { targetId: profile.userId, state: "APPROVED" };
  const [total, reviews, breakdown] = await Promise.all([
    prisma_default.freelanceReview.count({ where }),
    prisma_default.freelanceReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        qualityRating: true,
        communicationRating: true,
        deadlineRating: true,
        comment: true,
        response: true,
        respondedAt: true,
        createdAt: true,
        // The client's first name only. A review is public; the person who
        // wrote it did not sign up to be findable by it.
        author: { select: { firstName: true } }
      }
    }),
    prisma_default.freelanceReview.aggregate({
      where,
      _avg: {
        qualityRating: true,
        communicationRating: true,
        deadlineRating: true
      }
    })
  ]);
  return {
    average: profile.ratingAverage,
    count: profile.ratingCount,
    breakdown: {
      quality: breakdown._avg.qualityRating,
      communication: breakdown._avg.communicationRating,
      deadline: breakdown._avg.deadlineRating
    },
    reviews,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
};
var review_service_default = { leave, reply, pendingFor, publicFor, recomputeRating, ReviewError };

// server/controllers/review.controller.ts
var asHttpError4 = (err) => err instanceof ReviewError ? new AppError(err.message, err.status) : err;
var leaveReview = async (req, res, next) => {
  try {
    const { rating, comment, qualityRating, communicationRating, deadlineRating } = req.body;
    const num = (v) => v === void 0 || v === null || v === "" ? null : Math.trunc(Number(v));
    const review = await review_service_default.leave(req.params.id, req.user.id, {
      rating: Math.trunc(Number(rating)),
      comment: comment ? String(comment) : null,
      qualityRating: num(qualityRating),
      communicationRating: num(communicationRating),
      deadlineRating: num(deadlineRating)
    });
    res.status(201).json({ success: true, data: { review } });
  } catch (err) {
    next(asHttpError4(err));
  }
};
var replyToReview = async (req, res, next) => {
  try {
    const { response } = req.body;
    const updated = await review_service_default.reply(req.params.id, req.user.id, String(response ?? ""));
    res.json({ success: true, data: { review: updated } });
  } catch (err) {
    next(asHttpError4(err));
  }
};
var getReviewState = async (req, res, next) => {
  try {
    res.json({ success: true, data: await review_service_default.pendingFor(req.params.id, req.user.id) });
  } catch (err) {
    next(asHttpError4(err));
  }
};
var listPublicReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const data = await review_service_default.publicFor(req.params.username, page);
    if (!data) return next(new AppError("Freelance introuvable.", 404));
    res.json({ success: true, data });
  } catch (err) {
    next(asHttpError4(err));
  }
};

// server/controllers/portfolio.controller.ts
init_prisma();

// server/services/portfolio.service.ts
init_prisma();
init_plans_service();
import { Prisma as Prisma4 } from "@prisma/client";
var PortfolioError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "PortfolioError";
  }
};
var TEMPLATES = ["default", "minimal", "editorial", "bold"];
var DEFAULT_SECTIONS = [
  "HEADER",
  "ABOUT",
  "SKILLS",
  "FEATURED_PROJECTS",
  "SERVICES",
  "EXPERIENCE",
  "EDUCATION",
  "CERTIFICATES",
  "REVIEWS",
  "CONTACT"
];
var MAX_FEATURED = 3;
var getOrCreate = async (freelancerId) => {
  const existing = await prisma_default.portfolio.findUnique({ where: { freelancerId } });
  if (existing) return existing;
  try {
    return await prisma_default.portfolio.create({ data: { freelancerId } });
  } catch (err) {
    if (err instanceof Prisma4.PrismaClientKnownRequestError && err.code === "P2002") {
      const p = await prisma_default.portfolio.findUnique({ where: { freelancerId } });
      if (p) return p;
    }
    throw err;
  }
};
var sectionsFor = async (portfolioId) => {
  const saved = await prisma_default.portfolioSection.findMany({
    where: { portfolioId },
    orderBy: { position: "asc" }
  });
  const byType = new Map(saved.map((s) => [s.type, s]));
  return DEFAULT_SECTIONS.map((type, i) => {
    const row = byType.get(type);
    return {
      type,
      visible: row?.visible ?? true,
      position: row?.position ?? i,
      content: row?.content ?? null
    };
  }).sort((a, b) => a.position - b.position);
};
var updateSettings = async (freelancerId, input) => {
  const portfolio = await getOrCreate(freelancerId);
  const entitlements = await plans_service_default.getEntitlements(freelancerId);
  if (input.template !== void 0) {
    if (!TEMPLATES.includes(input.template)) {
      throw new PortfolioError("Mod\xE8le inconnu.");
    }
    if (input.template !== "default" && entitlements.tier === "FREE") {
      throw new PortfolioError(
        "Les autres mod\xE8les sont r\xE9serv\xE9s aux formules Pro et Premium.",
        403
      );
    }
  }
  if (input.accentColor !== void 0 && !/^#[0-9a-fA-F]{6}$/.test(input.accentColor)) {
    throw new PortfolioError("Couleur invalide.");
  }
  return prisma_default.portfolio.update({
    where: { id: portfolio.id },
    data: {
      ...input.template !== void 0 ? { template: input.template } : {},
      ...input.accentColor !== void 0 ? { accentColor: input.accentColor } : {},
      ...input.fontFamily !== void 0 ? { fontFamily: input.fontFamily } : {},
      ...input.defaultLanguage !== void 0 ? { defaultLanguage: input.defaultLanguage } : {},
      ...input.seoTitle !== void 0 ? { seoTitle: input.seoTitle?.trim() || null } : {},
      ...input.seoDescription !== void 0 ? { seoDescription: input.seoDescription?.trim() || null } : {},
      ...input.published !== void 0 ? { published: input.published, publishedAt: input.published ? /* @__PURE__ */ new Date() : null } : {}
    }
  });
};
var saveSections = async (freelancerId, sections) => {
  const portfolio = await getOrCreate(freelancerId);
  const known = sections.filter(
    (s) => DEFAULT_SECTIONS.includes(s.type)
  );
  await prisma_default.$transaction(
    known.map(
      (s, i) => prisma_default.portfolioSection.upsert({
        where: {
          portfolioId_type: {
            portfolioId: portfolio.id,
            type: s.type
          }
        },
        update: {
          visible: s.visible !== false,
          position: i,
          content: s.content ?? void 0
        },
        create: {
          portfolioId: portfolio.id,
          type: s.type,
          visible: s.visible !== false,
          position: i,
          content: s.content ?? void 0
        }
      })
    )
  );
  return sectionsFor(portfolio.id);
};
var isAllowedVideo = (url) => /^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//.test(url);
var assertVideoAllowed = async (freelancerId, videoUrl) => {
  if (!videoUrl) return;
  if (!isAllowedVideo(videoUrl)) {
    throw new PortfolioError("Seuls les liens YouTube et Vimeo sont accept\xE9s.");
  }
  const entitlements = await plans_service_default.getEntitlements(freelancerId);
  if (entitlements.tier === "FREE") {
    throw new PortfolioError(
      "Les vid\xE9os dans les r\xE9alisations sont r\xE9serv\xE9es aux formules Pro et Premium.",
      403
    );
  }
};
var addProject = async (freelancerId, input) => {
  if (!input.title?.trim()) throw new PortfolioError("Le titre est obligatoire.");
  const portfolio = await getOrCreate(freelancerId);
  const entitlements = await plans_service_default.getEntitlements(freelancerId);
  const count = await prisma_default.portfolioProject.count({ where: { portfolioId: portfolio.id } });
  if (entitlements.maxPortfolioProjects !== null && count >= entitlements.maxPortfolioProjects) {
    throw new PortfolioError(
      `La formule ${entitlements.planName} permet ${entitlements.maxPortfolioProjects} r\xE9alisations. Supprimez-en une ou changez de formule.`,
      403
    );
  }
  await assertVideoAllowed(freelancerId, input.videoUrl);
  if (input.featured) await assertFeaturedRoom(portfolio.id);
  return prisma_default.portfolioProject.create({
    data: {
      portfolioId: portfolio.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      categoryId: input.categoryId || null,
      role: input.role?.trim() || null,
      tools: Array.isArray(input.tools) ? input.tools.map(String).slice(0, 12) : [],
      clientName: input.clientName?.trim() || null,
      externalUrl: input.externalUrl?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      featured: Boolean(input.featured),
      position: count
    }
  });
};
var assertFeaturedRoom = async (portfolioId, excludeId) => {
  const featured = await prisma_default.portfolioProject.count({
    where: { portfolioId, featured: true, ...excludeId ? { id: { not: excludeId } } : {} }
  });
  if (featured >= MAX_FEATURED) {
    throw new PortfolioError(
      `Trois r\xE9alisations peuvent \xEAtre mises \xE0 la une. Retirez-en une d'abord.`
    );
  }
};
var updateProject = async (freelancerId, projectId, input) => {
  const portfolio = await getOrCreate(freelancerId);
  const existing = await prisma_default.portfolioProject.findFirst({
    where: { id: projectId, portfolioId: portfolio.id },
    select: { id: true, featured: true }
  });
  if (!existing) throw new PortfolioError("R\xE9alisation introuvable.", 404);
  if (input.videoUrl !== void 0) await assertVideoAllowed(freelancerId, input.videoUrl);
  if (input.featured && !existing.featured) await assertFeaturedRoom(portfolio.id, projectId);
  return prisma_default.portfolioProject.update({
    where: { id: existing.id },
    data: {
      ...input.title !== void 0 ? { title: input.title.trim() } : {},
      ...input.description !== void 0 ? { description: input.description?.trim() || null } : {},
      ...input.categoryId !== void 0 ? { categoryId: input.categoryId || null } : {},
      ...input.role !== void 0 ? { role: input.role?.trim() || null } : {},
      ...input.tools !== void 0 ? { tools: (input.tools ?? []).map(String).slice(0, 12) } : {},
      ...input.clientName !== void 0 ? { clientName: input.clientName?.trim() || null } : {},
      ...input.externalUrl !== void 0 ? { externalUrl: input.externalUrl?.trim() || null } : {},
      ...input.videoUrl !== void 0 ? { videoUrl: input.videoUrl?.trim() || null } : {},
      ...input.completedAt !== void 0 ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {},
      ...input.featured !== void 0 ? { featured: Boolean(input.featured) } : {}
    }
  });
};
var removeProject = async (freelancerId, projectId) => {
  const portfolio = await getOrCreate(freelancerId);
  const done = await prisma_default.portfolioProject.deleteMany({
    where: { id: projectId, portfolioId: portfolio.id }
  });
  if (done.count === 0) throw new PortfolioError("R\xE9alisation introuvable.", 404);
  return { id: projectId };
};
var publicPage = async (username) => {
  const freelancer = await prisma_default.freelancerProfile.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
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
      skills: { select: { skill: { select: { name: true } } } },
      user: { select: { avatar: { select: { url: true } } } },
      portfolio: {
        select: {
          id: true,
          published: true,
          template: true,
          accentColor: true,
          fontFamily: true,
          defaultLanguage: true,
          seoTitle: true,
          seoDescription: true,
          cover: { select: { url: true } },
          projects: {
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
              category: { select: { name: true } },
              cover: { select: { url: true } },
              media: { orderBy: { position: "asc" }, select: { file: { select: { url: true } } } }
            }
          }
        }
      }
    }
  });
  if (!freelancer?.portfolio?.published) return null;
  const now = /* @__PURE__ */ new Date();
  const [services, reviews, entitlements] = await Promise.all([
    prisma_default.serviceListing.findMany({
      where: {
        freelancerId: freelancer.id,
        status: "PUBLISHED",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        media: { take: 1, orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
        packages: { orderBy: { price: "asc" }, take: 1, select: { price: true } }
      }
    }),
    prisma_default.freelanceReview.findMany({
      where: { targetId: freelancer.userId, state: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: { select: { firstName: true } }
      }
    }),
    plans_service_default.getEntitlements(freelancer.id)
  ]);
  const sections = await sectionsFor(freelancer.portfolio.id);
  prisma_default.portfolio.update({ where: { id: freelancer.portfolio.id }, data: { views: { increment: 1 } } }).catch(() => {
  });
  return {
    freelancer: {
      username: freelancer.username,
      displayName: freelancer.displayName,
      title: freelancer.title,
      bio: freelancer.bio,
      wilaya: freelancer.wilaya,
      hourlyRate: freelancer.hourlyRate,
      availability: freelancer.availability,
      level: freelancer.level,
      verified: freelancer.identityVerified,
      rating: freelancer.ratingAverage,
      ratingCount: freelancer.ratingCount,
      completedOrders: freelancer.completedOrders,
      languages: freelancer.languages,
      memberSince: freelancer.createdAt,
      skills: freelancer.skills.map((s) => s.skill.name),
      avatarUrl: freelancer.user.avatar?.url ?? null
    },
    theme: {
      template: freelancer.portfolio.template,
      accentColor: freelancer.portfolio.accentColor,
      fontFamily: freelancer.portfolio.fontFamily,
      defaultLanguage: freelancer.portfolio.defaultLanguage,
      coverUrl: freelancer.portfolio.cover?.url ?? null
    },
    seo: {
      title: freelancer.portfolio.seoTitle,
      description: freelancer.portfolio.seoDescription
    },
    sections,
    projects: freelancer.portfolio.projects.map((p) => ({
      ...p,
      coverUrl: p.cover?.url ?? null,
      gallery: p.media.map((m) => m.file.url)
    })),
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      coverUrl: s.media[0]?.file.url ?? null,
      startingPrice: s.packages[0]?.price ?? null
    })),
    reviews,
    /* "Réalisé avec Dar L'emploi" is removed only on a plan that pays for
     * it. Decided here, not in the page, so the page cannot simply omit it. */
    showBranding: !entitlements.removableBranding
  };
};
var portfolio_service_default = {
  getOrCreate,
  sectionsFor,
  updateSettings,
  saveSections,
  addProject,
  updateProject,
  removeProject,
  publicPage,
  TEMPLATES,
  PortfolioError
};

// server/controllers/portfolio.controller.ts
init_plans_service();
var asHttpError5 = (err) => err instanceof PortfolioError ? new AppError(err.message, err.status) : err;
var requireFreelancer2 = async (userId) => {
  const profile = await prisma_default.freelancerProfile.findUnique({
    where: { userId },
    select: { id: true, username: true }
  });
  if (!profile) throw new AppError("Aucun profil freelance pour ce compte.", 404);
  return profile;
};
var getMyPortfolio = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    const portfolio = await portfolio_service_default.getOrCreate(profile.id);
    const [sections, projects, entitlements] = await Promise.all([
      portfolio_service_default.sectionsFor(portfolio.id),
      prisma_default.portfolioProject.findMany({
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
          cover: { select: { url: true } }
        }
      }),
      plans_service_default.getEntitlements(profile.id)
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
          views: portfolio.views
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
          stats: entitlements.stats
        }
      }
    });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var updateSettings2 = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    const updated = await portfolio_service_default.updateSettings(profile.id, req.body ?? {});
    res.json({ success: true, data: { portfolio: updated } });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var saveSections2 = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    const { sections } = req.body;
    if (!Array.isArray(sections)) return next(new AppError("Sections manquantes.", 400));
    const saved = await portfolio_service_default.saveSections(profile.id, sections);
    res.json({ success: true, data: { sections: saved } });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var addProject2 = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    const project = await portfolio_service_default.addProject(profile.id, req.body ?? {});
    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var updateProject2 = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    const project = await portfolio_service_default.updateProject(profile.id, req.params.id, req.body ?? {});
    res.json({ success: true, data: { project } });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var removeProject2 = async (req, res, next) => {
  try {
    const profile = await requireFreelancer2(req.user.id);
    res.json({ success: true, data: await portfolio_service_default.removeProject(profile.id, req.params.id) });
  } catch (err) {
    next(asHttpError5(err));
  }
};
var getPublicPortfolio = async (req, res, next) => {
  try {
    const page = await portfolio_service_default.publicPage(req.params.username);
    if (!page) {
      return res.status(404).json({ success: false, message: "Portfolio introuvable." });
    }
    res.json({ success: true, data: page });
  } catch (err) {
    next(asHttpError5(err));
  }
};

// server/controllers/marketplacePayment.controller.ts
init_prisma();

// server/services/marketplacePayment.service.ts
init_prisma();
init_credits_service();
import { CreditEntryType as CreditEntryType5, MarketplacePaymentStatus, Prisma as Prisma5 } from "@prisma/client";
var PaymentError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "PaymentError";
  }
};
var reference = () => `DL-${Date.now().toString(36).toUpperCase()}`;
var MANUAL_METHODS = ["CCP_TRANSFER", "BARIDIMOB", "BANK_TRANSFER"];
var settle = async (paymentId) => {
  const payment = await prisma_default.marketplacePayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      userId: true,
      status: true,
      amount: true,
      creditPack: { select: { id: true, name: true, credits: true } }
    }
  });
  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (!payment.creditPack) {
    throw new PaymentError("Ce paiement ne correspond \xE0 aucun pack de cr\xE9dits.", 409);
  }
  const claimed = await prisma_default.marketplacePayment.updateMany({
    where: { id: payment.id, status: { not: MarketplacePaymentStatus.PAID } },
    data: { status: MarketplacePaymentStatus.PAID, paidAt: /* @__PURE__ */ new Date() }
  });
  if (claimed.count === 0) {
    return { granted: false, balance: await credits_service_default.getBalance(payment.userId) };
  }
  const granted = await credits_service_default.grant({
    userId: payment.userId,
    amount: payment.creditPack.credits,
    type: CreditEntryType5.PURCHASE,
    idempotencyKey: `payment:${payment.id}`,
    referenceType: "payment",
    referenceId: payment.id,
    note: `Achat : ${payment.creditPack.name}`
  });
  await issueInvoice(payment.id);
  return { granted: !granted.replayed, balance: granted.balance };
};
var issueInvoice = async (paymentId) => {
  const existing = await prisma_default.marketplaceInvoice.findUnique({
    where: { paymentId },
    select: { id: true }
  });
  if (existing) return;
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const countThisYear = await prisma_default.marketplaceInvoice.count({
    where: { number: { startsWith: `${year}-` } }
  });
  try {
    await prisma_default.marketplaceInvoice.create({
      data: {
        paymentId,
        number: `${year}-${String(countThisYear + 1).padStart(5, "0")}`
      }
    });
  } catch (err) {
    if (err instanceof Prisma5.PrismaClientKnownRequestError && err.code === "P2002") {
      await prisma_default.marketplaceInvoice.create({
        data: {
          paymentId,
          number: `${year}-${String(countThisYear + 2).padStart(5, "0")}`
        }
      }).catch(() => {
      });
      return;
    }
    throw err;
  }
};
var startPurchase = async (userId, creditPackId, method) => {
  const pack = await prisma_default.creditPack.findFirst({
    where: { id: creditPackId, active: true },
    select: { id: true, name: true, credits: true, price: true, currency: true }
  });
  if (!pack) throw new PaymentError("Pack introuvable ou indisponible.", 404);
  const isManual = MANUAL_METHODS.includes(method);
  const isCard = method === "CHARGILY_CIB" || method === "CHARGILY_EDAHABIA";
  if (!isManual && !isCard) throw new PaymentError("Moyen de paiement inconnu.");
  const payment = await prisma_default.marketplacePayment.create({
    data: {
      reference: reference(),
      userId,
      creditPackId: pack.id,
      // Read from the pack, never from the request: a client-supplied
      // amount is the price the buyer would like to pay.
      amount: pack.price,
      currency: pack.currency,
      method,
      status: isManual ? MarketplacePaymentStatus.AWAITING_REVIEW : MarketplacePaymentStatus.PENDING
    },
    select: { id: true, reference: true, amount: true, currency: true, status: true }
  });
  return { payment, pack, isManual };
};
var attachCheckout = async (paymentId, checkoutId) => prisma_default.marketplacePayment.update({
  where: { id: paymentId },
  data: { providerCheckoutId: checkoutId },
  select: { id: true }
});
var handleWebhook = async (checkoutId, paid, payload) => {
  const nothing = {
    matched: false,
    settled: false,
    granted: false,
    balance: null
  };
  const payment = await prisma_default.marketplacePayment.findUnique({
    where: { providerCheckoutId: checkoutId },
    select: { id: true, status: true }
  });
  if (!payment) return nothing;
  await prisma_default.marketplacePayment.update({
    where: { id: payment.id },
    data: { providerPayload: payload }
  });
  if (!paid) {
    await prisma_default.marketplacePayment.updateMany({
      where: { id: payment.id, status: { not: MarketplacePaymentStatus.PAID } },
      data: { status: MarketplacePaymentStatus.FAILED }
    });
    return { ...nothing, matched: true };
  }
  const result = await settle(payment.id);
  return { matched: true, settled: true, granted: result.granted, balance: result.balance };
};
var attachReceipt = async (paymentId, userId, fileId) => {
  const payment = await prisma_default.marketplacePayment.findFirst({
    where: { id: paymentId, userId },
    select: { id: true, status: true, method: true }
  });
  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (payment.status === "PAID") throw new PaymentError("Ce paiement est d\xE9j\xE0 r\xE9gl\xE9.", 409);
  if (!MANUAL_METHODS.includes(payment.method)) {
    throw new PaymentError("Ce paiement ne se r\xE8gle pas par virement.", 409);
  }
  return prisma_default.marketplacePayment.update({
    where: { id: payment.id },
    data: { receiptId: fileId, status: MarketplacePaymentStatus.AWAITING_REVIEW },
    select: { id: true, status: true }
  });
};
var approveManual = async (paymentId, adminId) => {
  const payment = await prisma_default.marketplacePayment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, receiptId: true, method: true }
  });
  if (!payment) throw new PaymentError("Paiement introuvable.", 404);
  if (payment.status === "PAID") throw new PaymentError("Ce paiement est d\xE9j\xE0 r\xE9gl\xE9.", 409);
  if (!MANUAL_METHODS.includes(payment.method)) {
    throw new PaymentError("Ce paiement n'est pas un virement.", 409);
  }
  if (!payment.receiptId) {
    throw new PaymentError("Aucun re\xE7u n'a \xE9t\xE9 d\xE9pos\xE9 pour ce paiement.", 409);
  }
  await prisma_default.marketplacePayment.update({
    where: { id: payment.id },
    data: { reviewedById: adminId, reviewedAt: /* @__PURE__ */ new Date() }
  });
  return settle(payment.id);
};
var rejectManual = async (paymentId, adminId, reason) => {
  if (!reason?.trim()) throw new PaymentError("Un motif est obligatoire.");
  const done = await prisma_default.marketplacePayment.updateMany({
    where: { id: paymentId, status: { not: MarketplacePaymentStatus.PAID } },
    data: {
      status: MarketplacePaymentStatus.REJECTED,
      rejectionReason: reason.trim(),
      reviewedById: adminId,
      reviewedAt: /* @__PURE__ */ new Date()
    }
  });
  if (done.count === 0) {
    throw new PaymentError("Ce paiement ne peut plus \xEAtre refus\xE9.", 409);
  }
  return { status: MarketplacePaymentStatus.REJECTED };
};
var historyFor = async (userId) => prisma_default.marketplacePayment.findMany({
  where: { userId },
  orderBy: { createdAt: "desc" },
  take: 50,
  select: {
    id: true,
    reference: true,
    amount: true,
    currency: true,
    method: true,
    status: true,
    rejectionReason: true,
    paidAt: true,
    createdAt: true,
    creditPack: { select: { name: true, credits: true } },
    invoice: { select: { number: true, issuedAt: true } }
  }
});
var pendingReceipts = async () => prisma_default.marketplacePayment.findMany({
  where: { status: MarketplacePaymentStatus.AWAITING_REVIEW },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    reference: true,
    amount: true,
    currency: true,
    method: true,
    createdAt: true,
    receipt: { select: { url: true, fileName: true } },
    creditPack: { select: { name: true, credits: true } },
    user: { select: { email: true, firstName: true, lastName: true } }
  }
});
var marketplacePayment_service_default = {
  startPurchase,
  attachCheckout,
  handleWebhook,
  attachReceipt,
  approveManual,
  rejectManual,
  settle,
  historyFor,
  pendingReceipts,
  PaymentError
};

// server/services/chargily.service.ts
import crypto8 from "crypto";
import axios from "axios";
var MODE = (process.env.CHARGILY_MODE?.trim() || "test").toLowerCase();
var API_BASE = MODE === "live" ? "https://pay.chargily.net/api/v2" : "https://pay.chargily.net/test/api/v2";
var readKey = () => {
  const raw = process.env.CHARGILY_SECRET_KEY ?? "";
  return raw.trim().replace(/^["']|["']$/g, "").trim();
};
var secretKey = () => {
  const key = readKey();
  if (!key) {
    throw new AppError(
      "Le paiement en ligne n'est pas configur\xE9. Contactez le support.",
      503
    );
  }
  return key;
};
var keyPrefix = readKey().slice(0, 8);
if (keyPrefix) {
  const keyIsLive = keyPrefix.startsWith("live_");
  if (MODE === "live" && !keyIsLive) {
    console.error(
      "CHARGILY_MODE=live but CHARGILY_SECRET_KEY is a test key. Every payment will be rejected."
    );
  } else if (MODE !== "live" && keyIsLive) {
    console.error(
      "CHARGILY_SECRET_KEY is a LIVE key but CHARGILY_MODE is not live. Real cards will not be charged."
    );
  }
}
var isChargilyConfigured = () => Boolean(readKey());
var createCheckout = async (input) => {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new AppError("Invalid amount.", 400);
  }
  try {
    const { data } = await axios.post(
      `${API_BASE}/checkouts`,
      {
        amount: input.amount,
        currency: "dzd",
        success_url: input.successUrl,
        failure_url: input.failureUrl,
        description: input.description,
        locale: input.locale ?? "fr",
        metadata: input.metadata
      },
      {
        headers: {
          Authorization: `Bearer ${secretKey()}`,
          "Content-Type": "application/json"
        },
        timeout: 15e3
      }
    );
    if (!data?.id || !data?.checkout_url) {
      throw new AppError("Chargily returned an unexpected response.", 502);
    }
    return {
      id: data.id,
      url: data.checkout_url,
      amount: data.amount,
      status: data.status
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const status = err?.response?.status;
    const detail2 = err?.response?.data;
    console.error("Chargily checkout failed:", status, detail2 ?? err?.message);
    if (status === 401) {
      throw new AppError(
        `Le paiement en ligne est mal configur\xE9 (cl\xE9 Chargily refus\xE9e, mode \xAB ${MODE} \xBB). Contactez le support.`,
        502
      );
    }
    const reason = typeof detail2?.message === "string" ? detail2.message : typeof detail2?.error === "string" ? detail2.error : null;
    throw new AppError(
      reason ? `Le paiement n'a pas pu \xEAtre cr\xE9\xE9 : ${reason}` : "Impossible de cr\xE9er le paiement. R\xE9essayez dans un instant.",
      502
    );
  }
};
var verifyWebhookSignature = (rawBody, signature2) => {
  if (!signature2) return false;
  const key = readKey();
  if (!key) return false;
  const expected = crypto8.createHmac("sha256", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature2, "utf8");
  if (a.length !== b.length) return false;
  return crypto8.timingSafeEqual(a, b);
};

// server/controllers/marketplacePayment.controller.ts
var asHttpError6 = (err) => err instanceof PaymentError ? new AppError(err.message, err.status) : err;
var APP_URL2 = () => process.env.APP_URL || "https://www.darlemploi.dz";
var getPurchaseOptions = async (_req, res, next) => {
  try {
    const packs = await prisma_default.creditPack.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, credits: true, price: true, currency: true }
    });
    const settings = await prisma_default.platformSetting.findMany({
      where: { key: { in: ["freelance.payment.ccp", "freelance.payment.baridimob"] } }
    });
    const read = (key) => settings.find((s) => s.key === key)?.value ?? null;
    res.json({
      success: true,
      data: {
        packs,
        // Whether the card route is actually usable, rather than a button
        // that fails once pressed.
        cardAvailable: isChargilyConfigured(),
        transfer: {
          ccp: read("freelance.payment.ccp"),
          baridimob: read("freelance.payment.baridimob")
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var startPurchase2 = async (req, res, next) => {
  try {
    const { creditPackId, method } = req.body;
    if (!creditPackId) return next(new AppError("Choisissez un pack.", 400));
    const { payment, pack, isManual } = await marketplacePayment_service_default.startPurchase(
      req.user.id,
      String(creditPackId),
      String(method ?? "CHARGILY_CIB")
    );
    if (isManual) {
      return res.status(201).json({
        success: true,
        data: { payment, checkoutUrl: null, instructions: true }
      });
    }
    if (!isChargilyConfigured()) {
      return next(
        new AppError(
          "Le paiement par carte n'est pas disponible. Choisissez le virement CCP ou BaridiMob.",
          503
        )
      );
    }
    const checkout = await createCheckout({
      // Chargily takes whole dinars.
      amount: Math.round(Number(payment.amount)),
      successUrl: `${APP_URL2()}/freelance/paiement/${payment.id}`,
      failureUrl: `${APP_URL2()}/freelance/paiement/${payment.id}`,
      description: `${pack.name} \u2014 Dar L'emploi Freelance`,
      locale: "fr",
      metadata: { marketplacePaymentId: payment.id }
    });
    await marketplacePayment_service_default.attachCheckout(payment.id, checkout.id);
    res.status(201).json({
      success: true,
      data: { payment, checkoutUrl: checkout.url, instructions: false }
    });
  } catch (err) {
    next(asHttpError6(err));
  }
};
var webhook = async (req, res) => {
  const signature2 = req.get("signature") ?? req.get("x-signature") ?? void 0;
  const raw = req.rawBody;
  if (!raw || !verifyWebhookSignature(raw, signature2)) {
    console.warn("Marketplace webhook: bad or missing signature, ignoring.");
    return res.status(400).json({ success: false, message: "Invalid signature." });
  }
  const event = req.body;
  const checkoutId = event?.data?.id;
  if (!checkoutId) return res.status(200).json({ success: true });
  try {
    const paid = event.type === "checkout.paid" || event.data?.status === "paid";
    await marketplacePayment_service_default.handleWebhook(checkoutId, paid, event);
  } catch (err) {
    console.error("Marketplace webhook failed:", err);
  }
  res.status(200).json({ success: true });
};
var getPayment = async (req, res, next) => {
  try {
    const payment = await prisma_default.marketplacePayment.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        rejectionReason: true,
        paidAt: true,
        createdAt: true,
        receipt: { select: { url: true } },
        creditPack: { select: { name: true, credits: true } },
        invoice: { select: { number: true, issuedAt: true } }
      }
    });
    if (!payment) return next(new AppError("Paiement introuvable.", 404));
    res.json({ success: true, data: { payment } });
  } catch (err) {
    next(err);
  }
};
var listMyPayments = async (req, res, next) => {
  try {
    res.json({ success: true, data: { payments: await marketplacePayment_service_default.historyFor(req.user.id) } });
  } catch (err) {
    next(err);
  }
};
var attachReceipt2 = async (req, res, next) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return next(new AppError("Aucun re\xE7u fourni.", 400));
    const result = await marketplacePayment_service_default.attachReceipt(
      req.params.id,
      req.user.id,
      String(fileId)
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError6(err));
  }
};
var listPendingReceipts = async (_req, res, next) => {
  try {
    res.json({ success: true, data: { payments: await marketplacePayment_service_default.pendingReceipts() } });
  } catch (err) {
    next(err);
  }
};
var approveReceipt = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await marketplacePayment_service_default.approveManual(req.params.id, req.user.id)
    });
  } catch (err) {
    next(asHttpError6(err));
  }
};
var rejectReceipt = async (req, res, next) => {
  try {
    const { reason } = req.body;
    res.json({
      success: true,
      data: await marketplacePayment_service_default.rejectManual(
        req.params.id,
        req.user.id,
        String(reason ?? "")
      )
    });
  } catch (err) {
    next(asHttpError6(err));
  }
};

// server/controllers/message.controller.ts
init_prisma();

// server/services/messaging.service.ts
init_prisma();
var MessagingError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "MessagingError";
  }
};
var MAX_BODY = 5e3;
var PATTERNS = [
  // Algerian mobiles, with or without the country code and with any of the
  // usual separators: 0555 12 34 56, +213555123456, 00213-555-123456.
  [/(?:\+|00)\s*213[\s.\-]*[5-7]\d(?:[\s.\-]*\d){7}/, "num\xE9ro de t\xE9l\xE9phone"],
  [/(?:^|[^\d])0[5-7](?:[\s.\-]*\d){8}(?:[^\d]|$)/, "num\xE9ro de t\xE9l\xE9phone"],
  // Spelled out to dodge a digit filter: "zero five five five".
  [
    /\b(?:z[eé]ro|sifr)\b[\s,.\-]*(?:\b(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf|z[eé]ro)\b[\s,.\-]*){5,}/i,
    "num\xE9ro de t\xE9l\xE9phone"
  ],
  [/[\w.+-]+@[\w-]+\.[\w.]{2,}/, "adresse e-mail"],
  // "arobase", "(at)", "[at]" standing in for the @.
  [
    /[\w.+-]{2,}\s*[([]?\s*(?:arobase|at|dot)\s*[)\]]?\s*[\w-]{2,}\s*\.\s*[a-z]{2,}/i,
    "adresse e-mail"
  ],
  [
    /\b(?:whats?app|watsapp|wtsp|telegram|t\.me|viber|imo|messenger|snapchat|instagram|insta|facebook)\b/i,
    "messagerie externe"
  ],
  [
    /(?:hors[\s-]?plateforme|en dehors de la plateforme|sans passer par (?:le )?site)/i,
    "contournement de la plateforme"
  ]
];
var contactFlags = (body) => {
  const found = /* @__PURE__ */ new Set();
  for (const [pattern, reason] of PATTERNS) {
    if (pattern.test(body)) found.add(reason);
  }
  return [...found];
};
var signAttachments = async (messages) => {
  const paths = messages.flatMap((m) => m.attachments.map((a) => a.url)).filter(Boolean);
  if (!paths.length) return messages;
  const signed = await createSignedUrls(MESSAGE_ATTACHMENT_BUCKET, [...new Set(paths)]);
  return messages.map((m) => ({
    ...m,
    attachments: m.attachments.map((a) => ({ ...a, url: signed.get(a.url) ?? null }))
  }));
};
var participantIn = async (conversationId, userId) => {
  const conversation = await prisma_default.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      orderId: true,
      participants: { select: { userId: true, lastReadAt: true } }
    }
  });
  if (!conversation || !conversation.participants.some((p) => p.userId === userId)) {
    throw new MessagingError("Conversation introuvable.", 404);
  }
  return conversation;
};
var assertParticipant = async (conversationId, userId) => {
  await participantIn(conversationId, userId);
};
var openWith = async (userId, otherUserId, orderId) => {
  if (userId === otherUserId) {
    throw new MessagingError("Vous ne pouvez pas vous \xE9crire \xE0 vous-m\xEAme.", 400);
  }
  const other = await prisma_default.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, status: true, deletedAt: true }
  });
  if (!other || other.status === "DELETED" || other.deletedAt) {
    throw new MessagingError("Ce compte n'est plus disponible.", 404);
  }
  if (orderId) {
    const existing = await prisma_default.conversation.findUnique({
      where: { orderId },
      select: { id: true }
    });
    if (existing) return existing;
  } else {
    const mine = await prisma_default.conversationParticipant.findMany({
      where: { userId, conversation: { orderId: null } },
      select: { conversationId: true }
    });
    if (mine.length) {
      const shared = await prisma_default.conversationParticipant.findFirst({
        where: {
          userId: otherUserId,
          conversationId: { in: mine.map((m) => m.conversationId) }
        },
        select: { conversationId: true }
      });
      if (shared) return { id: shared.conversationId };
    }
  }
  return prisma_default.conversation.create({
    data: {
      orderId: orderId ?? null,
      participants: { create: [{ userId }, { userId: otherUserId }] }
    },
    select: { id: true }
  });
};
var userBehindUsername = async (username) => {
  const freelancer = await prisma_default.freelancerProfile.findUnique({
    where: { username },
    select: { userId: true }
  });
  if (!freelancer) throw new MessagingError("Freelance introuvable.", 404);
  return freelancer.userId;
};
var clientBehindProject = async (projectId, userId) => {
  const project = await prisma_default.freelanceProject.findFirst({
    where: { id: projectId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    select: { clientId: true }
  });
  if (!project) throw new MessagingError("Projet introuvable.", 404);
  const proposed = await prisma_default.proposal.findFirst({
    where: { projectId, freelancer: { userId } },
    select: { id: true }
  });
  if (!proposed) {
    throw new MessageAfterProposalError();
  }
  return project.clientId;
};
var MessageAfterProposalError = class extends MessagingError {
  constructor() {
    super("Envoyez d'abord une proposition : la discussion s'ouvre ensuite.", 403);
  }
};
var otherSideOfOrder = async (orderId, userId) => {
  const order = await prisma_default.freelanceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, clientId: true, freelancer: { select: { userId: true } } }
  });
  if (!order) throw new MessagingError("Commande introuvable.", 404);
  if (order.clientId === userId) return order.freelancer.userId;
  if (order.freelancer.userId === userId) return order.clientId;
  throw new MessagingError("Commande introuvable.", 404);
};
var OTHER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  freelancerProfile: { select: { displayName: true, username: true } }
};
var nameOf = (user) => user.freelancerProfile?.displayName || [user.firstName, user.lastName].filter(Boolean).join(" ") || // The local part only. A thread list is not a place to hand out addresses.
user.email.split("@")[0];
var unreadIn = (conversationId, userId, lastReadAt) => prisma_default.message.count({
  where: {
    conversationId,
    senderId: { not: userId },
    ...lastReadAt ? { createdAt: { gt: lastReadAt } } : {}
  }
});
var readUpToLatest = async (conversationId, userId) => {
  const latest = await prisma_default.message.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true }
  });
  await prisma_default.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    // An empty thread has nothing to have read; `now()` from the database
    // keeps even that case off the application's clock.
    data: { lastReadAt: latest?.createdAt ?? /* @__PURE__ */ new Date() }
  });
};
var listFor = async (userId, page = 1, perPage = 20) => {
  const where = { participants: { some: { userId } } };
  const [total, rows] = await Promise.all([
    prisma_default.conversation.count({ where }),
    prisma_default.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        updatedAt: true,
        order: { select: { id: true, reference: true } },
        participants: {
          select: { userId: true, lastReadAt: true, user: { select: OTHER_SELECT } }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, senderId: true, createdAt: true }
        }
      }
    })
  ]);
  const threads = await Promise.all(
    rows.map(async (c) => {
      const me = c.participants.find((p) => p.userId === userId);
      const other = c.participants.find((p) => p.userId !== userId);
      const last = c.messages[0];
      return {
        id: c.id,
        updatedAt: c.updatedAt,
        order: c.order,
        // Null only if the other account was hard-deleted, which cascades its
        // join row away and leaves a thread with one side.
        with: other ? {
          id: other.user.id,
          name: nameOf(other.user),
          username: other.user.freelancerProfile?.username ?? null
        } : null,
        lastMessage: last ? { body: last.body, mine: last.senderId === userId, createdAt: last.createdAt } : null,
        unread: await unreadIn(c.id, userId, me.lastReadAt)
      };
    })
  );
  return { threads, total, page, perPage };
};
var unreadTotal = async (userId) => {
  const rows = await prisma_default.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true }
  });
  const counts = await Promise.all(
    rows.map((r) => unreadIn(r.conversationId, userId, r.lastReadAt))
  );
  return counts.reduce((a, b) => a + b, 0);
};
var threadFor = async (conversationId, userId, options = {}) => {
  const conversation = await participantIn(conversationId, userId);
  const after = options.after ? new Date(options.after) : null;
  if (after && Number.isNaN(after.getTime())) {
    throw new MessagingError("Param\xE8tre \xAB after \xBB invalide.", 400);
  }
  const messages = await prisma_default.message.findMany({
    where: {
      conversationId,
      ...after ? { createdAt: { gt: after } } : {}
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(options.limit ?? 200, 1), 200),
    select: {
      id: true,
      body: true,
      senderId: true,
      createdAt: true,
      flagged: true,
      attachments: {
        select: {
          file: {
            select: { id: true, url: true, fileName: true, mimeType: true, size: true }
          }
        }
      }
    }
  });
  const otherId = conversation.participants.find((p) => p.userId !== userId)?.userId;
  const other = otherId ? await prisma_default.user.findUnique({ where: { id: otherId }, select: OTHER_SELECT }) : null;
  await readUpToLatest(conversationId, userId);
  return {
    conversation: {
      id: conversation.id,
      orderId: conversation.orderId,
      with: other ? { id: other.id, name: nameOf(other), username: other.freelancerProfile?.username ?? null } : null
    },
    messages: await signAttachments(
      messages.map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.senderId === userId,
        createdAt: m.createdAt,
        /* The sender is told their own message was flagged; the recipient is
         * not. Hiding it from the sender would be a shadow-ban, and showing it
         * to the recipient would turn a guess into an accusation. */
        flagged: m.senderId === userId ? m.flagged : false,
        attachments: m.attachments.map((a) => a.file)
      }))
    )
  };
};
var send = async (conversationId, userId, body, fileIds = []) => {
  await participantIn(conversationId, userId);
  const text = (body ?? "").trim();
  if (!text && !fileIds.length) throw new MessagingError("Message vide.", 400);
  if (text.length > MAX_BODY) {
    throw new MessagingError(`Message trop long (maximum ${MAX_BODY} caract\xE8res).`, 400);
  }
  const flags = text ? contactFlags(text) : [];
  const [message] = await prisma_default.$transaction([
    prisma_default.message.create({
      data: {
        conversationId,
        senderId: userId,
        body: text || null,
        flagged: flags.length > 0,
        flagReason: flags.length ? flags.join(", ") : null,
        attachments: fileIds.length ? { create: fileIds.map((fileId) => ({ fileId })) } : void 0
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        flagged: true,
        flagReason: true,
        attachments: {
          select: {
            file: {
              select: { id: true, url: true, fileName: true, mimeType: true, size: true }
            }
          }
        }
      }
    }),
    prisma_default.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: /* @__PURE__ */ new Date() },
      select: { id: true }
    })
  ]);
  await readUpToLatest(conversationId, userId);
  return {
    ...message,
    mine: true,
    attachments: message.attachments.map((a) => a.file)
  };
};
var markRead = async (conversationId, userId) => {
  await participantIn(conversationId, userId);
  await readUpToLatest(conversationId, userId);
};
var messaging_service_default = {
  MessagingError,
  contactFlags,
  assertParticipant,
  openWith,
  userBehindUsername,
  clientBehindProject,
  otherSideOfOrder,
  listFor,
  unreadTotal,
  threadFor,
  send,
  markRead
};

// server/controllers/message.controller.ts
var asHttpError7 = (err) => err instanceof MessagingError ? new AppError(err.message, err.status) : err;
var openConversation = async (req, res, next) => {
  try {
    const { username, projectId, orderId } = req.body;
    const me = req.user.id;
    let otherId;
    if (orderId) {
      otherId = await messaging_service_default.otherSideOfOrder(orderId, me);
    } else if (username) {
      otherId = await messaging_service_default.userBehindUsername(String(username).replace(/^@/, ""));
    } else if (projectId) {
      otherId = await messaging_service_default.clientBehindProject(projectId, me);
    } else {
      return next(new AppError("Pr\xE9cisez un freelance, un projet ou une commande.", 400));
    }
    const conversation = await messaging_service_default.openWith(me, otherId, orderId);
    res.json({ success: true, data: { conversation } });
  } catch (err) {
    next(asHttpError7(err));
  }
};
var listConversations = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json({ success: true, data: await messaging_service_default.listFor(req.user.id, page) });
  } catch (err) {
    next(asHttpError7(err));
  }
};
var getUnreadCount = async (req, res, next) => {
  try {
    res.json({ success: true, data: { unread: await messaging_service_default.unreadTotal(req.user.id) } });
  } catch (err) {
    next(asHttpError7(err));
  }
};
var getConversation = async (req, res, next) => {
  try {
    const after = typeof req.query.after === "string" ? req.query.after : void 0;
    const data = await messaging_service_default.threadFor(req.params.id, req.user.id, { after });
    res.json({ success: true, data });
  } catch (err) {
    next(asHttpError7(err));
  }
};
var sendMessage = async (req, res, next) => {
  const stored = [];
  try {
    const { body } = req.body;
    const files = validateMessageAttachments(req.files);
    if (files.length) await messaging_service_default.assertParticipant(req.params.id, req.user.id);
    const fileIds = [];
    for (const file of files) {
      const path = await uploadObject({
        bucket: MESSAGE_ATTACHMENT_BUCKET,
        path: buildObjectPath(req.user.id, file.extension),
        buffer: file.buffer,
        mimeType: file.mimeType
      });
      stored.push(path);
      const asset = await prisma_default.fileAsset.create({
        data: {
          // The path, not a URL: this bucket is private and every read is
          // signed, so a stored link would be one that stopped working.
          url: path,
          provider: "supabase",
          publicId: path,
          fileName: file.fileName,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size
        },
        select: { id: true }
      });
      fileIds.push(asset.id);
    }
    try {
      const message = await messaging_service_default.send(
        req.params.id,
        req.user.id,
        String(body ?? ""),
        fileIds
      );
      res.status(201).json({ success: true, data: { message } });
    } catch (sendErr) {
      await Promise.all(stored.map((path) => removeObject(MESSAGE_ATTACHMENT_BUCKET, path)));
      throw sendErr;
    }
  } catch (err) {
    next(asHttpError7(err));
  }
};
var markConversationRead = async (req, res, next) => {
  try {
    await messaging_service_default.markRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(asHttpError7(err));
  }
};

// server/services/customOffer.service.ts
init_prisma();
import { FreelanceOrderStatus as FreelanceOrderStatus2 } from "@prisma/client";
var CustomOfferError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name = "CustomOfferError";
  }
};
var MAX_DELIVERY_DAYS = 365;
var MAX_REVISIONS = 20;
var MIN_PRICE = 500;
var MAX_PRICE = 1e7;
var DEFAULT_VALID_DAYS = 7;
var OFFER_SELECT = {
  id: true,
  conversationId: true,
  title: true,
  description: true,
  price: true,
  deliveryDays: true,
  revisions: true,
  status: true,
  expiresAt: true,
  respondedAt: true,
  orderId: true,
  createdAt: true,
  freelancer: { select: { id: true, username: true, displayName: true } },
  client: { select: { id: true, firstName: true, lastName: true, email: true } },
  order: { select: { id: true, reference: true, status: true } }
};
var effectiveStatus = (offer) => offer.status === "SENT" && offer.expiresAt && offer.expiresAt.getTime() < Date.now() ? "EXPIRED" : offer.status;
var shape = (offer) => ({
  ...offer,
  price: Number(offer.price),
  status: effectiveStatus(offer)
});
var sidesOf = async (conversationId, userId) => {
  const conversation = await prisma_default.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      participants: {
        select: {
          userId: true,
          user: {
            select: { id: true, freelancerProfile: { select: { id: true } } }
          }
        }
      }
    }
  });
  if (!conversation || !conversation.participants.some((p) => p.userId === userId)) {
    throw new CustomOfferError("Conversation introuvable.", 404);
  }
  const me = conversation.participants.find((p) => p.userId === userId);
  const other = conversation.participants.find((p) => p.userId !== userId);
  if (!other) {
    throw new CustomOfferError("Cette conversation n'a plus qu'un participant.", 409);
  }
  return { conversation, me, other };
};
var send2 = async (input) => {
  const { me, other } = await sidesOf(input.conversationId, input.userId);
  if (!me.user.freelancerProfile) {
    throw new CustomOfferError(
      "Seul un freelance peut envoyer une offre. Activez votre profil freelance.",
      403
    );
  }
  const title = (input.title ?? "").trim();
  if (title.length < 3) {
    throw new CustomOfferError("Donnez un titre \xE0 cette offre.", 400);
  }
  if (title.length > 120) {
    throw new CustomOfferError("Le titre est trop long (120 caract\xE8res maximum).", 400);
  }
  const price = Math.round(Number(input.price));
  if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
    throw new CustomOfferError(
      `Le prix doit \xEAtre compris entre ${MIN_PRICE} et ${MAX_PRICE} DZD.`,
      400
    );
  }
  const deliveryDays = Math.trunc(Number(input.deliveryDays));
  if (!Number.isFinite(deliveryDays) || deliveryDays < 1 || deliveryDays > MAX_DELIVERY_DAYS) {
    throw new CustomOfferError(
      `Le d\xE9lai doit \xEAtre compris entre 1 et ${MAX_DELIVERY_DAYS} jours.`,
      400
    );
  }
  const revisions = Math.trunc(Number(input.revisions ?? 0));
  if (!Number.isFinite(revisions) || revisions < 0 || revisions > MAX_REVISIONS) {
    throw new CustomOfferError(`Les r\xE9visions doivent aller de 0 \xE0 ${MAX_REVISIONS}.`, 400);
  }
  const live = await prisma_default.customOffer.findFirst({
    where: { conversationId: input.conversationId, status: "SENT" },
    select: { id: true, expiresAt: true, status: true }
  });
  const validDays = input.validDays ?? DEFAULT_VALID_DAYS;
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 90) {
    throw new CustomOfferError("La validit\xE9 doit aller de 1 \xE0 90 jours.", 400);
  }
  const offer = await prisma_default.$transaction(async (tx) => {
    if (live) {
      await tx.customOffer.update({
        where: { id: live.id },
        data: { status: "WITHDRAWN", respondedAt: /* @__PURE__ */ new Date() }
      });
    }
    return tx.customOffer.create({
      data: {
        conversationId: input.conversationId,
        freelancerId: me.user.freelancerProfile.id,
        clientId: other.userId,
        title,
        description: input.description?.trim() || null,
        price: String(price),
        deliveryDays,
        revisions,
        expiresAt: new Date(Date.now() + validDays * 864e5)
      },
      select: OFFER_SELECT
    });
  });
  await prisma_default.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: /* @__PURE__ */ new Date() },
    select: { id: true }
  });
  return shape(offer);
};
var listForConversation = async (conversationId, userId) => {
  const { me } = await sidesOf(conversationId, userId);
  const rows = await prisma_default.customOffer.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: OFFER_SELECT
  });
  return {
    offers: rows.map(shape),
    canSendOffer: Boolean(me.user.freelancerProfile)
  };
};
var offerFor = async (offerId, userId) => {
  const offer = await prisma_default.customOffer.findUnique({
    where: { id: offerId },
    select: { ...OFFER_SELECT, freelancer: { select: { id: true, userId: true, username: true, displayName: true } } }
  });
  if (!offer) throw new CustomOfferError("Offre introuvable.", 404);
  const isClient = offer.client.id === userId;
  const isFreelancer = offer.freelancer.userId === userId;
  if (!isClient && !isFreelancer) throw new CustomOfferError("Offre introuvable.", 404);
  return { offer, isClient, isFreelancer };
};
var accept2 = async (offerId, userId) => {
  const { offer, isClient } = await offerFor(offerId, userId);
  if (!isClient) {
    throw new CustomOfferError("Seul le client peut accepter cette offre.", 403);
  }
  const status = effectiveStatus(offer);
  if (status === "EXPIRED") {
    throw new CustomOfferError(
      "Cette offre a expir\xE9. Demandez au freelance de la renvoyer.",
      409
    );
  }
  if (status !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus disponible.", 409);
  }
  const result = await prisma_default.$transaction(async (tx) => {
    const order = await tx.freelanceOrder.create({
      data: {
        reference: `OFF-${Date.now().toString(36).toUpperCase()}`,
        clientId: offer.client.id,
        freelancerId: offer.freelancer.id,
        // No service and no project: this order came from a conversation, and
        // saying so by leaving both null is truer than pointing at something
        // it did not come from.
        agreedPrice: offer.price,
        deliveryDueAt: new Date(Date.now() + offer.deliveryDays * 864e5),
        status: FreelanceOrderStatus2.CREATED
      },
      select: { id: true, reference: true, status: true, agreedPrice: true }
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        actorId: userId,
        fromStatus: FreelanceOrderStatus2.CREATED,
        toStatus: FreelanceOrderStatus2.CREATED,
        note: `Offre personnalis\xE9e accept\xE9e : ${offer.title}`
      }
    });
    const updated = await tx.customOffer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED", respondedAt: /* @__PURE__ */ new Date(), orderId: order.id },
      select: OFFER_SELECT
    });
    await tx.conversation.update({ where: { id: offer.conversationId }, data: { orderId: order.id } }).catch(() => void 0);
    return { offer: updated, order };
  });
  return { offer: shape(result.offer), order: result.order };
};
var decline = async (offerId, userId) => {
  const { offer, isClient } = await offerFor(offerId, userId);
  if (!isClient) {
    throw new CustomOfferError("Seul le client peut refuser cette offre.", 403);
  }
  if (effectiveStatus(offer) !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus disponible.", 409);
  }
  const updated = await prisma_default.customOffer.update({
    where: { id: offer.id },
    data: { status: "DECLINED", respondedAt: /* @__PURE__ */ new Date() },
    select: OFFER_SELECT
  });
  return shape(updated);
};
var withdraw2 = async (offerId, userId) => {
  const { offer, isFreelancer } = await offerFor(offerId, userId);
  if (!isFreelancer) {
    throw new CustomOfferError("Seul le freelance peut retirer cette offre.", 403);
  }
  const status = effectiveStatus(offer);
  if (status === "ACCEPTED") {
    throw new CustomOfferError(
      "Cette offre a \xE9t\xE9 accept\xE9e. Annulez la commande si besoin.",
      409
    );
  }
  if (status !== "SENT") {
    throw new CustomOfferError("Cette offre n'est plus en attente.", 409);
  }
  const updated = await prisma_default.customOffer.update({
    where: { id: offer.id },
    data: { status: "WITHDRAWN", respondedAt: /* @__PURE__ */ new Date() },
    select: OFFER_SELECT
  });
  return shape(updated);
};
var customOffer_service_default = { send: send2, listForConversation, accept: accept2, decline, withdraw: withdraw2, CustomOfferError };

// server/controllers/customOffer.controller.ts
var asHttpError8 = (err) => err instanceof CustomOfferError ? new AppError(err.message, err.status) : err;
var sendOffer = async (req, res, next) => {
  try {
    const { title, description, price, deliveryDays, revisions, validDays } = req.body;
    const offer = await customOffer_service_default.send({
      conversationId: req.params.id,
      userId: req.user.id,
      title: String(title ?? ""),
      description: description == null ? null : String(description),
      price: Number(price),
      deliveryDays: Number(deliveryDays),
      revisions: revisions == null ? 0 : Number(revisions),
      validDays: validDays == null ? null : Number(validDays)
    });
    res.status(201).json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError8(err));
  }
};
var listOffers = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await customOffer_service_default.listForConversation(req.params.id, req.user.id)
    });
  } catch (err) {
    next(asHttpError8(err));
  }
};
var acceptOffer = async (req, res, next) => {
  try {
    res.json({ success: true, data: await customOffer_service_default.accept(req.params.offerId, req.user.id) });
  } catch (err) {
    next(asHttpError8(err));
  }
};
var declineOffer = async (req, res, next) => {
  try {
    const offer = await customOffer_service_default.decline(req.params.offerId, req.user.id);
    res.json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError8(err));
  }
};
var withdrawOffer = async (req, res, next) => {
  try {
    const offer = await customOffer_service_default.withdraw(req.params.offerId, req.user.id);
    res.json({ success: true, data: { offer } });
  } catch (err) {
    next(asHttpError8(err));
  }
};

// server/routes/freelance.routes.ts
var router4 = Router4();
router4.get("/categories", listCategories);
router4.get("/services", listServices);
router4.get("/projects", listProjects);
router4.get("/projects/by-slug/:slug", getProject);
router4.get("/services/by-slug/:slug", getService);
router4.get("/freelancers/:username", getFreelancer);
router4.get("/freelancers/:username/reviews", listPublicReviews);
router4.get("/portfolio/:username", getPublicPortfolio);
router4.post("/payments/webhook", webhook);
router4.get("/payments/options", getPurchaseOptions);
router4.get("/freelancers", listFreelancers);
router4.get("/pricing", listPricing);
router4.get("/me/activation", protect, getActivationDraft);
router4.post("/me/activate", protect, activate);
router4.get("/me/workspace", protect, getMyWorkspace);
router4.get("/me/wallet", protect, getWallet);
router4.get("/me/services", protect, listMyServices);
router4.get("/me/proposals", protect, listMyProposals);
router4.get("/me/orders", protect, listMyOrders);
router4.patch("/me/profile", protect, updateMyProfile);
router4.post("/me/services", protect, createDraft);
router4.get("/me/services/:id", protect, getMyService);
router4.patch("/me/services/:id", protect, updateMyService);
router4.post("/me/services/:id/submit", protect, submitMyService);
router4.post("/me/services/:id/pause", protect, pauseMyService);
router4.post("/me/services/:id/resume", protect, resumeMyService);
router4.delete("/me/services/:id", protect, deleteMyService);
router4.post(
  "/me/services/:id/media",
  protect,
  handleServiceMediaUpload,
  addServiceMedia
);
router4.patch("/me/services/:id/media/order", protect, reorderServiceMedia);
router4.delete("/me/services/:id/media/:mediaId", protect, removeServiceMedia);
router4.post("/me/projects", protect, createDraft2);
router4.get("/me/projects", protect, listMine);
router4.get("/me/projects/:id", protect, getMine);
router4.patch("/me/projects/:id", protect, updateMine);
router4.post("/me/projects/:id/submit", protect, submitMine);
router4.post("/me/projects/:id/close", protect, closeMine);
router4.delete("/me/projects/:id", protect, deleteMine);
router4.get("/me/projects/:id/proposals", protect, listProposalsReceived);
router4.get("/projects/:projectId/eligibility", protect, getProposalEligibility);
router4.post("/me/proposals", protect, submitProposal);
router4.post("/me/proposals/:id/withdraw", protect, withdrawProposal);
router4.get("/me/received-proposals/:id", protect, getProposalForClient);
router4.post("/me/received-proposals/:id/decide", protect, decideProposal);
router4.post("/me/orders/from-service", protect, createFromService);
router4.get("/me/orders/:id", protect, getOrder);
router4.post("/me/orders/:id/start", protect, startOrder);
router4.post("/me/orders/:id/deliver", protect, deliverOrder);
router4.post("/me/orders/:id/revision", protect, requestRevision2);
router4.post("/me/orders/:id/accept", protect, acceptOrder);
router4.post("/me/orders/:id/cancel", protect, cancelOrder);
router4.get("/me/orders/:id/review", protect, getReviewState);
router4.post("/me/orders/:id/review", protect, leaveReview);
router4.post("/me/reviews/:id/reply", protect, replyToReview);
router4.get("/me/portfolio", protect, getMyPortfolio);
router4.patch("/me/portfolio", protect, updateSettings2);
router4.put("/me/portfolio/sections", protect, saveSections2);
router4.post("/me/portfolio/projects", protect, addProject2);
router4.patch("/me/portfolio/projects/:id", protect, updateProject2);
router4.delete("/me/portfolio/projects/:id", protect, removeProject2);
router4.post("/me/payments", protect, startPurchase2);
router4.get("/me/payments", protect, listMyPayments);
router4.get("/me/payments/:id", protect, getPayment);
router4.post("/me/payments/:id/receipt", protect, attachReceipt2);
router4.post("/me/conversations", protect, openConversation);
router4.get("/me/conversations", protect, listConversations);
router4.get("/me/conversations/unread", protect, getUnreadCount);
router4.get("/me/conversations/:id", protect, getConversation);
router4.post(
  "/me/conversations/:id/messages",
  protect,
  handleMessageAttachments,
  sendMessage
);
router4.post("/me/conversations/:id/read", protect, markConversationRead);
router4.get("/me/conversations/:id/offers", protect, listOffers);
router4.post("/me/conversations/:id/offers", protect, sendOffer);
router4.post("/me/offers/:offerId/accept", protect, acceptOffer);
router4.post("/me/offers/:offerId/decline", protect, declineOffer);
router4.post("/me/offers/:offerId/withdraw", protect, withdrawOffer);
var freelance_routes_default = router4;

// server/routes/application.routes.ts
import { Router as Router5 } from "express";

// server/controllers/application.controller.ts
init_prisma();

// server/services/aiAnalysis.service.ts
init_prisma();

// server/services/candidateScore.service.ts
init_prisma();
var CandidateScoreService = class {
  constructor() {
    // ============================================================
    // Score Weights
    // ============================================================
    this.WEIGHTS = {
      ai: 0.2,
      quiz: 0.2,
      oral: 0.2,
      interview: 0.2,
      recruiter: 0.2
    };
  }
  // ============================================================
  // Calculate Final Score
  // ============================================================
  calculateFinalScore(data) {
    const ai2 = data.aiScore ?? 0;
    const quiz = data.quizScore ?? 0;
    const oral = data.oralPresentationScore ?? 0;
    const interview = data.interviewScore ?? 0;
    const recruiter = data.recruiterScore ?? 0;
    return ai2 * this.WEIGHTS.ai + quiz * this.WEIGHTS.quiz + oral * this.WEIGHTS.oral + interview * this.WEIGHTS.interview + recruiter * this.WEIGHTS.recruiter;
  }
  // ============================================================
  // Create or Update Candidate Score
  // ============================================================
  async createOrUpdateScore(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidate: true,
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    const scoreData = {
      aiScore: application.aiScore,
      quizScore: application.quizScore,
      oralPresentationScore: application.oralPresentationScore,
      recruiterScore: application.recruiterScore,
      interviewScore: application.candidateScore?.interviewScore ?? null
    };
    const finalScore = this.calculateFinalScore(scoreData);
    if (application.candidateScore) {
      return prisma_default.candidateScore.update({
        where: {
          applicationId
        },
        data: {
          aiScore: scoreData.aiScore,
          quizScore: scoreData.quizScore,
          oralPresentationScore: scoreData.oralPresentationScore,
          recruiterScore: scoreData.recruiterScore,
          interviewScore: scoreData.interviewScore,
          finalScore
        }
      });
    }
    return prisma_default.candidateScore.create({
      data: {
        applicationId,
        candidateId: application.candidateId,
        aiScore: scoreData.aiScore,
        quizScore: scoreData.quizScore,
        oralPresentationScore: scoreData.oralPresentationScore,
        recruiterScore: scoreData.recruiterScore,
        interviewScore: scoreData.interviewScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Candidate
  // ============================================================
  async getMyScore(applicationId, userId) {
    const user = await prisma_default.user.findUnique({
      where: {
        id: userId
      },
      include: {
        candidateProfile: true
      }
    });
    if (!user?.candidateProfile) {
      throw new AppError(
        "Candidate profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }
    return application.candidateScore;
  }
  // ============================================================
  // Recruiter updates interview score
  // ============================================================
  async updateInterviewScore(applicationId, recruiterUserId, interviewScore) {
    if (interviewScore < 0 || interviewScore > 100) {
      throw new AppError(
        "Interview score must be between 0 and 100.",
        400
      );
    }
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }
    const current = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    const finalScore = this.calculateFinalScore({
      aiScore: current.aiScore,
      quizScore: current.quizScore,
      oralPresentationScore: current.oralPresentationScore,
      recruiterScore: current.recruiterScore,
      interviewScore
    });
    return prisma_default.candidateScore.update({
      where: {
        applicationId
      },
      data: {
        interviewScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Recruiter updates recruiter evaluation
  // ============================================================
  async updateRecruiterScore(applicationId, recruiterUserId, recruiterScore) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError(
        "Recruiter score must be between 0 and 100.",
        400
      );
    }
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    await prisma_default.application.update({
      where: {
        id: applicationId
      },
      data: {
        recruiterScore
      }
    });
    if (!application.candidateScore) {
      await this.createOrUpdateScore(applicationId);
    }
    const current = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!current) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    const finalScore = this.calculateFinalScore({
      aiScore: current.aiScore,
      quizScore: current.quizScore,
      oralPresentationScore: current.oralPresentationScore,
      interviewScore: current.interviewScore,
      recruiterScore
    });
    return prisma_default.candidateScore.update({
      where: {
        applicationId
      },
      data: {
        recruiterScore,
        finalScore
      }
    });
  }
  // ============================================================
  // Recruiter views one candidate score
  // ============================================================
  async getCandidateScore(applicationId, recruiterUserId, role) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: {
          include: {
            candidate: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (role !== "ADMIN") {
      const recruiter = await prisma_default.user.findUnique({
        where: {
          id: recruiterUserId
        },
        include: {
          recruiterProfile: true
        }
      });
      if (!recruiter?.recruiterProfile) {
        throw new AppError(
          "Recruiter profile not found.",
          404
        );
      }
      if (application.recruiterId !== recruiter.recruiterProfile.id) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }
    if (!application.candidateScore) {
      return this.createOrUpdateScore(
        applicationId
      );
    }
    return application.candidateScore;
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterScores(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.candidateScore.findMany({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.candidateScore.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [total, average, highest, lowest] = await prisma_default.$transaction([
      prisma_default.candidateScore.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      }),
      prisma_default.candidateScore.aggregate({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        _avg: {
          finalScore: true
        }
      }),
      prisma_default.candidateScore.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      }),
      prisma_default.candidateScore.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          finalScore: "asc"
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })
    ]);
    return {
      totalCandidates: total,
      averageScore: average._avg.finalScore ?? 0,
      highestCandidate: highest,
      lowestCandidate: lowest
    };
  }
  // ============================================================
  // Admin
  // ============================================================
  async getAllScores(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.candidateScore.findMany({
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              recruiter: true,
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.candidateScore.count()
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Admin Statistics
  // ============================================================
  async getAdminStatistics() {
    const [total, average] = await prisma_default.$transaction([
      prisma_default.candidateScore.count(),
      prisma_default.candidateScore.aggregate({
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      totalCandidates: total,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.createOrUpdateScore(
      applicationId
    );
  }
  // ============================================================
  // Delete Candidate Score
  // ============================================================
  async deleteScore(applicationId) {
    const score = await prisma_default.candidateScore.findUnique({
      where: {
        applicationId
      }
    });
    if (!score) {
      throw new AppError(
        "Candidate score not found.",
        404
      );
    }
    await prisma_default.candidateScore.delete({
      where: {
        applicationId
      }
    });
    return {
      success: true,
      message: "Candidate score deleted successfully."
    };
  }
};
var candidateScore_service_default = new CandidateScoreService();

// server/services/preselection.service.ts
init_prisma();
import { PreselectionStatus } from "@prisma/client";
var PreselectionService = class {
  constructor() {
    // ============================================================
    // Minimum score required for automatic preselection
    // ============================================================
    this.MINIMUM_SCORE = 70;
  }
  // ============================================================
  // Automatic Status
  // ============================================================
  determineStatus(score) {
    if (!score) {
      return PreselectionStatus.PENDING;
    }
    if (score >= this.MINIMUM_SCORE) {
      return PreselectionStatus.SHORTLISTED;
    }
    return PreselectionStatus.REJECTED;
  }
  // ============================================================
  // Create or Update Preselection
  // ============================================================
  async createOrUpdatePreselection(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true,
        recruiter: true,
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    const scores = application.candidateScore;
    const finalScore = scores?.finalScore ?? application.finalScore ?? application.aiScore ?? 0;
    const recruiterScore = scores?.recruiterScore ?? application.recruiterScore ?? null;
    const aiScore = scores?.aiScore ?? application.aiScore ?? null;
    const status = this.determineStatus(finalScore);
    const existingPreselection = application.preselections[0];
    if (existingPreselection) {
      return prisma_default.preselection.update({
        where: {
          id: existingPreselection.id
        },
        data: {
          aiScore,
          recruiterScore,
          finalScore,
          status
        }
      });
    }
    return prisma_default.preselection.create({
      data: {
        applicationId,
        recruiterId: application.recruiterId,
        aiScore,
        recruiterScore,
        finalScore,
        status
      }
    });
  }
  // ============================================================
  // Candidate
  // ============================================================
  async getMyPreselection(applicationId, userId) {
    const user = await prisma_default.user.findUnique({
      where: {
        id: userId
      },
      include: {
        candidateProfile: true
      }
    });
    if (!user?.candidateProfile) {
      throw new AppError(
        "Candidate profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findFirst({
      where: {
        id: applicationId,
        candidateId: user.candidateProfile.id
      },
      include: {
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
      );
    }
    return application.preselections[0];
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.createOrUpdatePreselection(
      applicationId
    );
  }
  // ============================================================
  // Recruiter reviews a candidate
  // ============================================================
  async reviewCandidate(applicationId, recruiterUserId, data) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidateScore: true,
        preselections: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (application.recruiterId !== recruiter.recruiterProfile.id) {
      throw new AppError(
        "Unauthorized.",
        403
      );
    }
    if (!application.preselections[0]) {
      await this.createOrUpdatePreselection(
        applicationId
      );
    }
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    const recruiterScore = data.recruiterScore ?? preselection.recruiterScore;
    const shortlisted = data.status === PreselectionStatus.SHORTLISTED;
    const rejected = data.status === PreselectionStatus.REJECTED;
    const earlyStage = application.status === "PENDING" || application.status === "REVIEWING";
    return prisma_default.$transaction(async (tx) => {
      await tx.candidateScore.updateMany({
        where: {
          applicationId
        },
        data: {
          recruiterScore
        }
      });
      await tx.application.update({
        where: { id: applicationId },
        data: {
          isPreselected: shortlisted,
          preselectionStatus: data.status,
          ...data.comment !== void 0 ? { preselectionComment: data.comment } : {},
          ...rejected ? { status: "REJECTED" } : shortlisted && earlyStage ? { status: "SHORTLISTED" } : {}
        }
      });
      return tx.preselection.update({
        where: {
          id: preselection.id
        },
        data: {
          recruiterScore,
          status: data.status,
          comment: data.comment,
          reviewedAt: /* @__PURE__ */ new Date()
        }
      });
    });
  }
  // ============================================================
  // Shortlist Candidate
  // ============================================================
  async shortlistCandidate(applicationId, recruiterUserId, comment) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status: PreselectionStatus.SHORTLISTED,
        comment
      }
    );
  }
  // ============================================================
  // Reject Candidate
  // ============================================================
  async rejectCandidate(applicationId, recruiterUserId, comment) {
    return this.reviewCandidate(
      applicationId,
      recruiterUserId,
      {
        status: PreselectionStatus.REJECTED,
        comment
      }
    );
  }
  // ============================================================
  // Get One Preselection
  // ============================================================
  async getPreselection(applicationId, recruiterUserId, role) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        preselections: {
          include: {
            application: {
              include: {
                candidate: {
                  include: {
                    user: true
                  }
                },
                job: true
              }
            }
          }
        }
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.preselections[0]) {
      return this.createOrUpdatePreselection(
        applicationId
      );
    }
    if (role !== "ADMIN") {
      const recruiter = await prisma_default.user.findUnique({
        where: {
          id: recruiterUserId
        },
        include: {
          recruiterProfile: true
        }
      });
      if (!recruiter?.recruiterProfile) {
        throw new AppError(
          "Recruiter profile not found.",
          404
        );
      }
      if (application.recruiterId !== recruiter.recruiterProfile.id) {
        throw new AppError(
          "Unauthorized.",
          403
        );
      }
    }
    return application.preselections[0];
  }
  // ============================================================
  // Update Comment
  // ============================================================
  async updateComment(applicationId, recruiterUserId, comment) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId,
        recruiterId: recruiter.recruiterProfile.id
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    return prisma_default.preselection.update({
      where: {
        id: preselection.id
      },
      data: {
        comment,
        reviewedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterPreselections(recruiterUserId, page = 1, limit = 10, status) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const where = {
      recruiterId: recruiter.recruiterProfile.id
    };
    if (status) {
      where.status = status;
    }
    const [items, total] = await prisma_default.$transaction([
      prisma_default.preselection.findMany({
        where,
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  /* Selected, not `user: true`.
                   *
                   * That returned every User column — the bcrypt hash
                   * included — to any recruiter who opened this list. A
                   * password hash has no reason to leave the server: it is
                   * exactly what an offline cracking attempt needs if a token
                   * or a response is ever captured. */
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                      avatar: { select: { url: true } }
                    }
                  }
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          finalScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.preselection.count({
        where
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [
      total,
      shortlisted,
      rejected,
      pending,
      average
    ] = await prisma_default.$transaction([
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.SHORTLISTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.REJECTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          recruiterId: recruiter.recruiterProfile.id,
          status: PreselectionStatus.PENDING
        }
      }),
      prisma_default.preselection.aggregate({
        where: {
          recruiterId: recruiter.recruiterProfile.id
        },
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Recruiter Ranking
  // ============================================================
  async getRanking(recruiterUserId, limit = 20) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    return prisma_default.preselection.findMany({
      where: {
        recruiterId: recruiter.recruiterProfile.id
      },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: true
              }
            },
            job: true
          }
        }
      },
      orderBy: {
        finalScore: "desc"
      },
      take: limit
    });
  }
  // ============================================================
  // Admin
  // ============================================================
  async getAllPreselections(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.preselection.findMany({
        include: {
          recruiter: true,
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.preselection.count()
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Admin Statistics
  // ============================================================
  async getAdminStatistics() {
    const [
      total,
      shortlisted,
      rejected,
      pending,
      average
    ] = await prisma_default.$transaction([
      prisma_default.preselection.count(),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.SHORTLISTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.REJECTED
        }
      }),
      prisma_default.preselection.count({
        where: {
          status: PreselectionStatus.PENDING
        }
      }),
      prisma_default.preselection.aggregate({
        _avg: {
          finalScore: true
        }
      })
    ]);
    return {
      total,
      shortlisted,
      rejected,
      pending,
      averageScore: average._avg.finalScore ?? 0
    };
  }
  // ============================================================
  // Delete
  // ============================================================
  async deletePreselection(applicationId) {
    const preselection = await prisma_default.preselection.findFirst({
      where: {
        applicationId
      }
    });
    if (!preselection) {
      throw new AppError(
        "Preselection not found.",
        404
      );
    }
    await prisma_default.preselection.delete({
      where: {
        id: preselection.id
      }
    });
    return {
      success: true,
      message: "Preselection deleted successfully."
    };
  }
};
var preselection_service_default = new PreselectionService();

// server/services/aiAnalysis.service.ts
import { AIAnalysisStatus } from "@prisma/client";

// server/services/ai/openai.provider.ts
import { GoogleGenAI } from "@google/genai";
var ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
var MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
var RETRYABLE = [429, 500, 502, 503, 504];
var TOTAL_BUDGET_MS = 5e4;
var MAX_ATTEMPT_MS = 24e3;
var MIN_ATTEMPT_MS = 6e3;
var MAX_ATTEMPTS = 4;
var BACKOFF_MS = [1e3, 3e3, 7e3];
var RATE_LIMIT_BACKOFF_MS = 1e4;
var statusOf = (err) => {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : null;
};
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var AttemptTimeout = class extends Error {
};
var withTimeout = async (work, ms) => {
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise((_, reject2) => {
        timer = setTimeout(() => reject2(new AttemptTimeout(`timed out after ${ms}ms`)), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
async function askAI(prompt) {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const remaining = () => deadline - Date.now();
  const exhausted = () => new AppError(
    "The AI service is busy right now. Please try again in a moment.",
    503
  );
  for (let attempt = 0; ; attempt++) {
    const budget = Math.min(MAX_ATTEMPT_MS, remaining());
    if (budget < MIN_ATTEMPT_MS) throw exhausted();
    try {
      const response = await withTimeout(
        ai.models.generateContent({ model: MODEL, contents: prompt }),
        budget
      );
      return response.text ?? "";
    } catch (err) {
      const timedOut = err instanceof AttemptTimeout;
      const status = statusOf(err);
      if (!timedOut && !(status !== null && RETRYABLE.includes(status))) throw err;
      if (attempt + 1 >= MAX_ATTEMPTS) throw exhausted();
      const backoff = status === 429 ? RATE_LIMIT_BACKOFF_MS : BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      if (remaining() - backoff < MIN_ATTEMPT_MS) throw exhausted();
      console.warn(
        `Gemini ${timedOut ? "timeout" : status} on attempt ${attempt + 1}; retrying in ${backoff}ms (${Math.round(remaining() / 1e3)}s budget left)`
      );
      await wait(backoff);
    }
  }
}

// server/services/ai/prompt.builder.ts
function buildPrompt(data) {
  return `
You are an expert HR recruiter.

Analyze this candidate.

JOB TITLE:
${data.jobTitle}

JOB DESCRIPTION:
${data.jobDescription}

CANDIDATE CV:
${data.cvText}

Return ONLY valid JSON.

{
  "score":0,
  "summary":"",
  "strengths":[],
  "weaknesses":[],
  "matchedSkills":[],
  "missingSkills":[],
  "extractedSkills":[],
  "extractedEducation":[],
  "extractedExperience":[],
  "recommendations":[]
}
`;
}

// server/services/ai/analysis.parser.ts
function parseAnalysis(response) {
  if (!response) {
    throw new AppError(
      "Empty AI response.",
      500
    );
  }
  try {
    const cleaned = response.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      overallScore: Number(parsed.overallScore ?? 0),
      skillsScore: Number(parsed.skillsScore ?? 0),
      experienceScore: Number(parsed.experienceScore ?? 0),
      educationScore: Number(parsed.educationScore ?? 0),
      languageScore: Number(parsed.languageScore ?? 0),
      extractedSkills: Array.isArray(parsed.extractedSkills) ? parsed.extractedSkills : [],
      extractedLanguages: Array.isArray(parsed.extractedLanguages) ? parsed.extractedLanguages : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error(
      "AI Parser Error:",
      error
    );
    throw new AppError(
      "Invalid AI response format.",
      500
    );
  }
}

// server/services/cvExtraction.service.ts
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

// server/services/cvFile.service.ts
import axios2 from "axios";
var SUPABASE_URL_SCHEME = "supabase://cvs/";
var isPrivatelyStored = (asset) => asset.provider === "supabase";
var getCvAccessUrl = async (asset) => {
  if (!isPrivatelyStored(asset)) {
    return asset.url;
  }
  if (!asset.publicId) {
    throw new AppError("This CV is missing its storage reference.", 500);
  }
  return createSignedCvUrl(asset.publicId);
};
var getCvBuffer = async (asset) => {
  if (isPrivatelyStored(asset)) {
    if (!asset.publicId) {
      throw new AppError("This CV is missing its storage reference.", 500);
    }
    return downloadCvObject(asset.publicId);
  }
  const response = await axios2.get(asset.url, {
    responseType: "arraybuffer"
  });
  return Buffer.from(response.data);
};
var getCvExtension = (asset) => {
  if (asset.extension) return asset.extension.toLowerCase();
  const source = asset.publicId || asset.url;
  return source.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
};

// server/services/cvExtraction.service.ts
var CVExtractionService = class {
  async extractTextFromAsset(asset) {
    const extension = getCvExtension(asset);
    const buffer = await getCvBuffer(asset);
    switch (extension) {
      case "pdf":
        return this.extractPdf(buffer);
      case "docx":
        return this.extractDocx(buffer);
      case "doc":
        throw new AppError(
          "Text cannot be read from a .doc file. Please upload your CV as a PDF or DOCX to use this feature.",
          400
        );
      default:
        throw new AppError(`Unsupported CV format: ${extension}`, 400);
    }
  }
  /**
   * Reads text from a PDF.
   *
   * Uses unpdf, which wraps a current pdf.js build for server runtimes. The
   * previous library (pdf-parse-debugging-disabled, a fork of pdf.js from
   * 2019) failed unpredictably on real candidate CVs: the same bytes threw
   * "bad XRef entry" on one run and parsed fine on the next, and retrying did
   * not converge — one measured run failed all three attempts on a file that
   * had succeeded nine times out of ten minutes earlier. That is not something
   * a candidate can act on, and on a cold serverless function it was close to
   * a guaranteed failure.
   *
   * Measured on every CV in storage: 20/20 successful, and it recovers
   * noticeably more text than the old parser did (2920 characters against 2111
   * on the same file), which directly improves the questions generated from it.
   */
  async extractPdf(buffer) {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return this.cleanText(Array.isArray(text) ? text.join("\n") : text);
    } catch (err) {
      console.error("PDF extraction failed:", err);
      throw new AppError(
        "This PDF could not be read. Please re-export it or upload a different file.",
        400
      );
    }
  }
  async extractDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return this.cleanText(result.value);
  }
  cleanText(text) {
    return text.replace(/\r/g, "").replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  }
};
var cvExtraction_service_default = new CVExtractionService();

// server/services/aiAnalysis.service.ts
var AIAnalysisService = class {
  // ============================================================
  // Build Prompt
  // ============================================================
  createPrompt(jobTitle, jobDescription, cvText) {
    return buildPrompt({
      jobTitle,
      jobDescription,
      cvText
    });
  }
  // ============================================================
  // Save / Update Analysis
  // ============================================================
  async saveAnalysis(applicationId, candidateId, analysis) {
    const existing = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      }
    });
    const data = {
      candidateId,
      status: AIAnalysisStatus.COMPLETED,
      overallScore: analysis.overallScore ?? 0,
      skillsScore: analysis.skillsScore ?? 0,
      experienceScore: analysis.experienceScore ?? 0,
      educationScore: analysis.educationScore ?? 0,
      languageScore: analysis.languageScore ?? 0,
      extractedSkills: analysis.extractedSkills ?? [],
      extractedLanguages: analysis.extractedLanguages ?? [],
      strengths: analysis.strengths ?? [],
      weaknesses: analysis.weaknesses ?? [],
      recommendations: analysis.recommendations ?? [],
      processedAt: /* @__PURE__ */ new Date()
    };
    if (existing) {
      return prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data
      });
    }
    return prisma_default.aIAnalysis.create({
      data: {
        applicationId,
        ...data
      }
    });
  }
  // ============================================================
  // Update Application AI Score
  // ============================================================
  async updateApplicationScore(applicationId, score) {
    return prisma_default.application.update({
      where: {
        id: applicationId
      },
      data: {
        aiScore: score
      }
    });
  }
  // ============================================================
  // Read Application
  // ============================================================
  async getApplication(applicationId) {
    const application = await prisma_default.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        candidate: true,
        job: true,
        cv: true,
        aianalysis: true
      }
    });
    if (!application) {
      throw new AppError(
        "Application not found.",
        404
      );
    }
    if (!application.cv) {
      throw new AppError(
        "Candidate CV not found.",
        404
      );
    }
    return application;
  }
  // ============================================================
  // Analyze Application
  // ============================================================
  async analyzeApplication(applicationId) {
    const application = await this.getApplication(
      applicationId
    );
    if (application.aianalysis) {
      await prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data: {
          status: AIAnalysisStatus.PROCESSING
        }
      });
    } else {
      await prisma_default.aIAnalysis.create({
        data: {
          applicationId,
          candidateId: application.candidateId,
          status: AIAnalysisStatus.PROCESSING
        }
      });
    }
    try {
      if (!application.cv) {
        throw new AppError(
          "This application has no CV attached, so it cannot be analysed.",
          400
        );
      }
      const cvText = await cvExtraction_service_default.extractTextFromAsset(
        application.cv
      );
      const prompt = this.createPrompt(
        application.job.title,
        application.job.description,
        cvText
      );
      const aiResponse = await askAI(prompt);
      const analysis = parseAnalysis(aiResponse);
      const savedAnalysis = await this.saveAnalysis(
        applicationId,
        application.candidateId,
        analysis
      );
      await this.updateApplicationScore(
        applicationId,
        analysis.overallScore
      );
      await candidateScore_service_default.createOrUpdateScore(
        applicationId
      );
      await preselection_service_default.createOrUpdatePreselection(
        applicationId
      );
      return savedAnalysis;
    } catch (error) {
      await prisma_default.aIAnalysis.update({
        where: {
          applicationId
        },
        data: {
          status: AIAnalysisStatus.FAILED
        }
      });
      throw error;
    }
  }
  // ============================================================
  // Get One Analysis
  // ============================================================
  async getAnalysis(applicationId) {
    const analysis = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                user: true
              }
            },
            job: true
          }
        }
      }
    });
    if (!analysis) {
      throw new AppError(
        "AI analysis not found.",
        404
      );
    }
    return analysis;
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterAnalyses(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.aIAnalysis.findMany({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        include: {
          application: {
            include: {
              candidate: {
                include: {
                  user: true
                }
              },
              job: true
            }
          }
        },
        orderBy: {
          overallScore: "desc"
        },
        skip,
        take: limit
      }),
      prisma_default.aIAnalysis.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      })
    ]);
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: {
        id: recruiterUserId
      },
      include: {
        recruiterProfile: true
      }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError(
        "Recruiter profile not found.",
        404
      );
    }
    const [
      total,
      average,
      highest,
      lowest
    ] = await prisma_default.$transaction([
      prisma_default.aIAnalysis.count({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        }
      }),
      prisma_default.aIAnalysis.aggregate({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        _avg: {
          overallScore: true
        }
      }),
      prisma_default.aIAnalysis.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          overallScore: "desc"
        }
      }),
      prisma_default.aIAnalysis.findFirst({
        where: {
          application: {
            recruiterId: recruiter.recruiterProfile.id
          }
        },
        orderBy: {
          overallScore: "asc"
        }
      })
    ]);
    return {
      totalAnalyses: total,
      averageScore: average._avg.overallScore ?? 0,
      highestAnalysis: highest,
      lowestAnalysis: lowest
    };
  }
  // ============================================================
  // Recalculate
  // ============================================================
  async recalculate(applicationId) {
    return this.analyzeApplication(
      applicationId
    );
  }
  // ============================================================
  // Delete Analysis
  // ============================================================
  async deleteAnalysis(applicationId) {
    const analysis = await prisma_default.aIAnalysis.findUnique({
      where: {
        applicationId
      }
    });
    if (!analysis) {
      throw new AppError(
        "AI analysis not found.",
        404
      );
    }
    await prisma_default.aIAnalysis.delete({
      where: {
        applicationId
      }
    });
    return {
      success: true,
      message: "AI analysis deleted successfully."
    };
  }
};
var aiAnalysis_service_default = new AIAnalysisService();

// server/services/cvDirectory.service.ts
init_prisma();
import { Prisma as Prisma7 } from "@prisma/client";
var MAX_TERMS2 = 8;
var MAX_PER_PAGE2 = 200;
var searchSql = (q) => {
  const terms = q.toLowerCase().replace(/[^\p{L}\p{N}\s+#.]/gu, " ").split(/\s+/).filter((t) => t.length >= 2).slice(0, MAX_TERMS2);
  if (!terms.length) return null;
  const perTerm = terms.map((term) => {
    const like = `%${term}%`;
    return Prisma7.sql`(
      public.dl_unaccent(coalesce(u."firstName", '') || ' ' || coalesce(u."lastName", ''))
        ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp."currentJobTitle", '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.headline, '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.city, '')) ILIKE public.dl_unaccent(${like})
      OR public.dl_unaccent(coalesce(cp.wilaya, '')) ILIKE public.dl_unaccent(${like})
      OR EXISTS (
        SELECT 1 FROM unnest(cp.skills) AS s
         WHERE public.dl_unaccent(s) ILIKE public.dl_unaccent(${like})
      )
      OR public.dl_unaccent(j.title) ILIKE public.dl_unaccent(${like})
    )`;
  });
  return Prisma7.join(perTerm, " AND ");
};
var matchingCandidates = async (p, skip, take) => {
  const where = [Prisma7.sql`a."recruiterId" = ${p.recruiterProfileId}`];
  const having = [];
  if (p.jobId) where.push(Prisma7.sql`a."jobId" = ${p.jobId}`);
  if (p.wilaya) {
    where.push(Prisma7.sql`(
      public.dl_unaccent(coalesce(cp.wilaya, '')) ILIKE public.dl_unaccent(${p.wilaya})
      OR public.dl_unaccent(coalesce(cp.city, '')) ILIKE public.dl_unaccent(${p.wilaya})
    )`);
  }
  if (typeof p.minExperience === "number" && Number.isFinite(p.minExperience)) {
    where.push(
      Prisma7.sql`coalesce(cp."yearsExperience", 0) >= ${Math.trunc(p.minExperience)}`
    );
  }
  if (p.hasCv === true) {
    where.push(Prisma7.sql`(cp."resumeId" IS NOT NULL OR cp."cvBuilderData" IS NOT NULL)`);
  }
  if (p.availableNow === true) where.push(Prisma7.sql`cp."availableImmediately" = true`);
  if (p.q?.trim()) {
    const text = searchSql(p.q);
    if (text) where.push(text);
  }
  if (typeof p.minScore === "number" && Number.isFinite(p.minScore)) {
    having.push(Prisma7.sql`coalesce(max(a."aiScore"), 0) >= ${p.minScore}`);
  }
  if (p.preselectedOnly === true) {
    having.push(Prisma7.sql`bool_or(coalesce(a."isPreselected", false)) = true`);
  }
  const whereSql = Prisma7.join(where, " AND ");
  const havingSql = having.length ? Prisma7.sql`HAVING ${Prisma7.join(having, " AND ")}` : Prisma7.empty;
  return prisma_default.$queryRaw`
    SELECT cp.id,
           count(*) OVER () AS total
      FROM "Application" a
      JOIN "CandidateProfile" cp ON cp.id = a."candidateId"
      JOIN "User" u ON u.id = cp."userId"
      JOIN "Job" j ON j.id = a."jobId"
     WHERE ${whereSql}
       -- A closed account is not a candidate to call.
       AND u."deletedAt" IS NULL
       AND u."status" <> 'DELETED'::"AccountStatus"
     GROUP BY cp.id
     ${havingSql}
     ORDER BY coalesce(max(a."aiScore"), 0) DESC,
              max(a."appliedAt") DESC
     LIMIT ${take} OFFSET ${skip}`;
};
var hydrate2 = async (candidateIds, recruiterProfileId) => {
  if (!candidateIds.length) return [];
  const applications = await prisma_default.application.findMany({
    where: { candidateId: { in: candidateIds }, recruiterId: recruiterProfileId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      candidateId: true,
      aiScore: true,
      isPreselected: true,
      oralPresentationScore: true,
      appliedAt: true,
      job: { select: { id: true, title: true, category: { select: { name: true } } } },
      candidate: {
        select: {
          id: true,
          userId: true,
          currentJobTitle: true,
          headline: true,
          city: true,
          wilaya: true,
          skills: true,
          yearsExperience: true,
          availableImmediately: true,
          resumeId: true,
          // Only whether there is one: the builder document is the whole CV
          // and has no business in a list.
          cvBuilderData: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: { select: { url: true } }
            }
          }
        }
      }
    }
  });
  const userIds = [...new Set(applications.map((a) => a.candidate.userId))];
  const [quizzes, presentations] = await Promise.all([
    prisma_default.quiz.findMany({
      where: { candidateId: { in: userIds } },
      select: { candidateId: true, attempt: { select: { aiScore: true } } }
    }),
    prisma_default.oralPresentation.findMany({
      where: { candidateId: { in: candidateIds } },
      select: { candidateId: true, videoId: true }
    })
  ]);
  const quizByUser = new Map(quizzes.map((q) => [q.candidateId, q.attempt?.aiScore ?? null]));
  const hasPresentation = new Set(presentations.filter((p) => p.videoId).map((p) => p.candidateId));
  const byCandidate = /* @__PURE__ */ new Map();
  for (const a of applications) {
    const c = a.candidate;
    const score = Math.round(a.aiScore ?? 0);
    const existing = byCandidate.get(c.id);
    const jobIds = new Set(existing?.jobIds ?? []);
    const jobTitles = new Set(existing?.jobTitles ?? []);
    const sectors = new Set(existing?.sectors ?? []);
    if (a.job?.id) jobIds.add(a.job.id);
    if (a.job?.title) jobTitles.add(a.job.title);
    if (a.job?.category?.name) sectors.add(a.job.category.name);
    const better = !existing || score > existing.aiScore;
    const base = better ? {
      id: c.id,
      fullName: `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim() || c.user.email,
      email: c.user.email,
      phone: c.user.phone ?? "",
      avatarUrl: c.user.avatar?.url ?? null,
      position: c.currentJobTitle || c.headline || a.job?.title || "",
      experience: c.yearsExperience ?? 0,
      location: c.city ?? c.wilaya ?? "",
      skills: c.skills ?? [],
      availableNow: c.availableImmediately,
      aiScore: score,
      quizScore: quizByUser.get(c.userId) != null ? Math.round(quizByUser.get(c.userId)) : void 0,
      oralPresentationScore: a.oralPresentationScore ?? void 0,
      hasPresentation: hasPresentation.has(c.id),
      hasCv: Boolean(c.resumeId) || isFilled(c.cvBuilderData),
      createdAt: a.appliedAt
    } : existing;
    const isPreselected = Boolean(existing?.isPreselected) || Boolean(a.isPreselected);
    byCandidate.set(c.id, {
      ...base,
      isPreselected,
      jobIds: [...jobIds],
      jobTitles: [...jobTitles],
      sectors: [...sectors]
    });
  }
  const position = new Map(candidateIds.map((id, i) => [id, i]));
  return [...byCandidate.values()].sort(
    (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)
  );
};
var isFilled = (data) => !!data && typeof data === "object" && Object.values(data).some(
  (v) => Array.isArray(v) ? v.length > 0 : v !== null && v !== void 0 && v !== ""
);
var searchCvDirectory = async (params) => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 24) || 24, 1), MAX_PER_PAGE2);
  const skip = (page - 1) * perPage;
  const [rows, everyone] = await Promise.all([
    matchingCandidates(params, skip, perPage),
    // How many applicants the recruiter has in total, whatever the search
    // says. The screen's headline figures are about their pipeline, not about
    // the current query, and counting the filtered set there would make
    // "candidats" drop every time somebody typed.
    prisma_default.$queryRaw`
      SELECT count(DISTINCT a."candidateId") AS total
        FROM "Application" a
        JOIN "CandidateProfile" cp ON cp.id = a."candidateId"
        JOIN "User" u ON u.id = cp."userId"
       WHERE a."recruiterId" = ${params.recruiterProfileId}
         AND u."deletedAt" IS NULL
         AND u."status" <> 'DELETED'::"AccountStatus"`
  ]);
  const total = Number(rows[0]?.total ?? 0);
  return {
    candidates: await hydrate2(
      rows.map((r) => r.id),
      params.recruiterProfileId
    ),
    total,
    totalAll: Number(everyone[0]?.total ?? 0),
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage))
  };
};

// server/controllers/application.controller.ts
var applyToJob = async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;
    const candidateId = req.user.id;
    const job = await prisma_default.job.findUnique({
      where: { id: jobId },
      include: {
        company: { select: { name: true } },
        recruiter: {
          select: {
            userId: true,
            // Needed to write to them. A suspended or deleted recruiter is
            // read here and skipped below rather than excluded by the query,
            // because the application itself must still be saved.
            user: {
              select: {
                email: true,
                firstName: true,
                status: true,
                deletedAt: true
              }
            }
          }
        }
      }
    });
    if (!job) {
      return next(new AppError("Job not found", 404));
    }
    const user = await prisma_default.user.findUnique({
      where: { id: candidateId },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Only candidates can apply to jobs", 403));
    }
    const existingApplication = await prisma_default.application.findFirst({
      where: { jobId, candidateId: user.candidateProfile.id }
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
    const application = await prisma_default.application.create({
      data: {
        jobId,
        candidateId: user.candidateProfile.id,
        recruiterId: job.recruiterId,
        coverLetter,
        cvId: user.candidateProfile.resumeId
      }
    });
    aiAnalysis_service_default.analyzeApplication(application.id).catch((error) => {
      console.error(
        "AI Analysis Error:",
        error
      );
    });
    const candidateName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
    if (job.recruiter?.userId) {
      notifyNewApplication({
        recruiterUserId: job.recruiter.userId,
        candidateName,
        jobTitle: job.title
      });
    }
    const recruiterUser = job.recruiter?.user;
    const recruiterReachable = !!recruiterUser?.email && recruiterUser.status !== "SUSPENDED" && recruiterUser.status !== "DELETED" && !recruiterUser.deletedAt;
    await deliverEmail(
      "Application e-mails",
      () => Promise.all([
        sendApplicationSentEmail(user.email, {
          firstName: user.firstName,
          jobTitle: job.title,
          company: job.company?.name ?? "l'entreprise",
          city: job.location,
          appliedAt: application.appliedAt
        }),
        recruiterReachable ? sendNewApplicationEmail(recruiterUser.email, {
          recruiterFirstName: recruiterUser.firstName,
          candidateName,
          jobTitle: job.title,
          company: job.company?.name ?? null,
          city: job.location,
          coverLetter,
          appliedAt: application.appliedAt
        }) : Promise.resolve(false)
      ])
    );
    res.status(201).json({
      status: "success",
      data: { application }
    });
  } catch (err) {
    next(err);
  }
};
var getMyApplications = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found", 404));
    }
    const applications = await prisma_default.application.findMany({
      where: { candidateId: user.candidateProfile.id },
      // Selected rather than `recruiter: true`: the candidate needs the
      // company's name and location to recognise what they applied to, and the
      // recruiter's own profile row is neither useful to them nor theirs to
      // see.
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            wilaya: true,
            type: true,
            company: { select: { name: true, logo: { select: { url: true } } } }
          }
        }
      },
      orderBy: { appliedAt: "desc" }
    });
    res.status(200).json({
      status: "success",
      results: applications.length,
      data: { applications }
    });
  } catch (err) {
    next(err);
  }
};
var getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await prisma_default.job.findUnique({
      where: { id: jobId },
      include: { recruiter: true }
    });
    if (!job) return next(new AppError("Job not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    const applications = await prisma_default.application.findMany({
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
                avatar: { select: { url: true } }
              }
            }
          }
        },
        cv: true,
        aianalysis: true
      },
      orderBy: { appliedAt: "desc" }
    });
    const candidateIds = [...new Set(applications.map((a) => a.candidateId))];
    const candidateUserIds = [
      ...new Set(applications.map((a) => a.candidate.userId))
    ];
    const [quizzes, presentations] = await Promise.all([
      prisma_default.quiz.findMany({
        where: { candidateId: { in: candidateUserIds } },
        include: { attempt: true }
      }),
      prisma_default.oralPresentation.findMany({
        where: { candidateId: { in: candidateIds } },
        include: { video: true }
      })
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
          avatarUrl: application.candidate.user.avatar?.url ?? null
        }
      },
      quiz: quizByUserId.get(application.candidate.userId) ?? null,
      oralPresentation: presentationByCandidateId.get(application.candidateId) ?? null
    }));
    res.status(200).json({
      status: "success",
      results: enriched.length,
      data: { applications: enriched }
    });
  } catch (err) {
    next(err);
  }
};
var updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const application = await prisma_default.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            recruiter: true,
            company: { select: { name: true } }
          }
        },
        candidate: { select: { userId: true } }
      }
    });
    if (!application) return next(new AppError("Application not found", 404));
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { recruiterProfile: true }
    });
    if (application.job.recruiterId !== user?.recruiterProfile?.id && req.user.role !== "ADMIN") {
      return next(new AppError("Unauthorized", 403));
    }
    const updatedApplication = await prisma_default.application.update({
      where: { id },
      data: { status }
    });
    if (application.status !== updatedApplication.status) {
      notifyApplicationStatus({
        candidateUserId: application.candidate.userId,
        status: updatedApplication.status,
        jobTitle: application.job.title,
        company: application.job.company?.name ?? "L'entreprise"
      });
    }
    res.status(200).json({
      status: "success",
      data: { application: updatedApplication }
    });
  } catch (err) {
    next(err);
  }
};
var getCvDirectory = async (req, res, next) => {
  try {
    const me = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, recruiterProfile: { select: { id: true } } }
    });
    if (!me?.recruiterProfile) {
      return next(
        new AppError(
          me?.role === "ADMIN" ? "Le r\xE9pertoire CV est propre \xE0 un compte recruteur." : "Profil recruteur introuvable.",
          403
        )
      );
    }
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : void 0;
    };
    const str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
    const result = await searchCvDirectory({
      recruiterProfileId: me.recruiterProfile.id,
      q: str(req.query.q),
      jobId: str(req.query.jobId),
      wilaya: str(req.query.wilaya),
      minExperience: num(req.query.minExperience),
      minScore: num(req.query.minScore),
      // Only "true" turns a filter on, so ?hasCv=maybe does not silently
      // become "candidates without a CV".
      hasCv: req.query.hasCv === "true" ? true : void 0,
      availableNow: req.query.availableNow === "true" ? true : void 0,
      preselectedOnly: req.query.preselectedOnly === "true" ? true : void 0,
      page: num(req.query.page),
      perPage: num(req.query.perPage)
    });
    res.status(200).json({
      status: "success",
      results: result.candidates.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/application.routes.ts
var router5 = Router5();
router5.use(protect);
router5.post("/", restrictTo("CANDIDATE"), applyToJob);
router5.get("/my", restrictTo("CANDIDATE"), getMyApplications);
router5.get("/job/:jobId", restrictTo("RECRUITER", "ADMIN"), getJobApplications);
router5.get(
  "/cv-directory",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getCvDirectory
);
router5.patch("/:id/status", restrictTo("RECRUITER", "ADMIN"), updateApplicationStatus);
var application_routes_default = router5;

// server/routes/contact.routes.ts
import { Router as Router6 } from "express";

// server/controllers/contact.controller.ts
init_prisma();
var DEFAULT_CONTACT_INBOX = "contact@darlemploi.dz";
var escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var sendContactMessage = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    if (!email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    if (message.length > 5e3 || subject.length > 200) {
      return res.status(400).json({ message: "Your message is too long" });
    }
    const contactInbox = process.env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_INBOX;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2B3442;">
        <h2 style="color:#173E7D;">Nouveau message depuis le formulaire de contact</h2>
        <p><strong>De :</strong> ${escapeHtml(email)}</p>
        <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
        <div style="background:#F5F7FA; padding:16px; border-radius:8px; margin:20px 0; white-space:pre-wrap;">${escapeHtml(
      message
    )}</div>
        <p style="color:#6B7686; font-size:12px;">
          R\xE9pondez directement \xE0 cet email pour joindre l'exp\xE9diteur.
        </p>
      </div>
    `;
    const text = [
      "Nouveau message depuis le formulaire de contact",
      "",
      `De : ${email}`,
      `Sujet : ${subject}`,
      "",
      message
    ].join("\n");
    const sent = await sendEmail(contactInbox, `Contact : ${subject}`, html, {
      replyTo: email.trim(),
      text
    });
    if (!sent) {
      return res.status(502).json({
        message: "Votre message n'a pas pu \xEAtre envoy\xE9. R\xE9essayez plus tard ou \xE9crivez-nous directement \xE0 " + DEFAULT_CONTACT_INBOX + "."
      });
    }
    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error in sendContactMessage:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};
var sendCorporateEnquiry = async (req, res) => {
  try {
    const { companyName, contactName, email, phone: phone2, teamSize, message } = req.body;
    if (!companyName?.trim() || !contactName?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "L'entreprise, le contact et l'email sont requis." });
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: "Veuillez fournir une adresse email valide." });
    }
    if ((message ?? "").length > 5e3 || companyName.length > 200 || contactName.length > 200) {
      return res.status(400).json({ message: "Votre message est trop long." });
    }
    const enquiry = {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone2?.trim() || null,
      teamSize: teamSize?.trim() || null,
      message: message?.trim() || null
    };
    const delivered = await sendCorporateEnquiryEmail(enquiry);
    if (!delivered) {
      return res.status(502).json({
        message: "Votre demande n'a pas pu \xEAtre envoy\xE9e. R\xE9essayez plus tard ou \xE9crivez-nous directement \xE0 contact@darlemploi.dz."
      });
    }
    sendCorporateEnquiryAck(enquiry).catch(
      (err) => console.error("Corporate acknowledgement failed:", err)
    );
    res.status(200).json({ message: "Demande envoy\xE9e avec succ\xE8s" });
  } catch (error) {
    console.error("Error in sendCorporateEnquiry:", error);
    res.status(500).json({ message: "Failed to send enquiry" });
  }
};
var DEFAULT_SUPPORT_INBOX = "support@darlemploi.dz";
var sendSupportMessage = async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    if (!email || !subject || !message) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: "Veuillez fournir une adresse email valide." });
    }
    if (message.length > 5e3 || subject.length > 200) {
      return res.status(400).json({ message: "Votre message est trop long." });
    }
    const account = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        recruiterProfile: {
          select: {
            companies: {
              take: 1,
              orderBy: { createdAt: "asc" },
              select: { company: { select: { name: true, plan: true, postingCredits: true } } }
            }
          }
        }
      }
    });
    const company = account?.recruiterProfile?.companies?.[0]?.company ?? null;
    const accountRows = [
      ["Compte", account?.email ?? "\u2014"],
      ["R\xF4le", account?.role ?? "\u2014"],
      ["ID", account?.id ?? "\u2014"],
      ...company ? [
        ["Entreprise", company.name],
        ["Plan", company.plan],
        ["Annonces restantes", String(company.postingCredits)]
      ] : []
    ];
    const supportInbox = process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_INBOX;
    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2B3442;">
        <h2 style="color:#173E7D;">Demande de support</h2>
        <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
        <div style="background:#F5F7FA; padding:16px; border-radius:8px; margin:20px 0; white-space:pre-wrap;">${escapeHtml(
      message
    )}</div>
        <table style="border-collapse:collapse; font-size:13px; color:#4A5568;">
          ${accountRows.map(
      ([k, v]) => `<tr><td style="padding:4px 12px 4px 0; color:#6B7686;">${escapeHtml(
        k
      )}</td><td style="padding:4px 0;"><strong>${escapeHtml(v)}</strong></td></tr>`
    ).join("")}
          <tr><td style="padding:4px 12px 4px 0; color:#6B7686;">R\xE9pondre \xE0</td><td style="padding:4px 0;"><strong>${escapeHtml(
      email
    )}</strong></td></tr>
        </table>
        <p style="color:#6B7686; font-size:12px; margin-top:20px;">
          R\xE9pondez directement \xE0 cet email pour joindre l'exp\xE9diteur.
        </p>
      </div>
    `;
    const text = [
      "Demande de support",
      "",
      `Sujet : ${subject}`,
      "",
      message,
      "",
      "---",
      ...accountRows.map(([k, v]) => `${k} : ${v}`),
      `R\xE9pondre \xE0 : ${email}`
    ].join("\n");
    const sent = await sendEmail(supportInbox, `Support : ${subject}`, html, {
      replyTo: email.trim(),
      text
    });
    if (!sent) {
      return res.status(502).json({
        message: "Votre demande n'a pas pu \xEAtre envoy\xE9e. R\xE9essayez plus tard ou \xE9crivez-nous directement \xE0 " + DEFAULT_SUPPORT_INBOX + "."
      });
    }
    res.status(200).json({ message: "Support request sent" });
  } catch (error) {
    console.error("Error in sendSupportMessage:", error);
    res.status(500).json({ message: "\xC9chec de l'envoi de votre demande." });
  }
};

// server/routes/contact.routes.ts
var router6 = Router6();
router6.post("/", sendContactMessage);
router6.post("/corporate", sendCorporateEnquiry);
router6.post("/support", protect, sendSupportMessage);
var contact_routes_default = router6;

// server/routes/admin.routes.ts
import { Router as Router7 } from "express";

// server/controllers/admin.controller.ts
init_prisma();
var getAllCompanies = async (req, res, next) => {
  try {
    const companies = await prisma_default.company.findMany({
      include: {
        members: {
          include: {
            recruiter: {
              include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }
            }
          }
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        jobs: { select: { id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json({
      status: "success",
      results: companies.length,
      data: { companies }
    });
  } catch (err) {
    next(err);
  }
};
var getCompany = async (req, res, next) => {
  try {
    const company = await prisma_default.company.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { recruiter: { include: { user: true } } } },
        subscriptions: { orderBy: { createdAt: "desc" }, include: { payments: true } },
        jobs: true
      }
    });
    if (!company) return next(new AppError("Company not found", 404));
    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};
var updateCompanyPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, durationDays } = req.body;
    const validPlans = ["FREE", "PREMIUM", "CORPORATE"];
    if (!plan || !validPlans.includes(plan)) {
      return next(new AppError(`plan must be one of: ${validPlans.join(", ")}`, 400));
    }
    const company = await prisma_default.company.findUnique({ where: { id } });
    if (!company) return next(new AppError("Company not found", 404));
    const isTermed = plan === "CORPORATE";
    const startsAt = /* @__PURE__ */ new Date();
    const endsAt = new Date(
      startsAt.getTime() + (durationDays || 365) * 24 * 60 * 60 * 1e3
    );
    const [updatedCompany, subscription] = await prisma_default.$transaction([
      prisma_default.company.update({
        where: { id },
        data: { plan }
      }),
      ...isTermed ? [
        prisma_default.subscription.create({
          data: {
            companyId: id,
            plan,
            status: "ACTIVE",
            startsAt,
            endsAt,
            autoRenew: false
          }
        })
      ] : []
    ]);
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_COMPANY_PLAN",
        entity: "Company",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({
      status: "success",
      data: { company: updatedCompany, subscription }
    });
  } catch (err) {
    next(err);
  }
};
var getAllUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    const users = await prisma_default.user.findMany({
      where: {
        role: role ? role : void 0,
        status: status ? status : void 0
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        // Sent alongside status because the two are no longer independent:
        // PENDING means this is false, and the list offers a way to fix it.
        emailVerified: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        recruiterProfile: { select: { id: true, verified: true } },
        candidateProfile: {
          select: {
            id: true,
            // Only whether there is one — see the mapping below.
            resumeId: true,
            cvBuilderData: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const shaped = users.map(({ candidateProfile, ...user }) => {
      const data = candidateProfile?.cvBuilderData;
      const builderFilled2 = !!data && typeof data === "object" && Object.values(data).some(
        (v) => Array.isArray(v) ? v.length > 0 : v !== null && v !== void 0 && v !== ""
      );
      return {
        ...user,
        candidateProfile: candidateProfile ? {
          id: candidateProfile.id,
          hasUploadedCv: Boolean(candidateProfile.resumeId),
          hasBuiltCv: builderFilled2
        } : null
      };
    });
    res.status(200).json({ status: "success", results: shaped.length, data: { users: shaped } });
  } catch (err) {
    next(err);
  }
};
var updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }
    const target = await prisma_default.user.findUnique({
      where: { id },
      select: { role: true }
    });
    if (!target) return next(new AppError("Compte introuvable.", 404));
    if (req.user?.id === id) {
      return next(new AppError("Vous ne pouvez pas modifier votre propre statut.", 400));
    }
    if (target.role === "ADMIN" && !req.adminAccess?.isSuperAdmin) {
      return next(
        new AppError(
          "Seul un administrateur sans restriction peut modifier un compte administrateur.",
          403
        )
      );
    }
    const user = await prisma_default.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, role: true, status: true }
    });
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "UPDATE_USER_STATUS",
        entity: "User",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};
var adminPreselect = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status, comment, finalScore } = req.body;
    const validStatuses = ["PENDING", "SHORTLISTED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400));
    }
    const application = await prisma_default.application.findUnique({
      where: { id: applicationId },
      include: { job: { include: { company: true } }, recruiter: true }
    });
    if (!application) return next(new AppError("Application not found", 404));
    if (application.job.company.plan !== "CORPORATE") {
      return next(new AppError("Admin preselection override is only for CORPORATE plan companies", 403));
    }
    const [preselection, updatedApplication] = await prisma_default.$transaction([
      prisma_default.preselection.create({
        data: {
          applicationId,
          recruiterId: application.recruiterId,
          status,
          finalScore: finalScore ?? void 0,
          comment: comment ? `[ADMIN OVERRIDE] ${comment}` : "[ADMIN OVERRIDE]",
          reviewedAt: /* @__PURE__ */ new Date()
        }
      }),
      prisma_default.application.update({
        where: { id: applicationId },
        data: {
          preselectionStatus: status,
          isPreselected: status === "SHORTLISTED",
          preselectionComment: comment
        }
      })
    ]);
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "ADMIN_PRESELECTION_OVERRIDE",
        entity: "Application",
        entityId: applicationId,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({
      status: "success",
      data: { preselection, application: updatedApplication }
    });
  } catch (err) {
    next(err);
  }
};
var getCorporatePendingPreselections = async (req, res, next) => {
  try {
    const applications = await prisma_default.application.findMany({
      where: {
        preselectionStatus: "PENDING",
        job: { company: { plan: "CORPORATE" } }
      },
      include: {
        job: { include: { company: true } },
        candidate: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }
      },
      orderBy: { appliedAt: "asc" }
    });
    res.status(200).json({ status: "success", results: applications.length, data: { applications } });
  } catch (err) {
    next(err);
  }
};
var getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalRecruiters, totalCandidates, totalCompanies, totalJobs, planCounts, pendingTickets] = await Promise.all([
      prisma_default.user.count(),
      prisma_default.user.count({ where: { role: "RECRUITER" } }),
      prisma_default.user.count({ where: { role: "CANDIDATE" } }),
      prisma_default.company.count(),
      prisma_default.job.count(),
      prisma_default.company.groupBy({ by: ["plan"], _count: true }),
      prisma_default.supportTicket.count({ where: { status: "OPEN" } })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalRecruiters,
        totalCandidates,
        totalCompanies,
        totalJobs,
        planCounts,
        pendingTickets
      }
    });
  } catch (err) {
    next(err);
  }
};
var grantCompanyPostings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { postings, credits } = req.body;
    if (postings == null && credits == null) {
      return next(new AppError("Provide either postings (to add) or credits (to set).", 400));
    }
    if (postings != null && credits != null) {
      return next(new AppError("Provide postings or credits, not both.", 400));
    }
    const company = await prisma_default.company.findUnique({ where: { id } });
    if (!company) return next(new AppError("Company not found", 404));
    const updated = credits != null ? await setPostings(id, Number(credits)) : await grantPostings(id, Number(postings));
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: credits != null ? "SET_COMPANY_POSTINGS" : "GRANT_COMPANY_POSTINGS",
        entity: "Company",
        entityId: id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.status(200).json({ status: "success", data: { company: updated } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/adminManage.controller.ts
init_prisma();

// server/services/profileFromCv.service.ts
var clean = (v) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
};
var SEP = "[\\s.-]?";
var phone = (prefix, lead, rest) => new RegExp(`${prefix}${SEP}${lead}(?:${SEP}\\d){${rest}}(?!\\d)`);
var PHONE_PATTERNS = [
  // +213 / 00213, then 9 digits — the national leading 0 is dropped.
  phone("(?:\\+213|00213)", "[5-7]", 8),
  // 0 + mobile prefix + 8 digits.
  phone("(?<!\\d)0", "[5-7]", 8),
  // 0 + landline area code + 7 digits.
  phone("(?<!\\d)0", "[1-4]", 7)
];
var EMAIL_PATTERN2 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
var tidyPhone = (raw) => raw.replace(/[\s.-]/g, "");
var findPhone = (text) => {
  for (const pattern of PHONE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return tidyPhone(m[0]);
  }
  return null;
};
var findEmail = (text) => {
  const m = text.match(EMAIL_PATTERN2);
  return m ? m[0].toLowerCase() : null;
};
var fromCvBuilder = (data) => {
  if (!data || typeof data !== "object") return null;
  const d = data;
  const skills = Array.isArray(d.skills) ? d.skills.map((s) => typeof s === "string" ? s : s?.name).filter((s) => Boolean(s)) : [];
  const derived = {
    source: "cv-maker",
    fullName: clean(d.name),
    phone: clean(d.phone),
    email: clean(d.email),
    address: clean(d.address),
    title: clean(d.title),
    summary: clean(d.summary),
    skills,
    linkedin: clean(d.linkedin),
    portfolio: clean(d.portfolio)
  };
  const hasAnything = derived.fullName || derived.phone || derived.email || derived.address || skills.length;
  return hasAnything ? derived : null;
};
var fromUploadedCv = async (asset) => {
  let text;
  try {
    text = await cvExtraction_service_default.extractTextFromAsset(asset);
  } catch {
    return null;
  }
  if (!text?.trim()) return null;
  const phone2 = findPhone(text);
  const email = findEmail(text);
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 2 && l.length < 60 && !/\d/.test(l) && !l.includes("@"));
  if (!phone2 && !email && !firstLine) return null;
  return {
    source: "uploaded-cv",
    fullName: firstLine ?? null,
    phone: phone2,
    email
  };
};

// server/services/adminPayments.service.ts
init_prisma();
var MAX_SCAN = 2e3;
var MAX_PER_PAGE3 = 100;
var name = (user) => user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "\u2014";
var PACK_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELED: "CANCELED"
};
var readSubscriptions = async () => {
  const rows = await prisma_default.payment.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      transactionId: true,
      paidAt: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          company: {
            select: {
              name: true,
              members: {
                where: { role: "OWNER" },
                take: 1,
                select: {
                  recruiter: {
                    select: {
                      user: { select: { firstName: true, lastName: true, email: true } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  return rows.map((p) => {
    const owner = p.subscription?.company?.members[0]?.recruiter?.user ?? null;
    return {
      id: p.id,
      source: "subscription",
      // Payment has no reference of its own; the gateway's id is the only
      // thing a payer could quote back.
      reference: p.transactionId ?? p.id.slice(0, 8).toUpperCase(),
      description: `Abonnement ${p.subscription?.plan ?? "\u2014"}`,
      payer: {
        name: name(owner),
        email: owner?.email ?? null,
        company: p.subscription?.company?.name ?? null
      },
      amount: p.amount,
      currency: p.currency.toUpperCase(),
      method: p.method,
      status: p.status ?? "PENDING",
      invoiceNumber: null,
      receiptUrl: null,
      paidAt: p.paidAt,
      createdAt: p.createdAt
    };
  });
};
var readPackOrders = async () => {
  const rows = await prisma_default.packOrder.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      packId: true,
      jobs: true,
      amount: true,
      currency: true,
      status: true,
      checkoutId: true,
      invoiceNumber: true,
      paidAt: true,
      createdAt: true,
      company: { select: { name: true } },
      buyer: { select: { firstName: true, lastName: true, email: true } }
    }
  });
  return rows.map((o) => ({
    id: o.id,
    source: "pack",
    reference: o.invoiceNumber ?? o.checkoutId ?? o.id.slice(0, 8).toUpperCase(),
    description: `Pack annonces ${o.packId} \xB7 ${o.jobs} annonce(s)`,
    payer: {
      name: name(o.buyer),
      email: o.buyer?.email ?? null,
      company: o.company?.name ?? null
    },
    // Whole dinars on this table, where the others carry decimals.
    amount: o.amount,
    currency: o.currency.toUpperCase(),
    method: "CARD",
    status: PACK_STATUS[o.status] ?? "PENDING",
    invoiceNumber: o.invoiceNumber,
    receiptUrl: null,
    paidAt: o.paidAt,
    createdAt: o.createdAt
  }));
};
var readMarketplace = async () => {
  const rows = await prisma_default.marketplacePayment.findMany({
    take: MAX_SCAN,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      creditPack: { select: { name: true, credits: true } },
      subscription: { select: { plan: { select: { name: true } } } },
      receipt: { select: { url: true } },
      invoice: { select: { number: true } }
    }
  });
  return rows.map((p) => ({
    id: p.id,
    source: "marketplace",
    reference: p.reference,
    description: p.creditPack ? `Cr\xE9dits \xB7 ${p.creditPack.name} (${p.creditPack.credits})` : p.subscription?.plan?.name ? `Abonnement freelance \xB7 ${p.subscription.plan.name}` : "Achat marketplace",
    payer: {
      name: name(p.user),
      email: p.user?.email ?? null,
      company: null
    },
    amount: Number(p.amount),
    currency: p.currency.toUpperCase(),
    method: p.method,
    status: p.status,
    invoiceNumber: p.invoice?.number ?? null,
    // The proof behind a manual transfer. Approving one without looking at it
    // is granting credits because somebody said so.
    receiptUrl: p.receipt?.url ?? null,
    paidAt: p.paidAt,
    createdAt: p.createdAt
  }));
};
var matches = (row, p) => {
  if (p.source && row.source !== p.source) return false;
  if (p.status && row.status !== p.status) return false;
  if (p.method && row.method !== p.method) return false;
  if (p.q) {
    const needle = p.q.toLowerCase();
    const haystack = [
      row.reference,
      row.invoiceNumber ?? "",
      row.description,
      row.payer.name,
      row.payer.email ?? "",
      row.payer.company ?? ""
    ].join(" ").toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  const when = row.paidAt ?? row.createdAt;
  if (p.from) {
    const from = new Date(p.from);
    if (!Number.isNaN(from.getTime()) && when < from) return false;
  }
  if (p.to) {
    const to = new Date(p.to);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      if (when > to) return false;
    }
  }
  return true;
};
var summarise = (rows) => {
  const paid = rows.filter((r) => r.status === "PAID");
  const startOfMonth = /* @__PURE__ */ new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const sum = (list) => Math.round(list.reduce((total, r) => total + r.amount, 0));
  const perSource = (source) => sum(paid.filter((r) => r.source === source));
  return {
    /* Summed without converting between currencies. Everything on the
     * platform is priced in dinars; adding two currencies into one number
     * would be a figure that is simply wrong, so the breakdown below says
     * which currencies are present instead. */
    currencies: [...new Set(rows.map((r) => r.currency))],
    revenue: sum(paid),
    revenueThisMonth: sum(
      paid.filter((r) => (r.paidAt ?? r.createdAt) >= startOfMonth)
    ),
    bySource: {
      subscription: perSource("subscription"),
      pack: perSource("pack"),
      marketplace: perSource("marketplace")
    },
    counts: {
      all: rows.length,
      paid: paid.length,
      pending: rows.filter((r) => r.status === "PENDING").length,
      // The queue a human has to work through, and the only count here that
      // is a to-do rather than a fact.
      awaitingReview: rows.filter((r) => r.status === "AWAITING_REVIEW").length,
      failed: rows.filter((r) => r.status === "FAILED" || r.status === "EXPIRED").length,
      refunded: rows.filter((r) => r.status === "REFUNDED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length
    },
    pendingAmount: sum(
      rows.filter((r) => r.status === "PENDING" || r.status === "AWAITING_REVIEW")
    )
  };
};
var listPayments = async (params) => {
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const perPage = Math.min(Math.max(Math.trunc(params.perPage ?? 25) || 25, 1), MAX_PER_PAGE3);
  const [subscriptions, packs, marketplace] = await Promise.all([
    readSubscriptions(),
    readPackOrders(),
    readMarketplace()
  ]);
  const everything = [...subscriptions, ...packs, ...marketplace];
  const truncated = subscriptions.length === MAX_SCAN || packs.length === MAX_SCAN || marketplace.length === MAX_SCAN;
  const filtered = everything.filter((row) => matches(row, params)).sort(
    (a, b) => (b.paidAt ?? b.createdAt).getTime() - (a.paidAt ?? a.createdAt).getTime()
  );
  const start2 = (page - 1) * perPage;
  return {
    payments: filtered.slice(start2, start2 + perPage),
    total: filtered.length,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
    /* Totals over everything that matched, not over the page: a page of
     * twenty-five tells an admin nothing about what the platform earned. */
    summary: summarise(filtered),
    truncated,
    scanLimit: MAX_SCAN
  };
};

// server/utils/adminScopes.ts
var ADMIN_SCOPES = [
  "overview",
  "plans",
  "payments",
  "users",
  "jobs",
  "schedules",
  "emails",
  "crm",
  "preselection",
  "freelance_moderation",
  "team_tasks"
];
var SCOPE_LABELS = {
  overview: {
    label: "Aper\xE7u",
    description: "Les chiffres de la plateforme."
  },
  plans: {
    label: "Plans recruteurs",
    description: "Changer le plan d'une entreprise et cr\xE9diter des packs d'annonces. Touche \xE0 ce qui a \xE9t\xE9 pay\xE9."
  },
  payments: {
    label: "Paiements",
    description: "Consulter tous les paiements. Lecture seule."
  },
  users: {
    label: "Comptes",
    description: "Voir, modifier, suspendre et supprimer des comptes. Ne permet jamais de cr\xE9er un administrateur."
  },
  jobs: {
    label: "Offres",
    description: "Modifier et supprimer les offres d'emploi."
  },
  schedules: {
    label: "Agenda",
    description: "L'agenda de l'\xE9quipe."
  },
  emails: {
    label: "E-mails group\xE9s",
    description: "\xC9crire \xE0 des milliers de comptes d'un seul envoi. \xC0 n'accorder qu'en connaissance de cause."
  },
  crm: {
    label: "CRM",
    description: "Les prospects et leurs notes."
  },
  preselection: {
    label: "Pr\xE9s\xE9lection Corporate",
    description: "D\xE9cider \xE0 la place d'un recruteur Corporate."
  },
  freelance_moderation: {
    label: "Mod\xE9ration freelance",
    description: "Valider services et projets, lire les messages signal\xE9s, et approuver les virements \u2014 ce qui accorde des cr\xE9dits."
  },
  team_tasks: {
    label: "T\xE2ches d'\xE9quipe",
    description: "Le tableau des t\xE2ches internes."
  }
};
var VALID = new Set(ADMIN_SCOPES);
var isAdminScope = (value) => typeof value === "string" && VALID.has(value);
var normaliseScopes = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isAdminScope))];
};
var canUseScope = (user, scope2) => {
  if (!user || user.role !== "ADMIN") return false;
  if (user.isSuperAdmin) return true;
  return Array.isArray(user.adminScopes) && user.adminScopes.includes(scope2);
};

// server/controllers/adminManage.controller.ts
import bcrypt2 from "bcryptjs";
var audit = (req, action, entity, entityId) => prisma_default.auditLog.create({
  data: {
    userId: req.user?.id,
    action,
    entity,
    entityId,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  }
}).catch((err) => console.error(`Audit log failed for ${action}:`, err));
var sendVerificationLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const target = await prisma_default.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        status: true,
        emailVerified: true,
        deletedAt: true
      }
    });
    if (!target) return next(new AppError("Compte introuvable.", 404));
    if (target.emailVerified) {
      return next(new AppError("Cette adresse est d\xE9j\xE0 confirm\xE9e.", 400));
    }
    if (target.status === "DELETED" || target.deletedAt) {
      return next(new AppError("Ce compte est supprim\xE9.", 400));
    }
    const verifyUrl = verificationUrl(await issueEmailVerificationToken(target.id));
    const sent = await sendVerifyEmail(target.email, target.firstName, verifyUrl);
    await audit(req, "SEND_VERIFICATION_LINK", "User", id);
    res.status(200).json({ status: "success", data: { sent: Boolean(sent) } });
  } catch (err) {
    next(err);
  }
};
var ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"];
var STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"];
var updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, status } = req.body;
    const target = await prisma_default.user.findUnique({ where: { id } });
    if (!target) return next(new AppError("Compte introuvable.", 404));
    if (req.user?.id === id && (role !== void 0 || status !== void 0)) {
      return next(
        new AppError("Vous ne pouvez pas modifier votre propre r\xF4le ou statut.", 400)
      );
    }
    if (role !== void 0 && !ROLES.includes(role)) {
      return next(new AppError(`role must be one of: ${ROLES.join(", ")}`, 400));
    }
    const touchingAdmin = role === "ADMIN" || target.role === "ADMIN";
    if (touchingAdmin && !req.adminAccess?.isSuperAdmin) {
      return next(
        new AppError(
          "Seul un administrateur sans restriction peut g\xE9rer un compte administrateur.",
          403
        )
      );
    }
    if (status !== void 0 && !STATUSES.includes(status)) {
      return next(new AppError(`status must be one of: ${STATUSES.join(", ")}`, 400));
    }
    if (role !== void 0 && target.role === "ADMIN" && role !== "ADMIN") {
      const admins = await prisma_default.user.count({
        where: { role: "ADMIN", status: { not: "DELETED" } }
      });
      if (admins <= 1) {
        return next(new AppError("Impossible de r\xE9trograder le dernier administrateur.", 400));
      }
    }
    const nextEmail = email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== target.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return next(new AppError("Adresse email invalide.", 400));
      }
      const taken = await prisma_default.user.findUnique({ where: { email: nextEmail } });
      if (taken) return next(new AppError("Cette adresse email est d\xE9j\xE0 utilis\xE9e.", 400));
    }
    const user = await prisma_default.user.update({
      where: { id },
      data: {
        firstName: firstName?.trim() ?? void 0,
        lastName: lastName?.trim() ?? void 0,
        email: nextEmail ?? void 0,
        role: role ?? void 0,
        status: status ?? void 0,
        // Reinstating has to clear the tombstone, or sign-in keeps refusing.
        deletedAt: status && status !== "DELETED" ? null : void 0
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });
    await audit(req, "UPDATE_USER", "User", id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};
var deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      return next(new AppError("Vous ne pouvez pas supprimer votre propre compte.", 400));
    }
    const target = await prisma_default.user.findUnique({ where: { id } });
    if (!target) return next(new AppError("Compte introuvable.", 404));
    if (target.role === "ADMIN") {
      if (!req.adminAccess?.isSuperAdmin) {
        return next(
          new AppError(
            "Seul un administrateur sans restriction peut supprimer un compte administrateur.",
            403
          )
        );
      }
      const admins = await prisma_default.user.count({
        where: { role: "ADMIN", status: { not: "DELETED" } }
      });
      if (admins <= 1) {
        return next(new AppError("Impossible de supprimer le dernier administrateur.", 400));
      }
    }
    const user = await prisma_default.user.update({
      where: { id },
      data: { status: "DELETED", deletedAt: /* @__PURE__ */ new Date() },
      select: { id: true, email: true, status: true, deletedAt: true }
    });
    await audit(req, "DELETE_USER", "User", id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (err) {
    next(err);
  }
};
var getAllJobsAdmin = async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const jobs = await prisma_default.job.findMany({
      where: {
        status: status ? status : void 0,
        title: q ? { contains: q, mode: "insensitive" } : void 0
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        title: true,
        location: true,
        wilaya: true,
        status: true,
        featured: true,
        publishedAt: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        // Surfaced in the list so a delete is never a surprise.
        _count: { select: { applications: true } }
      }
    });
    res.status(200).json({ status: "success", results: jobs.length, data: { jobs } });
  } catch (err) {
    next(err);
  }
};
var getJobApplicationsAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await prisma_default.job.findUnique({ where: { id }, select: { id: true } });
    if (!job) return next(new AppError("Offre introuvable.", 404));
    const applications = await prisma_default.application.findMany({
      where: { jobId: id },
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        finalScore: true,
        candidate: {
          select: {
            id: true,
            headline: true,
            wilaya: true,
            resumeId: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } }
          }
        }
      }
    });
    res.status(200).json({ status: "success", results: applications.length, data: { applications } });
  } catch (err) {
    next(err);
  }
};
var JOB_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"];
var updateJobAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, featured } = req.body;
    if (status !== void 0 && !JOB_STATUSES.includes(status)) {
      return next(new AppError(`status must be one of: ${JOB_STATUSES.join(", ")}`, 400));
    }
    const job = await prisma_default.job.findUnique({ where: { id } });
    if (!job) return next(new AppError("Offre introuvable.", 404));
    const updated = await prisma_default.job.update({
      where: { id },
      data: {
        status: status ?? void 0,
        featured: typeof featured === "boolean" ? featured : void 0,
        // Publishing for the first time needs a date, or the offer shows no
        // age wherever it is listed.
        publishedAt: status === "PUBLISHED" && !job.publishedAt ? /* @__PURE__ */ new Date() : void 0
      },
      select: { id: true, title: true, status: true, featured: true, publishedAt: true }
    });
    await audit(req, "UPDATE_JOB", "Job", id);
    res.status(200).json({ status: "success", data: { job: updated } });
  } catch (err) {
    next(err);
  }
};
var deleteJobAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const force = req.query.force === "true";
    const job = await prisma_default.job.findUnique({
      where: { id },
      select: { id: true, title: true, _count: { select: { applications: true } } }
    });
    if (!job) return next(new AppError("Offre introuvable.", 404));
    const applications = job._count.applications;
    if (applications > 0 && !force) {
      return res.status(409).json({
        status: "error",
        message: `Cette offre a ${applications} candidature(s), qui seront supprim\xE9es avec elle. Archivez-la, ou confirmez la suppression.`,
        data: { applications }
      });
    }
    await prisma_default.job.delete({ where: { id } });
    await audit(req, "DELETE_JOB", "Job", id);
    res.status(200).json({ status: "success", data: { id, applications } });
  } catch (err) {
    next(err);
  }
};
var getUserDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await prisma_default.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        avatar: { select: { url: true } },
        candidateProfile: {
          select: {
            id: true,
            headline: true,
            bio: true,
            city: true,
            wilaya: true,
            skills: true,
            yearsExperience: true,
            currentJobTitle: true,
            desiredSalary: true,
            availableImmediately: true,
            linkedinUrl: true,
            githubUrl: true,
            portfolioUrl: true,
            // provider/publicId/extension are here for the extractor, which
            // reads a privately stored CV through the service-role client
            // rather than an HTTP GET that would 401.
            resume: {
              select: {
                id: true,
                url: true,
                fileName: true,
                createdAt: true,
                provider: true,
                publicId: true,
                extension: true
              }
            },
            cvBuilderData: true,
            _count: { select: { applications: true } }
          }
        },
        recruiterProfile: {
          select: {
            id: true,
            verified: true,
            companies: {
              select: {
                role: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    plan: true,
                    postingCredits: true,
                    verified: true,
                    _count: { select: { jobs: true } }
                  }
                }
              }
            }
          }
        },
        _count: { select: { notifications: true } }
      }
    });
    if (!user) return next(new AppError("Compte introuvable.", 404));
    const { candidateProfile, ...rest } = user;
    const data = candidateProfile?.cvBuilderData;
    const hasBuiltCv = !!data && typeof data === "object" && Object.values(data).some(
      (v) => Array.isArray(v) ? v.length > 0 : v !== null && v !== void 0 && v !== ""
    );
    let cvDerived = null;
    if (candidateProfile) {
      cvDerived = fromCvBuilder(candidateProfile.cvBuilderData);
      if (!cvDerived?.phone && candidateProfile.resume) {
        const fromFile = await fromUploadedCv(candidateProfile.resume);
        if (fromFile) {
          cvDerived = cvDerived ? {
            ...cvDerived,
            phone: cvDerived.phone ?? fromFile.phone,
            email: cvDerived.email ?? fromFile.email,
            fullName: cvDerived.fullName ?? fromFile.fullName
          } : fromFile;
        }
      }
    }
    const orders = await prisma_default.packOrder.findMany({
      where: { buyerId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        packId: true,
        jobs: true,
        amount: true,
        currency: true,
        status: true,
        invoiceNumber: true,
        paidAt: true,
        createdAt: true
      }
    });
    res.status(200).json({
      status: "success",
      data: {
        user: {
          ...rest,
          candidateProfile: candidateProfile ? {
            ...candidateProfile,
            cvBuilderData: void 0,
            hasUploadedCv: Boolean(candidateProfile.resume),
            hasBuiltCv
          } : null,
          /** Read from the CV, never written to the profile. */
          cvDerived,
          orders
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var getPayments = async (req, res, next) => {
  try {
    const str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : void 0;
    };
    const SOURCES = ["subscription", "pack", "marketplace"];
    const source = str(req.query.source);
    if (source && !SOURCES.includes(source)) {
      return next(new AppError(`source must be one of: ${SOURCES.join(", ")}`, 400));
    }
    const data = await listPayments({
      source,
      status: str(req.query.status),
      method: str(req.query.method),
      q: str(req.query.q),
      from: str(req.query.from),
      to: str(req.query.to),
      page: num(req.query.page),
      perPage: num(req.query.perPage)
    });
    res.status(200).json({ status: "success", results: data.payments.length, data });
  } catch (err) {
    next(err);
  }
};
var listAdminScopes = async (_req, res, next) => {
  try {
    res.status(200).json({
      status: "success",
      data: {
        scopes: ADMIN_SCOPES.map((key) => ({ key, ...SCOPE_LABELS[key] }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listAdminAccess = async (req, res, next) => {
  try {
    const admins = await prisma_default.user.findMany({
      where: { role: "ADMIN", deletedAt: null },
      orderBy: [{ isSuperAdmin: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isSuperAdmin: true,
        adminScopes: true,
        createdAt: true
      }
    });
    res.status(200).json({
      status: "success",
      results: admins.length,
      data: {
        admins: admins.map((a) => ({
          ...a,
          // Said plainly, because an administrator with neither is an account
          // that can sign in and reach nothing — easy to create by accident.
          hasNoAccess: !a.isSuperAdmin && a.adminScopes.length === 0,
          isMe: a.id === req.user.id
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var updateAdminAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuperAdmin, scopes } = req.body;
    if (req.user.id === id) {
      return next(
        new AppError("Vous ne pouvez pas modifier vos propres autorisations.", 400)
      );
    }
    const target = await prisma_default.user.findUnique({
      where: { id },
      select: { id: true, role: true, isSuperAdmin: true, deletedAt: true }
    });
    if (!target || target.deletedAt) {
      return next(new AppError("Compte introuvable.", 404));
    }
    if (target.role !== "ADMIN") {
      return next(
        new AppError(
          "Ce compte n'est pas administrateur. Changez son r\xF4le depuis Comptes d'abord.",
          400
        )
      );
    }
    const makeSuper = typeof isSuperAdmin === "boolean" ? isSuperAdmin : target.isSuperAdmin;
    if (target.isSuperAdmin && !makeSuper) {
      const others = await prisma_default.user.count({
        where: {
          role: "ADMIN",
          isSuperAdmin: true,
          deletedAt: null,
          status: { notIn: ["SUSPENDED", "DELETED"] },
          id: { not: target.id }
        }
      });
      if (others === 0) {
        return next(
          new AppError(
            "C'est le dernier administrateur sans restriction. Nommez-en un autre avant de limiter celui-ci.",
            400
          )
        );
      }
    }
    const updated = await prisma_default.user.update({
      where: { id: target.id },
      data: {
        isSuperAdmin: makeSuper,
        /* Kept even for an unrestricted administrator rather than cleared: if
         * their unrestricted status is removed later, the areas they were
         * trusted with are still on the record instead of silently becoming
         * none. */
        ...scopes !== void 0 ? { adminScopes: normaliseScopes(scopes) } : {}
      },
      select: {
        id: true,
        email: true,
        isSuperAdmin: true,
        adminScopes: true
      }
    });
    await audit(req, "UPDATE_ADMIN_ACCESS", "User", target.id);
    res.status(200).json({ status: "success", data: { admin: updated } });
  } catch (err) {
    next(err);
  }
};
var resetAdminPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (req.user.id === id) {
      return next(
        new AppError(
          "Changez votre propre mot de passe depuis votre compte : l'actuel y est demand\xE9.",
          400
        )
      );
    }
    const target = await prisma_default.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, deletedAt: true }
    });
    if (!target || target.deletedAt) {
      return next(new AppError("Compte introuvable.", 404));
    }
    if (target.role !== "ADMIN") {
      return next(
        new AppError("R\xE9serv\xE9 aux comptes administrateurs.", 400)
      );
    }
    const verdict = checkPassword(newPassword);
    if (!verdict.ok) return next(new AppError(verdict.message, 400));
    await prisma_default.user.update({
      where: { id: target.id },
      data: { password: await bcrypt2.hash(newPassword, 12) },
      select: { id: true }
    });
    await audit(req, "RESET_ADMIN_PASSWORD", "User", target.id);
    res.status(200).json({
      status: "success",
      message: `Mot de passe de ${target.email} r\xE9initialis\xE9.`
    });
  } catch (err) {
    next(err);
  }
};

// server/controllers/schedule.controller.ts
init_prisma();
var TYPES = ["MEETING", "INTERVIEW", "CALL", "DEMO", "DEADLINE", "OTHER"];
var STATUSES2 = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"];
var guestSelect = {
  id: true,
  name: true,
  email: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } }
};
var eventSelect = {
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
  guests: { select: guestSelect }
};
var toGuestRows = (guests) => {
  if (!Array.isArray(guests)) return [];
  return guests.map((g) => ({
    userId: g.userId?.trim() || null,
    name: g.name?.trim() || null,
    email: g.email?.trim().toLowerCase() || null
  })).filter((g) => g.userId || g.name || g.email).slice(0, 50);
};
var readBody = (body) => {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = body.type;
  const status = body.status;
  if (type !== void 0 && !TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${TYPES.join(", ")}`, 400);
  }
  if (status !== void 0 && !STATUSES2.includes(status)) {
    throw new AppError(`status must be one of: ${STATUSES2.join(", ")}`, 400);
  }
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) {
    throw new AppError("Date de d\xE9but invalide.", 400);
  }
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    throw new AppError("Date de fin invalide.", 400);
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new AppError("La fin ne peut pas pr\xE9c\xE9der le d\xE9but.", 400);
  }
  return { title, type, status, startsAt, endsAt };
};
var listSchedules = async (req, res, next) => {
  try {
    const { from, to, type, status } = req.query;
    const start2 = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    const events = await prisma_default.scheduleEvent.findMany({
      where: {
        type: type ? type : void 0,
        status: status ? status : void 0,
        // Overlap, not containment: a meeting that begins in the previous
        // month and runs into this one still belongs on this month's grid.
        ...start2 && end ? { startsAt: { lte: end }, endsAt: { gte: start2 } } : {}
      },
      orderBy: { startsAt: "asc" },
      take: 500,
      select: eventSelect
    });
    res.status(200).json({ status: "success", results: events.length, data: { events } });
  } catch (err) {
    next(err);
  }
};
var createSchedule = async (req, res, next) => {
  try {
    const { title, type, status, startsAt, endsAt } = readBody(req.body ?? {});
    if (!title) return next(new AppError("Le titre est requis.", 400));
    if (!startsAt || !endsAt) {
      return next(new AppError("Les dates de d\xE9but et de fin sont requises.", 400));
    }
    const event = await prisma_default.scheduleEvent.create({
      data: {
        title,
        type: type ?? void 0,
        status: status ?? void 0,
        startsAt,
        endsAt,
        allDay: Boolean(req.body?.allDay),
        location: req.body?.location?.trim() || null,
        notes: req.body?.notes?.trim() || null,
        hostId: req.body?.hostId?.trim() || req.user?.id || null,
        createdById: req.user?.id ?? null,
        guests: { create: toGuestRows(req.body?.guests) }
      },
      select: eventSelect
    });
    res.status(201).json({ status: "success", data: { event } });
  } catch (err) {
    next(err);
  }
};
var updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma_default.scheduleEvent.findUnique({
      where: { id },
      select: { id: true, startsAt: true, endsAt: true }
    });
    if (!existing) return next(new AppError("\xC9v\xE9nement introuvable.", 404));
    const body = req.body ?? {};
    const { title, type, status, startsAt, endsAt } = readBody(body);
    const nextStart = startsAt ?? existing.startsAt;
    const nextEnd = endsAt ?? existing.endsAt;
    if (nextEnd < nextStart) {
      return next(new AppError("La fin ne peut pas pr\xE9c\xE9der le d\xE9but.", 400));
    }
    const event = await prisma_default.scheduleEvent.update({
      where: { id },
      data: {
        title: title || void 0,
        type: type ?? void 0,
        status: status ?? void 0,
        startsAt: startsAt ?? void 0,
        endsAt: endsAt ?? void 0,
        allDay: typeof body.allDay === "boolean" ? body.allDay : void 0,
        location: body.location === void 0 ? void 0 : body.location?.trim() || null,
        notes: body.notes === void 0 ? void 0 : body.notes?.trim() || null,
        hostId: body.hostId === void 0 ? void 0 : body.hostId || null,
        // Guests are replaced wholesale when sent: the form edits the list as
        // a whole, and diffing it here would only invent a second source of
        // truth for what it already holds.
        ...body.guests !== void 0 ? { guests: { deleteMany: {}, create: toGuestRows(body.guests) } } : {}
      },
      select: eventSelect
    });
    res.status(200).json({ status: "success", data: { event } });
  } catch (err) {
    next(err);
  }
};
var deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma_default.scheduleEvent.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return next(new AppError("\xC9v\xE9nement introuvable.", 404));
    await prisma_default.scheduleEvent.delete({ where: { id } });
    res.status(200).json({ status: "success", data: { id } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/adminEmail.controller.ts
init_prisma();
var MAX_BATCH = 12;
var MAX_BCC = 200;
var asContent = (body) => ({
  subject: body.subject.trim(),
  body: body.body,
  buttonLabel: body.buttonLabel?.trim() || null,
  buttonUrl: body.buttonUrl?.trim() || null
});
var sendBroadcast = async (req, res, next) => {
  try {
    const { userIds, mode = "individual" } = req.body;
    const content = asContent(req.body);
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
      return res.status(400).json({ success: false, message: "Le bouton a un libell\xE9 mais pas de lien." });
    }
    const limit = mode === "grouped" ? MAX_BCC : MAX_BATCH;
    if (userIds.length > limit) {
      return res.status(400).json({
        success: false,
        message: `Lot trop grand : ${userIds.length} destinataires pour un maximum de ${limit}.`
      });
    }
    const recipients = await prisma_default.user.findMany({
      where: { id: { in: userIds }, status: { not: "DELETED" } },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Aucun destinataire valide." });
    }
    if (mode === "grouped") {
      const flat = {
        ...content,
        subject: stripPlaceholders(content.subject),
        body: stripPlaceholders(content.body)
      };
      const sent = await sendAdminBroadcastEmail("info@darlemploi.dz", flat, {
        bcc: recipients.map((r) => r.email)
      });
      return res.json({
        success: true,
        data: {
          mode,
          sent: sent ? recipients.length : 0,
          failed: sent ? 0 : recipients.length,
          results: recipients.map((r) => ({ id: r.id, email: r.email, ok: sent }))
        }
      });
    }
    const results = [];
    for (const r of recipients) {
      try {
        const ok = await sendAdminBroadcastEmail(r.email, {
          ...content,
          subject: fillPlaceholders(content.subject, r),
          body: fillPlaceholders(content.body, r)
        });
        results.push({ id: r.id, email: r.email, ok });
      } catch (err) {
        results.push({
          id: r.id,
          email: r.email,
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    return res.json({
      success: true,
      data: {
        mode,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results
      }
    });
  } catch (err) {
    next(err);
  }
};
var sendBroadcastPreview = async (req, res, next) => {
  try {
    const { to } = req.body;
    const content = asContent(req.body);
    if (!to?.trim()) {
      return res.status(400).json({ success: false, message: "Adresse de test manquante." });
    }
    if (!content.subject || !content.body?.trim()) {
      return res.status(400).json({ success: false, message: "Objet ou message manquant." });
    }
    const admin = { email: to.trim(), firstName: "Test", lastName: "Dar L'Emploi" };
    const ok = await sendAdminBroadcastEmail(to.trim(), {
      ...content,
      subject: fillPlaceholders(content.subject, admin),
      body: fillPlaceholders(content.body, admin)
    });
    return res.json({ success: ok, data: { sent: ok } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/freelanceModeration.controller.ts
init_prisma();
init_plans_service();
var asHttpError9 = (err) => {
  if (err instanceof ServiceValidationError) return new AppError(err.message, 400);
  if (err instanceof PlanLimitError) return new AppError(err.message, 409);
  return err;
};
var listQueue = async (req, res, next) => {
  try {
    const services = await prisma_default.serviceListing.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        publicationAttempts: true,
        category: { select: { name: true } },
        packages: {
          orderBy: { price: "asc" },
          select: { tier: true, name: true, price: true, deliveryDays: true, revisions: true, features: true }
        },
        faqs: { orderBy: { position: "asc" }, select: { question: true, answer: true } },
        skills: { select: { skill: { select: { name: true } } } },
        media: { orderBy: { position: "asc" }, select: { file: { select: { url: true } } } },
        freelancer: {
          select: {
            username: true,
            displayName: true,
            level: true,
            identityVerified: true,
            ratingAverage: true,
            ratingCount: true,
            wilaya: true,
            user: { select: { email: true } }
          }
        }
      }
    });
    res.json({
      success: true,
      data: {
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          submittedAt: s.updatedAt,
          // Second and later attempts deserve a closer look: this one has
          // been refused before.
          attempt: s.publicationAttempts,
          category: s.category?.name ?? null,
          packages: s.packages,
          faqs: s.faqs,
          skills: s.skills.map((x) => x.skill.name),
          images: s.media.map((m) => m.file.url),
          freelancer: {
            username: s.freelancer.username,
            displayName: s.freelancer.displayName,
            email: s.freelancer.user.email,
            level: s.freelancer.level,
            verified: s.freelancer.identityVerified,
            rating: s.freelancer.ratingAverage,
            ratingCount: s.freelancer.ratingCount,
            wilaya: s.freelancer.wilaya
          }
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var getQueueStats = async (_req, res, next) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const [pending, overdue, approvedToday, rejectedToday] = await Promise.all([
      prisma_default.serviceListing.count({ where: { status: "PENDING" } }),
      // Waiting longer than the target. Measured, not assumed: the
      // specification's "moins de 24 heures" is a claim that has to be
      // checkable before anyone repeats it.
      prisma_default.serviceListing.count({ where: { status: "PENDING", updatedAt: { lt: dayAgo } } }),
      prisma_default.moderationRecord.count({
        where: { entityType: "service", state: "APPROVED", createdAt: { gte: dayAgo } }
      }),
      prisma_default.moderationRecord.count({
        where: { entityType: "service", state: "REJECTED", createdAt: { gte: dayAgo } }
      })
    ]);
    res.json({ success: true, data: { pending, overdue, approvedToday, rejectedToday } });
  } catch (err) {
    next(err);
  }
};
var approveService = async (req, res, next) => {
  try {
    const service = await servicePublication_service_default.approve(req.params.id, req.user.id);
    res.json({ success: true, data: { id: service.id, status: service.status } });
  } catch (err) {
    next(asHttpError9(err));
  }
};
var rejectService = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await servicePublication_service_default.reject(req.params.id, req.user.id, String(reason ?? ""));
    res.json({ success: true, data: result });
  } catch (err) {
    next(asHttpError9(err));
  }
};
var listHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 30;
    const [total, records] = await Promise.all([
      prisma_default.moderationRecord.count({ where: { entityType: "service" } }),
      prisma_default.moderationRecord.findMany({
        where: { entityType: "service" },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          entityId: true,
          state: true,
          reason: true,
          createdAt: true,
          moderator: { select: { email: true, firstName: true, lastName: true } }
        }
      })
    ]);
    const titles = await prisma_default.serviceListing.findMany({
      where: { id: { in: records.map((r) => r.entityId) } },
      select: { id: true, title: true }
    });
    const titleById = new Map(titles.map((t) => [t.id, t.title]));
    res.json({
      success: true,
      data: {
        records: records.map((r) => ({
          ...r,
          title: titleById.get(r.entityId) ?? "(service supprim\xE9)"
        })),
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (err) {
    next(err);
  }
};
var listProjectQueue = async (_req, res, next) => {
  try {
    const projects = await prisma_default.freelanceProject.findMany({
      where: { status: "PENDING" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        budgetType: true,
        budgetMin: true,
        budgetMax: true,
        deadline: true,
        remote: true,
        wilaya: true,
        visibility: true,
        category: { select: { name: true } },
        skills: { select: { skill: { select: { name: true } } } },
        client: { select: { email: true, firstName: true, lastName: true } },
        company: { select: { name: true } }
      }
    });
    res.json({
      success: true,
      data: {
        projects: projects.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          submittedAt: p.updatedAt,
          budgetType: p.budgetType,
          budgetMin: p.budgetMin,
          budgetMax: p.budgetMax,
          deadline: p.deadline,
          remote: p.remote,
          wilaya: p.wilaya,
          visibility: p.visibility,
          category: p.category?.name ?? null,
          skills: p.skills.map((s) => s.skill.name),
          client: {
            email: p.client.email,
            name: p.company?.name ?? [p.client.firstName, p.client.lastName].filter(Boolean).join(" ") ?? null
          }
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
var approveProject = async (req, res, next) => {
  try {
    const done = await prisma_default.freelanceProject.updateMany({
      where: { id: req.params.id, status: "PENDING" },
      data: { status: "OPEN", publishedAt: /* @__PURE__ */ new Date() }
    });
    if (done.count === 0) {
      return next(new AppError("Ce projet n'est pas en attente de validation.", 409));
    }
    await prisma_default.moderationRecord.create({
      data: {
        entityType: "project",
        entityId: req.params.id,
        state: "APPROVED",
        moderatorId: req.user.id
      }
    });
    res.json({ success: true, data: { id: req.params.id, status: "OPEN" } });
  } catch (err) {
    next(err);
  }
};
var rejectProject = async (req, res, next) => {
  try {
    const reason = String(req.body.reason ?? "").trim();
    if (!reason) {
      return next(new AppError("Un motif est obligatoire pour refuser un projet.", 400));
    }
    const done = await prisma_default.freelanceProject.updateMany({
      where: { id: req.params.id, status: "PENDING" },
      data: { status: "REJECTED", rejectionReason: reason }
    });
    if (done.count === 0) {
      return next(new AppError("Ce projet n'est pas en attente de validation.", 409));
    }
    await prisma_default.moderationRecord.create({
      data: {
        entityType: "project",
        entityId: req.params.id,
        state: "REJECTED",
        reason,
        moderatorId: req.user.id
      }
    });
    res.json({ success: true, data: { id: req.params.id, status: "REJECTED" } });
  } catch (err) {
    next(err);
  }
};
var listFlaggedMessages = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = 25;
    const [total, messages] = await Promise.all([
      prisma_default.message.count({ where: { flagged: true } }),
      prisma_default.message.findMany({
        where: { flagged: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          body: true,
          flagReason: true,
          createdAt: true,
          conversationId: true,
          sender: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              freelancerProfile: { select: { username: true, displayName: true } }
            }
          },
          conversation: {
            select: {
              order: { select: { id: true, reference: true } },
              participants: {
                select: {
                  user: { select: { id: true, email: true, firstName: true, lastName: true } }
                }
              }
            }
          }
        }
      })
    ]);
    const withContext = await Promise.all(
      messages.map(async (m) => ({
        ...m,
        context: await prisma_default.message.findMany({
          where: { conversationId: m.conversationId, createdAt: { lte: m.createdAt } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, body: true, senderId: true, createdAt: true }
        })
      }))
    );
    res.json({ success: true, data: { messages: withContext, total, page, perPage } });
  } catch (err) {
    next(err);
  }
};
var clearMessageFlag = async (req, res, next) => {
  try {
    const message = await prisma_default.message.findUnique({
      where: { id: req.params.id },
      select: { id: true, flagged: true }
    });
    if (!message) return next(new AppError("Message introuvable.", 404));
    const updated = await prisma_default.message.update({
      where: { id: message.id },
      data: { flagged: false },
      select: { id: true, flagged: true }
    });
    await prisma_default.auditLog.create({
      data: {
        userId: req.user?.id,
        action: "CLEAR_MESSAGE_FLAG",
        entity: "Message",
        entityId: message.id,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
      }
    });
    res.json({ success: true, data: { message: updated } });
  } catch (err) {
    next(err);
  }
};

// server/controllers/teamTask.controller.ts
init_prisma();
var mondayOf = (d) => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - offset);
  return copy;
};
var weekFrom = (raw) => {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = /* @__PURE__ */ new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return mondayOf(parsed);
  }
  return mondayOf(/* @__PURE__ */ new Date());
};
var asIsoDate = (d) => d.toISOString().slice(0, 10);
var getBoard = async (req, res, next) => {
  try {
    const weekStart = weekFrom(req.query.week);
    const [members, tasks] = await Promise.all([
      prisma_default.teamMember.findMany({
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true, active: true, position: true }
      }),
      prisma_default.teamTask.findMany({
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
          position: true
        }
      })
    ]);
    const byMember = /* @__PURE__ */ new Map();
    for (const t of tasks) {
      if (!byMember.has(t.memberId)) byMember.set(t.memberId, []);
      byMember.get(t.memberId).push(t);
    }
    const columns = members.filter((m) => m.active || byMember.has(m.id)).map((m) => {
      const own = byMember.get(m.id) ?? [];
      return {
        member: m,
        tasks: own.map((t) => ({
          ...t,
          dueDate: t.dueDate ? asIsoDate(t.dueDate) : null
        })),
        total: own.length,
        done: own.filter((t) => t.done).length
      };
    });
    res.json({
      success: true,
      data: {
        weekStart: asIsoDate(weekStart),
        columns,
        total: tasks.length,
        done: tasks.filter((t) => t.done).length
      }
    });
  } catch (err) {
    next(err);
  }
};
var listMembers = async (_req, res, next) => {
  try {
    const members = await prisma_default.teamMember.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        active: true,
        position: true,
        user: { select: { email: true } }
      }
    });
    res.json({ success: true, data: { members } });
  } catch (err) {
    next(err);
  }
};
var createMember = async (req, res, next) => {
  try {
    const { name: name2, role, userId } = req.body;
    const clean2 = String(name2 ?? "").trim();
    if (!clean2) return next(new AppError("Le nom est obligatoire.", 400));
    const count = await prisma_default.teamMember.count();
    const member = await prisma_default.teamMember.create({
      data: {
        name: clean2,
        role: role ? String(role).trim() : null,
        userId: userId ? String(userId) : null,
        position: count
      },
      select: { id: true, name: true, role: true, active: true, position: true }
    });
    res.status(201).json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
};
var updateMember = async (req, res, next) => {
  try {
    const { name: name2, role, active, position } = req.body;
    if (name2 !== void 0 && !String(name2).trim()) {
      return next(new AppError("Le nom ne peut pas \xEAtre vide.", 400));
    }
    const member = await prisma_default.teamMember.update({
      where: { id: req.params.id },
      data: {
        ...name2 !== void 0 ? { name: String(name2).trim() } : {},
        ...role !== void 0 ? { role: role ? String(role).trim() : null } : {},
        ...active !== void 0 ? { active: Boolean(active) } : {},
        ...position !== void 0 ? { position: Number(position) } : {}
      },
      select: { id: true, name: true, role: true, active: true, position: true }
    });
    res.json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
};
var deleteMember = async (req, res, next) => {
  try {
    const tasks = await prisma_default.teamTask.count({ where: { memberId: req.params.id } });
    if (tasks > 0) {
      return next(
        new AppError(
          `Ce membre a ${tasks} t\xE2che(s) enregistr\xE9e(s). D\xE9sactivez-le plut\xF4t que de le supprimer.`,
          409
        )
      );
    }
    await prisma_default.teamMember.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
};
var createTask = async (req, res, next) => {
  try {
    const { memberId, title, note, week } = req.body;
    const clean2 = String(title ?? "").trim();
    if (!clean2) return next(new AppError("La t\xE2che ne peut pas \xEAtre vide.", 400));
    if (!memberId) return next(new AppError("Choisissez un membre.", 400));
    const member = await prisma_default.teamMember.findUnique({
      where: { id: String(memberId) },
      select: { id: true }
    });
    if (!member) return next(new AppError("Membre introuvable.", 404));
    const weekStart = weekFrom(week);
    const count = await prisma_default.teamTask.count({ where: { memberId: member.id, weekStart } });
    const task = await prisma_default.teamTask.create({
      data: {
        memberId: member.id,
        title: clean2,
        note: note ? String(note).trim() : null,
        weekStart,
        position: count,
        createdById: req.user.id
      },
      select: {
        id: true,
        memberId: true,
        title: true,
        note: true,
        done: true,
        doneAt: true,
        position: true
      }
    });
    res.status(201).json({ success: true, data: { task, weekStart: asIsoDate(weekStart) } });
  } catch (err) {
    next(err);
  }
};
var getTask = async (req, res, next) => {
  try {
    const task = await prisma_default.teamTask.findUnique({
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
        createdBy: { select: { firstName: true, lastName: true, email: true } }
      }
    });
    if (!task) return next(new AppError("T\xE2che introuvable.", 404));
    res.json({
      success: true,
      data: {
        task: {
          ...task,
          weekStart: asIsoDate(task.weekStart),
          dueDate: task.dueDate ? asIsoDate(task.dueDate) : null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
var PRIORITIES = ["LOW", "NORMAL", "HIGH"];
var updateTask = async (req, res, next) => {
  try {
    const { title, note, done, memberId, position, priority, dueDate } = req.body;
    if (title !== void 0 && !String(title).trim()) {
      return next(new AppError("La t\xE2che ne peut pas \xEAtre vide.", 400));
    }
    if (priority !== void 0 && !PRIORITIES.includes(priority)) {
      return next(new AppError("Priorit\xE9 inconnue.", 400));
    }
    let due;
    if (dueDate !== void 0) {
      if (!dueDate) due = null;
      else if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        due = /* @__PURE__ */ new Date(`${dueDate}T00:00:00Z`);
      } else {
        return next(new AppError("Date d'\xE9ch\xE9ance invalide.", 400));
      }
    }
    const task = await prisma_default.teamTask.update({
      where: { id: req.params.id },
      data: {
        ...title !== void 0 ? { title: String(title).trim() } : {},
        ...note !== void 0 ? { note: note ? String(note).trim() : null } : {},
        ...memberId !== void 0 ? { memberId: String(memberId) } : {},
        ...position !== void 0 ? { position: Number(position) } : {},
        ...priority !== void 0 ? { priority } : {},
        ...due !== void 0 ? { dueDate: due } : {},
        ...done !== void 0 ? { done: Boolean(done), doneAt: done ? /* @__PURE__ */ new Date() : null } : {}
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
        position: true
      }
    });
    res.json({
      success: true,
      data: { task: { ...task, dueDate: task.dueDate ? asIsoDate(task.dueDate) : null } }
    });
  } catch (err) {
    next(err);
  }
};
var deleteTask = async (req, res, next) => {
  try {
    await prisma_default.teamTask.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) {
    next(err);
  }
};
var carryOver = async (req, res, next) => {
  try {
    const from = weekFrom(req.body.week);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 7);
    const pending = await prisma_default.teamTask.findMany({
      where: { weekStart: from, done: false },
      select: { memberId: true, title: true, note: true, position: true }
    });
    if (pending.length === 0) {
      return res.json({ success: true, data: { copied: 0, weekStart: asIsoDate(to) } });
    }
    const existing = await prisma_default.teamTask.findMany({
      where: { weekStart: to },
      select: { memberId: true, title: true }
    });
    const seen = new Set(existing.map((t) => `${t.memberId}::${t.title}`));
    const fresh = pending.filter((t) => !seen.has(`${t.memberId}::${t.title}`));
    if (fresh.length > 0) {
      await prisma_default.teamTask.createMany({
        data: fresh.map((t) => ({
          memberId: t.memberId,
          title: t.title,
          note: t.note,
          weekStart: to,
          position: t.position,
          createdById: req.user.id
        }))
      });
    }
    res.json({ success: true, data: { copied: fresh.length, weekStart: asIsoDate(to) } });
  } catch (err) {
    next(err);
  }
};

// server/services/preselectionByOffer.service.ts
init_prisma();
var MAX_SKILLS = 12;
var APPLICATION_SELECT = {
  id: true,
  status: true,
  preselectionStatus: true,
  isPreselected: true,
  preselectionScore: true,
  preselectionComment: true,
  aiScore: true,
  quizScore: true,
  oralPresentationScore: true,
  finalScore: true,
  coverLetter: true,
  appliedAt: true,
  updatedAt: true,
  cv: { select: { url: true, fileName: true } },
  // Why the score is what it is. A number with no reason behind it is not
  // something a recruiter can act on or defend.
  aianalysis: {
    select: { strengths: true, weaknesses: true, recommendations: true, overallScore: true }
  },
  candidate: {
    select: {
      id: true,
      headline: true,
      bio: true,
      currentJobTitle: true,
      city: true,
      wilaya: true,
      skills: true,
      yearsExperience: true,
      availableImmediately: true,
      desiredSalary: true,
      linkedinUrl: true,
      githubUrl: true,
      portfolioUrl: true,
      resumeId: true,
      cvBuilderData: true,
      user: {
        // Selected, never `user: true`. That returns every column including
        // the bcrypt hash, which is exactly what the recruiter list elsewhere
        // in this feature was doing.
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: { select: { url: true } }
        }
      },
      oralPresentation: { select: { videoId: true } }
    }
  }
};
var cvHighlights = (data) => {
  if (!data || typeof data !== "object") return { lastRole: null, education: null, languages: [] };
  const d = data;
  const first = (key) => Array.isArray(d[key]) ? d[key][0] : null;
  const experience = first("experiences");
  const education = first("education");
  const text = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
  const join = (parts) => {
    const kept = parts.filter(Boolean);
    return kept.length ? kept.join(" \xB7 ") : null;
  };
  return {
    lastRole: experience ? join([text(experience.title) ?? text(experience.position), text(experience.company)]) : null,
    education: education ? join([text(education.degree) ?? text(education.title), text(education.school)]) : null,
    languages: Array.isArray(d.languages) ? d.languages.map(
      (l) => typeof l === "string" ? l : text(l?.name)
    ).filter((l) => Boolean(l)).slice(0, 6) : []
  };
};
var builderFilled = (data) => !!data && typeof data === "object" && Object.values(data).some(
  (v) => Array.isArray(v) ? v.length > 0 : v !== null && v !== void 0 && v !== ""
);
var shape2 = (a) => {
  const c = a.candidate;
  const highlights = cvHighlights(c.cvBuilderData);
  return {
    applicationId: a.id,
    candidateId: c.id,
    fullName: `${c.user.firstName ?? ""} ${c.user.lastName ?? ""}`.trim() || c.user.email,
    email: c.user.email,
    phone: c.user.phone ?? "",
    avatarUrl: c.user.avatar?.url ?? null,
    position: c.currentJobTitle || c.headline || "",
    headline: c.headline ?? null,
    summary: c.bio ?? null,
    location: c.city ?? c.wilaya ?? "",
    wilaya: c.wilaya ?? null,
    experience: c.yearsExperience ?? 0,
    // Capped: a candidate who listed forty skills would push everyone else
    // off the screen, and the rest are on their profile.
    skills: (c.skills ?? []).slice(0, MAX_SKILLS),
    skillsTotal: (c.skills ?? []).length,
    availableNow: c.availableImmediately,
    desiredSalary: c.desiredSalary ?? null,
    lastRole: highlights.lastRole,
    education: highlights.education,
    languages: highlights.languages,
    links: {
      linkedin: c.linkedinUrl ?? null,
      github: c.githubUrl ?? null,
      portfolio: c.portfolioUrl ?? null
    },
    cvUrl: a.cv?.url ?? null,
    hasCv: Boolean(c.resumeId) || builderFilled(c.cvBuilderData),
    hasPresentation: Boolean(c.oralPresentation?.videoId),
    coverLetter: a.coverLetter ?? null,
    aiScore: Math.round(a.aiScore ?? 0),
    quizScore: a.quizScore != null ? Math.round(a.quizScore) : null,
    oralPresentationScore: a.oralPresentationScore != null ? Math.round(a.oralPresentationScore) : null,
    finalScore: a.finalScore != null ? Math.round(a.finalScore) : null,
    preselectionScore: a.preselectionScore != null ? Math.round(a.preselectionScore) : null,
    strengths: a.aianalysis?.strengths ?? [],
    weaknesses: a.aianalysis?.weaknesses ?? [],
    recommendations: a.aianalysis?.recommendations ?? [],
    status: a.status,
    preselectionStatus: a.preselectionStatus,
    isPreselected: a.isPreselected,
    preselectionComment: a.preselectionComment ?? null,
    appliedAt: a.appliedAt,
    updatedAt: a.updatedAt
  };
};
var countOf = (rows) => {
  const by = (s) => rows.filter((r) => r.status === s).length;
  const scored = rows.filter((r) => r.aiScore > 0);
  return {
    total: rows.length,
    preselected: rows.filter((r) => r.isPreselected).length,
    pending: by("PENDING") + by("REVIEWING"),
    shortlisted: by("SHORTLISTED"),
    interview: by("INTERVIEW"),
    hired: by("HIRED"),
    rejected: by("REJECTED"),
    withCv: rows.filter((r) => r.hasCv).length,
    // Averaged over the scored ones only: counting an unscored application as
    // zero would make the average say the shortlist is weak when it is simply
    // not analysed yet.
    averageScore: scored.length ? Math.round(scored.reduce((sum, r) => sum + r.aiScore, 0) / scored.length) : null
  };
};
var listByOffer = async (params) => {
  const recruiter = await prisma_default.user.findUnique({
    where: { id: params.recruiterUserId },
    select: { recruiterProfile: { select: { id: true } } }
  });
  if (!recruiter?.recruiterProfile) return null;
  const term = params.q?.trim();
  const applications = await prisma_default.application.findMany({
    where: {
      recruiterId: recruiter.recruiterProfile.id,
      ...params.jobId ? { jobId: params.jobId } : {},
      ...params.status ? { status: params.status } : {},
      ...params.preselectedOnly ? { isPreselected: true } : {},
      // A closed account is not a candidate to call.
      candidate: { user: { deletedAt: null, status: { not: "DELETED" } } },
      ...term ? {
        OR: [
          { candidate: { user: { firstName: { contains: term, mode: "insensitive" } } } },
          { candidate: { user: { lastName: { contains: term, mode: "insensitive" } } } },
          { candidate: { currentJobTitle: { contains: term, mode: "insensitive" } } },
          { candidate: { headline: { contains: term, mode: "insensitive" } } },
          { candidate: { skills: { has: term } } }
        ]
      } : {}
    },
    select: { ...APPLICATION_SELECT, jobId: true },
    /* Nulls last, explicitly.
     *
     * Postgres puts NULLs first in a DESC sort, so an application nobody has
     * analysed yet led the offer — above the best-scoring candidate. The
     * unscored ones belong at the bottom, newest first, which is also the
     * order in which they are worth looking at by hand. */
    orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { appliedAt: "desc" }]
  });
  const jobs = await prisma_default.job.findMany({
    where: {
      recruiterId: recruiter.recruiterProfile.id,
      ...params.jobId ? { id: params.jobId } : {}
    },
    select: {
      id: true,
      title: true,
      location: true,
      wilaya: true,
      type: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      expiresAt: true,
      category: { select: { name: true } }
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }]
  });
  const byJob = /* @__PURE__ */ new Map();
  for (const a of applications) {
    const list = byJob.get(a.jobId) ?? [];
    list.push(shape2(a));
    byJob.set(a.jobId, list);
  }
  const offers = jobs.map((job) => {
    const candidates = byJob.get(job.id) ?? [];
    return {
      id: job.id,
      title: job.title,
      location: job.location,
      wilaya: job.wilaya,
      type: job.type,
      status: job.status,
      sector: job.category?.name ?? null,
      publishedAt: job.publishedAt,
      // Said per offer rather than worked out from a date in the UI: an
      // expired offer still collecting applications is worth noticing.
      expired: Boolean(job.expiresAt && job.expiresAt.getTime() < Date.now()),
      counts: countOf(candidates),
      candidates
    };
  });
  offers.sort((a, b) => b.counts.total - a.counts.total);
  const everyCandidate = offers.flatMap((o) => o.candidates);
  return {
    offers,
    totals: {
      offers: offers.length,
      offersWithCandidates: offers.filter((o) => o.counts.total > 0).length,
      candidates: everyCandidate.length,
      preselected: everyCandidate.filter((c) => c.isPreselected).length,
      ...(() => {
        const all = countOf(everyCandidate);
        return {
          pending: all.pending,
          shortlisted: all.shortlisted,
          interview: all.interview,
          hired: all.hired,
          rejected: all.rejected,
          averageScore: all.averageScore
        };
      })()
    }
  };
};
var listCorporatePendingByOffer = async () => {
  const applications = await prisma_default.application.findMany({
    where: {
      preselectionStatus: "PENDING",
      job: { company: { plan: "CORPORATE" } },
      candidate: { user: { deletedAt: null, status: { not: "DELETED" } } }
    },
    select: { ...APPLICATION_SELECT, jobId: true },
    // Nulls last, or an unanalysed application leads its offer. See listByOffer.
    orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { appliedAt: "asc" }]
  });
  if (!applications.length) {
    return { offers: [], totals: { offers: 0, candidates: 0, companies: 0 } };
  }
  const jobs = await prisma_default.job.findMany({
    where: { id: { in: [...new Set(applications.map((a) => a.jobId))] } },
    select: {
      id: true,
      title: true,
      location: true,
      wilaya: true,
      type: true,
      status: true,
      publishedAt: true,
      expiresAt: true,
      category: { select: { name: true } },
      company: { select: { name: true } }
    }
  });
  const byJob = /* @__PURE__ */ new Map();
  for (const a of applications) {
    const list = byJob.get(a.jobId) ?? [];
    list.push(shape2(a));
    byJob.set(a.jobId, list);
  }
  const offers = jobs.map((job) => {
    const candidates = byJob.get(job.id) ?? [];
    return {
      id: job.id,
      title: job.title,
      company: job.company?.name ?? null,
      location: job.location,
      wilaya: job.wilaya,
      type: job.type,
      status: job.status,
      sector: job.category?.name ?? null,
      publishedAt: job.publishedAt,
      expired: Boolean(job.expiresAt && job.expiresAt.getTime() < Date.now()),
      counts: countOf(candidates),
      candidates
    };
  }).filter((o) => o.counts.total > 0).sort((a, b) => b.counts.total - a.counts.total);
  return {
    offers,
    totals: {
      offers: offers.length,
      candidates: applications.length,
      companies: new Set(jobs.map((j) => j.company?.name).filter(Boolean)).size
    }
  };
};

// server/controllers/preselection.controller.ts
var getMyPreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.getMyPreselection(
      req.params.applicationId,
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var getPreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.getPreselection(
      req.params.applicationId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var shortlistCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.shortlistCandidate(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Candidate shortlisted successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var rejectCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.rejectCandidate(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Candidate rejected successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var reviewCandidate = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.reviewCandidate(
      req.params.applicationId,
      req.user.id,
      {
        status: req.body.status,
        recruiterScore: req.body.recruiterScore,
        comment: req.body.comment
      }
    );
    res.status(200).json({
      status: "success",
      message: "Candidate reviewed successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var updateComment = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.updateComment(
      req.params.applicationId,
      req.user.id,
      req.body.comment
    );
    res.status(200).json({
      status: "success",
      message: "Comment updated successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterPreselections = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status ? req.query.status : void 0;
    const result = await preselection_service_default.getRecruiterPreselections(
      req.user.id,
      page,
      limit,
      status
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics = async (req, res, next) => {
  try {
    const statistics = await preselection_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var getRanking = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const ranking = await preselection_service_default.getRanking(
      req.user.id,
      limit
    );
    res.status(200).json({
      status: "success",
      data: ranking
    });
  } catch (err) {
    next(err);
  }
};
var getAllPreselections = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await preselection_service_default.getAllPreselections(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics = async (req, res, next) => {
  try {
    const statistics = await preselection_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var recalculatePreselection = async (req, res, next) => {
  try {
    const preselection = await preselection_service_default.recalculate(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      message: "Preselection recalculated successfully.",
      data: preselection
    });
  } catch (err) {
    next(err);
  }
};
var deletePreselection = async (req, res, next) => {
  try {
    const result = await preselection_service_default.deletePreselection(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getPreselectionByOffer = async (req, res, next) => {
  try {
    const str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
    const result = await listByOffer({
      recruiterUserId: req.user.id,
      jobId: str(req.query.jobId),
      status: str(req.query.status),
      q: str(req.query.q),
      preselectedOnly: req.query.preselectedOnly === "true" ? true : void 0
    });
    if (!result) {
      return next(new AppError("Profil recruteur introuvable.", 404));
    }
    res.status(200).json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
};
var getCorporatePendingByOffer = async (req, res, next) => {
  try {
    res.status(200).json({ status: "success", data: await listCorporatePendingByOffer() });
  } catch (err) {
    next(err);
  }
};
var preselection_controller_default = {
  getCorporatePendingByOffer,
  getMyPreselection,
  getPreselection,
  getPreselectionByOffer,
  shortlistCandidate,
  rejectCandidate,
  reviewCandidate,
  updateComment,
  getRecruiterPreselections,
  getRecruiterStatistics,
  getRanking,
  getAllPreselections,
  getAdminStatistics,
  recalculatePreselection,
  deletePreselection
};

// server/middleware/adminScope.middleware.ts
var requireAdminScope = (scope2) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError("Not authorized to access this route", 401));
      }
      const account = await readAdminAccess(req.user.id);
      if (!account || account.role !== "ADMIN" || account.status === "SUSPENDED" || account.status === "DELETED" || account.deletedAt) {
        return next(new AppError("You do not have permission to perform this action", 403));
      }
      if (!canUseScope(account, scope2)) {
        return next(
          new AppError(
            `Acc\xE8s limit\xE9 : \xAB ${SCOPE_LABELS[scope2].label} \xBB ne fait pas partie de vos autorisations.`,
            403
          )
        );
      }
      req.adminAccess = {
        isSuperAdmin: account.isSuperAdmin,
        scopes: account.adminScopes
      };
      next();
    } catch (err) {
      next(err);
    }
  };
};
var requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Not authorized to access this route", 401));
    }
    const account = await readAdminAccess(req.user.id);
    if (!account || account.role !== "ADMIN" || !account.isSuperAdmin || account.status === "SUSPENDED" || account.status === "DELETED" || account.deletedAt) {
      return next(
        new AppError("R\xE9serv\xE9 \xE0 un administrateur sans restriction.", 403)
      );
    }
    req.adminAccess = { isSuperAdmin: true, scopes: [] };
    next();
  } catch (err) {
    next(err);
  }
};

// server/routes/admin.routes.ts
var router7 = Router7();
router7.use(protect);
router7.use(restrictTo("ADMIN"));
var scope = requireAdminScope;
router7.get("/stats", scope("overview"), getStats);
router7.get("/companies", scope("plans"), getAllCompanies);
router7.get("/companies/:id", scope("plans"), getCompany);
router7.patch("/companies/:id/plan", scope("plans"), updateCompanyPlan);
router7.patch("/companies/:id/postings", scope("plans"), grantCompanyPostings);
router7.get("/users", scope("users"), getAllUsers);
router7.patch("/users/:id/status", scope("users"), updateUserStatus);
router7.get("/users/:id", scope("users"), getUserDetail);
router7.patch("/users/:id", scope("users"), updateUser);
router7.post("/users/:id/send-verification", scope("users"), sendVerificationLink);
router7.delete("/users/:id", scope("users"), deleteUser);
router7.get("/payments", scope("payments"), getPayments);
router7.get("/access", requireSuperAdmin, listAdminAccess);
router7.get("/access/scopes", requireSuperAdmin, listAdminScopes);
router7.patch("/access/:id", requireSuperAdmin, updateAdminAccess);
router7.patch("/access/:id/password", requireSuperAdmin, resetAdminPassword);
router7.get("/jobs", scope("jobs"), getAllJobsAdmin);
router7.get("/jobs/:id/applications", scope("jobs"), getJobApplicationsAdmin);
router7.patch("/jobs/:id", scope("jobs"), updateJobAdmin);
router7.delete("/jobs/:id", scope("jobs"), deleteJobAdmin);
router7.get("/schedules", scope("schedules"), listSchedules);
router7.post("/schedules", scope("schedules"), createSchedule);
router7.patch("/schedules/:id", scope("schedules"), updateSchedule);
router7.delete("/schedules/:id", scope("schedules"), deleteSchedule);
router7.post("/emails/send", scope("emails"), sendBroadcast);
router7.post("/emails/preview", scope("emails"), sendBroadcastPreview);
router7.get("/freelance/moderation", scope("freelance_moderation"), listQueue);
router7.get("/freelance/moderation/stats", scope("freelance_moderation"), getQueueStats);
router7.get("/freelance/moderation/history", scope("freelance_moderation"), listHistory);
router7.post("/freelance/moderation/services/:id/approve", scope("freelance_moderation"), approveService);
router7.post("/freelance/moderation/services/:id/reject", scope("freelance_moderation"), rejectService);
router7.get("/freelance/moderation/projects", scope("freelance_moderation"), listProjectQueue);
router7.post("/freelance/moderation/projects/:id/approve", scope("freelance_moderation"), approveProject);
router7.post("/freelance/moderation/projects/:id/reject", scope("freelance_moderation"), rejectProject);
router7.get("/freelance/moderation/messages", scope("freelance_moderation"), listFlaggedMessages);
router7.post("/freelance/moderation/messages/:id/clear", scope("freelance_moderation"), clearMessageFlag);
router7.get("/team/board", scope("team_tasks"), getBoard);
router7.post("/team/carry-over", scope("team_tasks"), carryOver);
router7.get("/team/members", scope("team_tasks"), listMembers);
router7.post("/team/members", scope("team_tasks"), createMember);
router7.patch("/team/members/:id", scope("team_tasks"), updateMember);
router7.delete("/team/members/:id", scope("team_tasks"), deleteMember);
router7.post("/team/tasks", scope("team_tasks"), createTask);
router7.get("/team/tasks/:id", scope("team_tasks"), getTask);
router7.patch("/team/tasks/:id", scope("team_tasks"), updateTask);
router7.delete("/team/tasks/:id", scope("team_tasks"), deleteTask);
router7.get("/freelance/payments/pending", scope("freelance_moderation"), listPendingReceipts);
router7.post("/freelance/payments/:id/approve", scope("freelance_moderation"), approveReceipt);
router7.post("/freelance/payments/:id/reject", scope("freelance_moderation"), rejectReceipt);
router7.get("/preselections/corporate-pending", scope("preselection"), getCorporatePendingPreselections);
router7.get("/preselections/corporate-pending/by-offer", scope("preselection"), getCorporatePendingByOffer);
router7.post("/preselections/:applicationId", scope("preselection"), adminPreselect);
var admin_routes_default = router7;

// server/routes/crm.routes.ts
import { Router as Router8 } from "express";

// server/controllers/crm.controller.ts
init_prisma();
import { LeadStatus, LeadSource, Role } from "@prisma/client";
var LEAD_STATUSES = Object.values(LeadStatus);
var LEAD_SOURCES = Object.values(LeadSource);
var STAFF_SELECT = {
  select: { id: true, email: true, firstName: true, lastName: true }
};
var leadInclude = {
  owner: STAFF_SELECT,
  convertedUser: STAFF_SELECT,
  crmNotes: {
    orderBy: { createdAt: "desc" },
    include: { author: STAFF_SELECT }
  }
};
var listLeads = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const where = {};
    if (status && LEAD_STATUSES.includes(status)) {
      where.status = status;
    }
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { companyName: { contains: term, mode: "insensitive" } },
        { contactName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } }
      ];
    }
    const [leads, byStatus] = await Promise.all([
      prisma_default.lead.findMany({
        where,
        include: leadInclude,
        orderBy: [{ updatedAt: "desc" }],
        take: 200
      }),
      prisma_default.lead.groupBy({ by: ["status"], _count: true })
    ]);
    const pipeline = LEAD_STATUSES.map((s) => ({
      status: s,
      count: byStatus.find((b) => b.status === s)?._count ?? 0
    }));
    res.status(200).json({ status: "success", data: { leads, pipeline } });
  } catch (err) {
    next(err);
  }
};
var createLead = async (req, res, next) => {
  try {
    const { companyName, contactName, email, phone: phone2, status, source, notes, nextActionAt } = req.body;
    if (!companyName?.trim()) {
      return next(new AppError("A company name is required.", 400));
    }
    const lead = await prisma_default.lead.create({
      data: {
        companyName: companyName.trim(),
        contactName: contactName?.trim() || null,
        email: email?.trim() || null,
        phone: phone2?.trim() || null,
        status: LEAD_STATUSES.includes(status) ? status : void 0,
        source: LEAD_SOURCES.includes(source) ? source : void 0,
        notes: notes?.trim() || null,
        nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
        // Whoever creates it owns it until reassigned.
        ownerId: req.user.id
      },
      include: leadInclude
    });
    res.status(201).json({ status: "success", data: { lead } });
  } catch (err) {
    next(err);
  }
};
var updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const existing = await prisma_default.lead.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Lead not found.", 404));
    const data = {};
    if (body.companyName !== void 0) {
      if (!body.companyName?.trim()) return next(new AppError("A company name is required.", 400));
      data.companyName = body.companyName.trim();
    }
    if (body.contactName !== void 0) data.contactName = body.contactName?.trim() || null;
    if (body.email !== void 0) data.email = body.email?.trim() || null;
    if (body.phone !== void 0) data.phone = body.phone?.trim() || null;
    if (body.notes !== void 0) data.notes = body.notes?.trim() || null;
    if (body.nextActionAt !== void 0) {
      data.nextActionAt = body.nextActionAt ? new Date(body.nextActionAt) : null;
    }
    if (body.status !== void 0) {
      if (!LEAD_STATUSES.includes(body.status)) {
        return next(new AppError("Unknown lead status.", 400));
      }
      data.status = body.status;
    }
    if (body.source !== void 0) {
      if (!LEAD_SOURCES.includes(body.source)) {
        return next(new AppError("Unknown lead source.", 400));
      }
      data.source = body.source;
    }
    if (body.ownerId !== void 0) {
      data.owner = body.ownerId ? { connect: { id: body.ownerId } } : { disconnect: true };
    }
    const lead = await prisma_default.lead.update({ where: { id }, data, include: leadInclude });
    res.status(200).json({ status: "success", data: { lead } });
  } catch (err) {
    next(err);
  }
};
var deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma_default.lead.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Lead not found.", 404));
    await prisma_default.lead.delete({ where: { id } });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};
var convertLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return next(new AppError("A user id is required.", 400));
    const [lead, user] = await Promise.all([
      prisma_default.lead.findUnique({ where: { id } }),
      prisma_default.user.findUnique({ where: { id: userId } })
    ]);
    if (!lead) return next(new AppError("Lead not found.", 404));
    if (!user) return next(new AppError("User not found.", 404));
    const updated = await prisma_default.lead.update({
      where: { id },
      data: {
        convertedUserId: user.id,
        convertedAt: /* @__PURE__ */ new Date(),
        status: LeadStatus.WON
      },
      include: leadInclude
    });
    res.status(200).json({ status: "success", data: { lead: updated } });
  } catch (err) {
    next(err);
  }
};
var addNote = async (req, res, next) => {
  try {
    const { body, leadId, subjectId } = req.body;
    if (!body?.trim()) return next(new AppError("A note cannot be empty.", 400));
    if (Boolean(leadId) === Boolean(subjectId)) {
      return next(new AppError("Attach the note to either a lead or a person.", 400));
    }
    if (leadId && !await prisma_default.lead.findUnique({ where: { id: leadId } })) {
      return next(new AppError("Lead not found.", 404));
    }
    if (subjectId && !await prisma_default.user.findUnique({ where: { id: subjectId } })) {
      return next(new AppError("User not found.", 404));
    }
    const note = await prisma_default.crmNote.create({
      data: {
        body: body.trim(),
        authorId: req.user.id,
        leadId: leadId ?? null,
        subjectId: subjectId ?? null
      },
      include: { author: STAFF_SELECT }
    });
    res.status(201).json({ status: "success", data: { note } });
  } catch (err) {
    next(err);
  }
};
var deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await prisma_default.crmNote.findUnique({ where: { id } });
    if (!note) return next(new AppError("Note not found.", 404));
    await prisma_default.crmNote.delete({ where: { id } });
    res.status(200).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};
var listContacts = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const wanted = role === "RECRUITER" || role === "CANDIDATE" ? role : void 0;
    const where = {
      role: wanted ?? { in: [Role.RECRUITER, Role.CANDIDATE] },
      deletedAt: null
    };
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: "insensitive" } },
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } }
      ];
    }
    const users = await prisma_default.user.findMany({
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
          select: { id: true, currentJobTitle: true, city: true, wilaya: true, resumeId: true }
        },
        recruiterProfile: {
          select: {
            id: true,
            companies: {
              select: { company: { select: { id: true, name: true, plan: true } } }
            }
          }
        },
        crmNotesAbout: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { author: STAFF_SELECT }
        },
        _count: { select: { crmNotesAbout: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    res.status(200).json({ status: "success", data: { contacts: users } });
  } catch (err) {
    next(err);
  }
};

// server/routes/crm.routes.ts
var router8 = Router8();
router8.use(protect);
router8.use(restrictTo("ADMIN"));
router8.get("/leads", listLeads);
router8.post("/leads", createLead);
router8.patch("/leads/:id", updateLead);
router8.delete("/leads/:id", deleteLead);
router8.post("/leads/:id/convert", convertLead);
router8.post("/notes", addNote);
router8.delete("/notes/:id", deleteNote);
router8.get("/contacts", listContacts);
var crm_routes_default = router8;

// server/routes/company.routes.ts
import { Router as Router9 } from "express";

// server/controllers/company.controller.ts
init_prisma();
var companySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  website: true,
  industry: true,
  size: true,
  foundedYear: true,
  country: true,
  city: true,
  address: true,
  plan: true,
  verified: true,
  postingCredits: true,
  logo: { select: { id: true, url: true } }
};
var resolveMembership = async (userId) => {
  const membership = await prisma_default.companyMember.findFirst({
    where: { recruiter: { userId } },
    orderBy: { createdAt: "asc" },
    include: { company: { select: companySelect } }
  });
  if (!membership) {
    throw new AppError("No company is attached to this account.", 404);
  }
  return membership;
};
var getMyCompany = async (req, res, next) => {
  try {
    const membership = await resolveMembership(req.user.id);
    const quota = await getPostingQuota(membership.companyId);
    res.status(200).json({
      status: "success",
      data: { company: membership.company, memberRole: membership.role, quota }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyCompany = async (req, res, next) => {
  try {
    const membership = await resolveMembership(req.user.id);
    if (membership.role !== "OWNER" && req.user.role !== "ADMIN") {
      return next(new AppError("Only the company owner can edit this profile.", 403));
    }
    const body = req.body;
    const data = {};
    const text = (value) => {
      const v = typeof value === "string" ? value.trim() : "";
      return v.length ? v : null;
    };
    if (body.name !== void 0) {
      const name2 = text(body.name);
      if (!name2) return next(new AppError("The company name is required.", 400));
      data.name = name2;
    }
    if (body.description !== void 0) data.description = text(body.description);
    if (body.industry !== void 0) data.industry = text(body.industry);
    if (body.size !== void 0) data.size = text(body.size);
    if (body.country !== void 0) data.country = text(body.country);
    if (body.city !== void 0) data.city = text(body.city);
    if (body.address !== void 0) data.address = text(body.address);
    if (body.website !== void 0) {
      const website = text(body.website);
      if (website && !/^https?:\/\/\S+\.\S+/.test(website)) {
        return next(new AppError("The website must be a full URL, starting with http:// or https://", 400));
      }
      data.website = website;
    }
    if (body.foundedYear !== void 0) {
      const year = Number(body.foundedYear);
      if (body.foundedYear === null || body.foundedYear === "") {
        data.foundedYear = null;
      } else if (!Number.isInteger(year) || year < 1800 || year > (/* @__PURE__ */ new Date()).getFullYear()) {
        return next(new AppError("Enter a valid founding year.", 400));
      } else {
        data.foundedYear = year;
      }
    }
    const company = await prisma_default.company.update({
      where: { id: membership.companyId },
      data,
      select: companySelect
    });
    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};
var updateMyCompanyLogo = async (req, res, next) => {
  let storedPath = null;
  try {
    const membership = await resolveMembership(req.user.id);
    if (membership.role !== "OWNER" && req.user.role !== "ADMIN") {
      return next(new AppError("Only the company owner can change the logo.", 403));
    }
    const image = validateAvatarUpload(req.file);
    const previousLogoId = membership.company.logo?.id ?? null;
    storedPath = await uploadObject({
      bucket: AVATAR_BUCKET,
      path: buildObjectPath(`company-${membership.companyId}`, image.extension),
      buffer: image.buffer,
      mimeType: image.mimeType
    });
    let company;
    try {
      company = await prisma_default.$transaction(async (tx) => {
        const asset = await tx.fileAsset.create({
          data: {
            url: getPublicUrl(AVATAR_BUCKET, storedPath),
            provider: "supabase",
            publicId: storedPath,
            fileName: image.fileName,
            mimeType: image.mimeType,
            extension: image.extension,
            size: image.size
          }
        });
        return tx.company.update({
          where: { id: membership.companyId },
          data: { logoId: asset.id },
          select: companySelect
        });
      });
    } catch (dbErr) {
      await removeObject(AVATAR_BUCKET, storedPath);
      throw dbErr;
    }
    if (previousLogoId && previousLogoId !== company.logo?.id) {
      const previous = await prisma_default.fileAsset.findUnique({ where: { id: previousLogoId } });
      if (previous?.provider === "supabase" && previous.publicId) {
        await removeObject(AVATAR_BUCKET, previous.publicId);
      } else if (previous?.provider === "cloudinary") {
        await destroyCloudinaryAsset(previous.publicId, "image");
      }
      await prisma_default.fileAsset.delete({ where: { id: previousLogoId } }).catch(() => null);
    }
    res.status(200).json({ status: "success", data: { company } });
  } catch (err) {
    next(err);
  }
};
var getMySubscription = async (req, res, next) => {
  try {
    const membership = await resolveMembership(req.user.id);
    const companyId = membership.companyId;
    const [company, quota, subscriptions, jobsByStatus, applications] = await Promise.all([
      prisma_default.company.findUnique({
        where: { id: companyId },
        select: { plan: true, postingCredits: true, verified: true, createdAt: true }
      }),
      getPostingQuota(companyId),
      prisma_default.subscription.findMany({
        where: { companyId },
        orderBy: { startsAt: "desc" },
        include: {
          payments: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              amount: true,
              currency: true,
              method: true,
              status: true,
              paidAt: true,
              createdAt: true
            }
          }
        }
      }),
      prisma_default.job.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { _all: true }
      }),
      prisma_default.application.count({ where: { job: { companyId } } })
    ]);
    if (!company) {
      return next(new AppError("No company is attached to this account.", 404));
    }
    const now = Date.now();
    const withEffectiveStatus = subscriptions.map((sub) => ({
      ...sub,
      // CANCELLED stays cancelled; only an ACTIVE row can have quietly lapsed.
      status: sub.status === "ACTIVE" && sub.endsAt.getTime() < now ? "EXPIRED" : sub.status
    }));
    const limitModel = company.plan === "CORPORATE" ? "annual" : company.plan === "PREMIUM" ? "offers" : "free";
    const current = limitModel === "annual" ? withEffectiveStatus.find(
      (sub) => sub.status === "ACTIVE" && sub.plan === company.plan
    ) ?? null : null;
    const daysRemaining = current ? Math.max(0, Math.ceil((current.endsAt.getTime() - now) / 864e5)) : null;
    res.status(200).json({
      status: "success",
      data: {
        plan: company.plan,
        limitModel,
        verified: company.verified,
        memberSince: company.createdAt,
        quota,
        current,
        daysRemaining,
        history: withEffectiveStatus,
        usage: {
          jobs: jobsByStatus.reduce(
            (acc, row) => {
              acc.total += row._count._all;
              acc.byStatus[row.status] = row._count._all;
              return acc;
            },
            { total: 0, byStatus: {} }
          ),
          applications
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/company.routes.ts
var router9 = Router9();
router9.use(protect);
router9.use(restrictTo("RECRUITER", "ADMIN"));
router9.get("/me", getMyCompany);
router9.get("/me/subscription", getMySubscription);
router9.patch("/me", updateMyCompany);
router9.patch("/me/logo", handleAvatarUpload, updateMyCompanyLogo);
var company_routes_default = router9;

// server/routes/payment.routes.ts
import { Router as Router10 } from "express";

// server/controllers/payment.controller.ts
init_prisma();

// server/constants/annoncePacks.ts
var ANNONCE_PACKS = [
  { id: "pack-1", jobs: 1, price: 5900 },
  { id: "pack-2", jobs: 2, price: 11e3 },
  { id: "pack-5", jobs: 5, price: 25e3 },
  { id: "pack-10", jobs: 10, price: 45e3 }
];
var requirePack = (packId) => {
  if (typeof packId !== "string") {
    throw new AppError("A pack must be chosen.", 400);
  }
  const pack = ANNONCE_PACKS.find((p) => p.id === packId);
  if (!pack) {
    throw new AppError("Unknown pack.", 400);
  }
  return pack;
};

// server/services/invoicePdf.service.ts
import { jsPDF } from "jspdf";
var NAVY = { r: 23, g: 62, b: 125 };
var ORANGE = { r: 246, g: 141, b: 88 };
var GREY = { r: 107, g: 118, b: 134 };
var money = (amount, currency) => `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`;
var date = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
var renderInvoicePdf = (data) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 56;
  const right = pageWidth - 56;
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, pageWidth, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Dar L'emploi", left, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Plateforme de recrutement - Algerie", left, 72);
  doc.text("darlemploi.dz", left, 88);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FACTURE", right, 52, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.invoiceNumber, right, 72, { align: "right" });
  doc.text(date(data.paidAt), right, 88, { align: "right" });
  let y = 160;
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.setFontSize(9);
  doc.text("FACTURE A", left, y);
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(data.companyName, left, y);
  if (data.buyerEmail) {
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(GREY.r, GREY.g, GREY.b);
    doc.text(data.buyerEmail, left, y);
  }
  y += 46;
  doc.setFillColor(245, 247, 250);
  doc.rect(left, y - 16, right - left, 28, "F");
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESIGNATION", left + 12, y + 2);
  doc.text("QTE", right - 150, y + 2, { align: "right" });
  doc.text("MONTANT", right - 12, y + 2, { align: "right" });
  y += 42;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Pack d'annonces (${data.packId})`, left + 12, y);
  doc.text(String(data.jobs), right - 150, y, { align: "right" });
  doc.text(money(data.amount, data.currency), right - 12, y, { align: "right" });
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  doc.text(
    `${data.jobs} annonce${data.jobs > 1 ? "s" : ""} creditee${data.jobs > 1 ? "s" : ""} sur le compte`,
    left + 12,
    y
  );
  y += 40;
  doc.setDrawColor(230, 233, 238);
  doc.line(left, y, right, y);
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  doc.text("TOTAL PAYE", right - 150, y, { align: "right" });
  doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b);
  doc.setFontSize(15);
  doc.text(money(data.amount, data.currency), right - 12, y, { align: "right" });
  y += 34;
  doc.setFillColor(232, 248, 240);
  doc.roundedRect(left, y - 16, 150, 26, 6, 6, "F");
  doc.setTextColor(16, 138, 91);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAIEMENT CONFIRME", left + 12, y + 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GREY.r, GREY.g, GREY.b);
  let fy = 720;
  doc.text(`Regle par Chargily Pay le ${date(data.paidAt)}.`, left, fy);
  if (data.checkoutId) {
    fy += 13;
    doc.text(`Reference de transaction : ${data.checkoutId}`, left, fy);
  }
  fy += 13;
  doc.text("Ce document est genere automatiquement et ne necessite pas de signature.", left, fy);
  return Buffer.from(doc.output("arraybuffer"));
};

// server/controllers/payment.controller.ts
var appUrl = () => (process.env.APP_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || "http://localhost:5173").replace(/\/$/, "");
var resolveMembership2 = async (userId) => {
  const membership = await prisma_default.companyMember.findFirst({
    where: { recruiter: { userId } },
    orderBy: { createdAt: "asc" },
    include: { company: { select: { id: true, name: true, plan: true } } }
  });
  if (!membership) {
    throw new AppError("No company is attached to this account.", 404);
  }
  return membership;
};
var listPacks = async (_req, res) => {
  res.status(200).json({
    status: "success",
    data: { packs: ANNONCE_PACKS, online: isChargilyConfigured() }
  });
};
var startPackCheckout = async (req, res, next) => {
  try {
    if (!isChargilyConfigured()) {
      return next(
        new AppError("Le paiement en ligne n'est pas encore activ\xE9. Contactez le support.", 503)
      );
    }
    const membership = await resolveMembership2(req.user.id);
    const pack = requirePack(req.body?.packId);
    const order = await prisma_default.packOrder.create({
      data: {
        companyId: membership.companyId,
        buyerId: req.user.id,
        packId: pack.id,
        jobs: pack.jobs,
        amount: pack.price,
        currency: "dzd",
        status: "PENDING"
      }
    });
    let checkout;
    try {
      checkout = await createCheckout({
        amount: pack.price,
        successUrl: `${appUrl()}/?payment=success&order=${order.id}`,
        failureUrl: `${appUrl()}/?payment=failed&order=${order.id}`,
        description: `${pack.jobs} annonce(s) \u2014 Dar L'emploi`,
        // Matched back on the webhook. The amount is not read from here.
        metadata: { orderId: order.id, companyId: membership.companyId, packId: pack.id }
      });
    } catch (err) {
      await prisma_default.packOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" }
      });
      throw err;
    }
    const updated = await prisma_default.packOrder.update({
      where: { id: order.id },
      data: { checkoutId: checkout.id, checkoutUrl: checkout.url }
    });
    res.status(201).json({
      status: "success",
      data: { orderId: updated.id, checkoutUrl: checkout.url }
    });
  } catch (err) {
    next(err);
  }
};
var nextInvoiceNumber = async () => {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma_default.packOrder.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true }
  });
  const seq = last?.invoiceNumber ? Number(last.invoiceNumber.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, "0")}`;
};
var chargilyWebhook = async (req, res) => {
  const raw = req.rawBody;
  if (!raw) {
    console.error("Chargily webhook: raw body missing \u2014 cannot verify signature.");
    return res.status(400).json({ message: "Cannot verify payload" });
  }
  const signature2 = req.header("signature") || req.header("x-signature") || void 0;
  if (!verifyWebhookSignature(raw, signature2)) {
    console.warn("Chargily webhook: bad signature, rejected.");
    return res.status(403).json({ message: "Invalid signature" });
  }
  const event = req.body;
  if (event?.type !== "checkout.paid") {
    return res.status(200).json({ received: true, ignored: event?.type ?? "unknown" });
  }
  const checkoutId = event.data?.id;
  if (!checkoutId) {
    return res.status(400).json({ message: "Missing checkout id" });
  }
  try {
    const order = await prisma_default.packOrder.findUnique({ where: { checkoutId } });
    if (!order) {
      console.error(`Chargily webhook: no order for checkout ${checkoutId}`);
      return res.status(200).json({ received: true, matched: false });
    }
    if (order.status === "PAID") {
      return res.status(200).json({ received: true, alreadyApplied: true });
    }
    const invoiceNumber = await nextInvoiceNumber();
    const claimed = await prisma_default.packOrder.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "PAID", paidAt: /* @__PURE__ */ new Date(), invoiceNumber }
    });
    if (claimed.count === 0) {
      return res.status(200).json({ received: true, alreadyApplied: true });
    }
    await prisma_default.company.updateMany({
      where: { id: order.companyId, plan: "FREE" },
      data: { plan: "PREMIUM" }
    });
    await grantPostings(order.companyId, order.jobs);
    console.log(
      `Chargily: order ${order.id} paid \u2014 ${order.jobs} annonce(s), ${order.amount} DZD, invoice ${invoiceNumber}`
    );
    res.status(200).json({ received: true, applied: true });
  } catch (err) {
    console.error("Chargily webhook processing failed:", err);
    res.status(500).json({ message: "Processing failed" });
  }
};
var listInvoices = async (req, res, next) => {
  try {
    const membership = await resolveMembership2(req.user.id);
    const invoices = await prisma_default.packOrder.findMany({
      where: { companyId: membership.companyId, status: "PAID" },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        packId: true,
        jobs: true,
        amount: true,
        currency: true,
        paidAt: true,
        checkoutId: true
      }
    });
    res.status(200).json({ status: "success", data: { invoices } });
  } catch (err) {
    next(err);
  }
};
var downloadInvoice = async (req, res, next) => {
  try {
    const membership = await resolveMembership2(req.user.id);
    const order = await prisma_default.packOrder.findFirst({
      where: { id: req.params.id, companyId: membership.companyId, status: "PAID" },
      include: {
        company: { select: { name: true } },
        buyer: { select: { email: true } }
      }
    });
    if (!order || !order.paidAt || !order.invoiceNumber) {
      return next(new AppError("Facture introuvable.", 404));
    }
    const pdf = renderInvoicePdf({
      invoiceNumber: order.invoiceNumber,
      paidAt: order.paidAt,
      companyName: order.company.name,
      buyerEmail: order.buyer?.email ?? null,
      packId: order.packId,
      jobs: order.jobs,
      amount: order.amount,
      currency: order.currency,
      checkoutId: order.checkoutId
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${order.invoiceNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
};
var getOrderStatus = async (req, res, next) => {
  try {
    const membership = await resolveMembership2(req.user.id);
    const order = await prisma_default.packOrder.findFirst({
      where: { id: req.params.id, companyId: membership.companyId },
      select: {
        id: true,
        status: true,
        jobs: true,
        amount: true,
        currency: true,
        invoiceNumber: true,
        paidAt: true
      }
    });
    if (!order) return next(new AppError("Commande introuvable.", 404));
    res.status(200).json({ status: "success", data: { order } });
  } catch (err) {
    next(err);
  }
};

// server/routes/payment.routes.ts
var router10 = Router10();
router10.post("/webhook/chargily", chargilyWebhook);
router10.get("/packs", listPacks);
router10.use(protect);
router10.use(restrictTo("RECRUITER", "ADMIN"));
router10.post("/checkout", startPackCheckout);
router10.get("/orders/:id", getOrderStatus);
router10.get("/invoices", listInvoices);
router10.get("/invoices/:id/pdf", downloadInvoice);
var payment_routes_default = router10;

// server/routes/preselection.routes.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  preselection_controller_default.getMyPreselection
);
router11.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getPreselection
);
router11.patch(
  "/application/:applicationId/review",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.reviewCandidate
);
router11.patch(
  "/application/:applicationId/shortlist",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.shortlistCandidate
);
router11.patch(
  "/application/:applicationId/reject",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.rejectCandidate
);
router11.patch(
  "/application/:applicationId/comment",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.updateComment
);
router11.get(
  "/recruiter/by-offer",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getPreselectionByOffer
);
router11.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRecruiterPreselections
);
router11.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRecruiterStatistics
);
router11.get(
  "/recruiter/ranking",
  protect,
  restrictTo("RECRUITER"),
  requireRecruiterTier("CORPORATE"),
  preselection_controller_default.getRanking
);
router11.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.getAllPreselections
);
router11.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.getAdminStatistics
);
router11.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.recalculatePreselection
);
router11.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  preselection_controller_default.deletePreselection
);
var preselection_routes_default = router11;

// server/routes/oralPresentation.routes.ts
import express from "express";

// server/controllers/oralPresentation.controller.ts
init_prisma();

// server/services/oralPresentation.service.ts
init_prisma();
import { OralPresentationStatus } from "@prisma/client";
var SAFE_CANDIDATE_USER = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    avatar: { select: { url: true } }
  }
};
var playableUrl = async (video) => {
  if (!video) return null;
  if (video.provider !== "supabase") return video.url;
  if (!video.publicId) return null;
  return createSignedUrl(PRESENTATION_BUCKET, video.publicId, VIDEO_URL_TTL_SECONDS);
};
var withPlayableVideo = async (presentation) => {
  if (!presentation?.video) return presentation;
  const url = await playableUrl(presentation.video);
  return { ...presentation, video: { ...presentation.video, url } };
};
var withPlayableVideos = async (items) => {
  const paths = items.filter((i) => i.video?.provider === "supabase" && i.video.publicId).map((i) => i.video.publicId);
  const signed = await createSignedUrls(
    PRESENTATION_BUCKET,
    paths,
    VIDEO_URL_TTL_SECONDS
  );
  return items.map((item) => {
    if (!item.video) return item;
    const url = item.video.provider === "supabase" ? signed.get(item.video.publicId ?? "") ?? null : item.video.url;
    return { ...item, video: { ...item.video, url } };
  });
};
var OralPresentationService = class {
  /**
   * Candidate: Upload or replace their profile presentation video.
   * One presentation per candidate profile (not per application).
   *
   * `meta` describes a video that the browser has already uploaded
   * directly to Cloudinary (see getUploadSignature) — we only ever
   * receive the resulting metadata here, never the file itself.
   */
  /**
   * Attaches an already-stored, already-validated video to the candidate's
   * presentation.
   *
   * Called only from the confirm endpoint, which checks that the object exists,
   * sits in this candidate's own folder, is within the size limit and really is
   * the video format it claims. The previous version took a URL straight from
   * the browser and saved it, so a candidate could point their "presentation"
   * at any video on the internet.
   */
  async savePresentation(userId, video) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const candidateId = user.candidateProfile.id;
    const fileAsset = await prisma_default.fileAsset.create({
      data: {
        // Not a fetchable address: the bucket is private, so readers sign a
        // URL from publicId. Stored in this deliberately non-HTTP form so code
        // that renders it blindly fails loudly.
        url: `supabase://${PRESENTATION_BUCKET}/${video.path}`,
        provider: "supabase",
        publicId: video.path,
        fileName: video.fileName,
        mimeType: video.mimeType,
        extension: video.extension,
        size: video.size
      }
    });
    const existing = user.candidateProfile.oralPresentation;
    if (existing) {
      const presentation2 = await prisma_default.oralPresentation.update({
        where: { candidateId },
        data: {
          videoId: fileAsset.id,
          status: OralPresentationStatus.UPLOADED
        },
        include: { video: true }
      });
      if (existing.videoId && existing.videoId !== fileAsset.id) {
        const previous = await prisma_default.fileAsset.findUnique({
          where: { id: existing.videoId }
        });
        if (previous?.provider === "supabase" && previous.publicId) {
          await removeObject(PRESENTATION_BUCKET, previous.publicId);
        } else if (previous?.provider === "cloudinary") {
          await destroyCloudinaryAsset(previous.publicId, "video");
        }
        await prisma_default.fileAsset.delete({ where: { id: existing.videoId } }).catch(() => null);
      }
      return withPlayableVideo(presentation2);
    }
    const presentation = await prisma_default.oralPresentation.create({
      data: {
        candidateId,
        videoId: fileAsset.id,
        status: OralPresentationStatus.UPLOADED
      },
      include: { video: true }
    });
    return withPlayableVideo(presentation);
  }
  /**
   * Candidate: Get own presentation
   */
  async getMyPresentation(userId) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId: user.candidateProfile.id },
      include: { video: true }
    });
    return withPlayableVideo(presentation);
  }
  /**
   * Recruiter/Admin: View a candidate's presentation.
   * A recruiter may only view it if the candidate has applied to one of
   * the recruiter's jobs.
   */
  async getPresentationByCandidateId(candidateId, requesterUserId, role) {
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId },
      include: {
        video: true,
        candidate: { include: { user: SAFE_CANDIDATE_USER } }
      }
    });
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    if (role !== "ADMIN") {
      const requester = await prisma_default.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true }
      });
      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }
      const hasApplication = await prisma_default.application.findFirst({
        where: {
          candidateId,
          recruiterId: requester.recruiterProfile.id
        },
        select: { id: true }
      });
      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }
    return withPlayableVideo(presentation);
  }
  /**
   * Recruiter: Score a candidate's presentation.
   * Same ownership rule as viewing: candidate must have applied to one
   * of the recruiter's jobs.
   */
  async updateRecruiterScore(candidateId, recruiterUserId, recruiterScore) {
    if (recruiterScore < 0 || recruiterScore > 100) {
      throw new AppError("Recruiter score must be between 0 and 100.", 400);
    }
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const presentation = await prisma_default.oralPresentation.findUnique({
      where: { candidateId }
    });
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    const hasApplication = await prisma_default.application.findFirst({
      where: {
        candidateId,
        recruiterId: recruiter.recruiterProfile.id
      },
      select: { id: true }
    });
    if (!hasApplication) {
      throw new AppError("Unauthorized.", 403);
    }
    const updated = await prisma_default.oralPresentation.update({
      where: { candidateId },
      data: {
        recruiterScore,
        status: OralPresentationStatus.REVIEWED
      },
      include: { video: true }
    });
    const applications = await prisma_default.application.findMany({
      where: { candidateId },
      select: { id: true }
    });
    await prisma_default.application.updateMany({
      where: { candidateId },
      data: { oralPresentationScore: recruiterScore }
    });
    await Promise.all(
      applications.map(
        (app2) => candidateScore_service_default.createOrUpdateScore(app2.id).catch(() => null)
      )
    );
    return updated;
  }
  /**
   * Candidate: Delete own presentation
   */
  async deletePresentation(userId) {
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { oralPresentation: true } } }
    });
    if (!user?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    const presentation = user.candidateProfile.oralPresentation;
    if (!presentation) {
      throw new AppError("Presentation not found.", 404);
    }
    const video = presentation.videoId ? await prisma_default.fileAsset.findUnique({ where: { id: presentation.videoId } }) : null;
    await prisma_default.$transaction(async (tx) => {
      await tx.oralPresentation.delete({
        where: { candidateId: user.candidateProfile.id }
      });
      if (presentation.videoId) {
        await tx.fileAsset.delete({ where: { id: presentation.videoId } });
      }
    });
    if (video?.provider === "supabase" && video.publicId) {
      await removeObject(PRESENTATION_BUCKET, video.publicId);
    } else if (video?.provider === "cloudinary") {
      await destroyCloudinaryAsset(video.publicId, "video");
    }
    return { success: true, message: "Presentation deleted successfully." };
  }
  /**
   * Recruiter: List presentations belonging to candidates who applied
   * to this recruiter's jobs.
   */
  async getRecruiterPresentations(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const skip = (page - 1) * limit;
    const where = {
      candidate: {
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id }
        }
      }
    };
    const [items, total] = await prisma_default.$transaction([
      prisma_default.oralPresentation.findMany({
        where,
        include: { video: true, candidate: { include: { user: SAFE_CANDIDATE_USER } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.oralPresentation.count({ where })
    ]);
    return {
      items: await withPlayableVideos(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Admin: List all presentations
   */
  async getAllPresentations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.oralPresentation.findMany({
        include: { video: true, candidate: { include: { user: SAFE_CANDIDATE_USER } } },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.oralPresentation.count()
    ]);
    return {
      items: await withPlayableVideos(items),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Recruiter dashboard statistics, scoped to candidates who applied
   * to this recruiter's jobs.
   */
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const baseWhere = {
      candidate: {
        applications: {
          some: { recruiterId: recruiter.recruiterProfile.id }
        }
      }
    };
    const [total, pending, uploaded, reviewed] = await prisma_default.$transaction([
      prisma_default.oralPresentation.count({ where: baseWhere }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.PENDING }
      }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.UPLOADED }
      }),
      prisma_default.oralPresentation.count({
        where: { ...baseWhere, status: OralPresentationStatus.REVIEWED }
      })
    ]);
    return { total, pending, uploaded, reviewed };
  }
};
var oralPresentation_service_default = new OralPresentationService();

// server/controllers/oralPresentation.controller.ts
var requireOwnCandidateProfile = async (req) => {
  const user = await prisma_default.user.findUnique({
    where: { id: req.user.id },
    include: { candidateProfile: true }
  });
  if (!user?.candidateProfile) {
    throw new AppError("Candidate profile not found.", 404);
  }
  return user.candidateProfile;
};
var assertOwnObjectPath = (path, profileId) => {
  if (typeof path !== "string" || !path) {
    throw new AppError("Missing upload reference.", 400);
  }
  const segments = path.split("/");
  if (segments.length !== 2) {
    throw new AppError("Invalid upload reference.", 400);
  }
  const [folder, object] = segments;
  if (folder !== profileId || !OBJECT_NAME_PATTERN.test(object)) {
    throw new AppError("Invalid upload reference.", 400);
  }
  return path;
};
var createPresentationUploadUrl = async (req, res, next) => {
  try {
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Please choose a video to upload.", 400));
    }
    const extension = resolveVideoExtension(fileName);
    const profile = await requireOwnCandidateProfile(req);
    const ticket = await createUploadTicket({
      bucket: PRESENTATION_BUCKET,
      path: buildObjectPath(profile.id, extension)
    });
    res.status(200).json({
      status: "success",
      data: { path: ticket.path, signedUrl: ticket.signedUrl, token: ticket.token }
    });
  } catch (err) {
    next(err);
  }
};
var confirmPresentationUpload = async (req, res, next) => {
  try {
    const { path, fileName } = req.body;
    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Missing file name.", 400));
    }
    const extension = resolveVideoExtension(fileName);
    const profile = await requireOwnCandidateProfile(req);
    const storedPath = assertOwnObjectPath(path, profile.id);
    let size;
    try {
      size = assertVideoSize(await getObjectSize(PRESENTATION_BUCKET, storedPath));
      const head = await downloadObjectHead(PRESENTATION_BUCKET, storedPath, 4096);
      if (!hasVideoSignature(head, extension)) {
        throw new AppError(
          `This file is not a valid ${extension.toUpperCase()} video. Please try again.`,
          400
        );
      }
    } catch (validationErr) {
      await removeObject(PRESENTATION_BUCKET, storedPath);
      throw validationErr;
    }
    const presentation = await oralPresentation_service_default.savePresentation(
      req.user.id,
      {
        path: storedPath,
        fileName,
        extension,
        mimeType: videoMimeType(extension),
        size
      }
    );
    console.log(
      `Presentation stored candidate=${profile.id} format=${extension} bytes=${size}`
    );
    res.status(201).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var getMyPresentation = async (req, res, next) => {
  try {
    const presentation = await oralPresentation_service_default.getMyPresentation(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var getPresentationByCandidateId = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const presentation = await oralPresentation_service_default.getPresentationByCandidateId(
      candidateId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var updateRecruiterScore = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const { recruiterScore } = req.body;
    const presentation = await oralPresentation_service_default.updateRecruiterScore(
      candidateId,
      req.user.id,
      Number(recruiterScore)
    );
    res.status(200).json({
      status: "success",
      data: { presentation }
    });
  } catch (err) {
    next(err);
  }
};
var deletePresentation = async (req, res, next) => {
  try {
    const result = await oralPresentation_service_default.deletePresentation(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterPresentations = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const data = await oralPresentation_service_default.getRecruiterPresentations(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...data
    });
  } catch (err) {
    next(err);
  }
};
var getAllPresentations = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const data = await oralPresentation_service_default.getAllPresentations(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...data
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics2 = async (req, res, next) => {
  try {
    const statistics = await oralPresentation_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/oralPresentation.routes.ts
var router12 = express.Router();
router12.use(protect);
router12.post(
  "/me/upload-url",
  restrictTo("CANDIDATE"),
  createPresentationUploadUrl
);
router12.post(
  "/me/confirm",
  restrictTo("CANDIDATE"),
  confirmPresentationUpload
);
router12.get("/me", restrictTo("CANDIDATE"), getMyPresentation);
router12.delete("/me", restrictTo("CANDIDATE"), deletePresentation);
router12.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterPresentations
);
router12.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics2
);
router12.get(
  "/candidate/:candidateId",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getPresentationByCandidateId
);
router12.patch(
  "/candidate/:candidateId/recruiter-score",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  updateRecruiterScore
);
router12.get("/", restrictTo("ADMIN"), getAllPresentations);
var oralPresentation_routes_default = router12;

// server/routes/quiz.routes.ts
import express2 from "express";

// server/services/quiz.service.ts
init_prisma();
import { QuizStatus } from "@prisma/client";

// server/services/ai/quiz.ai.ts
function stripFences(raw) {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}
var MIN_QUESTIONS = 5;
var MAX_QUESTIONS = 10;
async function generateQuizQuestions(cvText) {
  const prompt = `
You are an expert technical recruiter.

Read this candidate's CV and write between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}
interview questions that are directly based on what is actually written in it:
technologies used, real projects, education, professional experience, and
responsibilities.

Choose how many to write based on how much substance the CV contains. A short
CV with little detail should get ${MIN_QUESTIONS}. A rich CV covering several
roles, projects and technologies should get closer to ${MAX_QUESTIONS}. Never
invent material to reach a number: it is better to return ${MIN_QUESTIONS}
strong questions than ${MAX_QUESTIONS} where half are padding.

Do NOT write generic interview questions. Each question must reference
something specific found in the CV text below.

Write the questions in the same language as the CV. If that is unclear, write
them in French. Never mix languages within the set: candidates on this platform
are Algerian and answer in French or Arabic, and a French CV that comes back
with English questions reads as a broken feature. The "skill" label follows the
same language as the question.

CANDIDATE CV:
${cvText}

Return ONLY valid JSON, an array of between ${MIN_QUESTIONS} and
${MAX_QUESTIONS} objects:
[
  {
    "question": "",
    "skill": "",
    "difficulty": "EASY" | "MEDIUM" | "HARD"
  }
]
`;
  const raw = await askAI(prompt);
  if (!raw) {
    throw new AppError("Empty AI response while generating quiz.", 500);
  }
  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (error) {
    console.error("Quiz AI parse error:", error, raw);
    throw new AppError("Invalid AI response while generating quiz.", 500);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AppError("AI did not return a valid question list.", 500);
  }
  const questions = parsed.slice(0, MAX_QUESTIONS).map((q) => ({
    question: String(q.question ?? "").trim(),
    skill: q.skill ? String(q.skill) : void 0,
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(q.difficulty) ? q.difficulty : "MEDIUM"
  }));
  if (questions.some((q) => !q.question)) {
    throw new AppError("AI returned one or more empty questions.", 500);
  }
  if (questions.length < MIN_QUESTIONS) {
    throw new AppError(
      `AI returned only ${questions.length} question(s); at least ${MIN_QUESTIONS} are needed.`,
      500
    );
  }
  return questions;
}
async function evaluateAnswer(question, answer) {
  const prompt = `
You are an expert technical recruiter grading an interview answer.

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Score the answer from 0 to 100 based on relevance, accuracy, and depth.
If the answer is empty, off-topic, or says "I don't know", score it low.

Return ONLY valid JSON:
{
  "score": 0,
  "feedback": ""
}
`;
  const raw = await askAI(prompt);
  if (!raw) {
    return { score: 0, feedback: "No AI response received." };
  }
  try {
    const parsed = JSON.parse(stripFences(raw));
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score ?? 0))),
      feedback: String(parsed.feedback ?? "")
    };
  } catch (error) {
    console.error("Quiz answer AI parse error:", error, raw);
    return { score: 0, feedback: "Unable to evaluate this answer." };
  }
}

// server/services/quiz.service.ts
var QuizService = class {
  /**
   * Candidate: Return the existing quiz for this candidate, or generate a
   * new one from their CV if none exists yet.
   */
  async getOrGenerateQuiz(userId) {
    const existingQuiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } }
      }
    });
    if (existingQuiz) {
      return existingQuiz;
    }
    const candidate = await prisma_default.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: { include: { resume: true } } }
    });
    if (!candidate?.candidateProfile) {
      throw new AppError("Candidate profile not found.", 404);
    }
    if (!candidate.candidateProfile.resume) {
      throw new AppError(
        "Please upload a CV before generating your quiz.",
        400
      );
    }
    const cvText = await cvExtraction_service_default.extractTextFromAsset(
      candidate.candidateProfile.resume
    );
    if (!cvText || cvText.trim().length < 50) {
      throw new AppError(
        "Could not extract enough text from your CV to generate a quiz.",
        400
      );
    }
    const generated = await generateQuizQuestions(cvText);
    const quiz = await prisma_default.quiz.create({
      data: {
        candidateId: userId,
        status: QuizStatus.GENERATED,
        aiModel: "gemini-2.5-flash",
        questions: {
          create: generated.map((q, index) => ({
            order: index + 1,
            question: q.question,
            skill: q.skill,
            difficulty: q.difficulty
          }))
        }
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        attempt: { include: { answers: true } }
      }
    });
    return quiz;
  }
  /**
   * Candidate: Start (or resume) the quiz. Generates it on first call,
   * and flips status to IN_PROGRESS.
   */
  async startQuiz(userId) {
    const quiz = await this.getOrGenerateQuiz(userId);
    if (quiz.status === QuizStatus.GENERATED) {
      await prisma_default.quiz.update({
        where: { candidateId: userId },
        data: { status: QuizStatus.IN_PROGRESS }
      });
      quiz.status = QuizStatus.IN_PROGRESS;
    }
    return { quiz };
  }
  /**
   * Candidate: Get the quiz (generating it if needed).
   */
  async getQuiz(userId) {
    return this.getOrGenerateQuiz(userId);
  }
  /**
   * Candidate: Submit all answers, evaluate them, and calculate the score.
   */
  async submitQuiz(userId, answers) {
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new AppError("Answers are required.", 400);
    }
    const quiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: { questions: true, attempt: true }
    });
    if (!quiz) {
      throw new AppError("Quiz not found. Start the quiz first.", 404);
    }
    if (quiz.status === QuizStatus.SUBMITTED || quiz.status === QuizStatus.REVIEWED) {
      throw new AppError("This quiz has already been submitted.", 400);
    }
    const questionIds = new Set(quiz.questions.map((q) => q.id));
    for (const a of answers) {
      if (!questionIds.has(a.questionId)) {
        throw new AppError("Invalid question in submission.", 400);
      }
    }
    if (answers.length !== quiz.questions.length) {
      throw new AppError(
        `All ${quiz.questions.length} questions must be answered.`,
        400
      );
    }
    const evaluated = await Promise.all(
      answers.map(async (a) => {
        const question = quiz.questions.find((q) => q.id === a.questionId);
        const result = await evaluateAnswer(question.question, a.answer);
        return { ...a, ...result };
      })
    );
    const aiScore = evaluated.reduce((sum, e) => sum + e.score, 0) / evaluated.length;
    const attempt = await prisma_default.$transaction(async (tx) => {
      if (quiz.attempt) {
        await tx.quizAnswer.deleteMany({
          where: { attemptId: quiz.attempt.id }
        });
        await tx.quizAttempt.delete({ where: { id: quiz.attempt.id } });
      }
      const created = await tx.quizAttempt.create({
        data: {
          quizId: quiz.id,
          candidateId: userId,
          aiScore,
          submittedAt: /* @__PURE__ */ new Date(),
          answers: {
            create: evaluated.map((e) => ({
              questionId: e.questionId,
              answer: e.answer,
              aiScore: e.score,
              aiFeedback: e.feedback
            }))
          }
        },
        include: { answers: true }
      });
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.SUBMITTED, submittedAt: /* @__PURE__ */ new Date() }
      });
      return created;
    });
    const candidateProfile = await prisma_default.candidateProfile.findUnique({
      where: { userId },
      include: { applications: { select: { id: true } } }
    });
    if (candidateProfile) {
      await prisma_default.application.updateMany({
        where: { candidateId: candidateProfile.id },
        data: { quizScore: aiScore }
      });
      await Promise.all(
        candidateProfile.applications.map(
          (app2) => candidateScore_service_default.createOrUpdateScore(app2.id).catch(() => null)
        )
      );
    }
    return { attempt, aiScore };
  }
  /**
   * Candidate: Get own attempt
   */
  async getMyAttempt(userId) {
    const attempt = await prisma_default.quizAttempt.findUnique({
      where: { quizId: (await this.requireQuiz(userId)).id },
      include: { answers: { include: { question: true } } }
    });
    return attempt;
  }
  /**
   * Candidate: Delete own attempt so they can be re-evaluated
   * (does not delete the quiz/questions themselves).
   */
  async deleteAttempt(userId) {
    const quiz = await prisma_default.quiz.findUnique({
      where: { candidateId: userId },
      include: { attempt: true }
    });
    if (!quiz?.attempt) {
      throw new AppError("No attempt to delete.", 404);
    }
    await prisma_default.$transaction([
      prisma_default.quizAnswer.deleteMany({ where: { attemptId: quiz.attempt.id } }),
      prisma_default.quizAttempt.delete({ where: { id: quiz.attempt.id } }),
      prisma_default.quiz.update({
        where: { id: quiz.id },
        data: { status: QuizStatus.GENERATED, submittedAt: null }
      })
    ]);
    return { success: true, message: "Attempt deleted successfully." };
  }
  /**
   * Recruiter/Admin: View a specific attempt by id.
   */
  async getAttemptById(attemptId, requesterUserId, role) {
    const attempt = await prisma_default.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: { include: { question: true } },
        candidate: { include: { candidateProfile: true } }
      }
    });
    if (!attempt) {
      throw new AppError("Attempt not found.", 404);
    }
    if (role !== "ADMIN") {
      const requester = await prisma_default.user.findUnique({
        where: { id: requesterUserId },
        include: { recruiterProfile: true }
      });
      if (!requester?.recruiterProfile) {
        throw new AppError("Recruiter profile not found.", 404);
      }
      const candidateProfileId = attempt.candidate.candidateProfile?.id;
      const hasApplication = candidateProfileId && await prisma_default.application.findFirst({
        where: {
          candidateId: candidateProfileId,
          recruiterId: requester.recruiterProfile.id
        },
        select: { id: true }
      });
      if (!hasApplication) {
        throw new AppError("Unauthorized.", 403);
      }
    }
    return attempt;
  }
  /**
   * Recruiter: List attempts belonging to candidates who applied to
   * this recruiter's jobs.
   */
  async getRecruiterAttempts(recruiterUserId, page = 1, limit = 10) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const skip = (page - 1) * limit;
    const where = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id }
          }
        }
      }
    };
    const [items, total] = await prisma_default.$transaction([
      prisma_default.quizAttempt.findMany({
        where,
        include: {
          answers: true,
          candidate: { include: { candidateProfile: true } }
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.quizAttempt.count({ where })
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  /**
   * Admin: List all attempts
   */
  async getAllAttempts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await prisma_default.$transaction([
      prisma_default.quizAttempt.findMany({
        include: { answers: true, candidate: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma_default.quizAttempt.count()
    ]);
    return {
      items,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    };
  }
  async getRecruiterStatistics(recruiterUserId) {
    const recruiter = await prisma_default.user.findUnique({
      where: { id: recruiterUserId },
      include: { recruiterProfile: true }
    });
    if (!recruiter?.recruiterProfile) {
      throw new AppError("Recruiter profile not found.", 404);
    }
    const baseWhere = {
      candidate: {
        candidateProfile: {
          applications: {
            some: { recruiterId: recruiter.recruiterProfile.id }
          }
        }
      }
    };
    const [total, submitted] = await prisma_default.$transaction([
      prisma_default.quizAttempt.count({ where: baseWhere }),
      prisma_default.quizAttempt.count({
        where: { ...baseWhere, submittedAt: { not: null } }
      })
    ]);
    return { total, submitted };
  }
  async getAdminStatistics() {
    const [total, submitted] = await prisma_default.$transaction([
      prisma_default.quizAttempt.count(),
      prisma_default.quizAttempt.count({ where: { submittedAt: { not: null } } })
    ]);
    return { total, submitted };
  }
  async requireQuiz(userId) {
    const quiz = await prisma_default.quiz.findUnique({ where: { candidateId: userId } });
    if (!quiz) {
      throw new AppError("Quiz not found.", 404);
    }
    return quiz;
  }
};
var quiz_service_default = new QuizService();

// server/controllers/quiz.controller.ts
var startQuiz = async (req, res, next) => {
  try {
    const result = await quiz_service_default.startQuiz(req.user.id);
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (err) {
    next(err);
  }
};
var getQuiz = async (req, res, next) => {
  try {
    const quiz = await quiz_service_default.getQuiz(req.user.id);
    res.status(200).json({
      status: "success",
      data: { quiz }
    });
  } catch (err) {
    next(err);
  }
};
var submitQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = await quiz_service_default.submitQuiz(req.user.id, answers);
    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (err) {
    next(err);
  }
};
var getMyAttempt = async (req, res, next) => {
  try {
    const attempt = await quiz_service_default.getMyAttempt(req.user.id);
    res.status(200).json({
      status: "success",
      data: { attempt }
    });
  } catch (err) {
    next(err);
  }
};
var getAttemptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attempt = await quiz_service_default.getAttemptById(
      id,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: { attempt }
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterAttempts = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await quiz_service_default.getRecruiterAttempts(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getAllAttempts = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await quiz_service_default.getAllAttempts(page, limit);
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics3 = async (req, res, next) => {
  try {
    const statistics = await quiz_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics2 = async (req, res, next) => {
  try {
    const statistics = await quiz_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: { statistics }
    });
  } catch (err) {
    next(err);
  }
};
var deleteAttempt = async (req, res, next) => {
  try {
    const result = await quiz_service_default.deleteAttempt(req.user.id);
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/quiz.routes.ts
var router13 = express2.Router();
router13.use(protect);
router13.post("/start", restrictTo("CANDIDATE"), startQuiz);
router13.get("/", restrictTo("CANDIDATE"), getQuiz);
router13.post("/submit", restrictTo("CANDIDATE"), submitQuiz);
router13.get("/attempt", restrictTo("CANDIDATE"), getMyAttempt);
router13.delete("/attempt", restrictTo("CANDIDATE"), deleteAttempt);
router13.get(
  "/recruiter",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterAttempts
);
router13.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getRecruiterStatistics3
);
router13.get(
  "/attempt/:id",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  getAttemptById
);
router13.get("/all", restrictTo("ADMIN"), getAllAttempts);
router13.get("/admin/statistics", restrictTo("ADMIN"), getAdminStatistics2);
var quiz_routes_default = router13;

// server/routes/aiAnalysis.routes.ts
import { Router as Router12 } from "express";

// server/controllers/aiAnalysis.controller.ts
var AIAnalysisController = class {
  // ============================================================
  // Analyze Application
  // ============================================================
  async analyzeApplication(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.analyzeApplication(
        applicationId
      );
      res.status(200).json({
        success: true,
        message: "AI analysis completed successfully.",
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Get One Analysis
  // ============================================================
  async getAnalysis(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.getAnalysis(
        applicationId
      );
      res.status(200).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recruiter Dashboard
  // ============================================================
  async getRecruiterAnalyses(req, res, next) {
    try {
      const recruiterUserId = req.user.id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await aiAnalysis_service_default.getRecruiterAnalyses(
        recruiterUserId,
        page,
        limit
      );
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recruiter Statistics
  // ============================================================
  async getStatistics(req, res, next) {
    try {
      const recruiterUserId = req.user.id;
      const stats = await aiAnalysis_service_default.getStatistics(
        recruiterUserId
      );
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Recalculate Analysis
  // ============================================================
  async recalculate(req, res, next) {
    try {
      const { applicationId } = req.params;
      const analysis = await aiAnalysis_service_default.recalculate(
        applicationId
      );
      res.status(200).json({
        success: true,
        message: "AI analysis recalculated successfully.",
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
  // ============================================================
  // Delete Analysis
  // ============================================================
  async deleteAnalysis(req, res, next) {
    try {
      const { applicationId } = req.params;
      const result = await aiAnalysis_service_default.deleteAnalysis(
        applicationId
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
var aiAnalysis_controller_default = new AIAnalysisController();

// server/routes/aiAnalysis.routes.ts
var router14 = Router12();
router14.use(protect);
router14.get(
  "/:applicationId",
  restrictTo("CANDIDATE", "RECRUITER", "ADMIN"),
  aiAnalysis_controller_default.getAnalysis
);
router14.post(
  "/:applicationId/analyze",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.analyzeApplication
);
router14.post(
  "/:applicationId/recalculate",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.recalculate
);
router14.get(
  "/recruiter/all",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.getRecruiterAnalyses
);
router14.get(
  "/recruiter/statistics",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("PREMIUM"),
  aiAnalysis_controller_default.getStatistics
);
router14.delete(
  "/:applicationId",
  restrictTo("ADMIN"),
  aiAnalysis_controller_default.deleteAnalysis
);
var aiAnalysis_routes_default = router14;

// server/routes/candidateProfile.routes.ts
import express3 from "express";

// server/controllers/candidateProfile.controller.ts
init_prisma();

// server/middleware/cvUpload.middleware.ts
import multer2 from "multer";
var CV_EXTENSIONS = ["pdf", "doc", "docx"];
var CV_MAX_BYTES2 = 10 * 1024 * 1024;
var CV_MIME_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};
var cvUpload = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: CV_MAX_BYTES2, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "";
    if (!CV_EXTENSIONS.includes(extension)) {
      cb(new AppError("Your CV must be a PDF, DOC or DOCX file.", 400));
      return;
    }
    cb(null, true);
  }
}).single("cv");
var hasSignature = (buffer, extension) => {
  switch (extension) {
    // "%PDF"
    case "pdf":
      return buffer.subarray(0, 4).toString("latin1") === "%PDF";
    // OLE2 compound document — the legacy Word container.
    case "doc":
      return buffer.subarray(0, 8).equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]));
    // DOCX is a ZIP. "PK\x03\x04" alone would accept any archive, so also
    // require a Word part: ZIP stores entry names uncompressed in the local
    // file headers, so they are readable straight out of the raw bytes.
    case "docx":
      return buffer.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4])) && buffer.subarray(0, 4096).includes("word/");
    default:
      return false;
  }
};
var resolveCvExtension = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!CV_EXTENSIONS.includes(extension)) {
    throw new AppError("Your CV must be a PDF, DOC or DOCX file.", 400);
  }
  return extension;
};
var validateCvBuffer = (buffer, fileName) => {
  if (buffer.length === 0) {
    throw new AppError("That file is empty. Please choose another CV.", 400);
  }
  if (buffer.length > CV_MAX_BYTES2) {
    throw new AppError("Your CV must be smaller than 10 MB.", 400);
  }
  const extension = resolveCvExtension(fileName);
  if (!hasSignature(buffer, extension)) {
    throw new AppError(
      `This file is not a valid ${extension.toUpperCase()} document. Please upload your CV again.`,
      400
    );
  }
  return {
    buffer,
    extension,
    // Taken from our own table, not from the request: the browser-supplied
    // MIME type is never stored or served back.
    mimeType: CV_MIME_TYPES[extension],
    fileName,
    size: buffer.length
  };
};
var validateCvUpload = (file) => {
  if (!file) {
    throw new AppError("Please choose a CV file to upload.", 400);
  }
  return validateCvBuffer(file.buffer, file.originalname);
};
var handleCvUpload = (req, res, next) => {
  cvUpload(req, res, (err) => {
    if (err instanceof multer2.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError("Your CV must be smaller than 10 MB.", 400));
      }
      return next(new AppError(`Upload failed: ${err.message}`, 400));
    }
    if (err) return next(err);
    next();
  });
};

// server/controllers/candidateProfile.controller.ts
var serializeResume = async (resume) => ({
  id: resume.id,
  url: await getCvAccessUrl(resume),
  fileName: resume.fileName,
  mimeType: resume.mimeType,
  extension: resume.extension,
  size: resume.size,
  uploadedAt: resume.createdAt
});
var retireResume = async (resumeId) => {
  const citedByApplications = await prisma_default.application.count({
    where: { cvId: resumeId }
  });
  if (citedByApplications > 0) return;
  const asset = await prisma_default.fileAsset.findUnique({ where: { id: resumeId } });
  if (!asset) return;
  if (asset.provider === "supabase" && asset.publicId) {
    await removeCvObject(asset.publicId);
  }
  await prisma_default.fileAsset.delete({ where: { id: resumeId } }).catch(() => null);
};
var finalizeCv = async (profileId, previousResumeId, storedPath, cv) => {
  let resume;
  try {
    resume = await prisma_default.$transaction(async (tx) => {
      const asset = await tx.fileAsset.create({
        data: {
          // Not a fetchable address: the bucket is private, so readers mint a
          // signed URL from publicId. Stored in this deliberately non-HTTP
          // form so code that renders it blindly fails loudly.
          url: `${SUPABASE_URL_SCHEME}${storedPath}`,
          provider: "supabase",
          publicId: storedPath,
          fileName: cv.fileName,
          mimeType: cv.mimeType,
          extension: cv.extension,
          size: cv.size
        }
      });
      await tx.candidateProfile.update({
        where: { id: profileId },
        data: { resumeId: asset.id }
      });
      return asset;
    });
  } catch (dbErr) {
    await removeCvObject(storedPath);
    throw dbErr;
  }
  if (previousResumeId && previousResumeId !== resume.id) {
    await retireResume(previousResumeId);
  }
  console.log(
    `CV stored candidate=${profileId} format=${cv.extension} bytes=${cv.size}`
  );
  return resume;
};
var requireOwnCandidateProfile2 = async (req) => {
  const user = await prisma_default.user.findUnique({
    where: { id: req.user.id },
    include: { candidateProfile: true }
  });
  if (!user?.candidateProfile) {
    throw new AppError("Candidate profile not found.", 404);
  }
  return user.candidateProfile;
};
var CV_OBJECT_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|doc|docx)$/;
var assertOwnObjectPath2 = (path, profileId) => {
  if (typeof path !== "string" || !path) {
    throw new AppError("Missing upload reference.", 400);
  }
  const segments = path.split("/");
  if (segments.length !== 2) {
    throw new AppError("Invalid upload reference.", 400);
  }
  const [folder, object] = segments;
  if (folder !== profileId || !CV_OBJECT_NAME.test(object)) {
    throw new AppError("Invalid upload reference.", 400);
  }
  return path;
};
var assertCanViewCandidate = async (req, candidateProfileId) => {
  if (req.user.role === "ADMIN") return;
  const recruiter = await prisma_default.recruiterProfile.findUnique({
    where: { userId: req.user.id },
    select: { id: true }
  });
  if (!recruiter) {
    throw new AppError("Recruiter profile not found.", 403);
  }
  if (await getRecruiterPlan(req.user.id) === "CORPORATE") return;
  const hasApplied = await prisma_default.application.findFirst({
    where: { candidateId: candidateProfileId, job: { recruiterId: recruiter.id } },
    select: { id: true }
  });
  if (!hasApplied) {
    throw new AppError("You can only view candidates who applied to your jobs.", 403);
  }
};
var uploadCV = async (req, res, next) => {
  let storedPath = null;
  try {
    const cv = validateCvUpload(req.file);
    const profile = await requireOwnCandidateProfile2(req);
    storedPath = await uploadCvObject({
      candidateProfileId: profile.id,
      buffer: cv.buffer,
      extension: cv.extension,
      mimeType: cv.mimeType
    });
    const resume = await finalizeCv(profile.id, profile.resumeId, storedPath, cv);
    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(resume) }
    });
  } catch (err) {
    next(err);
  }
};
var updateMyProfile2 = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: true }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const {
      firstName,
      lastName,
      phone: phone2,
      headline,
      bio,
      city,
      wilaya,
      country,
      currentJobTitle,
      yearsExperience,
      desiredSalary,
      availableImmediately,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl
    } = req.body;
    const userData = {};
    if (firstName !== void 0) userData.firstName = firstName;
    if (lastName !== void 0) userData.lastName = lastName;
    const profileFieldData = {};
    if (phone2 !== void 0) profileFieldData.phone = phone2;
    if (headline !== void 0) profileFieldData.headline = headline;
    if (bio !== void 0) profileFieldData.bio = bio;
    if (city !== void 0) profileFieldData.city = city;
    if (wilaya !== void 0) profileFieldData.wilaya = wilaya;
    if (country !== void 0) profileFieldData.country = country;
    if (currentJobTitle !== void 0) profileFieldData.currentJobTitle = currentJobTitle;
    if (yearsExperience !== void 0) profileFieldData.yearsExperience = yearsExperience;
    if (desiredSalary !== void 0) profileFieldData.desiredSalary = desiredSalary;
    if (availableImmediately !== void 0) profileFieldData.availableImmediately = availableImmediately;
    if (skills !== void 0) profileFieldData.skills = skills;
    if (linkedinUrl !== void 0) profileFieldData.linkedinUrl = linkedinUrl;
    if (githubUrl !== void 0) profileFieldData.githubUrl = githubUrl;
    if (portfolioUrl !== void 0) profileFieldData.portfolioUrl = portfolioUrl;
    const [updatedUser, updatedProfile] = await prisma_default.$transaction([
      prisma_default.user.update({
        where: { id: user.id },
        data: userData,
        // Named: a write that returns every column fails against a schema
        // whose migration has not run, and the response needs only these.
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          preferredLanguage: true
        }
      }),
      prisma_default.candidateProfile.update({
        where: { id: user.candidateProfile.id },
        data: profileFieldData,
        include: { resume: true }
      })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        },
        candidateProfile: updatedProfile
      }
    });
  } catch (err) {
    next(err);
  }
};
var getMyCV = async (req, res, next) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      include: { candidateProfile: { include: { resume: true } } }
    });
    if (!user?.candidateProfile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const resume = user.candidateProfile.resume;
    res.status(200).json({
      status: "success",
      data: { resume: resume ? await serializeResume(resume) : null }
    });
  } catch (err) {
    next(err);
  }
};
var getMyCvBuilder = async (req, res, next) => {
  try {
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { userId: req.user.id },
      select: { cvBuilderData: true, updatedAt: true }
    });
    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        cvBuilderData: profile.cvBuilderData ?? null,
        updatedAt: profile.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
};
var saveMyCvBuilder = async (req, res, next) => {
  try {
    const { cvBuilderData } = req.body;
    if (cvBuilderData === void 0 || cvBuilderData === null) {
      return next(new AppError("cvBuilderData is required.", 400));
    }
    if (typeof cvBuilderData !== "object" || Array.isArray(cvBuilderData)) {
      return next(new AppError("cvBuilderData must be an object.", 400));
    }
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true }
    });
    if (!profile) {
      return next(new AppError("Candidate profile not found.", 404));
    }
    const updated = await prisma_default.candidateProfile.update({
      where: { id: profile.id },
      data: { cvBuilderData },
      select: { cvBuilderData: true, updatedAt: true }
    });
    res.status(200).json({
      status: "success",
      data: { cvBuilderData: updated.cvBuilderData, updatedAt: updated.updatedAt }
    });
  } catch (err) {
    next(err);
  }
};
var getCandidateCvDocument = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { id: candidateId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true } }
      }
    });
    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }
    await assertCanViewCandidate(req, profile.id);
    const built = profile.cvBuilderData ?? null;
    const fullName = [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ").trim();
    const document = {
      name: built?.name || fullName || profile.user.email,
      title: built?.title || profile.currentJobTitle || profile.headline || "",
      email: built?.email || profile.user.email || "",
      phone: built?.phone || profile.phone || "",
      address: built?.address || [profile.city, profile.wilaya, profile.country].filter(Boolean).join(", "),
      summary: built?.summary || profile.bio || "",
      experiences: Array.isArray(built?.experiences) ? built.experiences : [],
      education: Array.isArray(built?.education) ? built.education : [],
      skills: Array.isArray(built?.skills) ? built.skills : profile.skills ?? [],
      languages: Array.isArray(built?.languages) ? built.languages : []
    };
    res.status(200).json({
      status: "success",
      data: {
        document,
        photoUrl: profile.user.avatar?.url ?? null,
        // Lets the UI say "this candidate has not built a CV yet" instead of
        // silently showing a sparse document.
        hasBuiltCv: Boolean(built)
      }
    });
  } catch (err) {
    next(err);
  }
};
var getCandidateCvFile = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const profile = await prisma_default.candidateProfile.findUnique({
      where: { id: candidateId },
      include: { resume: true }
    });
    if (!profile) {
      return next(new AppError("Candidate not found.", 404));
    }
    await assertCanViewCandidate(req, profile.id);
    if (!profile.resume) {
      return next(new AppError("This candidate has not uploaded a CV.", 404));
    }
    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(profile.resume) }
    });
  } catch (err) {
    next(err);
  }
};
var createCvUploadUrl = async (req, res, next) => {
  try {
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Please choose a CV file to upload.", 400));
    }
    const extension = resolveCvExtension(fileName);
    const profile = await requireOwnCandidateProfile2(req);
    const ticket = await createCvUploadTicket({
      candidateProfileId: profile.id,
      extension
    });
    res.status(200).json({
      status: "success",
      data: { path: ticket.path, signedUrl: ticket.signedUrl, token: ticket.token }
    });
  } catch (err) {
    next(err);
  }
};
var confirmCvUpload = async (req, res, next) => {
  try {
    const { path, fileName } = req.body;
    if (!fileName || typeof fileName !== "string") {
      return next(new AppError("Missing file name.", 400));
    }
    const profile = await requireOwnCandidateProfile2(req);
    const storedPath = assertOwnObjectPath2(path, profile.id);
    let cv;
    try {
      const buffer = await downloadCvObject(storedPath);
      cv = validateCvBuffer(buffer, fileName);
    } catch (validationErr) {
      await removeCvObject(storedPath);
      throw validationErr;
    }
    const resume = await finalizeCv(profile.id, profile.resumeId, storedPath, cv);
    res.status(200).json({
      status: "success",
      data: { resume: await serializeResume(resume) }
    });
  } catch (err) {
    next(err);
  }
};
var listCandidateDirectory = async (req, res, next) => {
  try {
    const { search, wilaya, minExperience, page, limit } = req.query;
    const take = Math.min(Number(limit) || 24, 60);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const where = { resumeId: { not: null } };
    if (wilaya?.trim()) {
      where.OR = [
        { wilaya: { contains: wilaya.trim(), mode: "insensitive" } },
        { city: { contains: wilaya.trim(), mode: "insensitive" } }
      ];
    }
    const years = Number(minExperience);
    if (Number.isFinite(years) && years > 0) {
      where.yearsExperience = { gte: years };
    }
    if (search?.trim()) {
      const term = search.trim();
      where.AND = [
        {
          OR: [
            { currentJobTitle: { contains: term, mode: "insensitive" } },
            { headline: { contains: term, mode: "insensitive" } },
            { bio: { contains: term, mode: "insensitive" } },
            { skills: { hasSome: term.split(/[\s,]+/).filter(Boolean) } },
            { user: { firstName: { contains: term, mode: "insensitive" } } },
            { user: { lastName: { contains: term, mode: "insensitive" } } },
            { user: { email: { contains: term, mode: "insensitive" } } }
          ]
        }
      ];
    }
    const [candidates, total] = await Promise.all([
      prisma_default.candidateProfile.findMany({
        where,
        // Selected explicitly: a directory has no business carrying password
        // hashes to the browser.
        select: {
          id: true,
          currentJobTitle: true,
          headline: true,
          city: true,
          wilaya: true,
          yearsExperience: true,
          skills: true,
          availableImmediately: true,
          updatedAt: true,
          resume: { select: { id: true, fileName: true, extension: true, createdAt: true } },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: { select: { url: true } }
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take
      }),
      prisma_default.candidateProfile.count({ where })
    ]);
    res.status(200).json({
      status: "success",
      data: {
        candidates: candidates.map((c) => ({
          ...c,
          user: { ...c.user, avatarUrl: c.user.avatar?.url ?? null }
        })),
        pagination: { total, page: Math.max(Number(page) || 1, 1), limit: take, pages: Math.ceil(total / take) }
      }
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/candidateProfile.routes.ts
var router15 = express3.Router();
router15.use(protect);
router15.get(
  "/directory",
  restrictTo("RECRUITER", "ADMIN"),
  requireRecruiterTier("CORPORATE"),
  listCandidateDirectory
);
router15.get(
  "/:candidateId/cv-document",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvDocument
);
router15.get(
  "/:candidateId/cv-file",
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateCvFile
);
router15.use(restrictTo("CANDIDATE"));
router15.patch("/me", updateMyProfile2);
router15.post("/me/cv/upload-url", createCvUploadUrl);
router15.post("/me/cv/confirm", confirmCvUpload);
router15.post("/me/cv", handleCvUpload, uploadCV);
router15.get("/me/cv", getMyCV);
router15.get("/me/cv-builder", getMyCvBuilder);
router15.put("/me/cv-builder", saveMyCvBuilder);
var candidateProfile_routes_default = router15;

// server/routes/candidateScore.routes.ts
import { Router as Router13 } from "express";

// server/controllers/candidateScore.controller.ts
var getMyScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.getMyScore(
      req.params.applicationId,
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var updateInterviewScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.updateInterviewScore(
      req.params.applicationId,
      req.user.id,
      Number(req.body.interviewScore)
    );
    res.status(200).json({
      status: "success",
      message: "Interview score updated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var updateRecruiterScore2 = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.updateRecruiterScore(
      req.params.applicationId,
      req.user.id,
      Number(req.body.recruiterScore)
    );
    res.status(200).json({
      status: "success",
      message: "Recruiter score updated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var getCandidateScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.getCandidateScore(
      req.params.applicationId,
      req.user.id,
      req.user.role
    );
    res.status(200).json({
      status: "success",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterScores = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const scores = await candidateScore_service_default.getRecruiterScores(
      req.user.id,
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...scores
    });
  } catch (err) {
    next(err);
  }
};
var getRecruiterStatistics4 = async (req, res, next) => {
  try {
    const statistics = await candidateScore_service_default.getRecruiterStatistics(
      req.user.id
    );
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var getAllScores = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const scores = await candidateScore_service_default.getAllScores(
      page,
      limit
    );
    res.status(200).json({
      status: "success",
      ...scores
    });
  } catch (err) {
    next(err);
  }
};
var getAdminStatistics3 = async (req, res, next) => {
  try {
    const statistics = await candidateScore_service_default.getAdminStatistics();
    res.status(200).json({
      status: "success",
      data: statistics
    });
  } catch (err) {
    next(err);
  }
};
var recalculateScore = async (req, res, next) => {
  try {
    const score = await candidateScore_service_default.recalculate(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      message: "Score recalculated successfully.",
      data: score
    });
  } catch (err) {
    next(err);
  }
};
var deleteScore = async (req, res, next) => {
  try {
    const result = await candidateScore_service_default.deleteScore(
      req.params.applicationId
    );
    res.status(200).json({
      status: "success",
      ...result
    });
  } catch (err) {
    next(err);
  }
};

// server/routes/candidateScore.routes.ts
var router16 = Router13();
router16.get(
  "/application/:applicationId",
  protect,
  restrictTo("CANDIDATE"),
  getMyScore
);
router16.get(
  "/application/:applicationId/details",
  protect,
  restrictTo("RECRUITER", "ADMIN"),
  getCandidateScore
);
router16.patch(
  "/application/:applicationId/interview-score",
  protect,
  restrictTo("RECRUITER"),
  updateInterviewScore
);
router16.patch(
  "/application/:applicationId/recruiter-score",
  protect,
  restrictTo("RECRUITER"),
  updateRecruiterScore2
);
router16.get(
  "/recruiter",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterScores
);
router16.get(
  "/recruiter/statistics",
  protect,
  restrictTo("RECRUITER"),
  getRecruiterStatistics4
);
router16.get(
  "/",
  protect,
  restrictTo("ADMIN"),
  getAllScores
);
router16.get(
  "/statistics",
  protect,
  restrictTo("ADMIN"),
  getAdminStatistics3
);
router16.patch(
  "/application/:applicationId/recalculate",
  protect,
  restrictTo("ADMIN"),
  recalculateScore
);
router16.delete(
  "/application/:applicationId",
  protect,
  restrictTo("ADMIN"),
  deleteScore
);
var candidateScore_routes_default = router16;

// server/routes/notification.routes.ts
import { Router as Router14 } from "express";

// server/controllers/notification.controller.ts
init_prisma();
var getMyNotifications = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    const notifications = await prisma_default.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.status(200).json({ status: "success", data: notifications });
  } catch (err) {
    next(err);
  }
};
var markNotificationRead = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    const { id } = req.params;
    const notification = await prisma_default.notification.findFirst({
      where: { id, userId: req.user.id }
    });
    if (!notification) return next(new AppError("Notification not found", 404));
    const updated = await prisma_default.notification.update({
      where: { id },
      data: { read: true }
    });
    res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    next(err);
  }
};
var markAllNotificationsRead = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError("Not authorized", 401));
    await prisma_default.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });
    res.status(200).json({ status: "success" });
  } catch (err) {
    next(err);
  }
};

// server/routes/notification.routes.ts
var router17 = Router14();
router17.use(protect);
router17.get("/", getMyNotifications);
router17.patch("/read-all", markAllNotificationsRead);
router17.patch("/:id/read", markNotificationRead);
var notification_routes_default = router17;

// server/app.ts
dotenv3.config();
if (!process.env.JWT_SECRET) {
  console.warn(
    "\u26A0\uFE0F  JWT_SECRET is not set. Falling back to an insecure default \u2014 set JWT_SECRET in your environment before deploying to production."
  );
}
function createApp() {
  const app2 = express4();
  app2.set("trust proxy", 1);
  if (process.env.NODE_ENV === "production") {
    app2.use(helmet());
  } else {
    app2.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: [
              "'self'",
              "ws:",
              "http://localhost:*",
              "ws://localhost:*",
              "https://*.googleapis.com",
              "https://apis.google.com",
              "https://*.firebaseio.com",
              "wss://*.firebaseio.com",
              "https://*.cloudfunctions.net",
              "https://*.supabase.co",
              "https://res.cloudinary.com"
            ],
            frameSrc: ["'self'", "https://*.firebaseapp.com", "https://accounts.google.com"]
          }
        }
      })
    );
  }
  const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());
  app2.use(
    cors({
      origin: allowedOrigins,
      credentials: true
    })
  );
  app2.use(
    express4.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(cookieParser());
  app2.use(passport_default.initialize());
  if (!configureGoogleStrategy()) {
    console.warn(
      "\u26A0\uFE0F  Google sign-in is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALLBACK_URL). Email+password login is unaffected."
    );
  }
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Too many attempts. Please try again later."
    }
  });
  app2.use("/api/auth/login", authLimiter);
  app2.use("/api/auth/register", authLimiter);
  app2.use("/api/auth/verify-email", authLimiter);
  app2.use("/api/auth/me/password", authLimiter);
  app2.use("/api/auth/resend-verification", authLimiter);
  const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1e3,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Trop de messages envoy\xE9s. R\xE9essayez dans une heure."
    }
  });
  app2.use("/api/contact", contactLimiter);
  const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: "error",
      message: "Trop de tentatives de paiement. R\xE9essayez dans quelques minutes."
    }
  });
  app2.use("/api/payments/checkout", checkoutLimiter);
  app2.use("/api/auth", auth_routes_default);
  app2.use("/api/jobs", job_routes_default);
  app2.use("/api/categories", category_routes_default);
  app2.use("/api/freelance", freelance_routes_default);
  app2.use("/api/applications", application_routes_default);
  app2.use("/api/contact", contact_routes_default);
  app2.use("/api/admin", admin_routes_default);
  app2.use("/api/crm", crm_routes_default);
  app2.use("/api/companies", company_routes_default);
  app2.use("/api/payments", payment_routes_default);
  app2.use("/api/preselection", preselection_routes_default);
  app2.use("/api/oral-presentations", oralPresentation_routes_default);
  app2.use("/api/quiz", quiz_routes_default);
  app2.use("/api/ai-analysis", aiAnalysis_routes_default);
  app2.use("/api/candidates", candidateProfile_routes_default);
  app2.use("/api/candidate-scores", candidateScore_routes_default);
  app2.use("/api/notifications", notification_routes_default);
  app2.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app2.use(errorHandler);
  return app2;
}

// server/vercel-entry.ts
var app = createApp();
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
