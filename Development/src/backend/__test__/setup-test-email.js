const nodemailer = require('nodemailer');

console.log('🔧 Setting up test email credentials...\n');

// Create a test account on Ethereal
nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('❌ Failed to create test account:', err);
    process.exit(1);
  }

  console.log('✅ Test email account created!\n');
  console.log('📧 Add these to your .env file:\n');
  console.log('EMAIL_HOST=smtp.ethereal.email');
  console.log('EMAIL_PORT=587');
  console.log(`EMAIL_USER=${account.user}`);
  console.log(`EMAIL_PASSWORD=${account.pass}`);
  console.log('EMAIL_FROM=SafePath <noreply@safepath.test>\n');
  
  console.log('🌐 View emails at: https://ethereal.email/messages');
  console.log(`   Login with: ${account.user} / ${account.pass}\n`);
  
  console.log('💡 After updating .env, run: node test-email.js');
  process.exit(0);
});
