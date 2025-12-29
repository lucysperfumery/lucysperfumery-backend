const { cloudinary } = require("../config/cloudinary");

/**
 * Upload a single file to Cloudinary
 * @param {Object} file - File object from multer
 * @returns {Promise<string>} - Cloudinary URL
 */
const uploadToCloudinary = async (file) => {
  try {
    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lucysperfumery/products",
          transformation: [
            {
              width: 800,
              height: 800,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

/**
 * Delete an image from Cloudinary by public ID
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error("Failed to delete image from Cloudinary");
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== "string") return null;

  // Match pattern: .../lucysperfumery/products/filename
  const match = url.match(/lucysperfumery\/products\/([^\.]+)/);
  return match ? `lucysperfumery/products/${match[1]}` : null;
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
};
