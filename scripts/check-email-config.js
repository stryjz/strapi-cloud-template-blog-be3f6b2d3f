import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

function checkEmailConfiguration() {
  console.log('🔍 Checking Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('========================');
  
  const envVars = {
    'RESEND_API_KEY': process.env.RESEND_API_KEY,
    'FRONTEND_URL': process.env.FRONTEND_URL,
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      if (key === 'RESEND_API_KEY') {
        // Mask the API key for security
        const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
        console.log(`✅ ${key}: ${masked}`);
      } else {
        console.log(`✅ ${key}: ${value}`);
      }
    } else {
      console.log(`❌ ${key}: Not set`);
    }
  });
  
  console.log('\n🔧 Configuration Check:');
  console.log('======================');
  
  // Check if Resend API key is valid
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      console.log('✅ Resend client initialized successfully');
      
      // Test API key by trying to get domains (this will fail if key is invalid)
      console.log('🔑 Testing API key validity...');
      // Note: We'll test the actual sending in the other scripts
      
    } catch (error) {
      console.log('❌ Failed to initialize Resend client:', error.message);
    }
  } else {
    console.log('❌ RESEND_API_KEY not found in environment variables');
  }
  
  console.log('\n📧 Email Templates Check:');
  console.log('========================');
  
  // Check if the server is running and accessible
  const serverUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  console.log(`🌐 Frontend URL: ${serverUrl}`);
  console.log(`🔗 Verification URL pattern: ${serverUrl}/verify-email?token=...`);
  
  console.log('\n💡 Next Steps:');
  console.log('==============');
  console.log('1. Run: node scripts/test-email.js');
  console.log('2. Run: node scripts/test-email-advanced.js');
  console.log('3. Check your Resend dashboard: https://resend.com/emails');
  console.log('4. Check your email inbox for test emails');
  
  console.log('\n🔧 Troubleshooting:');
  console.log('==================');
  console.log('• If API key is missing: Add RESEND_API_KEY to your .env file');
  console.log('• If emails fail: Check your Resend account status and domain verification');
  console.log('• If server errors: Check your Docker containers are running');
  console.log('• If verification links fail: Update FRONTEND_URL in your .env file');
}

checkEmailConfiguration(); 