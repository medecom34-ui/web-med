// server/src/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminGuard = require("../middleware/adminGuard");
const adminOrderController = require("../controllers/adminOrderController");
const adminPaymentController = require("../controllers/adminPaymentController");
// ใช้ adminGuard กับทุก route ที่อยู่ภายใต้ /api/admin
router.use(adminGuard);

// orders (admin)
router.get("/orders", adminOrderController.listOrders);
router.get("/orders/:id", adminOrderController.getOrder);
router.patch("/orders/:id", adminOrderController.updateOrder);
router.post("/orders/:id/shipments", adminOrderController.createShipment);

// payments (admin)
router.get("/payments", adminPaymentController.listPayments);
router.patch("/payments/:id", adminPaymentController.updatePayment);


module.exports = router;
