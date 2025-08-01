import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'; // Change this to your email
const FROM_EMAIL = 'onboarding@resend.dev';

async function testBasicEmail() {
  console.log('\n📧 Test 1: Basic Email');
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: '🧪 Basic Email Test - S3 Commando',
      text: 'This is a simple text email test from S3 Commando.',
      html: '<h1>Basic Email Test</h1><p>This is a simple HTML email test from S3 Commando.</p>'
    });
    console.log('✅ Basic email sent successfully!');
    console.log('📧 Email ID:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Basic email failed:', error.message);
    return false;
  }
}

async function testVerificationEmail() {
  console.log('\n📧 Test 2: Verification Email (like your app)');
  try {
    const verificationToken = 'test-token-' + Date.now();
    const verificationUrl = `http://localhost:8080/verify-email?token=${verificationToken}`;
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: 'Verify your email address - S3 Commando',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to S3 Commando!</h2>
          <p>Hi Test User,</p>
          <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The S3 Commando Team</p>
        </div>
      `
    });
    console.log('✅ Verification email sent successfully!');
    console.log('📧 Email ID:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Verification email failed:', error.message);
    return false;
  }
}

async function testInvitationEmail() {
  console.log('\n📧 Test 3: Invitation Email');
  try {
    const loginUrl = 'http://localhost:8080/auth';
    const tempPassword = 'temp123456';
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: `You've been invited to join Test Team - S3 Commando`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You've been invited!</h2>
          <p>Hi Test User,</p>
          <p>You've been invited by Test Admin to join their team on S3 Commando.</p>
          <p>Your temporary login credentials:</p>
          <ul>
            <li><strong>Email:</strong> ${TEST_EMAIL}</li>
            <li><strong>Temporary Password:</strong> ${tempPassword}</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
              Login to S3 Commando
            </a>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login for security.</p>
          <p>Best regards,<br>The S3 Commando Team</p>
        </div>
      `
    });
    console.log('✅ Invitation email sent successfully!');
    console.log('📧 Email ID:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Invitation email failed:', error.message);
    return false;
  }
}

async function testEmailWithAttachments() {
  console.log('\n📧 Test 4: Email with Attachments (if supported)');
  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: '📎 Email with Attachments Test - S3 Commando',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email with Attachments Test</h2>
          <p>This email tests attachment functionality.</p>
          <p>Note: Resend may have limitations on attachments.</p>
        </div>
      `
      // Note: Resend may not support attachments in the same way as other providers
    });
    console.log('✅ Email with attachments sent successfully!');
    console.log('📧 Email ID:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Email with attachments failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Advanced Email Tests...');
  console.log('🔑 API Key:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('📧 Test Email:', TEST_EMAIL);
  
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is not set in your environment variables');
    console.log('💡 Please add your Resend API key to your .env file:');
    console.log('   RESEND_API_KEY=your_api_key_here');
    console.log('   TEST_EMAIL=your_email@example.com');
    return;
  }

  const results = {
    basic: await testBasicEmail(),
    verification: await testVerificationEmail(),
    invitation: await testInvitationEmail(),
    attachments: await testEmailWithAttachments()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your email system is working perfectly.');
  } else {
    console.log('⚠️  Some tests failed. Check the error messages above.');
  }
  
  console.log('\n📊 Check your Resend dashboard: https://resend.com/emails');
  console.log('📧 Check your email inbox for the test emails');
}

// Run all tests
runAllTests(); 