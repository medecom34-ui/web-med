
const API_BASE = "https://web-med-production.up.railway.app";


let products = [];
const PRODUCTS_NEED_OPTION = new Set([]);


const $ = (s) => document.querySelector(s);
const fmtTHB = (n) =>
  Number(n).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " THB";


function optimizeImg(url, width) {
  if (!url) return null;
  if (!url.includes("/upload/")) return url; // ถ้าไม่ใช่ Cloudinary ก็ปล่อยไป
  return url.replace("/upload/", `/upload/w_${width},f_auto,q_auto/`);
}

function isInboxProduct(p) {
  return String(p?.shortDesc || "").toUpperCase() === "INBOX";
}


// วงกลมสีเทา (data URI) สำหรับ select/pill
const PLACEHOLDER_ICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><circle cx='11' cy='11' r='11' fill='%23e5e7eb'/></svg>";

function toOptions(arr, valueKey = "slug", labelKey = "name", width = 80) {
  return arr.map((o) => {
    const raw = (o.img || o.imageUrl || "").trim();
    const imgUrl = raw ? optimizeImg(raw, width) : PLACEHOLDER_ICON;
    return {
      value: o[valueKey],
      label: o[labelKey],
      img: imgUrl,
    };
  });
}


function buildSmartSelect(nativeSel, mountEl, options, currentValue, onChange) {
  nativeSel.innerHTML = options
    .map(
      (o) =>
        `<option value="${o.value}" ${
          o.value === currentValue ? "selected" : ""
        }>${o.label}</option>`
    )
    .join("");

  const selected =
    options.find((o) => o.value === currentValue) ||
    options[0] || { label: "-", img: PLACEHOLDER_ICON };

  mountEl.innerHTML = `
    <div class="ss">
      <button type="button" class="ss-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="ss-icon" style="background-image:url('${selected.img}')"></span>
        <span class="ss-label">${selected.label}</span>
        <span class="ss-caret">▾</span>
      </button>
      <ul class="ss-list" role="listbox"></ul>
    </div>`;

  const root = mountEl.querySelector(".ss");
  const trigger = root.querySelector(".ss-trigger");
  const list = root.querySelector(".ss-list");

  list.innerHTML = options
    .map(
      (o) => `
    <li class="ss-item ${o.value === currentValue ? "active" : ""}" data-value="${
        o.value
      }">
      <span class="ss-icon" style="background-image:url('${o.img}')"></span>
      <span class="ss-text">${o.label}</span>
    </li>`
    )
    .join("");

  function open() {
    root.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  }
  function close() {
    root.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", () =>
    root.classList.contains("open") ? close() : open()
  );

  list.addEventListener("click", (e) => {
    const item = e.target.closest(".ss-item");
    if (!item) return;
    const val = item.getAttribute("data-value");
    const opt = options.find((o) => o.value === val);
    nativeSel.value = val;
    root.querySelector(".ss-label").textContent = opt.label;
    root.querySelector(".ss-icon").style.backgroundImage = `url('${opt.img}')`;
    list
      .querySelectorAll(".ss-item")
      .forEach((li) => li.classList.remove("active"));
    item.classList.add("active");
    nativeSel.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof onChange === "function") onChange(val);
    close();
  });

document.addEventListener("click", (e) => {


  if (
    e.target.closest("#cartButton") ||
    e.target.closest("#cartDrawer") ||
    e.target.closest("#cartClose")
  ) {
    return;
  }

  if (!e.target.closest(".ss")) {
    closeAllSelect();
  }
});

}



let flatCategories = [];
let categoryTree = [];
let rootCategories = [];

const params = new URLSearchParams(location.search);
let currentMain = null; // slug หมวดหลัก
let currentSub = null; // slug หมวดย่อย (ชั้น 2)
let currentSub2 = null; // slug หมวดย่อยของหมวดย่อย (ชั้น 3)

// DOM refs
const mainSel = $("#mainCat");
const subSel = $("#subCat");
const mainUI = $("#mainCatUI");
const subUI = $("#subCatUI");
const fieldSub = $("#field-sub");

const subSubSel = $("#subSubCat");
const subSubUI = $("#subSubCatUI");
const fieldSub2 = $("#field-sub2");
const subSubHelp = $("#subSubHelp");

