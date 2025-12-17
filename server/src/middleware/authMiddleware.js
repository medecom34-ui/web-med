// server/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      //console.log("[authMiddleware] no Authorization header");
      return next();
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2) {
      console.log("[authMiddleware] invalid Authorization header format:", authHeader);
      return next();
    }

    const token = parts[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;   // เติม req.user ให้ adminGuard ใช้
      //console.log("[authMiddleware] token verified, payload:", payload);
    } catch (err) {
      console.warn("[authMiddleware] invalid token:", err.message);
    }

    next();
  } catch (err) {
    console.error("[authMiddleware] error:", err);
    next();
  }
};
