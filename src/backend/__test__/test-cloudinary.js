require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('Testing Cloudinary connection...');
console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API key:', process.env.CLOUDINARY_API_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 10000
});

// Test by getting account details
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection successful!');
    console.log('Result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Cloudinary connection failed:');
    console.error('Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  });

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Connection timeout after 15 seconds');
  process.exit(1);
}, 15000);
