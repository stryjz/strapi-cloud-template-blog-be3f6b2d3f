import os
import resend
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_restricted_api_key():
    try:
        print("🧪 Testing Restricted Resend API Key...")
        
        # Get API key from environment
        api_key = os.environ.get("RESEND_API_KEY")
        test_email = os.environ.get("TEST_EMAIL", "test@example.com")
        
        if not api_key:
            print("❌ RESEND_API_KEY not found in environment variables")
            return
        
        print(f"🔑 API Key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else '***'}")
        print(f"📧 Test Email: {test_email}")
        print("ℹ️  Note: Your API key is restricted (can only send emails)")
        
        # Set the API key
        resend.api_key = api_key
        
        # Test with the exact format from Resend docs
        params = {
            "from": "onboarding@resend.dev",
            "to": [test_email],
            "subject": "🧪 Restricted API Test - S3 Commando",
            "html": """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🧪 Restricted API Test Successful!</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">S3 Commando Email System</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h2 style="color: #333; margin-top: 0;">Test Details</h2>
                    <ul style="color: #666;">
                        <li><strong>API Key Type:</strong> Restricted (Email Only)</li>
                        <li><strong>From:</strong> onboarding@resend.dev</li>
                        <li><strong>To:</strong> {test_email}</li>
                        <li><strong>Subject:</strong> 🧪 Restricted API Test - S3 Commando</li>
                    </ul>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #28a745;">
                    <h3 style="color: #155724; margin-top: 0;">✅ Success!</h3>
                    <p style="color: #155724; margin-bottom: 0;">
                        Your restricted API key is working correctly! This means your email system should work in your application.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <p style="color: #666; margin: 0;">
                        <strong>Next Steps:</strong><br>
                        1. Check your Resend dashboard for this email<br>
                        2. Test your application's email functionality<br>
                        3. Your server should now be able to send emails
                    </p>
                </div>
            </div>
            """
        }
        
        print("📤 Sending test email with restricted API key...")
        email = resend.Emails.send(params)
        
        print("✅ Email sent successfully!")
        print(f"📧 Email ID: {email.get('id', 'N/A')}")
        print(f"📋 Response: {email}")
        
        print("\n🎉 Your restricted API key is working!")
        print("📊 Check your Resend dashboard: https://resend.com/emails")
        print("📧 Check your email inbox for the test email")
        print("🚀 Your application should now be able to send emails!")
        
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        
        if "401" in str(e):
            print("🔑 Authentication failed - check your API key")
        elif "400" in str(e):
            print("📧 Bad request - check your email configuration")
        elif "403" in str(e):
            print("🚫 Forbidden - check your Resend account permissions")
        else:
            print("🔧 Unknown error - check your Resend account status")

if __name__ == "__main__":
    test_restricted_api_key() 