// assets/js/success.js
(function(){
  const $ = s => document.querySelector(s);

    if (window.Cart && Cart.clear) {
    Cart.clear();
  } else {
    localStorage.removeItem("cart");
  }

  const params = new URLSearchParams(location.search);

  const orderNumber =
    params.get("orderNumber")
    || params.get("order")
    || localStorage.getItem("lastOrderNumber")
    || localStorage.getItem("lastOrderId")
    || "";

  
  if (!orderNumber) {
    const el = document.getElementById("orderId");
    if (el) el.textContent = "ไม่ทราบหมายเลข";
  } else {
    const el = document.getElementById("orderId");
    if (el) el.textContent = orderNumber;
  }

  
  const btn = document.getElementById("viewStatusBtn") || document.querySelector(".btn-primary");
  btn && btn.addEventListener("click", (e)=>{
    e.preventDefault();
    if (orderNumber) {
      location.href = "orders.html?orderNumber=" + encodeURIComponent(orderNumber);
    } else {
      location.href = "orders.html";
    }
  });


})();
