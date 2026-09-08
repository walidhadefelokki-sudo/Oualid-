import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Mail transport, preferred first:
 *
 * 1. SMTP_HOST — the domain's own mail server. Preferred because mail then
 *    genuinely originates from the domain it claims: SPF and DKIM align
 *    without extra DNS, replies land in the real inscription@darlemploi.dz
 *    mailbox, and no third party sees the contents.
 *
 *    The host is quantum.octenium.net, NOT mail.darlemploi.dz. That name has
 *    no A record — the domain's MX still points at it, so inbound mail is
 *    misrouted too — and the server's TLS certificate is issued for
 *    quantum.octenium.net, so connecting under any other name fails
 *    certificate verification rather than sending.
 *
 * 2. RESEND_API_KEY — HTTPS fallback, used when SMTP is unset or the send
 *    fails. Worth keeping: a serverless platform can block outbound SMTP, and
 *    a fallback that needs no ports is the difference between degraded mail
 *    and none. It can only send from a domain verified in Resend, so it is a
 *    safety net rather than an equal path.
 *
 * 3. Gmail — legacy, only when neither of the above is configured.
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
export const emailTransportName = smtpHost
  ? `smtp:${smtpHost}:${smtpPort}`
  : resend
    ? 'resend'
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
  if (!smtpHost) return resend ? { ok: true } : { ok: false, error: 'No mail transport configured.' };
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
const FROM_NAME = "Dar L'Emploi";

/**
 * Sender addresses, one per kind of message.
 *
 * Account-lifecycle mail comes from register@, transactional confirmations
 * from info@, so a recipient can tell at a glance which is which and filter
 * accordingly.
 *
 * Both fall back to EMAIL_FROM when unset. That matters: the SMTP server
 * verifies the sender against real mailboxes and answers
 * "550 No Such User Here" for one that does not exist, which would fail the
 * send outright. Falling back keeps mail flowing until the mailbox is created
 * in the hosting panel.
 */
const FROM_REGISTER = process.env.EMAIL_FROM_REGISTER?.trim() || FROM_ADDRESS;
const FROM_INFO = process.env.EMAIL_FROM_INFO?.trim() || FROM_ADDRESS;

/** dd/mm/yyyy, the convention used across the platform. */
const formatDate = (date: Date = new Date()) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** A labelled detail row, as used in the confirmation emails. */
const detailRow = (icon: string, label: string, value: string) => `
  <tr>
    <td style="padding:6px 0;color:${BRAND.ink};font-size:15px;line-height:1.6;">
      <span style="display:inline-block;width:22px;">${icon}</span>
      <strong style="color:${BRAND.navy};">${label}</strong>&nbsp;${value}
    </td>
  </tr>`;