const pageTitle = $("#pageTitle");
const crumbMain = $("#crumb-main");
const crumbSub = $("#crumb-sub");

const subStrip = $("#subStrip");
const subStripWrap = $("#subStripWrap");
const subOfMain = $("#subOfMain");

const subStrip2 = $("#subStrip2");
const subStripWrap2 = $("#subStripWrap2");
const subOfSub = $("#subOfSub");

const productGrid = $("#productGrid");

function buildCategoryTree(flatList) {
  const map = new Map();

  flatList.forEach((c) => {
    map.set(String(c.id), {
      ...c,
      id: String(c.id),
      parentId: c.parentId ? String(c.parentId) : null,
      children: [],
    });
  });

  const roots = [];

  map.forEach((cat) => {
    if (cat.parentId) {
      const parent = map.get(cat.parentId);
      if (parent) {
        parent.children.push(cat);
      } else {
        roots.push(cat);
      }
    } else {
      roots.push(cat);
    }
  });

  // sort tree โดยใช้ sortOrder (0/null ไปท้าย)
  const sortTree = (nodes) => {
    const normalize = (v) => (v === null || v === undefined || v === 0 ? 9999 : Number(v));
    nodes.sort((a, b) => {
      const sa = normalize(a.sortOrder);
      const sb = normalize(b.sortOrder);
      if (sa !== sb) return sa - sb;
      return String(a.name).localeCompare(String(b.name), "th");
    });
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) sortTree(n.children);
    });
  };

  sortTree(roots);
  return roots;
}

async function loadCategoriesFromApi() {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  //console.log('CATEGORY -> products response:', json);

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || "Invalid categories response");
  }

  flatCategories = json.data.map((c) => ({
    id: c.id,
    parentId: c.parentId || null,
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    imageUrl: c.imageUrl || null,
    imageAlt: c.imageAlt || null,
  }));

  categoryTree = buildCategoryTree(flatCategories);
  rootCategories = categoryTree;

  // ตั้งค่าเริ่มต้นจาก query หรือจากตัวแรก
  currentMain = params.get("category") || (rootCategories[0] ? rootCategories[0].slug : null);

  const mainNode = getCurrentMainNode();
  const level2 = mainNode ? mainNode.children || [] : [];

  currentSub =
    params.get("sub") && level2.find((c) => c.slug === params.get("sub"))
      ? params.get("sub")
      : level2[0]?.slug || null;

  const subNode = getCurrentSubNode();
  const level3 = subNode ? subNode.children || [] : [];

  currentSub2 =
    params.get("sub2") && level3.find((c) => c.slug === params.get("sub2"))
      ? params.get("sub2")
      : level3[0]?.slug || null;

  renderMainSelect();
  renderSubSelect();
  renderSub2Select();
  renderSubStrip();
  renderSubStrip2();
  updateTitlesAndBreadcrumb();
  await loadProductsForCurrentCategory(); 
}



function getCurrentMainNode() {
  return rootCategories.find((c) => c.slug === currentMain) || null;
}

function getCurrentSubs() {
  const main = getCurrentMainNode();
  return main ? main.children || [] : [];
}

function getCurrentSubNode() {
  const subs = getCurrentSubs();
  return subs.find((s) => s.slug === currentSub) || null;
}

function getCurrentSub2s() {
  const subNode = getCurrentSubNode();
  return subNode ? subNode.children || [] : [];
}



function renderMainSelect() {
  if (!rootCategories.length) return;
  if (!currentMain) currentMain = rootCategories[0].slug;

  buildSmartSelect(
    mainSel,
    mainUI,
    toOptions(rootCategories, "slug", "name", 120), // รูปหมวดหลัก
    currentMain,
    (val) => {
      currentMain = val;

      const subs = getCurrentSubs();
      currentSub = subs[0]?.slug || null;

      const sub2s = getCurrentSub2s();
      currentSub2 = sub2s[0]?.slug || null;

      renderSubSelect();
      renderSub2Select();
      renderSubStrip();
      renderSubStrip2();
      updateTitlesAndBreadcrumb();
      loadProductsForCurrentCategory(); 
      updateUrl();
    }
  );
}

