// assets/js/success.js
(function(){
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);

  // อ่านจาก query param "orderNumber" ก่อน (ตามที่ต้องการ)
  // ถ้าไม่มีให้ fallback ไปหา "order" (เดิม) และ localStorage keys
  const orderNumber =
    params.get("orderNumber")
    || params.get("order")
    || localStorage.getItem("lastOrderNumber")
    || localStorage.getItem("lastOrderId")
    || "";

  // ถ้ามี element id=orderId ให้ใส่ค่า orderNumber (แสดงเป็นเลขออร์เดอร์ ไม่ใช่ id)
  if (!orderNumber) {
    const el = document.getElementById("orderId");
    if (el) el.textContent = "ไม่ทราบหมายเลข";
  } else {
    const el = document.getElementById("orderId");
    if (el) el.textContent = orderNumber;
  }

  // ปุ่มดูสถานะ -> ไปหน้า orders.html (ถ้าต้องการส่ง orderNumber ต่อให้พารามิเตอร์ ก็เพิ่ม ?orderNumber=...)
  const btn = document.getElementById("viewStatusBtn") || document.querySelector(".btn-primary");
  btn && btn.addEventListener("click", (e)=>{
    e.preventDefault();
    // ถ้ามี orderNumber ให้แนบไปด้วย เพื่อหน้า orders จะสามารถเลื่อน/highlight ได้ (option)
    if (orderNumber) {
      location.href = "orders.html?orderNumber=" + encodeURIComponent(orderNumber);
    } else {
      location.href = "orders.html";
    }
  });


})();
