const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if environment keys are present
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary Storage Service Configured.');
} else {
  console.log('Cloudinary credentials not detected. Defaulting to Local Storage.');
}

/**
 * Uploads a file, compresses images, generates thumbnails, and returns paths/URLs
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - { fileUrl, thumbnail, fileSize, fileType }
 */
const uploadFile = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  let fileType = 'document';

  if (mime.startsWith('image/')) fileType = 'image';
  else if (mime.startsWith('video/')) fileType = 'video';
  else if (ext === '.pdf') fileType = 'pdf';
  else if (ext === '.zip') fileType = 'zip';

  // --- CLOUDINARY UPLOAD ROUTE ---
  if (isCloudinaryConfigured) {
    try {
      let resourceType = 'auto';
      if (fileType === 'pdf' || fileType === 'zip') resourceType = 'raw';

      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: resourceType,
        folder: 'portfolio_creative',
        // Auto-compression for images
        quality: fileType === 'image' ? 'auto' : undefined,
        fetch_format: fileType === 'image' ? 'auto' : undefined,
      });

      // Cleanup local temp file saved by multer
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      let thumbnail = '';
      if (fileType === 'image') {
        // Generate a standard square/portrait thumbnail transform URL
        thumbnail = cloudinary.url(result.public_id, {
          width: 300,
          height: 375,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        });
      } else if (fileType === 'video') {
        // Generate an image frame poster thumbnail transform URL for videos
        thumbnail = cloudinary.url(result.public_id, {
          resource_type: 'video',
          format: 'jpg',
          width: 300,
          height: 375,
          crop: 'fill',
          gravity: 'auto',
        });
      }

      return {
        fileUrl: result.secure_url,
        thumbnail: thumbnail || result.secure_url,
        fileSize: result.bytes || file.size,
        fileType,
      };
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to local storage:', error.message);
      // Fall through to local storage if Cloudinary fails
    }
  }

  // --- LOCAL FALLBACK STORAGE ROUTE ---
  const creativeDir = path.join(__dirname, '../uploads/creative');
  if (!fs.existsSync(creativeDir)) {
    fs.mkdirSync(creativeDir, { recursive: true });
  }

  try {
    let finalFilename = file.filename;
    let finalFilePath = file.path;
    let thumbnailFilename = '';

    if (fileType === 'image') {
      const nameWithoutExt = path.basename(file.filename, ext);
      finalFilename = `compressed_${nameWithoutExt}.webp`;
      finalFilePath = path.join(creativeDir, finalFilename);

      // Compress and convert to webp
      await sharp(file.path)
        .webp({ quality: 80 })
        .toFile(finalFilePath);

      // Generate portrait thumbnail (300x375)
      thumbnailFilename = `thumb_${nameWithoutExt}.jpg`;
      const thumbnailPath = path.join(creativeDir, thumbnailFilename);
      await sharp(file.path)
        .resize(300, 375, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Delete the original uncompressed uploaded file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }

    const fileUrl = `/uploads/creative/${finalFilename}`;
    const thumbnail = thumbnailFilename 
      ? `/uploads/creative/${thumbnailFilename}` 
      : fileUrl;

    const stats = fs.statSync(finalFilePath);

    return {
      fileUrl,
      thumbnail,
      fileSize: stats.size,
      fileType,
    };
  } catch (error) {
    console.error('Local file processing failed:', error.message);
    if (file && file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    throw error;
  }
};

/**
 * Deletes a file from Cloudinary or local disk based on its URL
 * @param {string} fileUrl - Absolute Cloudinary URL or relative local file path
 * @param {string} [thumbnailUrl] - Associated thumbnail URL to also delete
 */
const deleteFile = async (fileUrl, thumbnailUrl) => {
  if (!fileUrl) return;

  // --- CLOUDINARY DELETE ROUTE ---
  if (isCloudinaryConfigured && fileUrl.includes('cloudinary.com')) {
    try {
      // Extract public_id from Cloudinary URL (e.g. portfolio_creative/filename)
      const parts = fileUrl.split('/portfolio_creative/');
      if (parts.length > 1) {
        const publicIdWithExt = parts[1];
        const publicId = 'portfolio_creative/' + publicIdWithExt.split('.')[0];
        
        let resourceType = 'image';
        if (fileUrl.includes('/video/')) resourceType = 'video';
        else if (fileUrl.includes('/raw/')) resourceType = 'raw';

        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`Cloudinary asset deleted: ${publicId}`);
      }
      return;
    } catch (error) {
      console.error('Cloudinary asset deletion error:', error.message);
    }
  }

  // --- LOCAL DELETE ROUTE ---
  try {
    const deleteLocalFile = (relPath) => {
      if (!relPath || relPath.startsWith('http')) return;
      const basename = path.basename(relPath);
      const filePath = path.join(__dirname, '../uploads/creative', basename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${basename}`);
      }
    };

    deleteLocalFile(fileUrl);
    if (thumbnailUrl && thumbnailUrl !== fileUrl) {
      deleteLocalFile(thumbnailUrl);
    }
  } catch (error) {
    console.error('Local file deletion error:', error.message);
  }
};

module.exports = {
  uploadFile,
  deleteFile,
};
