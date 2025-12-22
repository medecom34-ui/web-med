// assets/js/product.js
const API_BASE = "https://web-med-production.up.railway.app";
const $ = (s) => document.querySelector(s);
const fmtTHB = (n) =>
  Number(n).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " THB";

const params = new URLSearchParams(location.search);
const slug = params.get("slug");

if (!slug) {
  document.body.innerHTML =
    "<h2 style='text-align:center;margin-top:50px'>ไม่พบสินค้า (ไม่มี slug)</h2>";
  throw new Error("Missing slug");
}

let product = null;
let selectedVariant = null;

const MAIN_IMG_WIDTH = 600;   
const THUMB_IMG_WIDTH = 150;  

/** ย่อรูป Cloudinary อัตโนมัติ */
function optimizeImg(url, width) {
  if (!url) return url;
  if (!url.includes("/upload/")) return url; 

  return url.replace(
    "/upload/",
    `/upload/w_${width},f_auto,q_auto:eco/`
  );
}


function resolvePrice(variant, product) {
  // ถ้ามี variant ให้ลองดึงค่าหลายชื่อที่เป็นไปได้
  if (variant) {
    const candidates = [
      variant.price,
      variant.priceTHB,
      variant.amount,
      variant.unitPrice,
      variant.price_usd, // ถ้ามีรูปแบบอื่น
    ];
    for (const c of candidates) {
      if (c === undefined || c === null) continue;
      const num = Number(c);
      if (Number.isFinite(num)) return num;
    }
  }
  // fallback ไปที่ product
  const p = product?.priceTHB ?? product?.price ?? 0;
  const pn = Number(p);
  return Number.isFinite(pn) ? pn : 0;
}

// โหลดข้อมูลจาก API
async function loadProduct() {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error(json.message || "Invalid response");

    product = json.data;
    // เลือก variant แรกถ้ามี
    selectedVariant = Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants[0]
      : null;
    renderProduct();
  } catch (err) {
    console.error("loadProduct error:", err);
    document.body.innerHTML =
      "<h2 style='text-align:center;margin-top:50px'>โหลดรายละเอียดสินค้าไม่สำเร็จ</h2>";
  }
}

function renderProduct() {
  const p = product;
  if (!p) return;

  // breadcrumb
  $("#crumb-main").textContent = "รายละเอียดสินค้า";
  $("#crumb-sub").textContent = " › " + p.name;

  // title / code / price / desc
  $("#product-name").textContent = p.name;
  $("#product-code").textContent = p.code || "-";

  // แสดงราคาจาก variant ถ้ามี (โดยใช้ resolvePrice)
  const displayPrice = resolvePrice(selectedVariant, p);
  $("#product-price").textContent =
    displayPrice !== null && displayPrice !== undefined
      ? fmtTHB(displayPrice)
      : "กรุณาสอบถาม";

  // -------------------------
  // DESCRIPTION HANDLING
  // -------------------------
  // prefer longDesc ถ้ามี, ถ้าไม่มี fallback ไป description
  const rawDesc = (p.longDesc ?? p.description ?? "-").toString();

  // ตรวจหา tag HTML ที่เรายอมรับให้แสดง (ชุดนี้ปรับได้)
  const htmlTagRegex = /<\s*(br|p|ul|ol|li|strong|em|b|i|a|span)[\s>/]/i;
  const hasHtmlTag = htmlTagRegex.test(rawDesc);

  // basic sanitizer (เอา script/style และ on* attributes ออก)
  function sanitizeHtml(str) {
    // เอา <script> และ <style> ออกทั้งหมด
    str = str.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\1\s*>/gi, "");
    // เอา attribute ที่ขึ้นต้นด้วย on... เช่น onclick, onerror ออก
    str = str.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    // ป้องกัน javascript: ใน href/src
    str = str.replace(/(href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, "");
    return str;
  }

  if (hasHtmlTag) {
    // กรณีมี HTML tag — sanitize เบื้องต้นแล้วแสดงเป็น HTML
    $("#product-desc").innerHTML = sanitizeHtml(rawDesc);
  } else if (rawDesc.indexOf("\n") !== -1) {
    // กรณีมี newline (\n) แต่ไม่มี HTML tag — แปลงเป็น <br/>
    const withBr = rawDesc.replace(/\r\n?/g, "\n").replace(/\n/g, "<br/>");
    $("#product-desc").innerHTML = sanitizeHtml(withBr);
  } else {
    // ปกติเป็นข้อความเดียว — แสดงด้วย textContent (ปลอดภัย)
    $("#product-desc").textContent = rawDesc;
  }

  // -------------------------
  // รูปสินค้าใหญ่ + thumbnails (เดิม)
  // -------------------------
  const mainImg = $("#product-image");
  const thumbsWrap = document.getElementById("product-thumbs");

  // เผื่อ browser รองรับ lazy
  mainImg.loading = "lazy";

  if (p.images && p.images.length > 0) {
    const firstImg = p.images[0];

    mainImg.src = optimizeImg(firstImg.url, MAIN_IMG_WIDTH);
    mainImg.alt = firstImg.alt || p.name;

    thumbsWrap.innerHTML = p.images
      .map(
        (img, idx) => `
        <button class="thumb ${idx === 0 ? "active" : ""}" data-index="${idx}">
          <img src="${optimizeImg(img.url, THUMB_IMG_WIDTH)}"
               alt="${img.alt || p.name}"
               loading="lazy">
        </button>`
      )
      .join("");

    thumbsWrap.onclick = (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn) return;

      const idx = Number(btn.dataset.index);
      const img = p.images[idx];
      if (!img) return;

      mainImg.src = optimizeImg(img.url, MAIN_IMG_WIDTH);
      mainImg.alt = img.alt || p.name;

      thumbsWrap
        .querySelectorAll(".thumb")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
    };
  } else {
    mainImg.src = "./assets/img/placeholder.png";
    mainImg.alt = "no image";
    thumbsWrap.innerHTML = "";
  }

  // reset qty
  $("#qty").value = 1;
  renderVariantOptions();
}

