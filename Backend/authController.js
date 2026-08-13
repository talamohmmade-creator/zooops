const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Invitation = require('../models/Invitation');
const createToken = require('../utils/createToken');
const formatUser = require('../utils/formatUser');

const normalizeEmail = (email = '') => email.toLowerCase().trim();
const appUrl = () => (process.env.CLIENT_URL || process.env.PUBLIC_URL || '').replace(/\/$/, '');
const callbackUrl = () => process.env.GOOGLE_CALLBACK_URL || `${process.env.PUBLIC_URL?.replace(/\/$/, '')}/api/auth/google/callback`;
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const user = await User.findOne({ email }).populate('role');
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  return res.json({ message: 'Login successful.', token: createToken(user), user: formatUser(user) });
}

async function setupManager(req, res) {
  const email = normalizeEmail(req.body.email);
  const { password, fullName } = req.body;
  if (!email || !fullName || !password || password.length < 8) {
    return res.status(400).json({ message: 'Name, a valid email, and a password of at least 8 characters are required.' });
  }
  const userCount = await User.countDocuments();
  const approvedManagerEmails = (process.env.MANAGER_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean);
  if (userCount > 0 && !approvedManagerEmails.includes(email)) {
    return res.status(403).json({ message: 'This email is not approved as a manager. Add it to MANAGER_EMAILS in Render, or ask a manager for a user invitation.' });
  }
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account already exists for this email.' });
  let role = await Role.findOne({ name: 'Management' });
  if (!role) role = await Role.create({ name: 'Management', description: 'Can manage ZooOps operations.', permissions: [
    { resource: 'users', actions: ['create', 'read', 'update', 'manage'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'assign'] },
    { resource: 'evidence', actions: ['read', 'approve', 'return'] },
    { resource: 'reports', actions: ['read', 'manage'] }
  ] });
  const user = await User.create({ fullName, email, passwordHash: await bcrypt.hash(password, 12), role: role._id, jobTitle: 'Manager' });
  await user.populate('role');
  return res.status(201).json({ token: createToken(user), user: formatUser(user) });
}

async function registerFromInvite(req, res) {
  const rawToken = req.body.inviteToken || req.body.token;
  const { password } = req.body;
  if (!rawToken || !password || password.length < 8) return res.status(400).json({ message: 'Invitation and an 8-character password are required.' });
  const invitation = await Invitation.findOne({ tokenHash: hashToken(rawToken), status: 'pending', expiresAt: { $gt: new Date() } });
  if (!invitation) return res.status(400).json({ message: 'This invitation is invalid or expired.' });
  if (await User.exists({ email: invitation.email })) return res.status(409).json({ message: 'An account already exists for this email. Sign in instead.' });
  const user = await User.create({ fullName: req.body.fullName || invitation.fullName, email: invitation.email, passwordHash: await bcrypt.hash(password, 12), role: invitation.role, jobTitle: invitation.jobTitle, customPermissions: invitation.customPermissions });
  invitation.status = 'accepted'; invitation.acceptedAt = new Date(); await invitation.save();
  await user.populate('role');
  return res.status(201).json({ token: createToken(user), user: formatUser(user) });
}

function googleStart(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.PUBLIC_URL) return res.redirect(`${appUrl()}/App3.html?oauthError=${encodeURIComponent('Google login is not configured yet.')}`);
  const state = jwt.sign({ invite: req.query.invite || null }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: callbackUrl(), response_type: 'code', scope: 'openid email profile', prompt: 'select_account', state });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function googleCallback(req, res) {
  try {
    const state = jwt.verify(req.query.state, process.env.JWT_SECRET);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: req.query.code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl(), grant_type: 'authorization_code' }) });
    if (!tokenResponse.ok) throw new Error('Google rejected the authorization code.');
    const googleTokens = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${googleTokens.access_token}` } });
    const profile = await profileResponse.json();
    if (!profile.email_verified) throw new Error('Google email is not verified.');
    const email = normalizeEmail(profile.email);
    let user = await User.findOne({ email }).populate('role');
    if (!user && state.invite) {
      const invitation = await Invitation.findOne({ tokenHash: hashToken(state.invite), email, status: 'pending', expiresAt: { $gt: new Date() } });
      if (!invitation) throw new Error('Invitation is invalid, expired, or belongs to another email.');
      user = await User.create({ fullName: invitation.fullName || profile.name, email, googleId: profile.sub, role: invitation.role, jobTitle: invitation.jobTitle, customPermissions: invitation.customPermissions });
      invitation.status = 'accepted'; invitation.acceptedAt = new Date(); await invitation.save(); await user.populate('role');
    }
    if (!user || !user.active) throw new Error('No active ZooOps account exists for this Google email. Ask your manager for an invitation.');
    if (!user.googleId) { user.googleId = profile.sub; await user.save(); }
    res.redirect(`${appUrl()}/App3.html?oauthToken=${encodeURIComponent(createToken(user))}`);
  } catch (error) {
    res.redirect(`${appUrl()}/App3.html?oauthError=${encodeURIComponent(error.message)}`);
  }
}

const getMe = async (req, res) => res.json({ user: formatUser(req.user) });
const permissionCheck = async (req, res) => res.json({ message: 'You are authenticated.', user: formatUser(req.user) });
module.exports = { login, setupManager, registerFromInvite, googleStart, googleCallback, getMe, permissionCheck };
