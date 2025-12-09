require('dotenv').config();

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD);
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);

const { sendVerificationEmail } = require('./lib/emailService');

sendVerificationEmail(
  'karanireland41@gmail.com',
  'Test User',
  'test-123'
).then(() => {
  console.log('✅ SUCCESS!');
  process.exit(0);
}).catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});