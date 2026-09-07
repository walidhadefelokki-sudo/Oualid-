import { Request, Response } from 'express';
import { sendEmail } from '../utils/email';

/**
 * Where contact-form submissions are delivered. Overridable per environment,
 * but the platform's real address is the default rather than a developer's
 * mailbox — an unset variable should not quietly reroute customer enquiries.
 */
const DEFAULT_CONTACT_INBOX = 'contact@darlemploi.dz';

/**
 * Escapes text for inclusion in the email body.
 *
 * The subject and message come from an unauthenticated public form and were
 * previously interpolated into HTML verbatim, so anyone could put working
 * links or spoofed markup into a message that arrives looking like it came
 * from your own platform.
 */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { email, subject, message } = req.body as {
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // A very long message is either a mistake or an abuse attempt; either way
    // it should not be forwarded.
    if (message.length > 5000 || subject.length > 200) {
      return res.status(400).json({ message: 'Your message is too long' });
    }

    const contactInbox =
      process.env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_INBOX;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2B3442;">
        <h2 style="color:#173E7D;">Nouveau message depuis le formulaire de contact</h2>
        <p><strong>De :</strong> ${escapeHtml(email)}</p>
        <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
        <div style="background:#F5F7FA; padding:16px; border-radius:8px; margin:20px 0; white-space:pre-wrap;">${escapeHtml(
          message
        )}</div>
        <p style="color:#6B7686; font-size:12px;">
          Répondez directement à cet email pour joindre l'expéditeur.
        </p>
      </div>
    `;

    const text = [
      'Nouveau message depuis le formulaire de contact',
      '',
      `De : ${email}`,
      `Sujet : ${subject}`,
      '',
      message,
    ].join('\n');

    // replyTo, not from: the message is sent by the platform's own verified
    // sender, so it passes SPF/DKIM, while hitting Reply still reaches the
    // person who wrote in.
    const sent = await sendEmail(contactInbox, `Contact : ${subject}`, html, {
      replyTo: email.trim(),
      text,
    });

    if (!sent) {
      // Previously this always reported success, because sendEmail swallows
      // its own errors — so a submitter was told their message had been sent
      // when nothing had left the building.
      return res.status(502).json({
        message:
          "Votre message n'a pas pu être envoyé. Réessayez plus tard ou écrivez-nous directement à " +
          DEFAULT_CONTACT_INBOX +
          '.',
      });
    }

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error in sendContactMessage:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
