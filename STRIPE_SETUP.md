# Stripe Payment Integration Setup

This guide will help you set up Stripe payments in your S3 Commando Suite application.

## Prerequisites

1. A Stripe account (sign up at [stripe.com](https://stripe.com))
2. Your Stripe API keys (available in your Stripe Dashboard)

## Setup Steps

### 1. Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** > **API keys**
3. Copy your **Publishable key** and **Secret key**
4. For testing, use the test keys (they start with `pk_test_` and `sk_test_`)

### 2. Configure Environment Variables

Add your Stripe keys to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 3. Install Dependencies

The required dependencies are already installed:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK
- `@stripe/react-stripe-js` - React components for Stripe

### 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev:full
   ```

2. Navigate to the Payments page in your application

3. Try making a test purchase using Stripe's test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Requires Authentication**: `4000 0025 0000 3155`

## Features Implemented

### Backend (Server)
- ✅ Payment intent creation
- ✅ Payment confirmation
- ✅ Payment history retrieval
- ✅ Secure API endpoints with authentication

### Frontend (React)
- ✅ Stripe Elements integration
- ✅ Payment form with card input
- ✅ Real-time payment processing
- ✅ Error handling and user feedback
- ✅ Success/failure notifications

### Payment Flow
1. User selects purchase options (users/storage)
2. System creates payment intent on backend
3. User enters card details in Stripe Elements
4. Payment is processed securely through Stripe
5. Success/failure is handled and user is notified
6. Tenant limits are updated upon successful payment

## Security Features

- All payment processing happens through Stripe's secure infrastructure
- No card data is stored on your servers
- Payment intents are created server-side with proper authentication
- Client-side uses Stripe's Elements for secure card input

## Production Considerations

### Before Going Live
1. Switch to live Stripe keys (remove `_test` suffix)
2. Set up webhook endpoints for payment events
3. Implement proper error handling for failed payments
4. Add payment receipt emails
5. Set up Stripe Dashboard monitoring

### Webhook Setup (Recommended)
Set up webhooks to handle payment events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.payment_succeeded`

### Monitoring
- Monitor payments in your Stripe Dashboard
- Set up alerts for failed payments
- Track payment success rates

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that your Stripe keys are correct
   - Ensure you're using test keys for development

2. **Payment fails with "card declined"**
   - Use test card numbers for testing
   - Check Stripe Dashboard for detailed error messages

3. **"Elements not found" error**
   - Ensure `@stripe/react-stripe-js` is installed
   - Check that Stripe Elements are properly wrapped

4. **CORS errors**
   - Verify your frontend URL is correctly set in environment variables
   - Check server CORS configuration

### Getting Help
- Check [Stripe Documentation](https://docs.stripe.com/)
- Review Stripe Dashboard logs
- Test with Stripe's test mode first

## API Endpoints

### Create Payment Intent
```
POST /payments/create-payment-intent
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "amount": 1000,
  "currency": "usd",
  "description": "Payment description",
  "metadata": {
    "tenant_id": "tenant-123",
    "purchase_type": "users"
  }
}
```

### Confirm Payment
```
POST /payments/confirm-payment
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890"
}
```

### Get Payment History
```
GET /payments/history
Authorization: Bearer <session_token>
```

## Testing

Use these test scenarios:
1. **Successful payment** with test card `4242 4242 4242 4242`
2. **Failed payment** with test card `4000 0000 0000 0002`
3. **3D Secure authentication** with test card `4000 0025 0000 3155`
4. **Insufficient funds** with test card `4000 0000 0000 9995`

All test cards can use any future expiry date and any 3-digit CVC. 