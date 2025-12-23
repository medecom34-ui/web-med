
(function () {
  const $ = s => document.querySelector(s);
  const fmtTHB = n =>
    "฿" + Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const API_BASE = "https://web-med-production.up.railway.app"; 

  const DATA_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='160' viewBox='0 0 200 160'>
      <rect fill='#f3f4f6' width='100%' height='100%'></rect>
      <g fill='#e5e7eb' font-family='Arial' font-size='14'>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>No image</text>
      </g>
    </svg>`
  );


  const Cart = {
    load()  { return JSON.parse(localStorage.getItem("cart") || "[]"); },
    save(c) { localStorage.setItem("cart", JSON.stringify(c)); this.broadcast(); },
    broadcast(){ window.dispatchEvent(new Event("cart:changed")); },
    count() { return this.load().reduce((a, i) => a + (i.qty||0), 0); },
    total() { return this.load().reduce((a, i) => a + (i.qty||0) * (i.price||0), 0); },
    add(item) {
      const c = this.load();
      const idx = c.findIndex(x => x.key === item.key);
      if (idx > -1) c[idx].qty += item.qty; else c.push(item);
      this.save(c);
    },
    update(key, qty) {
      const c = this.load();
      const i = c.findIndex(x => x.key === key);
      if (i > -1) { c[i].qty = Math.max(1, qty); this.save(c); }
    },
    remove(key) {
      const c = this.load().filter(x => x.key !== key);
      this.save(c);
    }
  };

  window.AppCart = Cart;

  // UI refs
  const btn     = $("#cartButton");
  const badge   = $("#cartCount");
  const drawer  = $("#cartDrawer");
  const overlay = $("#cartOverlay");
  const closeBtn= $("#cartClose");
  const list    = $("#cartItems");
  const totalEl = $("#cartTotal");
  const goBtn   = $("#goCheckout");

  function updateCartBadge() {
    if (badge) badge.textContent = Cart.count();
  }

  function updateStatusHeaderBadge() {
    const statusBadge = document.getElementById("statusBadge");
    if (!statusBadge) return;
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    const active = orders.filter(o => o.status !== "delivered").length;
    statusBadge.textContent = active;
  }

function openDrawer(){
  drawer.classList.remove("hidden");
  overlay.classList.remove("hidden");
  drawer.classList.add("show");
  overlay.classList.add("show");
}

function closeDrawer(){
  drawer.classList.remove("show");
  overlay.classList.remove("show");
  drawer.classList.add("hidden");
  overlay.classList.add("hidden");
}

  function goLoginWithNext(next) {
    const url = "login.html?next=" + encodeURIComponent(next || "checkout.html");
    location.href = url;
  }

  function syncCheckoutButton() {
    if (!goBtn) return;
    const isLoggedIn = !!(window.Auth && Auth.current && Auth.current());
    if (isLoggedIn) {
      goBtn.classList.remove("btn-disabled");
      goBtn.removeAttribute("aria-disabled");
      goBtn.setAttribute("href", "checkout.html");
      goBtn.onclick = null;
    } else {
      goBtn.classList.add("btn-disabled");
      goBtn.setAttribute("aria-disabled", "true");
      goBtn.removeAttribute("href");
      goBtn.onclick = (e) => {
        e.preventDefault();
        alert("กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ");
        goLoginWithNext("checkout.html");
      };
    }
  }

  function safeImgSrc(url) {
    if (!url) return DATA_PLACEHOLDER;
    const u = String(url);
    if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) return u;
    if (u.startsWith("/")) return u;
    return u;
  }

  // load missing images (background)
  async function ensureImagesForMissing() {
    const cart = Cart.load();
    const need = cart.filter(i => !i.image || i.image === null || i.image === "");
    if (!need.length) return false;
    let changed = false;
    await Promise.all(need.map(async (row) => {
      try {
        const slug = row.slug || row.id || row.key;
        if (!slug) return;
        const r = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (!j.success || !j.data) return;
        const first = j.data.images?.[0]?.url || j.data.imageUrl || null;
        if (first) {
          const pic = (first.includes("/upload/")) ? first.replace("/upload/", "/upload/w_200,f_auto,q_auto:eco/") : first;
          const idx = cart.findIndex(x => x.key === row.key);
          if (idx > -1) {
            cart[idx].image = pic;
            changed = true;
          }
        }
      } catch (e) {
        console.warn("ensureImagesForMissing failed for", row, e);
      }
    }));
    if (changed) { Cart.save(cart); return true; }
    return false;
  }

  function normalizeOption(opt) {
  if (!opt) return null;
  if (typeof opt === "string") return opt;
  if (typeof opt === "object") return Object.values(opt).join(" / ");
  return String(opt);
}


  function render() {
    if (list) {
      const items = Cart.load();
      list.innerHTML = items.length
        ? items.map(row => `
          <div class="cart-item" data-key="${row.key}">
            <div class="cart-thumb">
              <img src="${safeImgSrc(row.image)}" alt="${row.name}" onerror="this.onerror=null;this.src='${DATA_PLACEHOLDER}'">
            </div>
            <div class="cart-main">
              <div class="item-name">${row.name}</div>
              ${(() => {
                          const optionText = normalizeOption(row.option);
                          return optionText
                            ? `<div class="item-option">ตัวเลือก: ${optionText}</div>`
                            : "";
                        })()}

              ${(row.sku || row.code) ? `<div class="item-code mono">รหัส: ${row.sku || row.code}</div>` : ""}  
              <div class="item-price">${fmtTHB(row.price)}</div>
            </div>
            <div class="cart-actions">
              <div class="qty-ctrl">
                <button class="minus">−</button>
                <input class="qty" type="number" min="1" value="${row.qty}" />
                <button class="plus">+</button>
              </div>
              <button class="del-btn" title="ลบ">✕</button>
            </div>
          </div>
        `).join("")
        : `<div style="padding:12px; color:#64748b;">ตะกร้าว่าง</div>`;
      totalEl && (totalEl.textContent = fmtTHB(Cart.total()));
    }
    updateCartBadge();
    syncCheckoutButton();
    ensureImagesForMissing().catch(()=>{});
  }

  async function fillCartFromServer() {
    try {
      const cart = Cart.load();
      if (!cart.length) return;

      const numericIds = [];
      const slugCandidates = new Set();

      cart.forEach(i => {
        if (i.slug) slugCandidates.add(String(i.slug));
        if (i.key) slugCandidates.add(String(i.key));
        if (i.id != null && i.id !== "") {
          const n = Number(i.id);
          if (!Number.isNaN(n)) numericIds.push(n);
          else slugCandidates.add(String(i.id));
        }
      });

      const ids = numericIds.length ? Array.from(new Set(numericIds)) : [];
      const slugs = Array.from(slugCandidates).filter(Boolean);

      if (!ids.length && !slugs.length) {
        console.warn("fillCartFromServer: no ids or slugs to query");
        return;
      }

      const payload = {};
      if (ids.length) payload.ids = ids;
      if (slugs.length) payload.slugs = slugs;

      console.log("fillCartFromServer payload:", payload);

      const res = await fetch(`${API_BASE}/api/products/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text().catch(()=>"[no body]");
        console.warn("batch fetch failed", res.status, txt);
        return;
      }
      const json = await res.json();
      if (!json.success || !json.data) {
        console.warn("batch fetch invalid response", json);
        return;
      }
      const products = Array.isArray(json.data) ? json.data : Object.values(json.data || {});
      const byId = new Map();
      const bySlug = new Map();
      products.forEach(p => {
        if (p.id != null) byId.set(String(p.id), p);
        if (p.slug) bySlug.set(String(p.slug), p);
      });

      const newCart = cart.map(item => {
        const p = (item.id != null && byId.has(String(item.id)) ? byId.get(String(item.id)) : null)
                || (item.slug && bySlug.has(String(item.slug)) ? bySlug.get(String(item.slug)) : null)
                || (item.key && bySlug.has(String(item.key)) ? bySlug.get(String(item.key)) : null)
                || null;

        if (!p) return item;

        let variant = null;
        if (item.variantId && Array.isArray(p.variants)) {
          variant = p.variants.find(v => String(v.id) === String(item.variantId)) || p.variants[0];
        } else {
          variant = Array.isArray(p.variants) ? p.variants[0] : null;
        }

        const firstImg = (p.media && p.media[0] && p.media[0].url) || (p.images && p.images[0] && p.images[0].url) || item.image || null;
        const priceVal = variant && variant.price != null ? variant.price : (p.priceTHB ?? p.price ?? item.price ?? 0);

        // IMPORTANT: normalize id/variantId -> string; price -> number
        return {
          ...item,
          id: p.id != null ? String(p.id) : item.id,
          slug: p.slug ? String(p.slug) : (item.slug || item.key || null),
          name: p.name || item.name,
          code: p.code || item.code || null,
          price: Number(priceVal),
          variantId: variant ? String(variant.id) : (item.variantId != null ? String(item.variantId) : null),
          image: firstImg || item.image || null
        };
      });

      localStorage.setItem("cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cart:changed"));
      console.log("Cart enriched from server:", newCart);

      // sync orderDraft.items if exists (so payment page gets data)
      try {
        const odRaw = localStorage.getItem("orderDraft");
        if (odRaw) {
          const od = JSON.parse(odRaw);
          const lookup = new Map();
          newCart.forEach(ci => {
            if (ci.key) lookup.set(String(ci.key), ci);
            if (ci.slug) lookup.set(String(ci.slug), ci);
            if (ci.id != null) lookup.set(String(ci.id), ci);
          });

          if (Array.isArray(od.items)) {
            od.items = od.items.map(it => {
              const k = String(it.key || it.slug || it.productId || it.id || "");
              const found = lookup.get(k) || lookup.get(String(it.slug)) || lookup.get(String(it.productId)) || null;
              if (!found) return it;
              const qty = Number(it.qty || found.qty || 1);
              const unitPrice = Number(found.price ?? it.unitPrice ?? it.price ?? 0);
              return {
                productId: found.id ? (Number.isNaN(Number(found.id)) ? null : Number(found.id)) : null,
                slug: found.slug || null,
                variantId: found.variantId ? (Number.isNaN(Number(found.variantId)) ? null : Number(found.variantId)) : null,
                nameSnapshot: found.name || it.nameSnapshot || found.name,
                skuSnapshot: found.code || it.skuSnapshot || null,
                qty,
                unitPrice,
                lineTotal: Number(qty * unitPrice)
              };
            });
            od.subtotal = od.items.reduce((s,i) => s + (i.lineTotal||0), 0);
          } else {
            od.items = newCart.map(ci => ({
              productId: ci.id ? (Number.isNaN(Number(ci.id)) ? null : Number(ci.id)) : null,
              slug: ci.slug || null,
              variantId: ci.variantId ? (Number.isNaN(Number(ci.variantId)) ? null : Number(ci.variantId)) : null,
              nameSnapshot: ci.name || "",
              skuSnapshot: ci.code || null,
              qty: ci.qty || 1,
              unitPrice: Number(ci.price || 0),
              lineTotal: Number((ci.qty || 1) * (ci.price || 0))
            }));
            od.subtotal = od.items.reduce((s,i) => s + (i.lineTotal||0), 0);
          }
          localStorage.setItem("orderDraft", JSON.stringify(od));
          console.log("orderDraft synced:", od);
        }
      } catch (e) {
        console.warn("failed to sync orderDraft:", e);
      }

    } catch (err) {
      console.warn("fillCartFromServer error:", err);
    }
  }

  // expose for manual calls from other pages
  window.fillCartFromServer = fillCartFromServer;

  // events
  btn      && btn.addEventListener("click", () => { render(); openDrawer(); });
  overlay  && overlay.addEventListener("click", closeDrawer);
  closeBtn && closeBtn.addEventListener("click", closeDrawer);
  goBtn    && goBtn.addEventListener("click", closeDrawer);

  list && list.addEventListener("click", e => {
    const wrap = e.target.closest(".cart-item");
    if (!wrap) return;
    const key = wrap.dataset.key;
    if (e.target.classList.contains("minus")) {
      const qtyEl = wrap.querySelector(".qty");
      Cart.update(key, Math.max(1, (+qtyEl.value || 1) - 1));
      render();
    }
    if (e.target.classList.contains("plus")) {
      const qtyEl = wrap.querySelector(".qty");
      Cart.update(key, (+qtyEl.value || 1) + 1);
      render();
    }
    if (e.target.classList.contains("del-btn")) {
      Cart.remove(key);
      render();
    }
  });

  list && list.addEventListener("change", e => {
    if (e.target.classList.contains("qty")) {
      const wrap = e.target.closest(".cart-item");
      const key = wrap.dataset.key;
      Cart.update(key, Math.max(1, +e.target.value || 1));
      render();
    }
  });

  window.addEventListener("cart:changed", render);
  window.addEventListener("orders:changed", updateStatusHeaderBadge);
  window.addEventListener("auth:changed", syncCheckoutButton);

  // initial paint
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await fillCartFromServer();
      await ensureImagesForMissing();
    } catch (e) {
      console.warn(e);
    } finally {
      render();
      updateStatusHeaderBadge();
      syncCheckoutButton();
    }
  });
})();
