// public/assets/js/admin-orders.js
(function(){
  const $ = s => document.querySelector(s);

  function parseNumber(n) {
    if (n === null || n === undefined) return NaN;
    if (typeof n === 'number') return n;
    if (typeof n === 'string') {
      const cleaned = n.replace(/,/g, '');
      const v = Number(cleaned);
      return Number.isFinite(v) ? v : NaN;
    }
    if (typeof n === 'object') {
      try {
        if (typeof n.toString === 'function') {
          const s = n.toString();
          if (typeof s === 'string' && s.trim() !== '' && !/^\[object\s/.test(s)) {
            const v = Number(s);
            if (!Number.isNaN(v)) return v;
          }
        }
        if (n.value !== undefined) {
          const v = Number(n.value);
          if (!Number.isNaN(v)) return v;
        }
        if (n.amount !== undefined) {
          const v = Number(n.amount);
          if (!Number.isNaN(v)) return v;
        }
        if (Array.isArray(n.d) && typeof n.e === 'number') {
          const parts = n.d.map(x => String(x));
          const joined = parts.join('');
          const len = joined.length;
          const decimalDigits = len - (Number(n.e) + 1);
          let numStr;
          if (decimalDigits > 0) {
            numStr = joined.slice(0, len - decimalDigits) + '.' + joined.slice(len - decimalDigits);
          } else if (decimalDigits === 0) {
            numStr = joined;
          } else {
            numStr = joined + '0'.repeat(-decimalDigits);
          }
          const v = Number(numStr);
          if (!Number.isNaN(v)) return v;
        }
        if (Array.isArray(n) && n.length) {
          const v = Number(n[0]);
          if (!Number.isNaN(v)) return v;
        }
        if (n.d && Array.isArray(n.d) && n.d.length === 1) {
          const v = Number(n.d[0]);
          if (!Number.isNaN(v)) return v;
        }
        const sAll = JSON.stringify(n);
        const cleanedForNum = sAll.replace(/[^\d\.\-]/g, '');
        const v = Number(cleanedForNum);
        if (!Number.isNaN(v)) return v;
      } catch (e){}
    }
    return NaN;
  }

  const money = n => {
    const num = parseNumber(n);
    if (!Number.isFinite(num)) return "฿0.00";
    return "฿" + Number(num).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  function fmtDate(iso) {
    if (!iso && iso !== 0) return "-";
    let d;
    try {
      if (iso instanceof Date) d = iso;
      else if (typeof iso === "number") d = new Date(iso);
      else if (typeof iso === "string") d = new Date(iso);
      else if (typeof iso === "object") {
        if (iso.date) d = new Date(iso.date);
        else if (iso.createdAt) d = new Date(iso.createdAt);
        else if (iso.placedAt) d = new Date(iso.placedAt);
        else d = new Date(JSON.stringify(iso));
      } else d = new Date(iso);
    } catch (e) {
      return "-";
    }
    if (!d || Number.isNaN(d.getTime())) return "-";
    try {
      const dd = String(d.getDate()).padStart(2,'0');
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2,'0');
      const min = String(d.getMinutes()).padStart(2,'0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch (e) {
      return d.toString();
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

  const STATUS = ["PENDING","SHIPPED","CANCELED"];


  async function loadOrders(){
    const res = await apiFetch("/api/admin/orders");
    if (!res || !res.success) return [];
    return res.data || [];
  }

  function applyDateFilter(list){
    // single-date filter
    const el = document.getElementById("ordersFilterDate");
    const date = el ? (el.value || null) : null;
    if (!date) return list;
    // match date only (ignore time)
    return list.filter(o => {
      const key = dateOnlyKey(o.createdAt || o.placedAt || o.updatedAt || null);
      return key === date;
    });
  }

  function renderRows(orders){
    const tb = $("#ordersTable tbody");
    if (!tb) return;
    const filtered = applyDateFilter(orders);
    if (!filtered.length) {
      tb.innerHTML = `<tr><td colspan="7" style="text-align:center">ยังไม่มีคำสั่งซื้อ</td></tr>`;
      return;
    }
    tb.innerHTML = filtered.map(o => {
      const addr = (o.addresses && o.addresses.find(a=>a.type==="SHIPPING")) || null;
      const name = addr ? addr.fullName : (o.user ? o.user.fullName : "-");
      const addressText = addr ? `${addr.line1} ${addr.subdistrict||''} ${addr.district||''} ${addr.province||''}` : "-";
      const phone = addr ? addr.phone : (o.user ? (o.user.phone||"-") : "-");
      const tracking = (o.shipments && o.shipments.length ? (o.shipments[o.shipments.length-1].trackingNo || "") : "");
      const status = o.status || "PENDING";
      const dateVal = o.createdAt || o.placedAt || o.updatedAt || null;
      const dateStr = fmtDate(dateVal);
      const candidate = o.grandTotal ?? o.subtotal ?? o.total ?? o.amount ?? null;
      const totalStr = money(candidate);

      return `
        <tr data-order="${o.id}">
          <td><div class="mono">${o.orderNumber || o.id}</div></td>
          <td style="white-space:nowrap">${dateStr}</td>
          <td>
            <div><b>${name}</b></div>
            <div style="font-size:0.9em">${(addressText||"-").replace(/\n/g,"<br>")}</div>
            <div><small>โทร: ${phone}</small></div>
          </td>
          <td style="text-align:right">${totalStr}</td>
          <td>
            <select data-status="${o.id}">
              ${STATUS.map(s => `<option value="${s}" ${s===status?"selected":""}>${s}</option>`).join("")}
            </select>
          </td>
          <td>
            <input data-trk="${o.id}" value="${tracking || ""}" placeholder="เช่น TRK123456">
          </td>
          <td>
            <button class="btn" data-save="${o.id}">บันทึก</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function showDetail(id){
    const res = await apiFetch(`/api/admin/orders/${id}`);
    if (!res || !res.success) return alert("ไม่พบข้อมูลคำสั่งซื้อ");
    const o = res.data;
    const items = (o.items||[]).map(it => `<li>${it.nameSnapshot} (x${it.qty}) - ${money(it.lineTotal)}</li>`).join("");
    const shipments = (o.shipments||[]).map(s=>`<div> ${s.carrier||"-"} / ${s.trackingNo||"-"} / ${s.status||"-"} </div>`).join("");
    const html = `
      <div style="padding:12px">
        <h3>คำสั่งซื้อ ${o.orderNumber || o.id}</h3>
        <div><b>ลูกค้า:</b> ${(o.addresses && o.addresses[0] && o.addresses[0].fullName) || (o.user && o.user.fullName) || "-"}</div>
        <div><b>รายการ:</b><ul>${items}</ul></div>
        <div><b>การชำระ:</b> ${(o.payments && o.payments[0] && o.payments[0].status) || "-"}</div>
        <div><b>พัสดุ:</b> ${shipments || "-"}</div>
        <div style="margin-top:8px"><button id="closeDetail">ปิด</button></div>
      </div>`;
    const host = document.createElement("div");
    host.id = "orderDetailModal";
    host.style = "position:fixed;left:10%;top:10%;right:10%;bottom:10%;background:#fff;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.2);overflow:auto;z-index:9999";
    host.innerHTML = html;
    document.body.appendChild(host);
    document.getElementById("closeDetail").onclick = ()=> host.remove();
  }

  function showToast(msg, type = "success", timeout = 2200) {
    const id = "adminToast";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style = `position: fixed;right: 16px;bottom: 16px;z-index: 10000;font-size: 14px;`;
      document.body.appendChild(el);
    }
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style = `margin-top:8px;padding:8px 12px;border-radius:8px;box-shadow: 0 6px 18px rgba(2,6,23,0.15);background: ${type === "success" ? "#10b981" : "#ef4444"};color: white;opacity: 0;transform: translateY(6px);transition: all 180ms ease;`;
    el.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; });
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(6px)"; setTimeout(()=> { toast.remove(); if (!el.children.length) el.remove(); }, 200); }, timeout);
  }

  async function saveOrder(id){
    try {
      const statusEl = document.querySelector(`select[data-status="${id}"]`);
      const trkEl    = document.querySelector(`input[data-trk="${id}"]`);
      if (!statusEl) return;
      const status = statusEl.value;
      const tracking = trkEl ? trkEl.value.trim() : "";

      const btn = document.querySelector(`button[data-save="${id}"]`);
      if (btn) { btn.disabled = true; btn.textContent = "กำลังบันทึก..."; }

      if (tracking) {
        const shipPayload = { trackingNo: tracking, carrier: "MANUAL", status: "SHIPPED", setOrderShipped: (status === "SHIPPED") };
        await apiFetch(`/api/admin/orders/${id}/shipments`, { method: "POST", body: JSON.stringify(shipPayload) });
      }

      await apiFetch(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });

      await refresh();
      showToast("บันทึกเรียบร้อย", "success");
    } catch (err) {
      console.error("saveOrder error:", err);
      showToast("บันทึกไม่สำเร็จ", "error");
    } finally {
      const btn = document.querySelector(`button[data-save="${id}"]`);
      if (btn) { btn.disabled = false; btn.textContent = "บันทึก"; }
    }
  }

  async function refresh(){
    try {
      const orders = await loadOrders();
      renderRows(orders);
      window.__adminOrdersList = orders;
    } catch (err) {
      console.error(err);
      alert("โหลดคำสั่งซื้อไม่สำเร็จ");
    }
  }

  document.addEventListener("click", (e)=>{
    const idSave = e.target.getAttribute("data-save");
    const idView = e.target.getAttribute("data-view");
    if (idSave) { e.preventDefault(); saveOrder(idSave); }
    if (idView) { e.preventDefault(); showDetail(idView); }
  });

  document.addEventListener("DOMContentLoaded", () => {
    refresh();
    const filterBtn = document.getElementById("ordersFilterBtn");
    if (filterBtn) filterBtn.addEventListener("click", () => renderRows(window.__adminOrdersList || []));
    const clearBtn = document.getElementById("ordersClearFilter");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      const el = document.getElementById("ordersFilterDate");
      if (el) el.value = "";
      renderRows(window.__adminOrdersList || []);
    });
  });

})();
