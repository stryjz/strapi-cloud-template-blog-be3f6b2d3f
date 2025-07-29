# Stripe Subscription Setup Guide

This guide will help you set up automatic monthly renewals using Stripe Subscriptions instead of one-time payments.

## Overview

With subscriptions, customers will be automatically charged each month, and your app will be notified of successful payments through webhooks.

## Prerequisites

1. Complete the basic Stripe setup from `STRIPE_SETUP.md`
2. Access to your Stripe Dashboard
3. A publicly accessible webhook endpoint (for production)

## Step 1: Create Subscription Products in Stripe Dashboard

### 1.1 Create Products
1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **Add Product**
3. Create products for different tiers:

**Basic Plan**
- Name: "Basic Plan - 10 Users"
- Description: "10 user licenses with 100GB storage"
- Price: $10/month (recurring)

**Pro Plan**
- Name: "Pro Plan - 25 Users" 
- Description: "25 user licenses with 250GB storage"
- Price: $25/month (recurring)

**Enterprise Plan**
- Name: "Enterprise Plan - 50 Users"
- Description: "50 user licenses with 500GB storage"
- Price: $50/month (recurring)

### 1.2 Get Price IDs
After creating each product, copy the **Price ID** (starts with `price_`). You'll need these for your application.

## Step 2: Configure Webhooks

### 2.1 Create Webhook Endpoint
1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/webhooks/stripe`
4. Select these events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 2.2 Get Webhook Secret
1. After creating the webhook, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to your `.env` file:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

## Step 3: Update Your Application

### 3.1 Environment Variables
Add the webhook secret to your `.env` file:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3.2 Price IDs Configuration
Create a configuration file for your price IDs:

```typescript
// src/lib/stripe-config.ts
export const STRIPE_PRICE_IDS = {
  BASIC_10_USERS: 'price_1ABC123DEF456GHI789JKL', // Replace with your actual price ID
  PRO_25_USERS: 'price_1ABC123DEF456GHI789JKL',   // Replace with your actual price ID
  ENTERPRISE_50_USERS: 'price_1ABC123DEF456GHI789JKL', // Replace with your actual price ID
};

export const getPriceIdForUsers = (userCount: number) => {
  if (userCount <= 10) return STRIPE_PRICE_IDS.BASIC_10_USERS;
  if (userCount <= 25) return STRIPE_PRICE_IDS.PRO_25_USERS;
  return STRIPE_PRICE_IDS.ENTERPRISE_50_USERS;
};
```

## Step 4: Update Payment Flow

### 4.1 Modify Payments Page
Update your `Payments.tsx` to use subscriptions instead of one-time payments:

```typescript
// In your purchase dialog, replace the one-time payment with subscription
const handlePurchaseLicense = async () => {
  if (!selectedTenant) return;

  const priceId = getPriceIdForUsers(purchaseForm.additionalUsers);
  
  setSubscriptionMetadata({
    tenant_id: selectedTenant.id,
    tenant_name: selectedTenant.name,
    user_email: session?.user?.email || '',
    purchase_type: 'users',
    additional_users: purchaseForm.additionalUsers.toString(),
  });
  
  setSelectedPriceId(priceId);
  setShowSubscriptionDialog(true);
};
```

### 4.2 Add Subscription Dialog
Add a subscription dialog to your Payments page:

```typescript
{/* Subscription Dialog */}
<Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Subscribe to Monthly Plan</DialogTitle>
    </DialogHeader>
    {selectedPriceId && (
      <Elements stripe={stripePromise}>
        <StripeSubscriptionForm
          priceId={selectedPriceId}
          amount={getAmountForPriceId(selectedPriceId)}
          description={getDescriptionForPriceId(selectedPriceId)}
          metadata={subscriptionMetadata}
          onSuccess={handleSubscriptionSuccess}
          onCancel={() => setShowSubscriptionDialog(false)}
        />
      </Elements>
    )}
  </DialogContent>
</Dialog>
```

## Step 5: Test the Integration

### 5.1 Test Webhook Locally
For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3001/webhooks/stripe
```

### 5.2 Test Subscription Flow
1. Start your development server
2. Create a test subscription using Stripe's test card: `4242 4242 4242 4242`
3. Check that the webhook events are received
4. Verify that tenant limits are updated correctly

## How It Works

### Automatic Renewals
1. Customer subscribes to a monthly plan
2. Stripe automatically charges their card each month
3. Your webhook receives `invoice.payment_succeeded` events
4. Your app updates tenant limits automatically

### Payment Notifications
Your app will be notified of payments through these webhook events:

- **`customer.subscription.created`**: New subscription created
- **`customer.subscription.updated`**: Subscription status changed
- **`customer.subscription.deleted`**: Subscription canceled
- **`invoice.payment_succeeded`**: Monthly payment successful
- **`invoice.payment_failed`**: Payment failed

### Tenant Limit Management
The webhook handlers automatically:
- Update tenant limits when payments succeed
- Revert to trial limits when payments fail
- Handle subscription cancellations
- Track payment history

## Production Deployment

### 1. Update Webhook URL
Change your webhook endpoint URL to your production domain:
```
https://yourdomain.com/webhooks/stripe
```

### 2. Switch to Live Keys
Replace test keys with live keys in your environment:
```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
```

### 3. Monitor Webhooks
- Check webhook delivery in Stripe Dashboard
- Set up alerts for failed webhook deliveries
- Monitor payment success rates

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook endpoint URL is accessible
   - Verify webhook secret is correct
   - Check server logs for webhook errors

2. **Subscription not creating**
   - Verify price ID is correct
   - Check Stripe Dashboard for subscription status
   - Ensure customer creation is working

3. **Tenant limits not updating**
   - Check webhook event handlers
   - Verify database queries are working
   - Check server logs for errors

### Testing Tools
- Use Stripe Dashboard to view subscriptions
- Check webhook delivery logs
- Use Stripe CLI for local testing
- Monitor server logs for webhook events

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Idempotency**: Handle duplicate webhook events
3. **Error Handling**: Implement proper error handling for failed payments
4. **Monitoring**: Set up alerts for payment failures

## Next Steps

1. Implement subscription management UI
2. Add subscription cancellation flow
3. Set up email notifications for payment events
4. Implement usage-based billing if needed
5. Add subscription upgrade/downgrade functionality 