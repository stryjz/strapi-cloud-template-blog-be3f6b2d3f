import os
import resend
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_resend_api_detailed():
    try:
        print("🧪 Detailed Resend API Test...")
        
        # Get API key from environment
        api_key = os.environ.get("RESEND_API_KEY")
        test_email = os.environ.get("TEST_EMAIL", "test@example.com")
        
        if not api_key:
            print("❌ RESEND_API_KEY not found in environment variables")
            return
        
        print(f"🔑 API Key: {api_key[:8]}...{api_key[-4:] if len(api_key) > 12 else '***'}")
        print(f"📧 Test Email: {test_email}")
        
        # Test 1: Direct API call to check API key validity
        print("\n📡 Test 1: Checking API key validity...")
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        # Try to get domains to test API key
        try:
            response = requests.get('https://api.resend.com/domains', headers=headers)
            print(f"📊 Domains API Response: {response.status_code}")
            if response.status_code == 200:
                print("✅ API key is valid!")
                domains = response.json()
                print(f"📋 Domains: {domains}")
            else:
                print(f"❌ API key validation failed: {response.status_code}")
                print(f"📋 Response: {response.text}")
        except Exception as e:
            print(f"❌ Error checking API key: {e}")
        
        # Test 2: Try sending email with detailed error handling
        print("\n📡 Test 2: Sending test email...")
        resend.api_key = api_key
        
        # Simple test email first
        simple_params = {
            "from": "onboarding@resend.dev",
            "to": [test_email],
            "subject": "🧪 Simple Test - S3 Commando",
            "text": "This is a simple test email from S3 Commando."
        }
        
        try:
            print("📤 Sending simple text email...")
            email = resend.Emails.send(simple_params)
            print("✅ Simple email sent successfully!")
            print(f"📧 Email ID: {email.get('id', 'N/A')}")
            print(f"📋 Full Response: {email}")
        except Exception as e:
            print(f"❌ Simple email failed: {e}")
            print(f"🔍 Error type: {type(e).__name__}")
            print(f"🔍 Error details: {str(e)}")
            
            # Try to get more details from the error
            if hasattr(e, 'response'):
                print(f"📊 HTTP Status: {e.response.status_code}")
                print(f"📋 Error Response: {e.response.text}")
        
        # Test 3: Try with different from address
        print("\n📡 Test 3: Testing with different from address...")
        alt_params = {
            "from": "Acme <onboarding@resend.dev>",
            "to": [test_email],
            "subject": "🧪 Alternative Test - S3 Commando",
            "html": "<h1>Alternative Test</h1><p>This is an alternative test email.</p>"
        }
        
        try:
            print("📤 Sending alternative email...")
            email = resend.Emails.send(alt_params)
            print("✅ Alternative email sent successfully!")
            print(f"📧 Email ID: {email.get('id', 'N/A')}")
        except Exception as e:
            print(f"❌ Alternative email failed: {e}")
        
        print("\n📊 Summary:")
        print("===========")
        print("• Check your Resend dashboard: https://resend.com/emails")
        print("• Check your email inbox for test emails")
        print("• If no emails received, check your Resend account status")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_resend_api_detailed() 