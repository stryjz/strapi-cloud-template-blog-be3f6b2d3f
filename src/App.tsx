import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Auth } from "@/pages/Auth";
import { VerifyEmail } from "@/pages/VerifyEmail";
import { Landing } from "@/pages/Landing";
import { Documentation } from "@/pages/Documentation";
import { Dashboard } from "@/pages/Dashboard";
import { Files } from "@/pages/Files";
import { Upload } from "@/pages/Upload";
import { Settings } from "@/pages/Settings";
import { Users } from "@/pages/Users";
import { Tenants } from "@/pages/Tenants";
import { Payments } from "@/pages/Payments";
import NotFound from "./pages/NotFound";
import { useSession } from "@/lib/auth-client";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  
  // Check if email is verified
  if (!session.user.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  const { data: session, isLoading } = useSession();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/documentation" element={<Documentation />} />
            
            {/* Protected routes - redirect to auth if not logged in */}
            <Route path="/dashboard" element={
              isLoading ? (
                <div className="min-h-screen flex items-center justify-center">
                  <div>Loading...</div>
                </div>
              ) : session ? (
                session.user.email_verified ? (
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/verify-email" replace />
                )
              ) : (
                <Navigate to="/auth" replace />
              )
            }>
              <Route index element={<Dashboard />} />
              <Route path="files" element={<Files />} />
              <Route path="upload" element={<Upload />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin/users" element={<Users />} />
              <Route path="admin/tenants" element={<Tenants />} />
              <Route path="admin/payments" element={<Payments />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
