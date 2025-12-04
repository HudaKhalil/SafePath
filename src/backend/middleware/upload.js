const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('☁️  Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);

// Use memory storage for multer (store files in memory temporarily)
const storage = multer.memoryStorage();

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder, userId) => {
  console.log(`🔄 [uploadToCloudinary] Starting upload - folder: ${folder}, userId: ${userId}, buffer size: ${buffer.length} bytes`);
  
  return new Promise((resolve, reject) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `${folder === 'profiles' ? 'profile' : 'hazard'}-${userId}-${uniqueSuffix}`;
    
    console.log(`📤 [uploadToCloudinary] Creating upload stream with publicId: ${publicId}`);
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `safepath/${folder}`,
        public_id: publicId,
        resource_type: 'image',
        transformation: folder === 'profiles' 
          ? [{ width: 500, height: 500, crop: 'limit' }]
          : [{ width: 1200, height: 1200, crop: 'limit' }]
      },
      (error, result) => {
        if (error) {
          console.error('❌ [uploadToCloudinary] Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ [uploadToCloudinary] Upload success! URL:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    console.log('📨 [uploadToCloudinary] Sending buffer to Cloudinary...');
    uploadStream.end(buffer);
    console.log('✅ [uploadToCloudinary] Buffer sent, waiting for response...');
  });
};

// File filter for images
const imageFilter = function (req, file, cb) {
  // Accept images only
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// File size limit (5MB)
const limits = {
  fileSize: 5 * 1024 * 1024 // 5MB
};

// Create multer instances with memory storage
const uploadProfile = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: limits
}).single('profilePicture'); // Field name: 'profilePicture'

const uploadHazard = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: limits
}).single('hazardPhoto'); // Field name: 'hazardPhoto'

// Multiple hazard images
const uploadMultipleHazards = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: limits
}).array('hazardPhotos', 5); // Max 5 images

// Helper function to delete image from Cloudinary
const deleteImage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary')) return;
  
  try {
    // Extract public_id from Cloudinary URL
    const matches = imageUrl.match(/\/v\d+\/(.+)\.\w+$/);
    if (matches) {
      const publicId = matches[1];
      await cloudinary.uploader.destroy(publicId);
      console.log('🗑️  Deleted from Cloudinary:', publicId);
    }
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};

module.exports = {
  uploadProfile,
  uploadHazard,
  uploadMultipleHazards,
  deleteImage,
  uploadToCloudinary
};
