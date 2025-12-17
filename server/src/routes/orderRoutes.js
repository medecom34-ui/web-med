// server/src/routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

router.get("/", orderController.getOrders);
router.post("/", orderController.createOrder);

// GET single order (id หรือ orderNumber)
router.get("/:id", orderController.getOrder);

module.exports = router;
