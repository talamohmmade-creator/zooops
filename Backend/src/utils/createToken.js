const jwt = require('jsonwebtoken');

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      roleId: user.role._id ? user.role._id.toString() : user.role.toString()
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = createToken;
