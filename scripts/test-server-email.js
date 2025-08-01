import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testServerEmail() {
  console.log('🧪 Testing Server Email Functionality...');
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  
  try {
    // Test 1: Check server health
    console.log('\n📡 Test 1: Server Health Check');
    const healthResponse = await fetch(`${SERVER_URL}/health`);
    if (healthResponse.ok) {
      console.log('✅ Server is running and healthy');
    } else {
      console.log('❌ Server health check failed');
      return;
    }
    
    // Test 2: Test sign-up endpoint (which sends verification email)
    console.log('\n📡 Test 2: Sign-up Endpoint Test');
    const signUpData = {
      email: TEST_EMAIL,
      password: 'testpassword123',
      name: 'Test User',
      tenantName: 'Test Tenant'
    };
    
    console.log('📤 Sending sign-up request...');
    const signUpResponse = await fetch(`${SERVER_URL}/auth/sign-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signUpData)
    });
    
    const signUpResult = await signUpResponse.json();
    console.log('📋 Response status:', signUpResponse.status);
    console.log('📋 Response body:', JSON.stringify(signUpResult, null, 2));
    
    if (signUpResponse.ok) {
      console.log('✅ Sign-up request successful');
      console.log('📧 Verification email should have been sent');
    } else {
      console.log('❌ Sign-up request failed');
      console.log('🔍 Error details:', signUpResult.error || signUpResult.message);
    }
    
    // Test 3: Test resend verification endpoint
    console.log('\n📡 Test 3: Resend Verification Endpoint Test');
    const resendData = {
      email: TEST_EMAIL
    };
    
    console.log('📤 Sending resend verification request...');
    const resendResponse = await fetch(`${SERVER_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendData)
    });
    
    const resendResult = await resendResponse.json();
    console.log('📋 Response status:', resendResponse.status);
    console.log('📋 Response body:', JSON.stringify(resendResult, null, 2));
    
    if (resendResponse.ok) {
      console.log('✅ Resend verification request successful');
      console.log('📧 Verification email should have been sent');
    } else {
      console.log('❌ Resend verification request failed');
      console.log('🔍 Error details:', resendResult.error || resendResult.message);
    }
    
    console.log('\n📊 Summary:');
    console.log('===========');
    console.log('✅ Server health: OK');
    console.log(`${signUpResponse.ok ? '✅' : '❌'} Sign-up endpoint: ${signUpResponse.ok ? 'OK' : 'FAILED'}`);
    console.log(`${resendResponse.ok ? '✅' : '❌'} Resend verification: ${resendResponse.ok ? 'OK' : 'FAILED'}`);
    
    console.log('\n💡 Next Steps:');
    console.log('==============');
    console.log('1. Check your email inbox for verification emails');
    console.log('2. Check your Resend dashboard: https://resend.com/emails');
    console.log('3. Check server logs: docker logs s3-commando-server');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('==================');
    console.log('• Make sure your Docker containers are running');
    console.log('• Check if the server is accessible at:', SERVER_URL);
    console.log('• Verify your RESEND_API_KEY is set in the server environment');
    console.log('• Check server logs: docker logs s3-commando-server');
  }
}

testServerEmail(); 