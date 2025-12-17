// Client/assets/js/orders.js
(function () {
  const $ = s => document.querySelector(s);
  const money = n => "฿" + Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const API_BASE = "http://localhost:5000";


  const me = (window.Auth && Auth.current && Auth.current()) || null;
  if (!me) {
    location.href = "login.html?next=" + encodeURIComponent(location.pathname);
    return;
  }

  const statusMap = {
    PENDING:   { text: "รอตรวจ/รอจัดส่ง", cls: "status-pending"   },
    PACKED:    { text: "กำลังเตรียมจัดส่ง", cls: "status-shipping"   },
    SHIPPED:   { text: "บริษัทจัดส่งแล้ว",  cls: "status-shipping"   },
    DELIVERED: { text: "จัดส่งสำเร็จ",      cls: "status-delivered"  },
    FULFILLING:{ text: "กำลังจัดเตรียม",   cls: "status-shipping"   },
    PAID:      { text: "ชำระแล้ว",         cls: "status-paid"       },
    CANCELED:  { text: "ยกเลิก",            cls: "status-cancelled"  }
  };

  const fmtDate = iso => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    // แปลงเป็นเวลาไทยในการแสดง
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  };

  async function loadOrdersFromApi() {
    try {
      // if admin -> fetch all orders; otherwise filter by userId
      const isAdmin = !!(me && me.role === "admin");
      const q = isAdmin ? "" : `?userId=${encodeURIComponent(me.id)}`;
      const res = await fetch(`${API_BASE}/api/orders${q}`);
      if (!res.ok) {
        console.error("loadOrders error HTTP", res.status);
        return [];
      }
      const json = await res.json();
      if (!json.success) {
        console.error("loadOrders error", json.message);
        return [];
      }
      return json.data || [];
    } catch (err) {
      console.error("loadOrders fetch error", err);
      return [];
    }
  }

  function renderOrders(orders) {
    const list = $("#ordersList");
    if (!list) return;

    const sorted = (orders || []).sort((a,b) => new Date(b.createdAt || b.placedAt || 0) - new Date(a.createdAt || a.placedAt || 0));

    if (!sorted.length) {
      list.innerHTML = `<article class="order-card">ยังไม่มีคำสั่งซื้อ</article>`;
      return;
    }

    list.innerHTML = sorted.map(o => {
      const st = statusMap[o.status] || statusMap.PENDING;
      const addrObj = (o.addresses && o.addresses[0]) || {};
      const name  = addrObj.fullName || o.customer?.name || "-";
      const addr  = (addrObj.line1 || "-").replace(/\n/g, "<br>");
      const phone = addrObj.phone || o.customer?.phone || "-";

      const orderNo = o.orderNumber || o.id || "-";
      const subtotalVal = Number(o.subtotal ?? o.grandTotal ?? 0);
   
      const totalVal = Number(o.grandTotal ?? subtotalVal);

      const subtotalDisplay = isNaN(subtotalVal) ? "฿0.00" : money(subtotalVal);
      const totalDisplay = isNaN(totalVal) ? "฿0.00" : money(totalVal);

      // หา tracking number 
      let tracking = null;
      try {
        if (o.shipments && o.shipments.length) {
          const last = o.shipments[o.shipments.length - 1];
          tracking = (last && (last.trackingNo || last.tracking || last.tracking_number)) || null;
        }
      } catch(e){ tracking = null; }

      const trackingDisplay = tracking ? tracking : "ยังไม่มีหมายเลขพัสดุ";

      const itemsHtml = (o.items||[]).map(it => {
        const imgUrl = it.image || (it.product && it.product.media && it.product.media[0] && it.product.media[0].url) || "";
        const sku = it.skuSnapshot || (it.variant && it.variant.sku) || "";
        const unitPrice = Number(it.unitPrice ?? (it.variant && it.variant.price) ?? 0);
        const qty = Number(it.qty ?? 1);
        const line = isNaN(unitPrice) ? "฿0.00" : money(unitPrice * qty);

        return `
          <div class="item" style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #eef2f7">
            <div style="width:64px;height:64px;border-radius:8px;background:#f3f4f6;flex:0 0 64px; background-size:cover; background-position:center; ${imgUrl ? `background-image:url(${imgUrl})` : ''}"></div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;color:#1e3a8a">${it.nameSnapshot || it.name || '-'}</div>
              ${ sku ? `<div style="color:#94a3b8;margin-top:6px">รหัส: ${sku}</div>` : '' }
              <div style="color:#64748b;margin-top:6px">x${qty}</div>
            </div>
            <div style="font-weight:700">${line}</div>
          </div>
        `;
      }).join("");

      return `
        <article class="order-card">
          <div class="order-head">
            <div class="order-title">สถานะคำสั่งซื้อ</div>
            <div class="order-id">หมายเลขคำสั่งซื้อ <b>${orderNo}</b> • วันที่ ${fmtDate(o.createdAt || o.placedAt)}</div>
          </div>

          <div class="order-grid" style="display:flex;gap:24px">
            <section class="order-items" style="flex:1">
              <div class="order-section-title">สินค้าทั้งหมด</div>
              ${itemsHtml}
              <div style="padding:12px 0;text-align:right;font-weight:700">ค่ารวมสินค้า: ${subtotalDisplay}</div>
            </section>

            <section style="width:320px;">
              <div class="ship-title">ที่อยู่ในการจัดส่ง</div>
              <div class="ship-name">ชื่อ: ${name}</div>
              <div class="ship-addr">ที่อยู่: ${addr}</div>
              <div class="ship-phone">โทร: ${phone}</div>
              <div style="margin-top:12px">สถานะ: <span class="status-badge ${st.cls}">${st.text}</span></div>

              <div style="margin-top:8px">หมายเลขพัสดุ: <b>${trackingDisplay}</b></div>

              <!-- ค่าส่งถูกตัดออกจากการแสดง -->
              <div style="margin-top:8px">ยอดรวมทั้งหมด: <b>${totalDisplay}</b></div>

              ${ o.payments && o.payments[0] ? `<div style="margin-top:8px">การชำระเงิน: ${o.payments[0].status || 'N/A'} (${ money(Number(o.payments[0].amount || 0)) })</div>` : '' }
            </section>
          </div>
        </article>
      `;
    }).join("");

    // update badge (ถ้าอยากให้ Auth.updateStatusBadge ใช้ได้ด้วย)
    const active = (orders || []).filter(o => o.status !== "DELIVERED" && o.status !== "COMPLETED").length;
    const badge = $("#statusBadge");
    if (badge) {
      badge.textContent = active;
      badge.style.display = active > 0 ? "" : "none";
    }
  }

  // boot: fetch and render
  (async function boot(){
    
    try { localStorage.removeItem("orders"); } catch(e){}

    const orders = await loadOrdersFromApi();
    renderOrders(orders);
    // เก็บ locally เพื่อใช้ร่วม tab อื่น (optional)
    try {
      localStorage.setItem("orders", JSON.stringify(orders));
      window.dispatchEvent(new Event("orders:changed"));
    } catch(e){}
  })();

  window.addEventListener("orders:changed", async () => {
    const orders = await loadOrdersFromApi();
    renderOrders(orders);
  });
})();
