import { useState, useEffect } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("login");
  const { data: session, isLoading } = useSession();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setActiveTab('register');
    } else if (tab === 'login') {
      setActiveTab('login');
    }
  }, [searchParams]);

  // Show loading while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users based on email verification status
  if (session && session.user) {
    // If email is not verified, redirect to email verification page
    if (!session.user.email_verified) {
      return <Navigate to="/verify-email" replace />;
    }
    // If email is verified, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user came from verification page (wants to sign in with different account)
  const fromVerification = searchParams.get('from') === 'verification';
  if (fromVerification) {
    // Clear any existing session data
    localStorage.removeItem('session');
    localStorage.removeItem('pendingVerificationEmail');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            FileVault
          </h1>
          <p className="text-muted-foreground mt-2">
            Secure file storage and management for modern teams
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-6">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="register" className="mt-6">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};