function renderVariantOptions() {
  const wrap = document.getElementById("product-options");
  wrap.innerHTML = "";

  // ถ้ามี variant แค่ตัวเดียว ไม่ต้องแสดงตัวเลือก
  if (!product?.variants || product.variants.length <= 1) return;

  wrap.innerHTML = `
    <div class="option-title">เลือกตัวเลือก</div>
    <div class="option-list">
      ${product.variants.map((v, idx) => {

        // default fallback = sku
        let label = v.sku;

        try {
          const attr = v.attributesJson || {};
          const parts = [];

          // เอาค่าดิบจาก json มาต่อชื่อ
          if (attr.size) parts.push(attr.size);
          if (attr.connector) parts.push(attr.connector);
          if (attr.type) parts.push(attr.type);
          if (attr.color) parts.push(attr.color);
          if (attr.model) parts.push(attr.model);
          if (attr.bladeNo) parts.push(`No.${attr.bladeNo}`); 
          if (attr.shape) parts.push(attr.shape);
          if (attr.width) parts.push(attr.width);
          if (attr.length) parts.push(attr.length);
          if (attr.tip) parts.push(attr.tip);
          if (attr.teeth) parts.push(attr.teeth);
          if (attr.armCircumference) parts.push(attr.armCircumference);
          if (attr.capacity) parts.push(attr.capacity);

          // ถ้ามีข้อมูลใน json ใช้ label ใหม่
          if (parts.length > 0) {
            label = parts.join(" / ");
          }
        } catch (e) {
          // fallback ใช้ sku
        }

        return `
           <label class="variant-box">
            <input type="radio"
                   name="variant"
                   value="${v.id}"
                   ${idx === 0 ? "checked" : ""}>
            <span class="variant-label">${label}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;

  // bind event เมื่อเปลี่ยนตัวเลือก
  wrap.querySelectorAll("input[name='variant']").forEach((el) => {
    el.addEventListener("change", () => {
      const id = el.value;
      selectedVariant = product.variants.find(v => v.id === id);
      updatePrice();
      updateSku();
    });
  });
}


function updatePrice() {
  const price = resolvePrice(selectedVariant, product);
  $("#product-price").textContent = fmtTHB(price);
}

function updateSku() {
  $("#product-code").textContent =
    selectedVariant?.sku || product.code || "-";
}


// qty controls
$("#plus").onclick = () => {
  const el = $("#qty");
  el.value = Number(el.value || 1) + 1;
};
$("#minus").onclick = () => {
  const el = $("#qty");
  const v = Number(el.value || 1);
  if (v > 1) el.value = v - 1;
};

// add to cart
$("#addCart").onclick = () => {
  if (!product) return;
  const qty = Number($("#qty").value || 1);
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  
  const variant = selectedVariant || null;
  const key = variant
  ? `${product.slug}__v${variant.id}`
  : product.slug;

  const idx = cart.findIndex((c) => c.key === key);

  const firstImgRaw = product.images?.[0]?.url || null;
  const firstImg = firstImgRaw ? optimizeImg(firstImgRaw, 200) : null; // small thumb

  

  // ตัดสินราคาด้วย resolvePrice (รองรับหลายชื่อตัวแปร)
  const resolvedPrice = resolvePrice(variant, product);

  // sku fallback: variant.sku หรือ variant.code หรือ product.code
  const sku = variant ? (variant.sku ?? variant.code ?? product.code ?? "") : (product.code || "");

  const item = {
    key,
    id: product.id,
    productId: product.id,            // เพื่อความชัดเจน
    variantId: variant ? variant.id : null,
    slug: product.slug,
    name: product.name,
    option: variant ? variant.attributesJson : null,
    code: variant?.code || product.code || null,
    sku: sku,
    qty,
    price: resolvedPrice,
    image: firstImg,
  };

  if (idx > -1) { cart[idx].qty += qty; }
  else cart.push(item);

  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart:changed"));
  alert("เพิ่มสินค้าในตะกร้าแล้ว");
};

document.getElementById("year").textContent = new Date().getFullYear();
loadProduct();
