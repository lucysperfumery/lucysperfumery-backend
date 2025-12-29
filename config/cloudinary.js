const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage for multer with optimization
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "lucysperfumery/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"],
    transformation: [
      {
        width: 800,
        height: 800,
        crop: "limit", // Don't upscale, only downscale if larger
        quality: "auto", // Auto quality optimization
        fetch_format: "auto", // Auto format selection (WebP, AVIF)
      },
    ],
  },
});

module.exports = { cloudinary, storage };
