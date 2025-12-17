// server/src/routes/productRoutes.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

// รายการ 3 endpoints (by-category, detail, batch)
router.get("/by-category", productController.getProductsByCategory);

router.get("/popular", productController.getPopularProducts);
router.get("/newest", productController.getNewestProducts);

router.get("/:slug", productController.getProductDetail);

// batch: รับ GET หรือ POST => getProductsBatch
router.get("/", productController.getProductsBatch);
router.post("/batch", productController.getProductsBatch);



module.exports = router;
