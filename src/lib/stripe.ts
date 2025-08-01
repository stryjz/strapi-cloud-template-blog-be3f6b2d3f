import { loadStripe } from '@stripe/stripe-js';

// Debug: Check if the publishable key is available
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('🔍 Stripe Configuration Debug:');
console.log('🔍 Publishable key available:', !!publishableKey);
console.log('🔍 Publishable key starts with:', publishableKey ? publishableKey.substring(0, 7) : 'Not set');

// Initialize Stripe with your publishable key
export const stripePromise = loadStripe(publishableKey);

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

// Helper function to create payment intent
export const createPaymentIntent = async (paymentData: PaymentRequest): Promise<PaymentIntent> => {
  const token = getSessionToken();
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/payments/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create payment intent');
  }

  return response.json();
};

// Helper function to confirm payment
export const confirmPayment = async (paymentIntentId: string): Promise<any> => {
  const token = getSessionToken();
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/payments/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ paymentIntentId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm payment');
  }

  return response.json();
};

// ===== SUBSCRIPTION FUNCTIONS =====

// Create subscription
export const createSubscription = async (priceId: string, metadata: any = {}): Promise<any> => {
  const token = getSessionToken();
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/subscriptions/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ priceId, metadata }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create subscription');
  }

  return response.json();
};

// Get subscription status
export const getSubscriptionStatus = async (): Promise<any> => {
  const token = getSessionToken();
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/subscriptions/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get subscription status');
  }

  return response.json();
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string): Promise<any> => {
  const token = getSessionToken();
  
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/subscriptions/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ subscriptionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel subscription');
  }

  return response.json();
};

// Get stored session token
const getSessionToken = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session).session?.id : null;
}; 