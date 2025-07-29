import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSubscription } from '@/lib/stripe';

interface StripeSubscriptionFormProps {
  priceId: string;
  amount: number;
  description: string;
  metadata?: Record<string, any>;
  onSuccess: (result: any) => void;
  onCancel: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

export const StripeSubscriptionForm: React.FC<StripeSubscriptionFormProps> = ({
  priceId,
  amount,
  description,
  metadata = {},
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    if (priceId) {
      initializeSubscription();
    }
  }, [priceId]);

  const initializeSubscription = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await createSubscription(priceId, metadata);
      setSubscriptionData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize subscription');
      toast({
        title: "Subscription Error",
        description: "Failed to initialize subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !subscriptionData) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the subscription payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        subscriptionData.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        toast({
          title: "Payment Failed",
          description: stripeError.message || "Payment could not be processed.",
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Subscription Created",
          description: "Your subscription has been created successfully! You will be charged monthly.",
        });
        
        onSuccess({
          subscriptionId: subscriptionData.subscriptionId,
          paymentIntent,
          status: 'active',
        });
      } else {
        setError('Payment was not completed');
        toast({
          title: "Payment Incomplete",
          description: "Payment was not completed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      toast({
        title: "Payment Error",
        description: "An error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing && !subscriptionData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Initializing subscription...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Monthly Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="bg-muted p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">{description}</h3>
            <p className="text-2xl font-bold text-primary">
              ${(amount / 100).toFixed(2)}/month
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically renews monthly • Cancel anytime
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              <CreditCard className="h-4 w-4 inline mr-2" />
              Card Information
            </label>
            <div className="border rounded-md p-3">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || !elements || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Subscribe for $${(amount / 100).toFixed(2)}/month`
              )}
            </Button>
          </div>
        </form>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>• Your subscription will automatically renew each month</p>
          <p>• You can cancel your subscription at any time</p>
          <p>• Payment is processed securely through Stripe</p>
        </div>
      </CardContent>
    </Card>
  );
}; 