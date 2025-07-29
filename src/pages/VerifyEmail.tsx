import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pendingVerificationEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }

    // Check if there's a verification token in the URL
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    setIsVerifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/verify-email?token=${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus('success');
        localStorage.removeItem('pendingVerificationEmail');
        toast({
          title: "Email Verified!",
          description: "Your email has been verified successfully. You can now sign in to your account.",
        });
      } else {
        setVerificationStatus('error');
        toast({
          title: "Verification Failed",
          description: data.error || "Failed to verify email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setVerificationStatus('error');
      toast({
        title: "Verification Failed",
        description: "An error occurred while verifying your email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address not found. Please try registering again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "A new verification email has been sent to your inbox.",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Failed to Resend",
          description: data.error || "Failed to resend verification email. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verifying Email...</h2>
              <p className="text-muted-foreground">Please wait while we verify your email address.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
              <p className="text-muted-foreground mb-6">
                Your email has been verified successfully. You can now sign in to your account.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't verify your email. The link may be expired or invalid.
              </p>
              <div className="space-y-3">
                <Button onClick={resendVerification} className="w-full">
                  Resend Verification Email
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    localStorage.removeItem('session');
                    localStorage.removeItem('pendingVerificationEmail');
                    window.location.href = '/auth?from=verification';
                  }}
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {email && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Sent to: <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <h3 className="font-medium mb-2">What to do next:</h3>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Check your email inbox (and spam folder)</li>
                <li>2. Click the verification link in the email</li>
                <li>3. Return here to sign in to your account</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <Button onClick={resendVerification} variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </Button>
              
              <Button 
                onClick={() => {
                  localStorage.removeItem('session');
                  localStorage.removeItem('pendingVerificationEmail');
                  window.location.href = '/auth?from=verification';
                }} 
                className="w-full"
              >
                Back to Sign In
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  localStorage.removeItem('session');
                  localStorage.removeItem('pendingVerificationEmail');
                  window.location.href = '/';
                }}
                className="w-full text-muted-foreground"
              >
                Sign Out
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Didn't receive the email? Check your spam folder or{" "}
              <Button variant="link" className="p-0 h-auto text-sm" onClick={resendVerification}>
                resend the verification email
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 