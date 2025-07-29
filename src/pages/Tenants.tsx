import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/auth-client";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Calendar, Eye, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Tenant {
  tenant_id: string;
  user_count: number;
  created_at: string;
  has_admin: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const session = localStorage.getItem('session');
  const token = session ? JSON.parse(session).session?.id : null;
  
  if (!token) {
    throw new Error('No session token');
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
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const Tenants = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tenantId: "",
    adminName: "",
    adminEmail: "",
    adminPassword: ""
  });
  const [creating, setCreating] = useState(false);

  // Check if user is super admin
  useEffect(() => {
    if (session && session.user?.role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "You need super admin privileges to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [session, navigate]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/admin/tenants');
      setTenants(response.tenants || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "super_admin") {
      fetchTenants();
    }
  }, [session]);

  const handleViewTenant = (tenantId: string) => {
    // Navigate to users page filtered by tenant
    navigate(`/admin/users?tenant=${tenantId}`);
  };

  const handleCreateTenant = async () => {
    try {
      setCreating(true);
      await authenticatedFetch('/api/admin/tenants', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      toast({
        title: "Success",
        description: "Tenant created successfully.",
      });
      
      setIsCreateDialogOpen(false);
      setFormData({ tenantId: "", adminName: "", adminEmail: "", adminPassword: "" });
      fetchTenants();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create tenant",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (session?.user?.role !== "super_admin") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Loading tenants...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground">
            Manage all tenants in your system.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input
                  id="tenantId"
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  placeholder="my-company-tenant"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTenant} disabled={creating}>
                  {creating ? "Creating..." : "Create Tenant"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant List ({tenants.length} tenants)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tenants found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Admin Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell className="font-medium">
                      <Badge variant="outline">
                        {tenant.tenant_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {tenant.user_count} users
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tenant.has_admin ? "default" : "destructive"}>
                        {tenant.has_admin ? "Has Admin" : "No Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTenant(tenant.tenant_id)}
                      >
                        <Eye className="h-4 w-4" />
                        View Users
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 