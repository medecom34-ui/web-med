// Client/assets/js/checkout.js
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

(function () {
  const $ = (s) => document.querySelector(s);
  const money = (n) => "฿" + Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const me = (window.Auth && Auth.current && Auth.current()) || null;
  if (!me) { location.href = "login.html?next=" + encodeURIComponent(location.pathname); return; }

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  if (!cart.length) { location.href = "index.html"; return; }

  const itemsBox = $("#orderItems");
  // replace the existing items rendering block with this:
  if (itemsBox) {
    itemsBox.innerHTML = cart
      .map((i) => `
        <div class="order-item" data-key="${i.key || ''}">
          <div class="order-thumb" style="${i.image ? `background-image:url(${i.image})` : ''}"></div>
          <div style="flex:1; min-width:0;">
            <div class="order-name">${i.name}</div>
            ${(i.code || i.sku || i.skuSnapshot)
  ? `<div class="order-option">รหัส: ${i.code || i.sku || i.skuSnapshot}</div>`
  : ''}

            <div class="order-option">x${i.qty}</div>
          </div>
          <div class="order-price">${money(i.price * i.qty)}</div>
        </div>
      `).join("");
  }

  const subtotal = cart.reduce((a, b) => a + b.qty * b.price, 0);
 
  const subEl = $("#subtotal"), shipEl = $("#shipFee"), grandEl = $("#grandTotal");
  if (subEl) subEl.textContent = money(subtotal);
  if (shipEl) shipEl.textContent = money(0);
  if (grandEl) grandEl.textContent = money(subtotal);



  function normalizePhone(input) {
    let s = String(input || "").replace(/[\s-]/g, "");
    if (s.startsWith("+66")) s = "0" + s.slice(3);
    return s;
  }

  function validatePhone(input) {
    const s = normalizePhone(input);
    return /^0\d{9}$/.test(s);
  }

  function validate() {
    const nameEl = $("#name"), phoneEl = $("#phone"), addrEl = $("#address");
    // payment/shipping inputs ถูกตัดออกจาก validation (payment fixed)
    if (!nameEl.value.trim() || !validatePhone(phoneEl.value) || !addrEl.value.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบและถูกต้อง (ตรวจสอบเบอร์โทร)");
      return false;
    }
    return true;
  }

  $("#toPayment").addEventListener("click", () => {
    if (!validate()) return;

    // create items with image included so payment page can show thumbnails
    const items = cart.map(i => {
      // robust productId detection: productId OR id (string or number)
      const productId = (i.productId != null) ? toNumberIfPossible(i.productId) : toNumberIfPossible(i.id);

      // slug fallback: existing slug OR create from name
      const slug = i.slug || i.slugSnapshot || slugify(i.name) || null;

      return {
        productId: productId,
        slug: slug,
        variantId: (i.variantId != null && !isNaN(Number(i.variantId))) ? Number(i.variantId) : null,
        nameSnapshot: i.name || i.title || "",
        skuSnapshot: i.code || i.sku || null,
        qty: Number(i.qty || 1),
        unitPrice: Number(i.price || i.unitPrice || 0),
        lineTotal: Number((i.qty||1) * (i.price || i.unitPrice || 0)),
        image: i.image || i.imageSnapshot || null
      };
    });

    const subtotalLocal = cart.reduce((a, b) => a + b.qty * b.price, 0);
    
    const draft = {
      userId: me.id,
        address: {
    fullName: $("#name").value.trim(),
    phone: normalizePhone($("#phone").value.trim()),
    line1: $("#address").value.trim(), 
    countryCode: "TH"
  },
      shippingMethod: null,
      paymentMethod: "promptpay", 
      items,
      subtotal: subtotalLocal,
      
      total: subtotalLocal,
      createdAt: new Date().toISOString(),
      status: "PENDING"
    };

    localStorage.setItem("orderDraft", JSON.stringify(draft));
    location.href = "payment.html";
  });
})();
