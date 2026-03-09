// libs imports
import nodemailer from "nodemailer";

/**
 * Lazy-initialised transporter — created once on first use.
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE (true/false),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * For local dev without a real SMTP server, set NODE_ENV=development
 * and the transporter falls back to Ethereal (auto-generated test account).
 */
let _transporter = null;

const getTransporter = async () => {
  if (_transporter) return _transporter;

  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    // Ethereal auto-generates a throwaway test account — no real emails sent
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Using Ethereal test email account:", testAccount.user);
    return _transporter;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
};

/**
 * Send a generic email.
 * @param {{ to: string, subject: string, html: string }} options
 */
export const sendEmail = async ({ to, subject, html }) => {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || "Vami <noreply@vami.app>";

  const info = await transporter.sendMail({ from, to, subject, html });

  // In development, log the Ethereal preview URL
  if (process.env.NODE_ENV === "development") {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log("📧 Email preview:", previewUrl);
    }
  }

  return info;
};

/**
 * Send an email-verification link to the user.
 * @param {{ to: string, username: string, token: string }} params
 */
export const sendVerificationEmail = async ({ to, username, token }) => {
  const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  return sendEmail({
    to,
    subject: "Verify your Vami account",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2>Welcome to Vami, ${username}!</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;
                  color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
          Verify Email
        </a>
        <p style="color:#6b7280;margin-top:20px;font-size:13px">
          This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
};