const detailBlock = (rows: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:#F7F9FC;border:1px solid ${BRAND.rule};border-radius:10px;">
    <tr><td style="padding:18px 20px;"><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
  </table>`;

/** A short bulleted list of selling points, one per line with its icon. */
const iconList = (items: Array<[string, string]>) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;">
    ${items
      .map(
        ([icon, text]) => `<tr><td style="padding:5px 0;color:${BRAND.ink};font-size:15px;line-height:1.6;">
          <span style="display:inline-block;width:24px;">${icon}</span>${text}</td></tr>`
      )
      .join('')}
  </table>`;

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

export interface SendEmailOptions {
  /**
   * Sender address for this message, overriding the default. Must be a real
   * mailbox on the domain: the SMTP server verifies it and rejects the send
   * with "550 No Such User Here" otherwise.
   */
  from?: string;
  /**
   * Where a reply should go, when that is not the sender.
   *
   * Mail is always *sent* from the platform's own verified address so it
   * passes SPF/DKIM; putting a visitor's address in `from` would fail
   * alignment and land in spam. replyTo keeps Reply working anyway.
   */
  replyTo?: string;
  /** Plain-text alternative, for clients that do not render HTML. */
  text?: string;
}

/**
 * Sends one email. Resolves true when the provider accepted it.
 *
 * Callers that must not fail because mail failed (registration, job matches)
 * can ignore the result; the contact form checks it, because telling someone
 * their message was sent when it was not is worse than telling them to try
 * again.
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options: SendEmailOptions = {}
): Promise<boolean> => {
  const from = `"${FROM_NAME}" <${options.from ?? FROM_ADDRESS}>`;

  // --- 1. The domain's own mail server -------------------------------------
  if (smtpHost) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        ...(options.text ? { text: options.text } : {}),
        ...(options.replyTo ? { replyTo: options.replyTo } : {}),
      });
      console.log(`Mail to ${to} sent via ${smtpHost}: ${info.messageId}`);
      return true;
    } catch (error) {
      // Loud, then fall through. Mail silently never arriving is how the
      // broken configuration went unnoticed for weeks.
      console.error(`SMTP send to ${to} failed via ${smtpHost}:`, error);
      if (!resend) return false;
      console.warn('Falling back to Resend.');
    }
  }

  // --- 2. HTTPS fallback ----------------------------------------------------
  if (resend) {
    // Resend reports failures in the response body rather than by throwing,
    // so an unchecked call looks exactly like a successful one.
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(options.text ? { text: options.text } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (error) {
      console.error(
        `Email to ${to} was NOT sent (Resend ${error.name}): ${error.message}`
      );
      return false;
    }

    console.log('Message sent via Resend: %s', data?.id);
    return true;
  }

  // --- 3. Nothing configured ------------------------------------------------
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Deliberately non-fatal: registration must still succeed on an
    // environment where mail is not configured yet.
    console.log('--- Email simulation (no SMTP_HOST, no RESEND_API_KEY) ---');
    console.log(`From: ${FROM_NAME} <${FROM_ADDRESS ?? 'unset'}>`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('----------------------------------------------------------');
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(options.text ? { text: options.text } : {}),
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error(`Email to ${to} was NOT sent:`, error);
    return false;
  }
};

/* -------------------------------------------------------------------------- */
/*                          Account lifecycle — register@                     */
/* -------------------------------------------------------------------------- */

/**
 * Candidate: account created.
 *
 * There is no verification link because the platform has no email-verification
 * flow — `User.emailVerified` exists but nothing issues or checks a token.
 */
export const sendCandidateWelcomeEmail = async (email: string, firstName?: string | null) => {
  const greeting = firstName?.trim() || 'et bienvenue';

  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(`<strong>Bienvenue sur Dar L'Emploi&nbsp;!</strong>`)}
    ${paragraph(
      `Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez maintenant d&eacute;couvrir des opportunit&eacute;s professionnelles adapt&eacute;es &agrave; votre profil et postuler en quelques clics.`
    )}

    ${iconList([
      ['&#128188;', 'Explorez les offres'],
      ['&#127919;', 'Trouvez celles qui correspondent &agrave; votre profil'],
      ['&#9889;', 'Postulez simplement et rapidement'],
    ])}

    ${paragraph(`Votre prochaine opportunit&eacute; peut commencer ici.`)}

    ${button(APP_URL, 'Explorer les offres')}

    ${paragraph(`&Agrave; bient&ocirc;t sur Dar L'Emploi,`)}`;

  const text = [
    `Bonjour ${greeting},`,
    '',
    "Bienvenue sur Dar L'Emploi !",
    '',
    'Votre compte a été créé avec succès. Vous pouvez maintenant découvrir des opportunités professionnelles adaptées à votre profil et postuler en quelques clics.',
    '',
    '- Explorez les offres',
    '- Trouvez celles qui correspondent à votre profil',
    '- Postulez simplement et rapidement',
    '',
    'Votre prochaine opportunité peut commencer ici.',
    APP_URL,
    '',
    "À bientôt sur Dar L'Emploi,",
  ].join('\n');

  return sendEmail(
    email,
    "Bienvenue sur Dar L'Emploi — Votre recherche commence maintenant 🚀",
    layout("Bienvenue sur Dar L'Emploi", body),
    { from: FROM_REGISTER, text }
  );
};

/** Recruiter: company account created. */
export const sendRecruiterWelcomeEmail = async (email: string, companyName?: string | null) => {
  const greeting = companyName?.trim() || 'et bienvenue';

  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(`<strong>Bienvenue sur Dar L'Emploi&nbsp;!</strong>`)}
    ${paragraph(
      `Votre compte entreprise a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&egrave;s maintenant publier votre premi&egrave;re offre d'emploi <strong>gratuitement</strong> et commencer &agrave; recevoir des candidatures de profils correspondant &agrave; vos besoins.`
    )}

    ${iconList([
      ['&#128640;', 'Votre premi&egrave;re offre est offerte'],
      ['&#128101;', 'Recevez des candidatures qualifi&eacute;es'],
      ['&#9889;', 'G&eacute;rez vos recrutements simplement depuis votre espace entreprise'],
    ])}

    ${paragraph(`Votre prochain collaborateur est peut-&ecirc;tre d&eacute;j&agrave; sur Dar L'Emploi.`)}

    ${button(APP_URL, 'Publier une offre')}

    ${paragraph(`Merci de votre confiance.`)}`;

  const text = [
    `Bonjour ${greeting},`,
    '',
    "Bienvenue sur Dar L'Emploi !",
    '',
    "Votre compte entreprise a été créé avec succès. Vous pouvez dès maintenant publier votre première offre d'emploi gratuitement et commencer à recevoir des candidatures de profils correspondant à vos besoins.",
    '',
    '- Votre première offre est offerte',
    '- Recevez des candidatures qualifiées',
    '- Gérez vos recrutements simplement depuis votre espace entreprise',
    '',
    "Votre prochain collaborateur est peut-être déjà sur Dar L'Emploi.",
    APP_URL,
    '',
    'Merci de votre confiance.',
  ].join('\n');

  return sendEmail(
    email,
    "Bienvenue sur Dar L'Emploi — Votre première offre est gratuite 🎉",
    layout("Bienvenue sur Dar L'Emploi", body),
    { from: FROM_REGISTER, text }
  );
};

/**
 * Routes a new account to the right welcome email.
 *
 * Kept so the registration controller has one call regardless of role, and so
 * the role decision lives beside the templates rather than in the controller.
 */
export const sendWelcomeEmail = async (
  email: string,
  name?: string | null,
  role?: 'CANDIDATE' | 'RECRUITER' | string
) =>
  role === 'RECRUITER'
    ? sendRecruiterWelcomeEmail(email, name)
    : sendCandidateWelcomeEmail(email, name);

/* -------------------------------------------------------------------------- */
/*                       Transactional confirmations — info@                  */
/* -------------------------------------------------------------------------- */

export interface ApplicationSentDetails {
  firstName?: string | null;
  jobTitle: string;
  company: string;
  city?: string | null;
  appliedAt?: Date;
}

/** Candidate: their application reached the recruiter. */
export const sendApplicationSentEmail = async (
  email: string,
  details: ApplicationSentDetails
) => {
  const greeting = details.firstName?.trim() || 'et merci';
  const city = details.city?.trim() || 'Non pr&eacute;cis&eacute;e';
  const date = formatDate(details.appliedAt);

  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
      `Votre candidature pour le poste de &laquo;&nbsp;<strong>${details.jobTitle}</strong>&nbsp;&raquo; aupr&egrave;s de <strong>${details.company}</strong> a bien &eacute;t&eacute; envoy&eacute;e.`
    )}

    ${detailBlock(
      detailRow('&#128204;', 'Poste', details.jobTitle) +
        detailRow('&#127970;', 'Entreprise', details.company) +
        detailRow('&#128205;', 'Localisation', city) +
        detailRow('&#128197;', 'Date', date)
    )}

    ${paragraph(
      `Votre profil a &eacute;t&eacute; transmis &agrave; l'entreprise. Si celle-ci souhaite poursuivre le processus de recrutement, elle pourra vous contacter directement.`
    )}
    ${paragraph(`En attendant, continuez &agrave; explorer les opportunit&eacute;s disponibles sur Dar L'Emploi.`)}

    ${button(APP_URL, 'Voir d\'autres offres')}

    ${paragraph(
      `<em>Une candidature aujourd'hui peut devenir une opportunit&eacute; demain.</em><br>Bonne chance&nbsp;! &#127808;`
    )}`;

  const text = [
    `Bonjour ${greeting},`,
    '',
    `Votre candidature pour le poste de « ${details.jobTitle} » auprès de ${details.company} a bien été envoyée.`,
    '',
    `Poste : ${details.jobTitle}`,
    `Entreprise : ${details.company}`,
    `Localisation : ${details.city ?? 'Non précisée'}`,
    `Date : ${date}`,
    '',
    "Votre profil a été transmis à l'entreprise. Si celle-ci souhaite poursuivre le processus de recrutement, elle pourra vous contacter directement.",
    '',
    "En attendant, continuez à explorer les opportunités disponibles sur Dar L'Emploi.",
    APP_URL,
    '',
    'Bonne chance !',
  ].join('\n');

  return sendEmail(
    email,
    `Candidature envoyée avec succès — ${details.jobTitle} ✅`,
    layout('Candidature envoy&eacute;e', body),
    { from: FROM_INFO, text }
  );
};

export interface JobPublishedDetails {
  companyName?: string | null;
  jobTitle: string;
  city?: string | null;
  publishedAt?: Date;
}

/** Recruiter: their job offer is live. */
export const sendJobPublishedEmail = async (
  email: string,
  details: JobPublishedDetails
) => {
  const greeting = details.companyName?.trim() || 'et merci';
  const city = details.city?.trim() || 'Non pr&eacute;cis&eacute;e';
  const date = formatDate(details.publishedAt);

  const body = `
    ${paragraph(`Bonjour <strong>${greeting}</strong>,`)}
    ${paragraph(
      `Votre offre &laquo;&nbsp;<strong>${details.jobTitle}</strong>&nbsp;&raquo; a &eacute;t&eacute; publi&eacute;e avec succ&egrave;s sur Dar L'Emploi.`
    )}
    ${paragraph(`Elle est maintenant visible par les candidats correspondant &agrave; vos crit&egrave;res.`)}

    <p style="margin:0 0 6px;color:${BRAND.navy};font-size:15px;font-weight:700;">D&eacute;tails de votre offre</p>
    ${detailBlock(
      detailRow('&#128204;', 'Poste', details.jobTitle) +
        detailRow('&#128205;', 'Localisation', city) +
        detailRow('&#128197;', 'Date de publication', date)
    )}

    ${paragraph(
      `Vous pouvez suivre les candidatures et consulter les profils des candidats directement depuis votre espace entreprise.`
    )}

    ${button(APP_URL, 'Voir mes candidatures')}

    ${paragraph(
      `Dar L'Emploi vous accompagne pour trouver le bon profil, simplement et rapidement.<br>Merci de votre confiance.`
    )}`;

  const text = [
    `Bonjour ${greeting},`,
    '',
    `Votre offre « ${details.jobTitle} » a été publiée avec succès sur Dar L'Emploi.`,
    'Elle est maintenant visible par les candidats correspondant à vos critères.',
    '',
    'Détails de votre offre',
    `Poste : ${details.jobTitle}`,
    `Localisation : ${details.city ?? 'Non précisée'}`,
    `Date de publication : ${date}`,
    '',
    'Vous pouvez suivre les candidatures et consulter les profils des candidats directement depuis votre espace entreprise.',
    APP_URL,
    '',
    'Merci de votre confiance.',
  ].join('\n');

  return sendEmail(
    email,
    "Votre offre d'emploi est publiée avec succès ✅",
    layout('Offre publi&eacute;e', body),
    { from: FROM_INFO, text }
  );
};

/**
 * Candidate: a newly posted job looks like a match for them.
 *
 * Not one of the four business templates — this is the pre-existing match
 * notification the job controller sends in the background, kept so posting a
 * job behaves as it did.
 */
export const sendJobMatchEmail = async (
  email: string,
  jobTitle: string,
  company: string,
  jobId: string
) => {
  const body = `
    ${paragraph(`Une nouvelle offre correspond &agrave; votre profil&nbsp;:`)}

    ${detailBlock(
      detailRow('&#128204;', 'Poste', jobTitle) + detailRow('&#127970;', 'Entreprise', company)
    )}

    ${button(`${APP_URL}/jobs/${jobId}`, `Voir l'offre`)}`;

  const text = [
    'Une nouvelle offre correspond à votre profil :',
    '',
    `Poste : ${jobTitle}`,
    `Entreprise : ${company}`,
    '',
    `${APP_URL}/jobs/${jobId}`,
  ].join('\n');

  return sendEmail(
    email,
    `Nouvelle offre : ${jobTitle} chez ${company}`,
    layout('Une offre pour vous', body),
    { from: FROM_INFO, text }
  );
};
