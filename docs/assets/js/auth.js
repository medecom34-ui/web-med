// public/assets/js/auth.js
(function(){
  'use strict';

  const BAR_ID    = "authBar";
  const AUTH_KEY  = "auth_user";   
  const TOKEN_KEY = "auth_token"; 


  const API_BASE  = "https://web-med-production.up.railway.app";


  const safeParse = (v, fallback) => {
    try {
      const parsed = JSON.parse(v);
      return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  };
  const getAuth   = () => safeParse(localStorage.getItem(AUTH_KEY), null);
  const setAuth   = (obj) => localStorage.setItem(AUTH_KEY, JSON.stringify(obj));
  const clearAuth = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };


  const Auth = {
    current(){ return getAuth(); },

    isAdmin(){
      const me = getAuth();
      return !!(me && String(me.role || "").toLowerCase() === "admin");
    },

    
    async login(email, password){
      const e = String(email || "").trim();
      const p = String(password || "");

      if (!e || !p) {
        return { ok:false, reason:"กรุณากรอกอีเมลและรหัสผ่าน" };
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ email: e, password: p }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json || !json.success) {
          return {
            ok: false,
            reason: (json && json.message) || "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
          };
        }

        const { token, user } = json.data || {};
        if (!token || !user) return { ok:false, reason:"ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง" };

        const role = (String(user.role || "").toUpperCase() === "ADMIN") ? "admin" : "user";

        const authObj = {
          id: String(user.id),
          name: user.fullName,
          email: user.email,
          phone: user.phone || null,
          role,
          token, 
        };

        // save both structured user object and raw token
        setAuth(authObj);
        localStorage.setItem(TOKEN_KEY, token);

        window.dispatchEvent(new Event("auth:changed"));
        return { ok:true };
      } catch (err) {
        return { ok:false, reason:"ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
      }
    },

    /* === SIGNUP === */
    async signup({ name, email, password, phone }){
      const fullName = String(name || "").trim();
      const em = String(email || "").trim();
      const pw = String(password || "");
      const ph = String(phone || "").trim();

      if (!fullName || !em || !pw) {
        return { ok:false, reason:"กรุณากรอกข้อมูลให้ครบถ้วน" };
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            fullName,
            email: em,
            password: pw,
            phone: ph || null,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok || !json || !json.success) {
          return { ok:false, reason:(json && json.message) || "สมัครสมาชิกไม่สำเร็จ" };
        }

        const { token, user } = json.data || {};
        if (!token || !user) return { ok:false, reason:"ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง" };

        const role = (String(user.role || "").toUpperCase() === "ADMIN") ? "admin" : "user";

        const authObj = {
          id: String(user.id),
          name: user.fullName,
          email: user.email,
          phone: user.phone || ph || null,
          role,
          token,
        };

        // save both structured user object and raw token
        setAuth(authObj);
        localStorage.setItem(TOKEN_KEY, token);

        window.dispatchEvent(new Event("auth:changed"));
        return { ok:true };
      } catch (err) {
        return { ok:false, reason:"ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" };
      }
    },

    logout(){
      clearAuth();
      localStorage.removeItem("orderDraft");
      window.dispatchEvent(new Event("auth:changed"));
    }
  };

  window.Auth = Auth;


  function updateStatusBadgeEverywhere(){
    const badge = document.getElementById("statusBadge");
    if(!badge) return;

    const orders = safeParse(localStorage.getItem("orders"), []) || [];
    const me = getAuth();

    if (!me) {
      badge.style.display = "none";
      return;
    }

    const ordersArr = Array.isArray(orders) ? orders : [];
    const myIdStr = String(me.id);

    const mine = ordersArr.filter(o => {
      try {
        return String(o.userId) === myIdStr;
      } catch (e) {
        return false;
      }
    });

    const active = mine.filter(o => (o.status || "").toLowerCase() !== "delivered").length;
    badge.textContent = active;
    badge.style.display = active > 0 ? "" : "none";
  }

  // ---------- Topbar ----------
function renderTopbar(){
  const host = document.getElementById(BAR_ID);
  if (!host) return;

  const u = Auth.current();

  if (!u) {
    host.innerHTML = `<a class="topbar__link" href="login.html">เข้าสู่ระบบ</a>`;
    return;
  }

  const isAdmin = (u.role === "admin");

  host.innerHTML = `
    <div class="auth-inline">
      <span class="hello">สวัสดี, <b>${u.name}</b>${isAdmin ? ' <span class="role">(admin)</span>' : ''}</span>
      ${isAdmin ? `
        <nav class="admin-links">
          <a href="./admin-orders.html" class="admin-link">จัดการคำสั่งซื้อ</a>
          <a href="./admin-fulfillment.html" class="admin-link">จัดเตรียมสินค้า/จัดส่ง</a>
          <a href="./admin-payments.html" class="admin-link">จัดการการชำระเงิน</a>
        </nav>
      ` : ''}
      <button id="logoutBtn" class="link-btn">ออกจากระบบ</button>
    </div>
  `;

  Array.from(host.querySelectorAll(".admin-link")).forEach(a => {
    const href = a.getAttribute("href");
    try {
      const clean = href.replace(/^\.\//,'');
      if (location.pathname.endsWith(clean)) a.classList.add("is-active");
    } catch(e){}
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", ()=>{
      Auth.logout();
      if (location.pathname.includes("admin-")) location.href = "login.html";
      else location.href = "index.html";
    });
  }
}



  document.addEventListener("DOMContentLoaded", () => {
    try {
      renderTopbar();
    } catch(e) { console.warn("renderTopbar failed", e); }

    try {
      updateStatusBadgeEverywhere();
    } catch(e) { console.warn("updateStatusBadgeEverywhere failed", e); }
  });

  window.addEventListener("auth:changed", () => {
    renderTopbar();
    updateStatusBadgeEverywhere();

    try { localStorage.removeItem("orders"); } catch(e){}
    window.dispatchEvent(new Event("orders:changed"));
  });

  window.addEventListener("orders:changed", () => {
    try { updateStatusBadgeEverywhere(); } catch(e){ console.warn(e); }
  });
})();
