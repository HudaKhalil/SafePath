const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadDir, 'profiles');
const hazardsDir = path.join(uploadDir, 'hazards');

[uploadDir, profilesDir, hazardsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilesDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `profile-${req.user.userId}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// Configure storage for hazard pictures
const hazardStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, hazardsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = `hazard-${req.user.userId}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

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

// Create multer instances
const uploadProfile = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: limits
}).single('profilePicture'); // Field name: 'profilePicture'

const uploadHazard = multer({
  storage: hazardStorage,
  fileFilter: imageFilter,
  limits: limits
}).single('hazardPhoto'); // Field name: 'hazardPhoto'

// Multiple hazard images
const uploadMultipleHazards = multer({
  storage: hazardStorage,
  fileFilter: imageFilter,
  limits: limits
}).array('hazardPhotos', 5); // Max 5 images

// Helper function to delete old image
const deleteImage = (filepath) => {
  if (filepath && fs.existsSync(filepath)) {
    try {
      fs.unlinkSync(filepath);
      console.log('Deleted old image:', filepath);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }
};

module.exports = {
  uploadProfile,
  uploadHazard,
  uploadMultipleHazards,
  deleteImage
};
