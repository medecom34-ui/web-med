// server/src/middleware/adminGuard.js
// ใช้เป็น middleware สำหรับ route ของแอดมินเพื่อป้องกันการเข้าถึง


module.exports = function adminGuard(req, res, next) {
  try {
   
    if (req.user && (req.user.role === "ADMIN" || req.user.role === "admin")) {
      return next();
    }


    return res.status(403).json({ success: false, message: "access denied: admin only" });
  } catch (err) {
    console.error("adminGuard error", err);
    return res.status(500).json({ success: false, message: "server error" });
  }
};
