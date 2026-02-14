const API_BASE = "https://web-med-production.up.railway.app";

/* ==== helper: ปรับขนาดรูป (กัน error ถ้าไม่มี cloudinary) ==== */
function optimizeImg(url, width) {
  if (!url) return "";
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},f_auto,q_auto/`);
}

const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");
const resultBox   = document.getElementById("searchResultsInline");

if (searchInput && searchBtn && resultBox) {

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;

    try {
      const res = await fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();

      if (json.success && json.data.length > 0) {
        resultBox.innerHTML = json.data.map(p => {
          const href = `product.html?slug=${encodeURIComponent(p.slug || "")}`;
          const img = p.imageUrl
            ? `style="background-image:url('${optimizeImg(p.imageUrl, 80)}')"`
            : "";

          return `
            <div class="search-item">
              <a href="${href}" class="search-thumb" ${img}></a>
              <a href="${href}" class="search-name">${p.name}</a>
            </div>
          `;
        }).join("");
      } else {
        resultBox.innerHTML = "<p style='padding:12px'>ไม่พบสินค้า</p>";
      }

      resultBox.classList.remove("hidden");

    } catch (err) {
      console.error("Search error:", err);
    }
  }

  searchBtn.addEventListener("click", doSearch);

  searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") doSearch();
  });

  /* ปิด dropdown เมื่อกดนอก */
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
      resultBox.classList.add("hidden");
    }
  });

}
