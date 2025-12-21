// ปีใน footer
document.getElementById("year").textContent = new Date().getFullYear();


const API_BASE = "https://web-med-production.up.railway.app";

function cartSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>`;
}

/* ===== โหลดสินค้าจริงจาก DB (HOT / NEW) ===== */

async function loadPopularProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products/popular`);
    const json = await res.json();
    if (!json.success) throw new Error();

    const items = json.data.map(mapProduct);
    $("#popular-grid").innerHTML = renderCards(items);

    window.__popular = items;
    syncAllProducts();
  } catch (e) {
    console.warn("โหลดสินค้ายอดนิยมไม่ได้");
  }
}

async function loadNewestProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products/newest`);
    const json = await res.json();
    if (!json.success) throw new Error();

    const items = json.data.map(mapProduct);
    $("#newest-grid").innerHTML = renderCards(items);

    window.__newest = items;
    syncAllProducts();
  } catch (e) {
    console.warn("โหลดสินค้าใหม่ไม่ได้");
  }
}

/* แปลงข้อมูลจาก DB → format การ์ด */
function mapProduct(p) {
  return {
    id: String(p.id),
    name: p.name,
    slug: p.slug,
    sku: p.sku || p.code || null,
    priceTHB: p.defaultPrice ?? p.price ?? 0,
    imageUrl: p.imageUrl || null,
  };
}

/* รวมสินค้าทั้งหมดไว้ใช้ addToCart */
function syncAllProducts() {
  const a = window.__popular || [];
  const b = window.__newest || [];
  window.allProducts = [...a, ...b];
}

/* เรียกตอนโหลดหน้า */
loadPopularProducts();
loadNewestProducts();


/* ===== Helpers ===== */
const $ = (s) => document.querySelector(s);
const fmtTHB = (n) =>
  "฿" +
  Number(n).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });


function optimizeImg(url, width) {
  if (!url) return null;
  if (!url.includes("/upload/")) return url; // ไม่ใช่ Cloudinary ก็ใช้ตามเดิม
  return url.replace("/upload/", `/upload/w_${width},f_auto,q_auto/`);
}



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
        // ถ้าหา parent ไม่เจอ (data พัง) ให้ดันขึ้น top level ไปก่อน
        roots.push(cat);
      }
    } else {
      roots.push(cat);
    }
  });


  const sortTree = (nodes) => {
    const normalize = (v) => (v === null || v === undefined || v === 0 ? 9999 : Number(v));
    nodes.sort((a, b) => {
      const sa = normalize(a.sortOrder);
      const sb = normalize(b.sortOrder);
      if (sa !== sb) return sa - sb;
      // รองลงมาเรียงตามชื่อกันมึน
      return String(a.name).localeCompare(String(b.name), "th");
    });
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        sortTree(n.children);
      }
    });
  };

  sortTree(roots);

  return roots;
}



function renderCategoriesTree(rootCategories) {
  
  const catRow = $("#category-row");
  if (catRow) {
    catRow.innerHTML = rootCategories
      .map((c) => {
        const imgUrl = c.imageUrl ? optimizeImg(c.imageUrl, 500) : null; // ย่อสำหรับการ์ดใหญ่
        const imgStyle = imgUrl
          ? `style="background-image:url('${imgUrl}');background-size:contain;background-position:center;background-repeat:no-repeat"`
          : "";
        return `
      <a class="cat" href="category.html?category=${encodeURIComponent(c.slug)}">
        <div class="cat__img" ${imgStyle}></div>
        <div class="cat__name">${c.name}</div>
      </a>
    `;
      })
      .join("");
  }

 
  const sideCats = $("#sideCats");
  if (!sideCats) return;

  // sub = หมวดระดับ 2, rootSlug = slug ของหมวดหลัก
  const renderLevel2 = (sub, rootSlug) => {
    const grandchildren = sub.children || [];

    // รูปของหมวดระดับ 2
    const subImgUrl = sub.imageUrl ? optimizeImg(sub.imageUrl, 60) : null;
    const subImgStyle = subImgUrl
      ? `style="background-image:url('${subImgUrl}');background-size:contain;background-position:center;background-repeat:no-repeat"`
      : "";

    // ลิงก์หมวดระดับ 2: ส่งทั้ง category(หลัก) + sub
    const subHref = `category.html?category=${encodeURIComponent(rootSlug)}&sub=${encodeURIComponent(sub.slug)}`;

    const grandHTML = grandchildren
      .map((gc) => {
        
        const gcImgUrl = gc.imageUrl ? optimizeImg(gc.imageUrl, 48) : null;
        const gcImgStyle = gcImgUrl
          ? `style="background-image:url('${gcImgUrl}');background-size:contain;background-position:center;background-repeat:no-repeat"`
          : "";

        
        const gcHref = `category.html?category=${encodeURIComponent(rootSlug)}&sub=${encodeURIComponent(
          sub.slug
        )}&sub2=${encodeURIComponent(gc.slug)}`;

        return `
        <li>
          <a class="subrow subrow--child" href="${gcHref}">
            <span class="subph" ${gcImgStyle}></span>
            <span class="subname">- ${gc.name}</span>
          </a>
        </li>
      `;
      })
      .join("");

    return `
    <li>
      <a class="subrow" href="${subHref}">
        <span class="subph" ${subImgStyle}></span>
        <span class="subname">${sub.name}</span>
      </a>
      ${grandHTML ? `<ul class="sub sub--child">${grandHTML}</ul>` : ""}
    </li>
  `;
  };

  sideCats.innerHTML = rootCategories
    .map((c) => {
      const subs = c.children || [];
      const subHTML = subs.map((sub) => renderLevel2(sub, c.slug)).join("");

      const phUrl = c.imageUrl ? optimizeImg(c.imageUrl, 80) : null; // รูปหมวดหลัก sidebar
      const phStyle = phUrl
        ? `style="background-image:url('${phUrl}');background-size:contain;background-position:center;background-repeat:no-repeat"`
        : "";

      return `
      <li class="catitem" data-cat="${c.slug}">
        <a class="cathead" href="category.html?category=${encodeURIComponent(c.slug)}">
          <span class="ph" aria-hidden="true" ${phStyle}></span>
          <span class="catname">${c.name}</span>
          <svg class="caret" viewBox="0 0 24 24">
            <path d="M8 10l4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round" />
          </svg>
        </a>
        <ul class="sub">${subHTML}</ul>
      </li>
    `;
    })
    .join("");

  // toggle หมวดใน sidebar
  sideCats.addEventListener("click", (e) => {
    const head = e.target.closest(".cathead");
    if (!head) return;
    const clickedCaret = e.target.closest(".caret");
    if (clickedCaret) {
      e.preventDefault();
      head.closest(".catitem").classList.toggle("open");
    }
  });

  // เปิดทุกหมวดตั้งแต่แรก
  document.querySelectorAll(".catitem").forEach((item) => {
    item.classList.add("open");
  });
}



/* ===== โหลดหมวดหมู่แบบไม่ทำให้เว็บพัง ===== */
async function loadCategoriesFromApi() {
  try {
    const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error();

    const flat = json.data.map((c) => ({
      id: String(c.id),
      parentId: c.parentId ? String(c.parentId) : null,
      slug: c.slug,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      imageUrl: c.imageUrl || null,
      imageAlt: c.imageAlt || null,
    }));

    const tree = buildCategoryTree(flat);
    renderCategoriesTree(tree);
  } catch (err) {
    console.warn("หมวดหมู่โหลดไม่ได้ → ใช้ fallback");

    const fallback = [
      { id: "1", slug: "beds", name: "เตียงผู้ป่วย", parentId: null, sortOrder: 1 },
      { id: "2", slug: "wheelchair", name: "รถเข็น / วีลแชร์", parentId: null, sortOrder: 2 },
      { id: "3", slug: "elder", name: "อุปกรณ์ผู้ป่วย ผู้สูงอายุ", parentId: null, sortOrder: 3 },
    ];

    const tree = buildCategoryTree(fallback);
    renderCategoriesTree(tree);
  }
}

loadCategoriesFromApi();



const renderCards = (items) =>
  items
    .map((p) => {
      const href = `product.html?slug=${encodeURIComponent(p.slug || "")}`;
      const imgStyle = p.imageUrl
        ? `style="background-image:url('${optimizeImg(p.imageUrl, 250)}')"`
        : "";

      const priceText =
        p.priceTHB && Number(p.priceTHB) > 0
          ? fmtTHB(p.priceTHB)
          : "กรุณาสอบถาม";

      return `
      <div class="product-card">
        <div class="img">
          <a class="open-detail"
             href="${href}"
             aria-label="${p.name || ""}"
             ${imgStyle}></a>

          <button
            class="cart-fab add-from-cat"
            title="ใส่ตะกร้า"
            onclick="event.stopPropagation(); addToCart('${p.slug || p.id}')"
            aria-label="ใส่ตะกร้า">
            ${cartSvg()}
          </button>
        </div>

        <a class="name link-name" href="${href}">
          ${p.name || ""}
        </a>

        <div class="price">${priceText}</div>
      </div>`;
    })
    .join("");





// ให้คลิกการ์ดทั้งใบไปหน้า product ได้
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card[data-href]");
  if (card) location.href = card.getAttribute("data-href");
});

window.addToCart = (keyOrSlug) => {
  const products = window.allProducts || [];
  const item = products.find((p) => p.slug === keyOrSlug || p.id === keyOrSlug);
  if (!item) return;

  const key = item.slug || item.id;
  const price = item.priceTHB;
  const sku = item.sku;

  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const idx = cart.findIndex((x) => x.key === key);

  if (idx > -1) cart[idx].qty += 1;
  else cart.push({ key, id: key, name: item.name, option: null, qty: 1, price,code: sku });

  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart:changed"));
  alert("เพิ่มลงตะกร้าแล้ว");
};

