const jwt = require("jsonwebtoken");

/**
 * Attaches the authenticated user's id to req.user when a valid JWT is
 * provided via either the Authorization header or a signed cookie.
 */
function authMiddleware(req, res, next) {
  const headerToken = req.headers.authorization;
  const bearerToken =
    typeof headerToken === "string" && headerToken.startsWith("Bearer ")
      ? headerToken.slice("Bearer ".length)
      : null;

  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey123");
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = authMiddleware;
