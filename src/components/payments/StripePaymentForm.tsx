import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle, AlertCircle, CreditCard as PayPalIcon, Building2 } from 'lucide-react';
import { createPaymentIntent, confirmPayment } from '@/lib/stripe';
import { toast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface StripePaymentFormProps {
  amount: number;
  description: string;
  metadata?: Record<string, string>;
  onSuccess: (paymentResult: any) => void;
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
  hidePostalCode: false, // Show postal code field
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  description,
  metadata = {},
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank_transfer'>('card');

  useEffect(() => {
    // Create payment intent when component mounts
    const initializePayment = async () => {
      try {
        setIsProcessing(true);
        setError(null);
        
        const intent = await createPaymentIntent({
          amount,
          currency: 'usd',
          description,
          metadata,
        });
        
        setPaymentIntent(intent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    initializePayment();
  }, [amount, description, metadata]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !paymentIntent) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let result;

      if (paymentMethod === 'card') {
        if (!elements) {
          setError('Card elements not available');
          return;
        }

        // Confirm card payment
        const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
          paymentIntent.client_secret,
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

        result = confirmedIntent;
      } else if (paymentMethod === 'paypal') {
        // Redirect to PayPal
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment-success`,
            payment_method_data: {
              billing_details: {
                email: 'customer@example.com',
              },
            },
          },
        });

        if (error) {
          setError(error.message || 'PayPal payment failed');
          toast({
            title: "PayPal Payment Failed",
            description: error.message || "PayPal payment could not be processed.",
            variant: "destructive",
          });
          return;
        }
        return; // Redirect will happen
      } else if (paymentMethod === 'bank_transfer') {
        // Handle bank transfer
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment-success`,
            payment_method_data: {
              billing_details: {
                email: 'customer@example.com',
              },
            },
          },
        });

        if (error) {
          setError(error.message || 'Bank transfer failed');
          toast({
            title: "Bank Transfer Failed",
            description: error.message || "Bank transfer could not be processed.",
            variant: "destructive",
          });
          return;
        }
        return; // Redirect will happen
      }

      if (result && result.status === 'succeeded') {
        // Confirm payment with our backend
        const backendResult = await confirmPayment(result.id);
        
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully!",
        });
        
        onSuccess(backendResult);
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

  if (isProcessing && !paymentIntent) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Initializing payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold">${amount.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Payment Method</label>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Credit/Debit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer">
                  <PayPalIcon className="h-4 w-4" />
                  PayPal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Card Element - Only show for card payment */}
          {paymentMethod === 'card' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Card Information</label>
              <div className="p-3 border rounded-md">
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </div>
              <p className="text-xs text-muted-foreground">
                Please include your postal/ZIP code when prompted. Any valid postal code will work for testing.
              </p>
            </div>
          )}

          {/* PayPal Info */}
          {paymentMethod === 'paypal' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                You will be redirected to PayPal to complete your payment after clicking "Pay".
              </p>
            </div>
          )}

          {/* Bank Transfer Info */}
          {paymentMethod === 'bank_transfer' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                You will receive bank transfer instructions after clicking "Pay". Payment may take 1-3 business days.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
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
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 