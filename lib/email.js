import nodemailer from 'nodemailer';

export async function sendPasswordSetupEmail(email, name, resetToken, origin) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error('Email credentials not configured in environment variables.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
  });

  const setupUrl = `${origin}/set-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Set Up Your ePassbook Password</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #090e1a;
          color: #f8fafc;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 580px;
          margin: 0 auto;
          background-color: #0d1425;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content p {
          margin: 0 0 20px 0;
          color: #94a3b8;
          font-size: 15px;
        }
        .content strong {
          color: #ffffff;
        }
        .btn-container {
          text-align: center;
          margin: 30px 0;
        }
        .btn {
          display: inline-block;
          padding: 14px 30px;
          background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
          transition: transform 0.2s ease;
        }
        .footer {
          background-color: #090e1a;
          padding: 20px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .footer p {
          margin: 0;
          color: #475569;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ePassbook Password Setup</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name || 'User'}</strong>,</p>
          <p>You tried to log in or register with email on ePassbook, but your account doesn't have a password set yet. This happens if you initially signed in via Google, or if this is a new registration.</p>
          <p>Click the button below to set up your password securely and activate password login for your account:</p>
          <div class="btn-container">
            <a href="${setupUrl}" class="btn" target="_blank">Set Up Password</a>
          </div>
          <p>This password setup link is valid for the next 1 hour. If you didn't request this email, you can safely ignore it.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ePassbook. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ePassbook" <${user}>`,
      to: email,
      subject: 'Set Up Your ePassbook Password',
      html: htmlContent,
    });
    console.log('Password setup email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password setup email:', error);
    return false;
  }
}
