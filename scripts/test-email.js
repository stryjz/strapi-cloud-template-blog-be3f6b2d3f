import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('📧 Testing email functionality...');
    console.log('🔑 API Key:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
    
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in your environment variables');
      console.log('💡 Please add your Resend API key to your .env file:');
      console.log('   RESEND_API_KEY=your_api_key_here');
      return;
    }

    // Test email configuration
    const testEmail = {
      from: 'onboarding@resend.dev',
      to: ['test@example.com'], // Change this to your email
      subject: '🧪 S3 Commando - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🧪 Email Test Successful!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">S3 Commando Email System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h2 style="color: #333; margin-top: 0;">Test Details</h2>
            <ul style="color: #666;">
              <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
              <li><strong>From:</strong> onboarding@resend.dev</li>
              <li><strong>To:</strong> test@example.com</li>
              <li><strong>Subject:</strong> 🧪 S3 Commando - Email Test</li>
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #28a745;">
            <h3 style="color: #155724; margin-top: 0;">✅ Success!</h3>
            <p style="color: #155724; margin-bottom: 0;">
              If you received this email, your Resend API key is working correctly and you should be able to see this email in your Resend dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <p style="color: #666; margin: 0;">
              <strong>Next Steps:</strong><br>
              1. Check your Resend dashboard for this email<br>
              2. Verify the email was delivered successfully<br>
              3. Test your application's email functionality
            </p>
          </div>
        </div>
      `
    };

    console.log('📤 Sending test email...');
    const result = await resend.emails.send(testEmail);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', result.id);
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    
    console.log('\n🎉 Your email system is working!');
    console.log('📊 Check your Resend dashboard to see the email');
    console.log('🔗 Dashboard: https://resend.com/emails');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    
    if (error.statusCode === 401) {
      console.error('🔑 Authentication failed - check your API key');
    } else if (error.statusCode === 400) {
      console.error('📧 Bad request - check your email configuration');
    } else if (error.statusCode === 403) {
      console.error('🚫 Forbidden - check your Resend account permissions');
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your RESEND_API_KEY is correct');
    console.log('2. Check your Resend account status');
    console.log('3. Ensure your domain is verified in Resend');
    console.log('4. Check the Resend dashboard for any errors');
  }
}

// Run the test
testEmail(); 