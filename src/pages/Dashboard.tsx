import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Files, Upload, Users, HardDrive, RefreshCw, Home, Clock, AlertTriangle } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard-api";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

// Helper function to format time ago
const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

const StatCard = ({ title, value, icon: Icon, description }: { 
  title: string; 
  value: string; 
  icon: any; 
  description: string; 
}) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-primary" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const isAdmin = session?.user?.role === "tenant_admin" || session?.user?.role === "super_admin";
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsed: "0 Bytes",
    recentUploads: 0,
    totalUsers: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [trialStatus, setTrialStatus] = useState({
    isTrial: false,
    daysRemaining: null,
    maxUsers: 10,
    maxFiles: 1000,
    maxStorageGB: 100,
    tenantName: ''
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      
      // Fetch dashboard data and trial status
      const [statsData, activityData, trialData] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(),
        fetch('/api/trial/status', {
          headers: {
            'Authorization': `Bearer ${session?.session?.id}`
          }
        }).then(res => res.json()).catch(() => ({ isTrial: false, daysRemaining: null }))
      ]);
      
      setStats(statsData);
      setRecentActivity(activityData);
      setTrialStatus(trialData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">...</div>
                <p className="text-xs text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Overview</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {session?.user?.name || "User"}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your file management system.
          </p>
          {trialStatus.tenantName && (
            <p className="text-sm text-muted-foreground mt-1">
              Workspace: <span className="font-medium text-foreground">{trialStatus.tenantName}</span>
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Files"
          value={stats.totalFiles.toLocaleString()}
          icon={Files}
          description="Files in your storage"
        />
        <StatCard
          title="Storage Used"
          value={stats.storageUsed}
          icon={HardDrive}
          description="Total storage used"
        />
        <StatCard
          title="Recent Uploads"
          value={stats.recentUploads.toString()}
          icon={Upload}
          description="Files uploaded today"
        />
        {isAdmin && (
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toString()}
            icon={Users}
            description="Active users"
          />
        )}
      </div>

      {/* Trial Status Card */}
      {trialStatus.isTrial && (
        <Card className="shadow-md border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trial Account
            </CardTitle>
            {trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 3 && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              {trialStatus.daysRemaining !== null ? `${trialStatus.daysRemaining} days left` : 'Active Trial'}
            </div>
            <p className="text-xs text-orange-600 mt-2">
              Trial limits: {trialStatus.maxUsers} users, {trialStatus.maxFiles} files, {trialStatus.maxStorageGB}GB storage
            </p>
            {trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 3 && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ Trial expires soon! Upgrade to continue using the service.
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 text-orange-700 border-orange-300 hover:bg-orange-100"
              onClick={() => navigate('/payments')}
            >
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div 
              className="flex items-center justify-between p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              onClick={() => navigate('/upload')}
            >
              <div className="flex items-center space-x-3">
                <Upload className="h-5 w-5 text-primary" />
                <span className="font-medium">Upload Files</span>
              </div>
              <span className="text-sm text-muted-foreground">Drag & drop or browse</span>
            </div>
            <div 
              className="flex items-center justify-between p-3 bg-accent rounded-lg cursor-pointer hover:bg-accent/80 transition-colors"
              onClick={() => navigate('/files')}
            >
              <div className="flex items-center space-x-3">
                <Files className="h-5 w-5 text-primary" />
                <span className="font-medium">Browse Files</span>
              </div>
              <span className="text-sm text-muted-foreground">View all files</span>
            </div>
          </CardContent>
        </Card>

                <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'upload' ? 'bg-success' : 
                        activity.type === 'download' ? 'bg-primary' : 'bg-warning'
                      }`}></div>
                      <span className="text-sm">{activity.fileName} {activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};