function renderSubSelect() {
  const subs = getCurrentSubs();
  if (!subs.length) {
    fieldSub.style.display = "none";
    currentSub = null;
    subSel.innerHTML = "";
    subUI.innerHTML = "";
    return;
  }

  fieldSub.style.display = "";
  if (!subs.find((s) => s.slug === currentSub)) {
    currentSub = subs[0].slug;
  }

  buildSmartSelect(
    subSel,
    subUI,
    toOptions(subs, "slug", "name", 100), // รูปหมวดย่อย
    currentSub,
    (val) => {
      currentSub = val;

      const sub2s = getCurrentSub2s();
      currentSub2 = sub2s[0]?.slug || null;

      renderSub2Select();
      renderSubStrip2();
      updateTitlesAndBreadcrumb();
      loadProductsForCurrentCategory(); 
      markActivePill();
      updateUrl();
    }
  );
}

function renderSub2Select() {
  const subs2 = getCurrentSub2s();
  if (!subs2.length) {
    fieldSub2.style.display = "none";
    currentSub2 = null;
    subSubSel.innerHTML = "";
    subSubUI.innerHTML = "";
    return;
  }

  fieldSub2.style.display = "";
  const subNode = getCurrentSubNode();
  subSubHelp.textContent = subNode ? `เลือกหมวดหมู่ย่อยในหมวด "${subNode.name}"` : "เลือกหมวดหมู่ย่อยระดับที่ 2";

  if (!subs2.find((s) => s.slug === currentSub2)) {
    currentSub2 = subs2[0].slug;
  }

  buildSmartSelect(
    subSubSel,
    subSubUI,
    toOptions(subs2, "slug", "name", 100),
    currentSub2,
    (val) => {
      currentSub2 = val;
      updateTitlesAndBreadcrumb();
      loadProductsForCurrentCategory(); 
      markActivePill2();
      updateUrl();
    }
  );
}

function renderSubStrip() {
  const subs = getCurrentSubs();
  const mainNode = getCurrentMainNode();

  subOfMain.textContent = mainNode ? mainNode.name : "";

  if (!subs.length) {
    subStripWrap.style.display = "none";
    subStrip.innerHTML = "";
    return;
  }

  subStripWrap.style.display = "";
  subStrip.innerHTML = subs
    .map((s) => {
      const raw = s.imageUrl && s.imageUrl.trim() ? s.imageUrl.trim() : "";
      const img = raw ? optimizeImg(raw, 120) : PLACEHOLDER_ICON;
      return `
    <button type="button" class="pill" data-sub="${s.slug}">
      <span class="pill-icon" style="background-image:url('${img}')"></span>
      <span class="pill-text">${s.name}</span>
    </button>`;
    })
    .join("");

  subStrip.onclick = (e) => {
    const b = e.target.closest(".pill");
    if (!b) return;
    currentSub = b.getAttribute("data-sub");

    const subs2 = getCurrentSub2s();
    currentSub2 = subs2[0]?.slug || null;

    renderSubSelect(); 
    renderSub2Select();
    renderSubStrip2();
    updateTitlesAndBreadcrumb();
    loadProductsForCurrentCategory(); 
    markActivePill();
    updateUrl();
  };

  markActivePill();
}

function renderSubStrip2() {
  const subs2 = getCurrentSub2s();
  const subNode = getCurrentSubNode();

  subOfSub.textContent = subNode ? subNode.name : "";

  if (!subs2.length) {
    subStripWrap2.style.display = "none";
    subStrip2.innerHTML = "";
    return;
  }

  subStripWrap2.style.display = "";
  subStrip2.innerHTML = subs2
    .map((s) => {
      const raw = s.imageUrl && s.imageUrl.trim() ? s.imageUrl.trim() : "";
      const img = raw ? optimizeImg(raw, 120) : PLACEHOLDER_ICON;
      return `
    <button type="button" class="pill" data-sub2="${s.slug}">
      <span class="pill-icon" style="background-image:url('${img}')"></span>
      <span class="pill-text">${s.name}</span>
    </button>`;
    })
    .join("");

  subStrip2.onclick = (e) => {
    const b = e.target.closest(".pill");
    if (!b) return;
    currentSub2 = b.getAttribute("data-sub2");

    renderSub2Select(); 
    updateTitlesAndBreadcrumb();
    loadProductsForCurrentCategory(); 
    markActivePill2();
    updateUrl();
  };

  markActivePill2();
}

