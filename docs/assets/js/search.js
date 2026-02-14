const API_BASE = "https://web-med-production.up.railway.app";
const $ = (s) => document.querySelector(s);

const params = new URLSearchParams(location.search);
const keyword = params.get("q") || "";

$("#searchKeyword").textContent = keyword;

async function loadSearch() {
  if (!keyword.trim()) return;

  try {
    const res = await fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(keyword)}`);
    const json = await res.json();

    if (!json.success) throw new Error();

    renderResults(json.data);
  } catch (err) {
    console.error(err);
    $("#searchResults").innerHTML = "<p>ไม่พบสินค้า</p>";
  }
}

function renderResults(products) {
  if (!products.length) {
    $("#searchResults").innerHTML = "<p>ไม่พบสินค้า</p>";
    return;
  }

  $("#searchResults").innerHTML = products.map(p => {
    const href = `product.html?slug=${encodeURIComponent(p.slug)}`;
    return `
      <div class="product-card">
        <div class="img">
          <a href="${href}" style="background-image:url('${p.imageUrl || ""}')"></a>
        </div>
        <a class="name" href="${href}">${p.name}</a>
        <div class="price">
          ${p.priceTHB ? "฿" + Number(p.priceTHB).toLocaleString() : "กรุณาสอบถาม"}
        </div>
      </div>
    `;
  }).join("");
}

loadSearch();
