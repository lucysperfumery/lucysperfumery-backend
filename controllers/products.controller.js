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
      options,
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

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        error: "Product category is required",
      });
    }

    // Parse options if sent as string (from FormData)
    let parsedOptions = [];
    if (options) {
      try {
        parsedOptions = typeof options === "string" ? JSON.parse(options) : options;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid options format",
        });
      }
    }

    // Validate: product must have either base price/stock OR options
    const hasOptions = parsedOptions && parsedOptions.length > 0;

    if (!hasOptions) {
      // Product without options - require base price and stock
      if (!price || price <= 0) {
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
    } else {
      // Product with options - validate each option
      for (const option of parsedOptions) {
        if (!option.name || !option.name.trim()) {
          return res.status(400).json({
            success: false,
            error: "Each option must have a name",
          });
        }
        if (!option.price || option.price <= 0) {
          return res.status(400).json({
            success: false,
            error: "Each option must have a price greater than 0",
          });
        }
        if (option.stock !== undefined && option.stock < 0) {
          return res.status(400).json({
            success: false,
            error: "Option stock cannot be negative",
          });
        }
      }
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
    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: hasOptions ? 0 : price,
      category: category.trim(),
      image: imageUrl,
      stock: hasOptions ? 0 : (stock !== undefined ? stock : 0),
      isActive: isActive !== undefined ? isActive : true,
    };

    if (hasOptions) {
      productData.options = parsedOptions;
    }

    const product = await Product.create(productData);

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
    const { name, description, price, category, stock, isActive, options } =
      req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Parse options if sent as string (from FormData)
    let parsedOptions = null;
    if (options !== undefined) {
      try {
        parsedOptions = typeof options === "string" ? JSON.parse(options) : options;
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid options format",
        });
      }
    }

    // Determine if product has options (use new value if provided, else use existing)
    const hasOptions = parsedOptions !== null
      ? (parsedOptions && parsedOptions.length > 0)
      : (product.options && product.options.length > 0);

    // Validate options if provided
    if (parsedOptions && parsedOptions.length > 0) {
      for (const option of parsedOptions) {
        if (!option.name || !option.name.trim()) {
          return res.status(400).json({
            success: false,
            error: "Each option must have a name",
          });
        }
        if (!option.price || option.price <= 0) {
          return res.status(400).json({
            success: false,
            error: "Each option must have a price greater than 0",
          });
        }
        if (option.stock !== undefined && option.stock < 0) {
          return res.status(400).json({
            success: false,
            error: "Option stock cannot be negative",
          });
        }
      }
    }

    // Validate base price/stock if no options
    if (!hasOptions) {
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
    if (category) product.category = category.trim();
    if (isActive !== undefined) product.isActive = isActive;

    // Update options or base price/stock
    if (parsedOptions !== null) {
      product.options = parsedOptions;
      if (parsedOptions.length > 0) {
        product.price = 0;
        product.stock = 0;
      }
    }

    // Only update base price/stock if product doesn't have options
    if (!hasOptions) {
      if (price !== undefined) product.price = price;
      if (stock !== undefined) product.stock = stock;
    }

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
 * Toggle product active status
 * @route PATCH /api/products/:id/toggle-active
 */
const toggleProductActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: "isActive must be a boolean value",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    product.isActive = isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: product,
    });
  } catch (error) {
    console.error("Error toggling product active status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to toggle product status",
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
  toggleProductActive,
  deleteProduct,
  getProductsByCategory,
  getCategories,
};
