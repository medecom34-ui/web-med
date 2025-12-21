// public/assets/js/admin-payments.js
(function(){
  const $ = s => document.querySelector(s);

  const API_BASE =
  location.hostname.includes("github.io")
    ? "https://web-med-production.up.railway.app"
    : "";

  function apiFetch(path, opts = {}) {
    const token = localStorage.getItem("auth_token") || (function(){
      try { const u = JSON.parse(localStorage.getItem("auth_user") || "null"); return u && u.token ? u.token : null; } catch(e){ return null; }
    })();
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (token) opts.headers.Authorization = "Bearer " + token;
    return fetch(path, opts).then(async r => {
      const txt = await r.text().catch(()=> "");
      try { return txt ? JSON.parse(txt) : null; } catch(e) { return { success:false, status:r.status, body: txt }; }
    });
  }

  function showToast(msg, type="success", timeout=2000) {
    const root = document.getElementById("toastRoot");
    const el = document.createElement("div");
    el.textContent = msg;
    el.style = `margin-top:8px;padding:8px 12px;border-radius:8px;color:#fff;background:${type==="success"?"#10b981":"#ef4444"};box-shadow:0 6px 18px rgba(0,0,0,0.12)`;
    root.appendChild(el);
    setTimeout(()=> { el.style.opacity = "0"; setTimeout(()=>el.remove(),150); }, timeout);
  }

  const PAYMENT_STATUS = ["PENDING","VERIFIED","REJECTED"];

  async function loadPayments() {
    const res = await apiFetch(`${API_BASE}/api/admin/payments`);
    if (!res || !res.success) return [];
    return res.data || [];
  }

  function parseAmount(v){
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v === "object") {
      if (Array.isArray(v.d) && typeof v.e === "number" && (v.s === 1 || v.s === -1)) {
        try {
          const digits = v.d.join('');
          const exp = v.e;
          const sign = v.s === -1 ? '-' : '';
          const pos = exp + 1;
          let str;
          if (pos <= 0) {
            str = '0.' + '0'.repeat(Math.max(0, -pos)) + digits;
          } else if (pos >= digits.length) {
            str = digits + '0'.repeat(pos - digits.length);
          } else {
            str = digits.slice(0, pos) + '.' + digits.slice(pos);
          }
          const full = sign + str;
          const n = Number(full);
          return Number.isFinite(n) ? n : null;
        } catch (e) {}
      }
      try {
        if (typeof v.toString === "function") {
          const s = v.toString();
          const n = Number(s);
          return Number.isFinite(n) ? n : null;
        }
      } catch(e){}
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function money(n){
    const num = parseAmount(n);
    if (num === null) return "฿0.00";
    return "฿" + num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDate(d){
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return "-";
      const dd = String(dt.getDate()).padStart(2,'0');
      const mm = String(dt.getMonth()+1).padStart(2,'0');
      const yyyy = dt.getFullYear();
      const hh = String(dt.getHours()).padStart(2,'0');
      const min = String(dt.getMinutes()).padStart(2,'0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch(e){
      return "-";
    }
  }

  function dateOnlyKey(d){
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return null;
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth()+1).padStart(2,'0');
      const dd = String(dt.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    } catch(e){ return null; }
  }

  function applyDateFilter(list){
    const el = document.getElementById("payFilterDate");
    const date = el ? (el.value || null) : null;
    if (!date) return list;
    return list.filter(p => dateOnlyKey(p.createdAt || (p.order && p.order.createdAt) || null) === date);
  }

  function renderRows(payments){
    const tb = $("#paymentsTable tbody");
    if (!tb) return;
    console.log("admin payments payload:", payments);
    const filtered = applyDateFilter(payments);
    if (!filtered.length) {
      tb.innerHTML = `<tr><td colspan="6" style="text-align:center">ยังไม่มีการชำระเงิน</td></tr>`;
      return;
    }
    tb.innerHTML = filtered.map(p => {
      const orderRef = p.orderId ? (p.order && p.order.orderNumber ? p.order.orderNumber : p.orderId) : "-";
      const dateStr = fmtDate(p.createdAt || (p.order && p.order.createdAt) || null);
      const payer = p.payerName || (p.order && p.order.user && p.order.user.fullName) || "-";

      let rawAmount = parseAmount(p.amount);
      if (rawAmount === null && p.order) {
        const order = p.order;
        const cand = ["amount","total","grandTotal","totalPrice","total_price","totalAmount","grand_total","paidAmount","paid_amount","paid"];
        for (const k of cand) {
          if (order[k] !== undefined && order[k] !== null) {
            const tryVal = parseAmount(order[k]);
            if (tryVal !== null) { rawAmount = tryVal; break; }
          }
        }
        if (rawAmount === null && order.summary && typeof order.summary === "object") {
          for (const k of cand) {
            if (order.summary[k] !== undefined && order.summary[k] !== null) {
              const tryVal = parseAmount(order.summary[k]);
              if (tryVal !== null) { rawAmount = tryVal; break; }
            }
          }
        }
      }
      const amountStr = money(rawAmount);

      const statusSel = `<select data-id="${p.id}">${PAYMENT_STATUS.map(s=>`<option value="${s}" ${s===p.status?"selected":""}>${s}</option>`).join("")}</select>`;
      const slip = p.slipUrl ? `<a href="${p.slipUrl}" target="_blank" rel="noopener">ดูสลิป</a>` : "-";
      return `
        <tr>
          <td><div class="mono">${orderRef}</div></td>
          <td style="white-space:nowrap">${dateStr}</td>
          <td>${payer}</td>
          <td style="text-align:right">${amountStr}</td>
          <td>${statusSel}</td>
          <td class="no-print">
            <div style="display:flex;gap:8px;align-items:center">
              ${slip !== "-" ? `<div style="margin-right:6px">${slip}</div>` : ""}
              <button class="btn" data-save="${p.id}">บันทึก</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function refresh(){
    try {
      const list = await loadPayments();
      renderRows(list);
      window.__adminPaymentsList = list;
    } catch (e) {
      console.error(e);
      alert("โหลดรายการชำระเงินไม่สำเร็จ");
    }
  }

  async function savePayment(id){
    const sel = document.querySelector(`select[data-id="${id}"]`);
    if (!sel) return;
    const status = sel.value;
    if (!PAYMENT_STATUS.includes(status)) return showToast("สถานะไม่ถูกต้อง", "error");
    try {
      const btn = document.querySelector(`button[data-save="${id}"]`);
      if (btn) { btn.disabled = true; btn.textContent = "กำลังบันทึก..."; }
      const res = await apiFetch(`${API_BASE}/api/admin/payments/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (!res || !res.success) throw new Error(res && res.message ? res.message : "failed");
      showToast("บันทึกสถานะเรียบร้อย", "success");
      await refresh();
    } catch (err) {
      console.error("savePayment error:", err);
      showToast("บันทึกไม่สำเร็จ", "error");
    } finally {
      const btn = document.querySelector(`button[data-save="${id}"]`);
      if (btn) { btn.disabled = false; btn.textContent = "บันทึก"; }
    }
  }

  document.addEventListener("click", (e) => {
    const idSave = e.target.getAttribute("data-save");
    if (idSave) { e.preventDefault(); savePayment(idSave); }
  });

  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    const btn = document.getElementById("payFilterBtn");
    if (btn) btn.addEventListener("click", () => renderRows(window.__adminPaymentsList || []));
    const clearBtn = document.getElementById("payClearFilter");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      const el = document.getElementById("payFilterDate");
      if (el) el.value = "";
      renderRows(window.__adminPaymentsList || []);
    });
  });

  window.addEventListener("payments:changed", refresh);
})();
