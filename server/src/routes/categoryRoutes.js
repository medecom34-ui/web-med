const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/categoryController');


// specific first:
router.get('/:slug/products', categoryController.getProductsByCategorySlug);

// list categories
router.get('/', categoryController.getAllCategories);

// category by id (if still used)
router.get('/:id', categoryController.getCategoryById);

module.exports = router;