function markActivePill() {
  subStrip
    .querySelectorAll(".pill")
    .forEach((b) => b.classList.toggle("active", b.getAttribute("data-sub") === currentSub));
}

function markActivePill2() {
  subStrip2
    .querySelectorAll(".pill")
    .forEach((b) => b.classList.toggle("active", b.getAttribute("data-sub2") === currentSub2));
}


function updateTitlesAndBreadcrumb() {
  const mainNode = getCurrentMainNode();
  const subNode = getCurrentSubNode();
  const sub2List = getCurrentSub2s();
  const sub2Node = sub2List.find((s) => s.slug === currentSub2) || null;

  const mainName = mainNode ? mainNode.name : "";
  const subName = subNode ? subNode.name : "";
  const sub2Name = sub2Node ? sub2Node.name : "";

  // หัวข้อหลักของหน้า: ถ้ามีชั้น 3 ให้ใช้ชื่อชั้น 3, ไม่งั้นใช้ชั้น 2, ไม่งั้นใช้หลัก
  pageTitle.textContent = sub2Name || subName || mainName;

  
  let crumb = mainName;
  if (subName) crumb += " › " + subName;
  crumbMain.textContent = crumb;
  crumbSub.textContent = sub2Name ? " › " + sub2Name : "";
}



function updateUrl() {
  const url = new URL(location.href);
  url.searchParams.set("category", currentMain);
  if (currentSub) url.searchParams.set("sub", currentSub);
  else url.searchParams.delete("sub");
  if (currentSub2) url.searchParams.set("sub2", currentSub2);
  else url.searchParams.delete("sub2");
  history.replaceState(null, "", url.toString());
}



