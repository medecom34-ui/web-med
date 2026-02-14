const API_BASE = "https://web-med-production.up.railway.app";


const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");

if (searchInput && searchBtn) {

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;

    const res = await fetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(q)}`);
    const json = await res.json();

    const resultBox = document.getElementById("searchResultsInline");

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
  }

  searchBtn.addEventListener("click", doSearch);
  searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") doSearch();
  });

}
