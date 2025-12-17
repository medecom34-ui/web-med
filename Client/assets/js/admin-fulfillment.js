// public/assets/js/admin-fulfillment.js
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

  const fmtDT = iso => {
    if (!iso && iso !== 0) return "-";
    let d;
    try {
      if (iso instanceof Date) d = iso;
      else if (typeof iso === "number") d = new Date(iso);
      else if (typeof iso === "string") d = new Date(iso);
      else if (typeof iso === "object") {
        if (iso.createdAt) d = new Date(iso.createdAt);
        else if (iso.placedAt) d = new Date(iso.placedAt);
        else if (iso.date) d = new Date(iso.date);
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
  };

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

  function apiFetch(path, opts = {}) {
    const token = localStorage.getItem("auth_token") || (function(){
      try {
        const u = JSON.parse(localStorage.getItem("auth_user") || "null");
        return u && u.token ? u.token : null;
      } catch(e){ return null; }
    })();

    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (token) opts.headers.Authorization = "Bearer " + token;

    return fetch(path, opts).then(async r => {
      const txt = await r.text().catch(()=>"");
      try {
        return txt ? JSON.parse(txt) : null;
      } catch(e) {
        return { success:false, status: r.status, body: txt };
      }
    });
  }

  async function loadOrders(){
    const res = await apiFetch("/api/admin/orders");
    if (!res || !res.success) return [];
    return res.data || [];
  }

  function groupItems(items){
    const rows = {};
    for(const it of (items||[])){
      const k = (it.product?.slug || it.nameSnapshot || it.skuSnapshot || ("id"+it.productId)) + "|" + (it.variantId || "");
      if(!rows[k]) rows[k] = { code: it.skuSnapshot || "-", name: it.nameSnapshot || "-", qty: 0 };
      rows[k].qty += (it.qty || 1);
    }
    return Object.values(rows);
  }

  function buildDetailHTML(o){
    const grouped = groupItems(o.items);
    const rows = grouped.map(g=>`<tr><td class="mono">${g.code}</td><td>${g.name}</td><td style="text-align:right">${g.qty}</td></tr>`).join("");
    
    const total = money(o.grandTotal ?? o.subtotal);
    return `
      <div class="card" style="margin-top:12px">
        <h3 style="margin-top:0">คำสั่งซื้อ <span class="mono">${o.orderNumber || o.id}</span></h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div><b>ลูกค้า:</b> ${ (o.addresses && o.addresses[0] && o.addresses[0].fullName) || (o.user && o.user.fullName) || "-" }</div>
            <div><b>โทร:</b> ${ (o.addresses && o.addresses[0] && o.addresses[0].phone) || (o.user && o.user.phone) || "-" }</div>
            <div><b>ที่อยู่:</b> ${(o.addresses && o.addresses[0] && o.addresses[0].line1) || "-"}</div>
          </div>
          <div>
            <div><b>วันที่:</b> ${fmtDT(o.createdAt)}</div>
            <!-- ค่าส่งถูกตัดออกจากใบพิมพ์ -->
            <div><b>รวมทั้งสิ้น:</b> ${total}</div>
          </div>
        </div>
        <div style="margin-top:12px;overflow:auto">
          <table class="table">
            <thead><tr><th>รหัสสินค้า</th><th>รายการ</th><th style="width:90px;text-align:right">จำนวน</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }

  async function renderTable(){
    const tb = $("#fulfillTable tbody");
    const orders = await loadOrders();
    window.__adminFulfillList = orders;
    if(!orders.length){ tb.innerHTML = `<tr><td colspan="8" style="text-align:center">ยังไม่มีคำสั่งซื้อ</td></tr>`; return; }

    const dateEl = document.getElementById("fulfillFilterDate");
    const selDate = dateEl ? (dateEl.value || null) : null;

    const filtered = selDate ? orders.filter(o => dateOnlyKey(o.createdAt) === selDate) : orders;

    if(!filtered.length){ tb.innerHTML = `<tr><td colspan="8" style="text-align:center">ยังไม่มีคำสั่งซื้อ</td></tr>`; return; }

    tb.innerHTML = filtered.map(o=>{
      const addr = o.addresses && o.addresses[0];
      const itemsCount = (o.items||[]).reduce((a,b)=> a + (Number(b.qty) || 0), 0);
      const total = money(o.grandTotal ?? o.subtotal); // รวมทั้งสิ้น (ไม่มีค่าส่ง)
      return `
      <tr>
        <td><div><b class="mono">${o.orderNumber||o.id}</b></div><div><small>${fmtDT(o.createdAt)}</small></div></td>
        <td>${addr ? addr.fullName : (o.user ? o.user.fullName : "-")}</td>
        <td style="max-width:320px">${addr ? addr.line1 : "-"}</td>
        <td>${addr ? addr.phone : (o.user ? o.user.phone || "-" : "-")}</td>
        <td>${itemsCount}</td>
        <td style="text-align:right">${total}</td>
        <td><span class="pill">${o.status||"PENDING"}</span></td>
        <td class="no-print">
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn no-wrap" data-print="${o.id}">พิมพ์ใบจัด</button>
          </div>
        </td>
      </tr>`; 
    }).join("");
  }

function openPrintTabAndPrint(htmlContent) {
  const win = window.open("", "_blank");

  if (!win) {
    alert("โปรดอนุญาตให้เปิด popup");
    return;
  }

  const html = `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ใบจัดสินค้า</title>
      <style>
        body{font-family:system-ui,'Noto Sans Thai',sans-serif;padding:18px;color:#111}
        .card{border-radius:12px;padding:18px;border:1px solid #eee;box-shadow:0 8px 20px rgba(0,0,0,0.05)}
        .mono{font-family:monospace}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        table th, table td{padding:10px;border:1px solid #eee;text-align:left}
        table th{background:#fafafa}
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function(){
          setTimeout(() => {
            try { window.print(); } catch(e){}
            setTimeout(() => {
              try { window.close(); } catch(e){}
            }, 200); // ปิดให้เร็วขึ้น ป้องกัน dialog ค้าง
          }, 50);
        };
      <\/script>
    </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}




  async function printPickList(orderId){
    const res = await apiFetch(`/api/admin/orders/${orderId}`);
    if (!res || !res.success) return alert("ไม่พบคำสั่งซื้อ");
    const html = buildDetailHTML(res.data);
    openPrintTabAndPrint(html);
  }

  document.addEventListener("click",(e)=>{
    const pid = e.target.getAttribute("data-print");
    if(pid){ e.preventDefault(); printPickList(pid); }
  });

  document.addEventListener("DOMContentLoaded",()=>{
    try {
      const main = document.querySelector("main");
      if (main) {
        if (!document.querySelector(".back-home-btn")) {
          const wrapper = document.createElement("div");
          wrapper.style.marginBottom = "16px";
          wrapper.innerHTML = `<button class="btn back-home-btn">🏠 กลับ Home</button>`;
          main.insertBefore(wrapper, main.firstChild);
          document.querySelector(".back-home-btn").onclick = ()=> location.href = 'index.html';
        }
        const extras = Array.from(document.querySelectorAll('a,button')).filter(el => {
          const txt = (el.textContent||"").trim();
          return txt.includes('กลับ') && txt.includes('Home') && !el.classList.contains('back-home-btn');
        });
        extras.forEach(el => {
          const h1 = document.querySelector("main h1");
          if (h1 && el.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) {
            el.remove();
          }
        });
      }
    } catch(e){ console.warn(e); }
    renderTable();

    const btn = document.getElementById("fulfillFilterBtn");
    if (btn) btn.addEventListener("click", ()=> renderTable());
    const clearBtn = document.getElementById("fulfillClearFilter");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      const el = document.getElementById("fulfillFilterDate");
      if (el) el.value = "";
      renderTable();
    });
  });

  (function injectSmallCss(){
    const id = 'adminFulfillSmallCss';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `.no-wrap{white-space:nowrap;} .no-print{}`;
    document.head.appendChild(style);
  })();

  window.addEventListener("orders:changed", renderTable);
})();
