const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const uploadController = require("../controllers/upload.controller");

/**
 * @route   POST /api/upload
 * @desc    Upload product image to Cloudinary
 * @access  Public (should add auth middleware in production)
 */
router.post("/", upload.single("image"), uploadController.uploadImage);

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete image from Cloudinary
 * @access  Public (should add auth middleware in production)
 */
router.delete("/:publicId", uploadController.deleteImage);

module.exports = router;
