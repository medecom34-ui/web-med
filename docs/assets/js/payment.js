// Client/assets/js/payment.js

(function () {
  // helpers
  function slugify(text) {
    if (!text) return null;
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[\s\_]+/g, '-')
      .replace(/[^\w\-ก-๙]+/g, '')
      .replace(/\-{2,}/g, '-')
      .replace(/^\-+|\-+$/g, '') || null;
  }
  function toNumberIfPossible(v) {
    if (v == null) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  const $ = s => document.querySelector(s);
  const API_BASE = "https://web-med-production.up.railway.app";
  const PROMPTPAY_QR_URL =
  "https://res.cloudinary.com/dan0fftcp/image/upload/v1765960630/QR_Code_%E0%B8%9E%E0%B8%B4%E0%B8%A1%E0%B8%9E%E0%B9%8C%E0%B8%A0%E0%B8%B1%E0%B8%97%E0%B8%A3_2_gzun7m.jpg";

  const money = n => "฿" + Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ensure cart/draft ready hook (if fillCartFromServer exists)
  (async function ensureDraftReady(){
    try {
      if (window.fillCartFromServer && typeof window.fillCartFromServer === 'function') {
        await window.fillCartFromServer();
        await new Promise(r => setTimeout(r, 80));
        console.log("fillCartFromServer done (payment boot)");
      } else {
        console.log("no fillCartFromServer found — continue");
      }
    } catch (e) {
      console.warn("ensureDraftReady error:", e);
    }
  })();

  // boot after small delay to let ensureDraftReady run
  setTimeout(boot, 100);

  async function boot() {

      // ====== SHOW PROMPTPAY QR ======
// ====== SHOW PROMPTPAY QR (CLEAN VERSION) ======
const qrContainer = document.getElementById("qrContainer");
if (qrContainer && PROMPTPAY_QR_URL) {
  qrContainer.innerHTML = `
    <img
      src="${PROMPTPAY_QR_URL}"
      alt="PromptPay QR Code"
      style="
        width:220px;
        max-width:100%;
        height:auto;
        display:block;
        margin:0 auto 12px;
      "
    />
    <div style="font-weight:600">
      กรุณาชำระเงินตามยอดที่แสดง
    </div>
  `;
}


    // load draft (from localStorage) or build from cart
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem("orderDraft") || "null");
    } catch(e) { draft = null; }

    if (!draft) {
      // fallback build from cart
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (!cart.length) { location.href = "index.html"; return; }
      const subtotal = cart.reduce((a,b)=> a + (Number(b.qty||0) * Number(b.price||0)), 0);
      const items = cart.map(i => ({
        productId: (i.id != null && !Number.isNaN(Number(i.id))) ? Number(i.id) : null,
        slug: i.slug || slugify(i.name) || null,
        name: i.name,
        sku: i.code || null,
        qty: Number(i.qty || 1),
        unitPrice: Number(i.price || 0),
        lineTotal: Number((i.qty||1)*(i.price||0)),
          image:
          i.image ||
          i.imageUrl ||
          i.thumbnail ||
          (Array.isArray(i.images) ? i.images[0] : null) ||
          null
      }));
      draft = {
        userId: null,
        customer: { name: "ลูกค้า", address: "-", phone: null },
        shippingMethod: null,
        paymentMethod: "promptpay",
        items,
        subtotal,
        // shipFee removed on purpose; if server requires, client will send 0
        total: subtotal,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem("orderDraft", JSON.stringify(draft));
    } else {
      // normalize items
      draft.items = (draft.items || []).map(it => {
        return {
          productId: (it.productId != null && !Number.isNaN(Number(it.productId))) ? Number(it.productId) : null,
          slug: it.slug || slugify(it.nameSnapshot || it.name) || null,
          variantId: (it.variantId != null && !Number.isNaN(Number(it.variantId))) ? Number(it.variantId) : null,
          name: it.nameSnapshot || it.name || "",
          sku: it.skuSnapshot || it.sku || null,
          qty: Number(it.qty || 1),
          unitPrice: Number((it.unitPrice !== undefined && it.unitPrice !== null) ? it.unitPrice : (it.price || 0)),
          lineTotal: Number(it.lineTotal || ((it.qty||1) * (it.unitPrice || it.price || 0))),
          image:
  it.image ||
  it.imageSnapshot ||
  it.imageUrl ||
  it.thumbnail ||
  (Array.isArray(it.images) ? it.images[0] : null) ||
  null

        };
      });
      // ensure numeric totals
      draft.subtotal = Number(draft.subtotal || draft.total || (draft.items || []).reduce((a,b)=>a + (b.lineTotal||0), 0));
      draft.total = Number(draft.total != null ? draft.total : draft.subtotal);
      localStorage.setItem("orderDraft", JSON.stringify(draft));
    }

    // render summary
    const list = document.getElementById("sumItems");
    const sumSubtotal = document.getElementById("sumSubtotal");
    const sumShip = document.getElementById("sumShip");
    const sumTotal = document.getElementById("sumTotal");
    const shipRow = document.getElementById("shipRow");

    if (list) {
      list.innerHTML = draft.items.map(i => `
        <div class="order-item" style="display:flex;gap:12px;align-items:center;margin-bottom:12px">
          <div class="order-thumb"
     style="width:60px;height:60px;border-radius:8px;flex:0 0 60px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;overflow:hidden">
  ${i.image ? `
    <img src="${i.image}"
         alt=""
         style="width:100%;height:100%;object-fit:cover" />
  ` : ``}
</div>

          <div style="flex:1">
            <div class="order-name" style="font-weight:700">${i.name}</div>
            ${i.sku ? `<div class="order-option" style="color:#94a3b8;font-size:13px">รหัส: ${i.sku}</div>` : ""}
            <div class="order-option" style="color:#94a3b8;font-size:13px">x${i.qty}</div>
          </div>
          <div class="order-price" style="font-weight:700">${money(i.unitPrice * i.qty)}</div>
        </div>
      `).join("");
    }

    // show subtotal and total; hide or set ship to 0
    if (sumSubtotal) sumSubtotal.textContent = money(draft.subtotal);
    if (sumShip) sumShip.textContent = money(0); 
    if (shipRow) shipRow.style.display = "none";
    if (sumTotal) sumTotal.textContent = money(draft.total);

    // slip preview handler
    const slipInput = document.getElementById("slipFile");
    const slipPreview = document.getElementById("slipPreview");
    if (slipInput) {
      slipInput.addEventListener("change", (e) => {
        const f = e.target.files[0];
        if (!f) { if (slipPreview) slipPreview.innerHTML = ""; return; }
        if (slipPreview) slipPreview.innerHTML = `<div style="font-size:13px">${f.name} (${Math.round(f.size/1024)} KB)</div>`;
      });
    }

    // paid button click -> create order + optional background upload of slip
    const btn = document.getElementById("paidBtn");
    if (btn) {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "กำลังสร้างคำสั่งซื้อ...";

        try {
          // prepare payload for create order
          const payload = {
            userId: draft.userId || null,
            orderNumber: draft.orderNumber || null,
            customer: draft.customer || { name: "ลูกค้า", address: "-", phone: null },
            shippingMethod: draft.shippingMethod || null,
            paymentMethod: "promptpay",
            subtotal: draft.subtotal,
            shippingFee: 0, // send zero to be explicit (server should accept missing/0)
            taxTotal: draft.taxTotal || 0,
            grandTotal: draft.total,
            items: (draft.items || []).map(i => ({
              productId: (i.productId != null && !Number.isNaN(Number(i.productId))) ? Number(i.productId) : null,
              slug: i.slug || slugify(i.name) || null,
              variantId: (i.variantId != null && !Number.isNaN(Number(i.variantId))) ? Number(i.variantId) : null,
              nameSnapshot: i.name || i.nameSnapshot || '',
              skuSnapshot: i.sku || i.code || i.skuSnapshot || '',
              qty: Number(i.qty || 1),
              unitPrice: Number(i.unitPrice || i.price || 0),
              lineTotal: Number(i.lineTotal || ((i.qty||1) * (i.unitPrice || i.price || 0))),
              image: i.image || null
            })),
            address: {
              type: "SHIPPING",
              fullName: (draft.customer && draft.customer.name) || "",
              phone: (draft.customer && draft.customer.phone) || null,
              line1: (draft.customer && draft.customer.address) || "-"
            },
            payment: {
              slipUrl: null,
              payerName: (draft.customer && draft.customer.name) || null,
              amount: draft.total,
              status: "PENDING"
            }
          };

          // create order
          const createRes = await fetch(`${API_BASE}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!createRes.ok) {
            const txt = await createRes.text().catch(()=>"");
            throw new Error("HTTP " + createRes.status + " " + txt);
          }
          const createJson = await createRes.json().catch(()=>null);
          if (!createJson || !createJson.success || !createJson.data) throw new Error(createJson && createJson.message ? createJson.message : "Invalid response from create order");

          const createdOrder = createJson.data;
          const orderId = createdOrder.id || createdOrder.orderNumber || null;

         const f = slipInput && slipInput.files && slipInput.files[0];

if (f && orderId) {
  (async () => {
    try {
      // ================================
      // 1. upload slip to cloudinary
      // ================================
      const fd = new FormData();
      fd.append("file", f); // ✅ ใช้ f

      const token =
        localStorage.getItem("auth_token") ||
        (() => {
          try {
            const u = JSON.parse(localStorage.getItem("auth_user") || "null");
            return u?.token || null;
          } catch {
            return null;
          }
        })();

      const up = await fetch(`${API_BASE}/api/uploads`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: "Bearer " + token } : {}
      });

      const uj = await up.json();
      if (!uj.success || !uj.data?.url) {
        console.error("upload slip failed", uj);
        return;
      }

      const slipUrl = uj.data.url;

      // ================================
      // 2. attach slip to payment
      // ================================
      await fetch(`${API_BASE}/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify({
          amount: draft.total,
          payerName: draft.customer?.name || null,
          slipUrl: slipUrl,
          status: "PENDING"
        })
      });

    } catch (e) {
      console.error("background upload/update error:", e);
    }
  })();
}


          // clear cart/draft and redirect to success
          localStorage.setItem("lastOrderId", createdOrder.id || createdOrder.orderNumber || "");
          localStorage.removeItem("cart");
          localStorage.removeItem("orderDraft");
          window.dispatchEvent(new Event("cart:changed"));
          window.dispatchEvent(new Event("orders:changed"));

          location.href = `success.html?orderNumber=${encodeURIComponent(createdOrder.orderNumber || "")}`;
        } catch (err) {
          console.error("create order error:", err);
          alert("ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่ หรือแจ้งผู้ดูแลระบบ");
          btn.disabled = false;
          btn.textContent = originalText;
        }
      });
    }
  } // end boot
})();
