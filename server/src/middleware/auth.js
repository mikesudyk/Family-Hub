const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  // Prefer httpOnly cookie (XSS-safe); fall back to Authorization header
  const token =
    req.cookies?.aeramea_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId   = payload.userId;
    req.familyId = payload.familyId;
    req.memberId = payload.memberId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
