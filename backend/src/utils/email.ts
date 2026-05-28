import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  userId: string;
  validateUrl: string;
}

/** Sends a welcome email to a newly created student with their NACOS User ID. */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #1e40af; color: #fff; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #333; }
    .id-box { background: #eff6ff; border: 2px dashed #1e40af; border-radius: 8px;
               padding: 16px; text-align: center; margin: 24px 0; }
    .id-box span { font-size: 22px; font-weight: bold; color: #1e40af; letter-spacing: 2px; }
    .btn { display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px;
           border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; }
    .footer { background: #f0f0f0; padding: 16px 32px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NACOS-AIFUE Portal</h1>
      <p style="margin:8px 0 0">Computer Science Department</p>
    </div>
    <div class="body">
      <p>Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p>Welcome to the NACOS-AIFUE Student Portal. Your account has been created successfully.</p>
      <p>Your unique <strong>Student User ID</strong> is:</p>
      <div class="id-box">
        <span>${escapeHtml(data.userId)}</span>
      </div>
      <p>Please keep this ID safe — you will need it to log in to the portal.</p>
      <p>To activate your account, click the button below and set your password:</p>
      <p style="text-align:center">
        <a href="${data.validateUrl}" class="btn">Activate My Account</a>
      </p>
      <p style="font-size:13px;color:#666">
        Or copy this link into your browser:<br/>
        <a href="${data.validateUrl}">${data.validateUrl}</a>
      </p>
      <p>This link does not expire. If you have any issues, contact the department admin.</p>
    </div>
    <div class="footer">
      NACOS-AIFUE Computer Science Department &bull; Aifue University<br/>
      This is an automated message. Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: data.email,
    subject: `Your NACOS-AIFUE Student ID: ${data.userId}`,
    html,
    text: `Dear ${data.name},\n\nYour NACOS-AIFUE Student User ID is: ${data.userId}\n\nActivate your account at: ${data.validateUrl}\n\nNACOS-AIFUE CS Department`,
  });
}

export interface PasswordResetEmailData {
  name: string;
  email: string;
  resetUrl: string;
}

/** Sends a password reset link (expires in 30 minutes). */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1e40af;color:#fff;padding:32px;text-align:center">
      <h1 style="margin:0">Password Reset</h1>
    </div>
    <div style="padding:32px;color:#333">
      <p>Dear <strong>${escapeHtml(data.name)}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <p style="background:#fff3cd;padding:12px;border-radius:6px;font-size:13px">
        ⚠️ This link expires in <strong>30 minutes</strong>.
      </p>
      <p style="text-align:center">
        <a href="${data.resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold">Reset Password</a>
      </p>
      <p style="font-size:13px;color:#666">Link: <a href="${data.resetUrl}">${data.resetUrl}</a></p>
      <p>If you did not request this, ignore this email — your account is safe.</p>
    </div>
  </div>
</body>
</html>`;

  await getTransporter().sendMail({
    from: env.EMAIL_FROM,
    to: data.email,
    subject: 'Reset Your NACOS-AIFUE Portal Password',
    html,
    text: `Reset your password at: ${data.resetUrl}\n\nThis link expires in 30 minutes.`,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
