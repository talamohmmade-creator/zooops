const bcrypt = require('bcryptjs');
const User = require('../models/User');
const createToken = require('../utils/createToken');
const formatUser = require('../utils/formatUser');

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('role');

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
  getMe,
  permissionCheck
};
