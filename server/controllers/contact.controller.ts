import { Request, Response } from 'express';
import { sendEmail } from '../utils/email';

export const sendContactMessage = async (req: Request, res: Response) => {
  try {
    const { email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const contactEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;

    if (!contactEmail) {
      console.error('No contact email configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>${message}</p>
        </div>
      </div>
    `;

    await sendEmail(contactEmail, `Contact Form: ${subject}`, html);

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error in sendContactMessage:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};