async function loadProductsForCurrentCategory() {
  try {
    // pick the most specific slug available (sub2 > sub > main)
    const targetSlug = currentSub2 || currentSub || currentMain;
    if (!targetSlug) {
      products = [];
      renderProducts();
      return;
    }

    const res = await fetch(`${API_BASE}/api/categories/${encodeURIComponent(targetSlug)}/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error(json.message || "Invalid products response");
    }


    products = json.data.map((p) => {
      return {
        id: p.id ?? p.productId ?? null,
        slug: p.slug ?? null,
        name: p.name ?? p.title ?? "",
        code: p.code ?? null,
        sku: p.sku ?? null,
        variantId: p.variantId ?? null,
        imageUrl: p.imageUrl || (p.images && p.images[0] && p.images[0].url) || null,
        priceTHB:
          p.priceTHB !== undefined && p.priceTHB !== null
            ? Number(p.priceTHB)
            : (p.price !== undefined ? Number(p.price) : null),
        raw: p
      };
    });

    renderProducts();
  } catch (err) {
    console.error("โหลดสินค้าไม่สำเร็จ:", err);
    products = [];
    renderProducts();
  }
}




function cartSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>`;
}



function renderProducts() {
  if (!products.length) {
    productGrid.innerHTML = `<p style="color:#64748b;font-size:14px">ยังไม่มีการลงข้อมูลสินค้าในหมวดนี้</p>`;
    return;
  }

  productGrid.innerHTML = products
    .map((p) => {
      // console.log('CATEGORY -> normalized products sample:', products.slice(0,5));// make safe values
      const href = `product.html?slug=${encodeURIComponent(p.slug || "")}`;
      const imgStyle = p.imageUrl ? `style="background-image:url('${optimizeImg(p.imageUrl, 250)}')"` : "";
      const priceVal = (p.priceTHB !== undefined && p.priceTHB !== null)
  ? Number(p.priceTHB)
  : null;
      const isInbox =
  String(p.raw?.shortDesc || "").trim().toUpperCase() === "INBOX";

      const priceText = isInbox
  ? "กรุณาสอบถามผ่าน LINE"
  : (priceVal != null ? fmtTHB(priceVal) : "กรุณาสอบถาม");

      //const skuHtml = p.sku ? `<div class="sku" style="font-size:12px;color:#6b7280;margin-top:4px">รหัส: ${p.sku}</div>` : "";

      
      const dataAttr = `data-slug="${(p.slug||"").replace(/"/g,'&quot;')}" data-id="${(p.id||"").toString().replace(/"/g,'&quot;')}" data-sku="${(p.sku||"").replace(/"/g,'&quot;')}" data-code="${(p.code||"").replace(/"/g,'&quot;')}" data-price="${priceVal != null ? priceVal : 0}" data-img="${(p.imageUrl||"").replace(/"/g,'&quot;')}"`;

      

      const cartBtnHtml = isInbox
        ? ""
        : `
          <button class="cart-fab add-from-cat" title="ใส่ตะกร้า" ${dataAttr}>
            ${cartSvg()}
          </button>
        `;


      return `
      <div class="product-card">
        <div class="img">
          <a class="open-detail" href="${href}" aria-label="${p.name || ''}" ${imgStyle}></a>
          ${cartBtnHtml}
        </div>
        <a class="name link-name" href="${href}">${p.name}</a>
        <div class="price">${priceText}</div>
      </div>`;
    })
    .join("");
}
// handle click from category cards (uses data-* attributes)
window.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-from-cat");
  if (!btn) return;
  e.preventDefault();

  // read dataset safely
  const ds = btn.dataset || {};
  const slug = ds.slug || "";
  const id = ds.id || "";
  const sku = ds.sku || "";
  const code = ds.code || "";
  const price = ds.price !== undefined ? Number(ds.price) : null;
  const img = ds.img || null;

  // build cart item key (prefer sku, then code, then slug/id)
  const key = sku ? `${slug}:${sku}` : (code ? `${slug}:${code}` : (slug || id || `k:${Date.now()}`));

  // try to find product object in loaded products
  const prod = products.find(p => (p.slug && String(p.slug) === String(slug)))
            || products.find(p => String(p.id) === String(id))
            || products.find(p => p.code && String(p.code) === String(code))
            || products.find(p => p.sku && String(p.sku) === String(sku))
            || null;

  const name = (prod && prod.name) || btn.getAttribute("aria-label") || slug || code || "สินค้า";

  // final price: prefer explicit data-price, otherwise product.priceTHB / product.price
  const finalPrice = (price != null && !Number.isNaN(price))
    ? Number(price)
    : (prod && (prod.priceTHB !== undefined && prod.priceTHB !== null ? Number(prod.priceTHB) : (prod.price !== undefined ? Number(prod.price) : 0)))
      || 0;

  const image = img || (prod && (prod.imageUrl || (prod.raw && (prod.raw.imageUrl || (prod.raw.images && prod.raw.images[0] && prod.raw.images[0].url))))) || null;

  const resolvedSku = sku || (prod && (prod.sku || (prod.raw && (prod.raw.sku)))) || null;
  const resolvedCode = code || (prod && (prod.code || (prod.raw && (prod.raw.code)))) || null;
  const variantId = prod && prod.variantId ? prod.variantId : null;
  const productId = prod && prod.id ? prod.id : (id || null);

  const item = {
    key,
    productId: productId,            
    id: slug || id || null,
    slug: slug || null,
    variantId: variantId,
    name: name,
    option: null,
    sku: resolvedSku,
    code: resolvedCode,
    qty: 1,
    price: Number(finalPrice || 0),
    image: image
  };

  // If AppCart API available use it (keeps logic centralised)
  if (window.AppCart && typeof window.AppCart.add === "function") {
    try {
      window.AppCart.add(item);
      // AppCart.add already broadcasts cart:changed
      alert("เพิ่มสินค้าในตะกร้าแล้ว");
      return;
    } catch (err) {
      console.warn("AppCart.add failed, falling back to localStorage", err);
      // fallthrough to localStorage fallback
    }
  }

  // fallback: update localStorage directly (backward compatible)
  const existing = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = existing.findIndex(x => x.key === item.key);
  if (idx > -1) {
    existing[idx].qty = (Number(existing[idx].qty || 0) + 1);
  } else {
    existing.push(item);
  }
  localStorage.setItem("cart", JSON.stringify(existing));
  window.dispatchEvent(new Event("cart:changed"));
  alert("เพิ่มสินค้าในตะกร้าแล้ว");
});


document.getElementById("year").textContent = new Date().getFullYear();

loadCategoriesFromApi().catch((err) => {
  console.error("โหลดหมวดหมู่ไม่สำเร็จ:", err);
});
