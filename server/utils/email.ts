import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Mail transport. Two paths, tried in this order:
 *
 * 1. RESEND_API_KEY — sends over HTTPS through Resend's API. This is the path
 *    that actually works in production. darlemploi.dz's own mail server
 *    (mail.darlemploi.dz) accepts no connection on 25, 465 or 587 from outside
 *    the hosting account, and a Vercel function sits outside it too, so no SMTP
 *    configuration can reach it. HTTPS is never firewalled.
 *
 * 2. SMTP_HOST, or Gmail when that is unset — kept as a fallback so an
 *    environment configured before this migration keeps sending rather than
 *    quietly going dark.
 */
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const smtpHost = process.env.SMTP_HOST?.trim();

// Port 465 is implicit TLS; 587 upgrades via STARTTLS. Deriving `secure` from
// the port avoids the classic mismatch where 465 is configured with
// secure:false and the connection hangs until it times out.
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpSecure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === 'true'
  : smtpPort === 465;

const transporter = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

/** Which transport is live — useful in a startup log or a health endpoint. */
export const emailTransportName = resend
  ? 'resend'
  : smtpHost
    ? `smtp:${smtpHost}:${smtpPort}`
    : 'gmail';

/**
 * Checks that mail is configured, without sending anything.
 *
 * For SMTP this opens a connection and authenticates. Resend has no such
 * handshake — an API key is only proven good by a request that uses it, and
 * the endpoints that would test one (domains, api-keys) are refused to a
 * sending-only key — so a key being present is all that can be asserted here.
 */
export const verifyEmailTransport = async (): Promise<
  { ok: true } | { ok: false; error: string }
> => {
  if (resend) return { ok: true };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
};

const APP_URL = process.env.APP_URL || 'https://www.darlemploi.dz';

/**
 * The address recruitment mail is sent from.
 *
 * Separate from EMAIL_USER (the mailbox we authenticate as) because the two
 * are not always the same address: Gmail will only accept a `from` that is a
 * verified alias on the authenticated account, so setting EMAIL_FROM without
 * verifying the alias makes Gmail silently rewrite it back to EMAIL_USER.
 * Falls back to the authenticated mailbox so mail still sends if EMAIL_FROM
 * has not been configured yet.
 */
const FROM_ADDRESS = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const FROM_NAME = "Dar L'emploi";

const BRAND = {
  navy: '#173E7D',
  orange: '#F68D58',
  ink: '#2B3442',
  muted: '#6B7686',
  rule: '#E4E8EE',
  ground: '#F5F7FA',
};

/**
 * Wraps content in the Dar L'emploi email shell.
 *
 * Built with tables and inline styles on purpose — Outlook and several
 * webmail clients strip <style> blocks and do not implement flexbox, so the
 * layout has to survive without either.
 */
const layout = (heading: string, body: string) => `
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
                &copy; ${new Date().getFullYear()} Dar L'emploi. Tous droits r&eacute;serv&eacute;s.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>`;

const button = (href: string, label: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:${BRAND.navy};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;

const paragraph = (text: string) =>
  `<p style="margin:0 0 14px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${text}</p>`;

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (resend) {
    // Resend reports failures in the response body rather than by throwing,
    // so an unchecked call looks exactly like a successful one.
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    if (error) {
      // Non-fatal by design: registration must not fail because mail did.
      // Loud, though — mail silently never arriving is how this went unnoticed.
      console.error(
        `Email to ${to} was NOT sent (Resend ${error.name}): ${error.message}`
      );
      return;
    }

    console.log('Message sent via Resend: %s', data?.id);
    return;
  }

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      // Deliberately non-fatal: registration must still succeed on an
      // environment where mail is not configured yet.
      console.log('--- Email simulation (no RESEND_API_KEY, no EMAIL_USER/EMAIL_PASS) ---');
      console.log(`From: ${FROM_NAME} <${FROM_ADDRESS ?? 'unset'}>`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('----------------------------------------------------------------------');
      return;
    }

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error(`Email to ${to} was NOT sent:`, error);
  }
};

/**
 * Registration confirmation.
 *
 * `role` is optional so the existing two-argument calls keep working; when
 * given, the email names the account type that was created. There is no
 * verification link because the platform has no email-verification flow —
 * `User.emailVerified` exists but nothing issues or checks a token.
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string,
  role?: 'CANDIDATE' | 'RECRUITER' | string
) => {
  const isRecruiter = role === 'RECRUITER';
  const accountLabel = isRecruiter ? 'Recruteur' : 'Candidat';

  const nextSteps = isRecruiter
    ? `
      <li style="margin-bottom:8px;">Compl&eacute;tez le profil de votre entreprise (logo, secteur, description).</li>
      <li style="margin-bottom:8px;">Publiez votre premi&egrave;re offre d'emploi.</li>
      <li style="margin-bottom:8px;">Consultez les candidatures et les analyses IA.</li>`
    : `
      <li style="margin-bottom:8px;">Compl&eacute;tez votre profil et t&eacute;l&eacute;versez votre CV.</li>
      <li style="margin-bottom:8px;">Enregistrez votre pr&eacute;sentation vid&eacute;o en arabe.</li>
      <li style="margin-bottom:8px;">Explorez les offres et postulez en un clic.</li>`;

  const body = `
    ${paragraph(`Bonjour <strong>${name}</strong>,`)}
    ${paragraph(
      `Votre compte Dar L'emploi a bien &eacute;t&eacute; cr&eacute;&eacute;. Vous rejoignez la plateforme de recrutement qui met l'intelligence artificielle au service des talents et des entreprises en Alg&eacute;rie.`
    )}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 10px;color:${BRAND.muted};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Votre compte</p>
          <p style="margin:0;color:${BRAND.ink};font-size:14px;line-height:1.8;">
            <strong style="color:${BRAND.navy};">Email</strong> &nbsp;${email}<br>
            <strong style="color:${BRAND.navy};">Type de compte</strong> &nbsp;${accountLabel}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px;color:${BRAND.navy};font-size:15px;font-weight:700;">Pour bien commencer</p>
    <ul style="margin:0 0 4px;padding-left:20px;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      ${nextSteps}
    </ul>

    ${button(APP_URL, 'Acc&eacute;der &agrave; mon espace')}

    ${paragraph(
      `<span style="color:${BRAND.muted};font-size:13px;">Vous n'&ecirc;tes pas &agrave; l'origine de cette inscription&nbsp;? Ignorez simplement ce message ou r&eacute;pondez-y pour nous en informer.</span>`
    )}`;

  await sendEmail(email, `Bienvenue sur Dar L'emploi, ${name}`, layout('Bienvenue sur Dar L\'emploi', body));
};

export const sendJobMatchEmail = async (
  email: string,
  jobTitle: string,
  company: string,
  jobId: string
) => {
  const body = `
    ${paragraph(`Une nouvelle offre correspond &agrave; votre profil&nbsp;:`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0;color:${BRAND.navy};font-size:17px;font-weight:700;">${jobTitle}</p>
          <p style="margin:6px 0 0;color:${BRAND.muted};font-size:14px;">${company}</p>
        </td>
      </tr>
    </table>

    ${button(`${APP_URL}/jobs/${jobId}`, `Voir l'offre`)}`;

  await sendEmail(
    email,
    `Nouvelle offre : ${jobTitle} chez ${company}`,
    layout('Une offre pour vous', body)
  );
};
