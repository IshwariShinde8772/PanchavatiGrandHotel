const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signToken(payload, expiresIn = env.jwtExpiry) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

module.exports = { signToken };

