import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Minimal configuration for development
// In production, use real SMTP credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('--- Email Simulation ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${html}`);
      console.log('-------------------------');
      return;
    }

    const info = await transporter.sendMail({
      from: `"JobMatch AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  const subject = 'Welcome to JobMatch AI!';
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome ${name}!</h2>
      <p>Thank you for joining JobMatch AI. We are excited to help you find your next big opportunity or your next great hire.</p>
      <p>Start exploring jobs or posting vacancies today!</p>
      <div style="margin-top: 20px; font-size: 0.8em; color: #666;">
        &copy; 2026 JobMatch AI. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(email, subject, html);
};

export const sendJobMatchEmail = async (email: string, jobTitle: string, company: string, jobId: string) => {
  const subject = `New Job Match: ${jobTitle} at ${company}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>A new job matches your profile!</h2>
      <p>We found a new position that might interest you:</p>
      <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin: 0;">${jobTitle}</h3>
        <p style="margin: 5px 0;"><strong>Company:</strong> ${company}</p>
      </div>
      <p>Click the link below to view the job details and apply:</p>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}/jobs/${jobId}" style="display: inline-block; background: #007bff; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Job</a>
    </div>
  `;
  await sendEmail(email, subject, html);
};
