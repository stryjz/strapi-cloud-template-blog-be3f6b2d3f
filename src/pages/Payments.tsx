import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useSession } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";
import { CreditCard, DollarSign, Users, HardDrive, Plus, ShoppingCart, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { StripePaymentForm } from '@/components/payments/StripePaymentForm';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  userCount: number;
  storageGB: number;
  description: string;
}

interface Tenant {
  id: string;
  name: string;
  tenantName: string;
  currentUsers: number;
  maxUsers: number;
  currentStorageGB: number;
  maxStorageGB: number;
  currentFiles: number;
  maxFiles: number;
  isTrial: boolean;
  trialEndDate: string | null;
  status: 'active' | 'inactive' | 'trial';
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get stored session token
const getSessionToken = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session).session?.id : null;
};

// Helper function for authenticated API calls
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getSessionToken();
  if (!token) {
    throw new Error('No session token available');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

export const Payments = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    purchaseType: "users", // "users" or "storage"
    additionalUsers: 1,
    storageGB: 10,
    paymentMethod: "credit_card"
  });
  const [showStripePayment, setShowStripePayment] = useState(false);

  // Predefined payment plans
  const paymentPlans: PaymentPlan[] = [
    {
      id: "basic",
      name: "User Licenses",
      price: 10,
      userCount: 1,
      storageGB: 0,
      description: "Purchase additional user licenses (1-50 users)"
    },
    {
      id: "pro",
      name: "Storage Plans",
      price: 10,
      userCount: 0,
      storageGB: 10,
      description: "Purchase additional storage space"
    }
  ];

  // Check if user is admin
  useEffect(() => {
    if (session && session.user?.role !== "super_admin" && session.user?.role !== "tenant_admin") {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [session, navigate]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      
      // Fetch current user's tenant usage
      const response = await authenticatedFetch('/api/tenant/usage');
      
      // Create tenant object from the response
      const tenant: Tenant = {
        id: response.tenant_id,
        name: session?.user?.name ? `${session.user.name}'s Tenant` : 'My Tenant',
        tenantName: response.tenant_name || `${session?.user?.name || 'User'}'s Workspace`,
        currentUsers: response.current_users,
        maxUsers: response.max_users,
        currentStorageGB: response.current_storage_gb,
        maxStorageGB: response.max_storage_gb,
        currentFiles: response.current_files,
        maxFiles: response.max_files,
        isTrial: response.is_trial,
        trialEndDate: response.trial_end_date,
        status: response.status
      };
      
      setTenants([tenant]);
    } catch (error) {
      setError("Failed to fetch tenant data");
      console.error("Error fetching tenant data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handlePurchaseLicense = async () => {
    if (!selectedTenant) return;

    // Calculate payment details
    let totalCost = 0;
    let description = "";

    if (purchaseForm.purchaseType === "users") {
      totalCost = purchaseForm.additionalUsers * 10; // $10 per user
      description = `${purchaseForm.additionalUsers} additional user license(s) for ${selectedTenant.name}`;
    } else {
      totalCost = purchaseForm.storageGB === 10 ? 10 : 50; // $10 for 10GB, $50 for 100GB
      description = `${purchaseForm.storageGB}GB additional storage for ${selectedTenant.name}`;
    }

    // Show Stripe payment form
    setShowStripePayment(true);
  };

  const handlePaymentSuccess = async (paymentResult: any) => {
    if (!selectedTenant) return;

    try {
      const successMessage = purchaseForm.purchaseType === "users"
        ? `Successfully purchased ${purchaseForm.additionalUsers} additional user license(s)`
        : `Successfully purchased ${purchaseForm.storageGB}GB additional storage`;

      toast({
        title: "Purchase Successful",
        description: successMessage,
      });

      // Close dialogs and reset form
      setIsPurchaseDialogOpen(false);
      setShowStripePayment(false);
      setSelectedTenant(null);
      setPurchaseForm({ 
        purchaseType: "users", 
        additionalUsers: 1, 
        storageGB: 10, 
        paymentMethod: "credit_card" 
      });

      // Force refresh tenant data from server to get updated limits
      console.log('🔄 Refreshing tenant data after payment...');
      setLoading(true);
      await fetchTenants();
      console.log('✅ Tenant data refreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing tenant data:', error);
      toast({
        title: "Update Failed",
        description: "Payment was successful but failed to update tenant limits. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentCancel = () => {
    setShowStripePayment(false);
  };

  const openPurchaseDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsPurchaseDialogOpen(true);
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments & Licensing</h1>
          <p className="text-muted-foreground">
            Purchase additional resources and view your current usage
          </p>
        </div>
      </div>

      {/* Information Alert */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>How it works:</strong> User licenses and storage are separate purchases. User licenses only increase the number of users you can have. Storage plans increase your total storage capacity. Your current usage and limits are shown in the table below.
        </p>
      </div>

      {/* Payment Plans Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Licenses Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Licenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$10</div>
            <p className="text-sm text-muted-foreground mt-2">per user license</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Purchase 1-50 additional user licenses
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                User licenses are separate from storage
              </div>
            </div>
            <Button 
              onClick={() => {
                setPurchaseForm({ 
                  purchaseType: "users", 
                  additionalUsers: 1, 
                  storageGB: 10, 
                  paymentMethod: "credit_card" 
                });
                // Use the actual tenant data instead of "general"
                if (tenants.length > 0) {
                  setSelectedTenant(tenants[0]);
                } else {
                  setSelectedTenant({
                    id: "general",
                    name: "General Purchase",
                    tenantName: "General Purchase",
                    currentUsers: 0,
                    maxUsers: 0,
                    currentStorageGB: 0,
                    maxStorageGB: 0,
                    currentFiles: 0,
                    maxFiles: 0,
                    isTrial: false,
                    trialEndDate: null,
                    status: 'active'
                  });
                }
                setIsPurchaseDialogOpen(true);
              }}
              className="w-full mt-4"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy User Licenses
            </Button>
          </CardContent>
        </Card>

        {/* Storage Plans */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">10GB Storage</div>
                  <div className="text-sm text-muted-foreground">Additional storage space</div>
                </div>
                <div className="text-xl font-bold">$10</div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">100GB Storage</div>
                  <div className="text-sm text-muted-foreground">Additional storage space</div>
                </div>
                <div className="text-xl font-bold">$50</div>
              </div>
            </div>
            <Button 
              onClick={() => {
                setPurchaseForm({ 
                  purchaseType: "storage", 
                  additionalUsers: 1, 
                  storageGB: 10, 
                  paymentMethod: "credit_card" 
                });
                // Use the actual tenant data instead of "general"
                if (tenants.length > 0) {
                  setSelectedTenant(tenants[0]);
                } else {
                  setSelectedTenant({
                    id: "general",
                    name: "General Purchase",
                    tenantName: "General Purchase",
                    currentUsers: 0,
                    maxUsers: 0,
                    currentStorageGB: 0,
                    maxStorageGB: 0,
                    currentFiles: 0,
                    maxFiles: 0,
                    isTrial: false,
                    trialEndDate: null,
                    status: 'active'
                  });
                }
                setIsPurchaseDialogOpen(true);
              }}
              className="w-full mt-4"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Storage
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tenants and Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Current Usage & Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Storage Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial End Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const userUsagePercentage = getUsagePercentage(tenant.currentUsers, tenant.maxUsers);
                const storageUsagePercentage = getUsagePercentage(tenant.currentStorageGB, tenant.maxStorageGB);
                
                return (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">ID: {tenant.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {tenant.currentUsers}/{tenant.maxUsers}
                          </span>
                          <Badge variant={getUsageColor(userUsagePercentage)}>
                            {userUsagePercentage}%
                          </Badge>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(userUsagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {tenant.currentStorageGB.toFixed(1)}/{tenant.maxStorageGB}GB
                          </span>
                          <Badge variant={getUsageColor(storageUsagePercentage)}>
                            {storageUsagePercentage}%
                          </Badge>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(storageUsagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {tenant.isTrial && tenant.trialEndDate ? (
                          new Date(tenant.trialEndDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          tenant.isTrial ? 'No end date' : 'N/A'
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Additional Resources</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTenant && selectedTenant.id !== "general" && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedTenant.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Current: {selectedTenant.currentUsers}/{selectedTenant.maxUsers} users, {selectedTenant.currentStorageGB.toFixed(1)}/{selectedTenant.maxStorageGB}GB storage
                </p>
              </div>
            )}
            
            {selectedTenant && selectedTenant.id === "general" && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">General Purchase</h4>
                <p className="text-sm text-muted-foreground">
                  Purchase additional resources for your account
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="purchase-type">Purchase Type</Label>
              <Select 
                value={purchaseForm.purchaseType} 
                onValueChange={(value) => setPurchaseForm({ 
                  ...purchaseForm, 
                  purchaseType: value,
                  additionalUsers: value === "users" ? 1 : 0,
                  storageGB: value === "storage" ? 10 : 0
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">User Licenses</SelectItem>
                  <SelectItem value="storage">Storage Space</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {purchaseForm.purchaseType === "users" && (
              <div>
                <Label htmlFor="additional-users">Additional Users</Label>
                <Input
                  id="additional-users"
                  type="number"
                  min="1"
                  max="50"
                  value={purchaseForm.additionalUsers}
                  onChange={(e) => setPurchaseForm({ 
                    ...purchaseForm, 
                    additionalUsers: parseInt(e.target.value) || 1 
                  })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  $10 per user license (1-50 users)
                </p>
              </div>
            )}

            {purchaseForm.purchaseType === "storage" && (
              <div>
                <Label htmlFor="storage-amount">Storage Amount</Label>
                <Select 
                  value={purchaseForm.storageGB.toString()} 
                  onValueChange={(value) => setPurchaseForm({ 
                    ...purchaseForm, 
                    storageGB: parseInt(value) 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10GB - $10</SelectItem>
                    <SelectItem value="100">100GB - $50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select 
                value={purchaseForm.paymentMethod} 
                onValueChange={(value) => setPurchaseForm({ ...purchaseForm, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Cost:</span>
                <span className="text-xl font-bold">
                  ${purchaseForm.purchaseType === "users" 
                    ? purchaseForm.additionalUsers * 10 
                    : purchaseForm.storageGB === 10 ? 10 : 50
                  }
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Additional {purchaseForm.purchaseType === "users" ? "Users:" : "Storage:"}</span>
                <span>
                  {purchaseForm.purchaseType === "users" 
                    ? `${purchaseForm.additionalUsers} user license(s)` 
                    : `${purchaseForm.storageGB}GB`
                  }
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPurchaseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePurchaseLicense} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Proceed to Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stripe Payment Dialog */}
      <Dialog open={showStripePayment} onOpenChange={setShowStripePayment}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                amount={purchaseForm.purchaseType === "users" 
                  ? purchaseForm.additionalUsers * 10 
                  : purchaseForm.storageGB === 10 ? 10 : 50
                }
                description={purchaseForm.purchaseType === "users"
                  ? `${purchaseForm.additionalUsers} additional user license(s) for ${selectedTenant.name}`
                  : `${purchaseForm.storageGB}GB additional storage for ${selectedTenant.name}`
                }
                metadata={{
                  tenant_id: selectedTenant.id,
                  tenant_name: selectedTenant.name,
                  user_email: session?.user?.email || '',
                  purchase_type: purchaseForm.purchaseType,
                  additional_users: purchaseForm.purchaseType === "users" ? purchaseForm.additionalUsers.toString() : "0",
                  storage_gb: purchaseForm.purchaseType === "storage" ? purchaseForm.storageGB.toString() : "0",
                }}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 