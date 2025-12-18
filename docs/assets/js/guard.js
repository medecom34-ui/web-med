// assets/js/guard.js
(function () {
  function requireAuth() {
    const ok = window.Auth && Auth.current && Auth.current();
    if (ok) return true;
    const next = location.pathname + location.search + location.hash;
    location.href = "login.html?next=" + encodeURIComponent(next);
    return false;
  }

  function requireAdmin() {
    const ok = window.Auth && Auth.current && Auth.current() && window.Auth.isAdmin && window.Auth.isAdmin();
    if (ok) return true;
    // ไม่มีสิทธิ์ → พากลับหน้าแรกหรือหน้าเข้าสู่ระบบ
    location.href = "login.html";
    return false;
  }

  function bootCheck(){
    const body = document.body;
    if (body.hasAttribute("data-require-auth"))  requireAuth();
    if (body.hasAttribute("data-require-admin")) requireAdmin();
  }

  document.addEventListener("DOMContentLoaded", bootCheck);

  // ถ้า session เปลี่ยนระหว่างอยู่บนหน้าปัจจุบัน (เช่นกด Logout)
  window.addEventListener("auth:changed", () => {
    bootCheck(); // จะรีไดเรกต์ออกจากหน้า admin ทันทีถ้าไม่ใช่แอดมินแล้ว
  });

  window.requireAuth = requireAuth;
  window.requireAdmin = requireAdmin;
})();
