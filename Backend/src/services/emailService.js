function getInviteLink(token) {
  const baseUrl = process.env.INVITE_BASE_URL || process.env.CLIENT_URL || 'http://localhost:3000/App3.html';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}invite=${encodeURIComponent(token)}`;
}

function smtpIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

async function sendInvitationEmail(invitation) {
  const inviteLink = getInviteLink(invitation.token);

  if (!smtpIsConfigured()) {
    return {
      sent: false,
      status: 'not_configured',
      inviteLink,
      error: 'SMTP email settings are not configured in .env.'
    };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    return {
      sent: false,
      status: 'failed',
      inviteLink,
      error: 'Nodemailer is not installed. Run: npm.cmd install nodemailer'
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: invitation.email,
    subject: 'You have been invited to ZooOps',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#202b39">
        <h2>You have been invited to ZooOps</h2>
        <p>Hello ${invitation.fullName},</p>
        <p>You have been invited to join ZooOps. Click the button below to get started.</p>
        <p>
          <a href="${inviteLink}" style="display:inline-block;background:#16a6a0;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">
            Get started
          </a>
        </p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${inviteLink}</p>
      </div>
    `
  });

  return {
    sent: true,
    status: 'sent',
    inviteLink
  };
}

module.exports = {
  getInviteLink,
  sendInvitationEmail
};
