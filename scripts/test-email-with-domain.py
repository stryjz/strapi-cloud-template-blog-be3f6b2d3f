import os
import resend
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_with_verified_domain():
    try:
        print("🧪 Testing with Verified Domain...")
        
        # Get API key from environment
        api_key = os.environ.get("RESEND_API_KEY")
        test_email = os.environ.get("TEST_EMAIL", "test@example.com")
        
        if not api_key:
            print("❌ RESEND_API_KEY not found in environment variables")
            return
        
        print(f"🔑 API Key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else '***'}")
        print(f"📧 Test Email: {test_email}")
        print("🌐 Using verified domain: itlabs-ai.com")
        
        # Set the API key
        resend.api_key = api_key
        
        # Test with your verified domain
        params = {
            "from": "S3 Commando <noreply@itlabs-ai.com>",
            "to": [test_email],
            "subject": "🧪 Domain Test - S3 Commando Email System",
            "html": """
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🧪 Domain Email Test Successful!</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">S3 Commando Email System</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h2 style="color: #333; margin-top: 0;">Test Details</h2>
                    <ul style="color: #666;">
                        <li><strong>From Domain:</strong> itlabs-ai.com (verified)</li>
                        <li><strong>From Address:</strong> noreply@itlabs-ai.com</li>
                        <li><strong>To:</strong> {test_email}</li>
                        <li><strong>Subject:</strong> 🧪 Domain Test - S3 Commando Email System</li>
                    </ul>
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #28a745;">
                    <h3 style="color: #155724; margin-top: 0;">✅ Success!</h3>
                    <p style="color: #155724; margin-bottom: 0;">
                        Your verified domain is working correctly! This should work in your application.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <p style="color: #666; margin: 0;">
                        <strong>Next Steps:</strong><br>
                        1. Check your Resend dashboard for this email<br>
                        2. Update your server to use this domain<br>
                        3. Test your application's email functionality
                    </p>
                </div>
            </div>
            """
        }
        
        print("📤 Sending test email with verified domain...")
        email = resend.Emails.send(params)
        
        print("✅ Email sent successfully!")
        print(f"📧 Email ID: {email.get('id', 'N/A')}")
        print(f"📋 Response: {email}")
        
        print("\n🎉 Your verified domain is working!")
        print("📊 Check your Resend dashboard: https://resend.com/emails")
        print("📧 Check your email inbox for the test email")
        
        # Also test with onboarding@resend.dev as fallback
        print("\n📡 Testing with onboarding@resend.dev as fallback...")
        fallback_params = {
            "from": "onboarding@resend.dev",
            "to": [test_email],
            "subject": "🧪 Fallback Test - S3 Commando",
            "text": "This is a fallback test using onboarding@resend.dev"
        }
        
        try:
            fallback_email = resend.Emails.send(fallback_params)
            print("✅ Fallback email sent successfully!")
            print(f"📧 Email ID: {fallback_email.get('id', 'N/A')}")
        except Exception as e:
            print(f"❌ Fallback email failed: {e}")
        
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        print(f"🔍 Error type: {type(e).__name__}")

if __name__ == "__main__":
    test_with_verified_domain() 