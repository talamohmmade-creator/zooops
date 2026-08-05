const bcrypt = require('bcryptjs');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const createToken = require('../utils/createToken');
const formatUser = require('../utils/formatUser');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: normalizeEmail(email) }).populate('role');

  if (!user || !user.active) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = createToken(user);

  return res.json({
    message: 'Login successful.',
    token,
    user: formatUser(user)
  });
}

async function registerFromInvite(req, res) {
  const { inviteToken, password } = req.body;

  if (!inviteToken || !password) {
    return res.status(400).json({ message: 'Invite token and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const invitation = await Invitation.findOne({ token: inviteToken }).populate('role');

  if (!invitation) {
    return res.status(404).json({ message: 'Invitation was not found.' });
  }

  if (invitation.status !== 'pending') {
    return res.status(400).json({ message: `Invitation is ${invitation.status}.` });
  }

  if (invitation.expiresAt < new Date()) {
    invitation.status = 'expired';
    await invitation.save();
    return res.status(400).json({ message: 'Invitation has expired.' });
  }

  const existingUser = await User.findOne({ email: invitation.email });
  if (existingUser) {
    return res.status(409).json({ message: 'This email already has a ZooOps account.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: invitation.fullName,
    email: invitation.email,
    passwordHash,
    role: invitation.role._id,
    jobTitle: invitation.jobTitle,
    customPermissions: invitation.permissions || [],
    active: true
  });

  invitation.status = 'accepted';
  invitation.acceptedAt = new Date();
  await invitation.save();

  const populatedUser = await User.findById(user._id).populate('role');
  const token = createToken(populatedUser);

  res.status(201).json({
    message: 'Account created from invitation.',
    token,
    user: formatUser(populatedUser)
  });
}

function oauthFrontendUrl(params) {
  const baseUrl = process.env.OAUTH_SUCCESS_URL || process.env.INVITE_BASE_URL || 'http://localhost:3000/App3.html';
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  return url.toString();
}

async function googleStart(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CALLBACK_URL) {
    return res.status(500).json({ message: 'Google login is not configured yet.' });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

async function googleCallback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(oauthFrontendUrl({ oauthError: 'Google login was cancelled.' }));
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.redirect(oauthFrontendUrl({ oauthError: tokenData.error_description || 'Google login failed.' }));
    }

    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.email) {
      return res.redirect(oauthFrontendUrl({ oauthError: 'Could not read Google account email.' }));
    }

    const email = normalizeEmail(profile.email);
    let user = await User.findOne({ email }).populate('role');

    if (!user) {
      const invitation = await Invitation.findOne({ email, status: 'pending' }).populate('role');

      if (!invitation) {
        return res.redirect(oauthFrontendUrl({ oauthError: 'This email is not invited to ZooOps.' }));
      }

      if (invitation.expiresAt < new Date()) {
        invitation.status = 'expired';
        await invitation.save();
        return res.redirect(oauthFrontendUrl({ oauthError: 'This invitation has expired.' }));
      }

      const randomPasswordHash = await bcrypt.hash(`${email}-${Date.now()}-${Math.random()}`, 12);
      user = await User.create({
        fullName: invitation.fullName || profile.name || email,
        email,
        passwordHash: randomPasswordHash,
        role: invitation.role._id,
        jobTitle: invitation.jobTitle,
        customPermissions: invitation.permissions || [],
        active: true
      });

      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      await invitation.save();
      user = await User.findById(user._id).populate('role');
    }

    if (!user.active) {
      return res.redirect(oauthFrontendUrl({ oauthError: 'This ZooOps account is inactive.' }));
    }

    const token = createToken(user);
    return res.redirect(oauthFrontendUrl({ oauthToken: token }));
  } catch (error) {
    return res.redirect(oauthFrontendUrl({ oauthError: error.message || 'Google login failed.' }));
  }
}

async function getMe(req, res) {
  return res.json({
    user: formatUser(req.user)
  });
}

async function permissionCheck(req, res) {
  return res.json({
    message: 'You are authenticated and allowed to read tasks.',
    user: formatUser(req.user)
  });
}

module.exports = {
  login,
  registerFromInvite,
  googleStart,
  googleCallback,
  getMe,
  permissionCheck
};
