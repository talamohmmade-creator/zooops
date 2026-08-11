const nodemailer = require('nodemailer');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));

function smtpConfigured() {
  return ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].every((key) => process.env[key]);
}

async function sendInvitationEmail({ to, fullName, roleName, inviteLink, invitedBy }) {
  if (!smtpConfigured()) throw new Error('SMTP is incomplete. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in Render.');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  const safeName = escapeHtml(fullName);
  const safeRole = escapeHtml(roleName || 'Team member');
  const safeInviter = escapeHtml(invitedBy || 'your ZooOps manager');
  const safeLink = escapeHtml(inviteLink);
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'You have been invited to ZooOps',
    text: `Hello ${fullName},\n\n${invitedBy || 'Your manager'} invited you to ZooOps as ${roleName || 'a team member'}.\n\nGet started: ${inviteLink}\n\nThis invitation expires in 7 days. Use the invited email address (${to}) when creating your account.`,
    html: `<!doctype html><html><body style="margin:0;background:#f2f5f8;font-family:Arial,sans-serif;color:#202b39"><div style="max-width:600px;margin:30px auto;background:#fff;border:1px solid #dde6ef;border-radius:18px;overflow:hidden"><div style="background:#16a6a0;color:#fff;padding:24px 30px;font-size:24px;font-weight:800">ZooOps</div><div style="padding:34px 30px"><h1 style="font-size:28px;margin:0 0 22px">You have been invited to ZooOps</h1><p style="font-size:17px;line-height:1.6">Hello ${safeName},</p><p style="font-size:17px;line-height:1.6">${safeInviter} invited you to join ZooOps as <strong>${safeRole}</strong>.</p><a href="${safeLink}" style="display:inline-block;margin:18px 0;background:#16a6a0;color:#fff;text-decoration:none;font-size:18px;font-weight:800;padding:15px 25px;border-radius:10px">Get started</a><p style="color:#607086;line-height:1.6">This secure invitation expires in 7 days. Your account will use <strong>${escapeHtml(to)}</strong> and automatically open the windows allowed for your assigned role.</p><p style="color:#607086;word-break:break-all">If the button does not work, copy this link:<br><a href="${safeLink}">${safeLink}</a></p></div></div></body></html>`
  });
}

module.exports = sendInvitationEmail;
