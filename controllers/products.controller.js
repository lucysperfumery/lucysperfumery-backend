const Product = require("../models/products.model");
const { uploadToCloudinary } = require("../services/upload.service");

/**
 * Create a new product
 * @route POST /api/products
 */
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      isActive,
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Product name is required",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: "Product description is required",
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be greater than 0",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        error: "Product category is required",
      });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({
        success: false,
        error: "Stock cannot be negative",
      });
    }

    // Upload image to Cloudinary BEFORE creating product
    let imageUrl = "no-image.jpg";
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file);
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
        });
      }
    }

    // Create product with Cloudinary URL
    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      image: imageUrl,
      stock: stock !== undefined ? stock : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create product",
    });
  }
};

/**
 * Get all products with pagination and filtering
 * @route GET /api/products?page=1&limit=10&category=Women's Perfume&search=chanel&active=true
 */
const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Filter by active status
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === "true";
    }

    // Search by name or description
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Filter by stock availability
    if (req.query.inStock === "true") {
      filter.stock = { $gt: 0 };
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch products",
    });
  }
};

/**
 * Get product by ID
 * @route GET /api/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch product",
    });
  }
};

/**
 * Update product by ID
 * @route PUT /api/products/:id
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock, isActive } =
      req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Validate updates
    if (price !== undefined && price <= 0) {
      return res.status(400).json({
        success: false,
        error: "Price must be greater than 0",
      });
    }

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({
        success: false,
        error: "Stock cannot be negative",
      });
    }

    // Upload new image to Cloudinary BEFORE updating product
    if (req.file) {
      try {
        const imageUrl = await uploadToCloudinary(req.file);
        product.image = imageUrl;
      } catch (uploadError) {
        return res.status(500).json({
          success: false,
          error: "Failed to upload image",
        });
      }
    }

    // Update fields
    if (name) product.name = name.trim();
    if (description) product.description = description.trim();
    if (price !== undefined) product.price = price;
    if (category) product.category = category.trim();
    if (stock !== undefined) product.stock = stock;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update product",
    });
  }
};

/**
 * Delete product (soft delete by setting isActive to false)
 * @route DELETE /api/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Soft delete - set isActive to false
    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to delete product",
    });
  }
};

/**
 * Get products by category
 * @route GET /api/products/category/:category
 */
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { category };

    // Only show active products by default
    if (req.query.active !== "false") {
      filter.isActive = true;
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch products by category",
    });
  }
};

/**
 * Get all unique categories
 * @route GET /api/products/categories/list
 */
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");

    res.status(200).json({
      success: true,
      data: categories.sort(),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch categories",
    });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getCategories,
};
