import { Request, Response } from 'express';
import {
  sendEmail,
  sendCorporateEnquiryEmail,
  sendCorporateEnquiryAck,
} from '../utils/email';

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

/**
 * A company asking to be contacted about the Corporate plan.
 *
 * Public: a prospective client is by definition not signed in yet.
 */
export const sendCorporateEnquiry = async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, email, phone, teamSize, message } = req.body as Record<
      string,
      string | undefined
    >;

    if (!companyName?.trim() || !contactName?.trim() || !email?.trim()) {
      return res
        .status(400)
        .json({ message: "L'entreprise, le contact et l'email sont requis." });
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ message: 'Veuillez fournir une adresse email valide.' });
    }

    if ((message ?? '').length > 5000 || companyName.length > 200 || contactName.length > 200) {
      return res.status(400).json({ message: 'Votre message est trop long.' });
    }

    const enquiry = {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      teamSize: teamSize?.trim() || null,
      message: message?.trim() || null,
    };

    const delivered = await sendCorporateEnquiryEmail(enquiry);

    if (!delivered) {
      // Reported honestly rather than pretending: a sales enquiry silently
      // vanishing is worse than asking the company to try again.
      return res.status(502).json({
        message:
          "Votre demande n'a pas pu être envoyée. Réessayez plus tard ou écrivez-nous directement à contact@darlemploi.dz.",
      });
    }

    // The acknowledgement is a courtesy: its failure must not make a delivered
    // enquiry look like a failure to the company that sent it.
    sendCorporateEnquiryAck(enquiry).catch((err) =>
      console.error('Corporate acknowledgement failed:', err)
    );

    res.status(200).json({ message: 'Demande envoyée avec succès' });
  } catch (error) {
    console.error('Error in sendCorporateEnquiry:', error);
    res.status(500).json({ message: 'Failed to send enquiry' });
  }
};
