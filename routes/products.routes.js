const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const upload = require('../middleware/upload.middleware');

// Get all unique categories (must be before /:id to avoid conflict)
router.get('/categories/list', productsController.getCategories);

// Get products by category (must be before /:id to avoid conflict)
router.get('/category/:category', productsController.getProductsByCategory);

// Create a new product (with optional image upload)
router.post('/', upload.single('image'), productsController.createProduct);

// Get all products (with pagination and filtering)
router.get('/', productsController.getAllProducts);

// Get product by ID
router.get('/:id', productsController.getProductById);

// Update product by ID (with optional image upload)
router.put('/:id', upload.single('image'), productsController.updateProduct);

// Delete product (soft delete)
router.delete('/:id', productsController.deleteProduct);

module.exports = router;
