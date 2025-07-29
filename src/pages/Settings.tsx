import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/lib/auth-client";
import { 
  Save, 
  Wifi, 
  Eye, 
  EyeOff,
  Database,
  Globe,
  Key,
  Shield
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const Settings = () => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  const [s3Config, setS3Config] = useState<S3Config>({
    bucketName: "",
    region: "us-east-1",
    accessKeyId: "",
    secretAccessKey: ""
  });

  // Load existing S3 configuration
  useEffect(() => {
    const loadS3Config = async () => {
      try {
        const token = session?.session?.id;
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/s3/config`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const config = await response.json();
          setS3Config({
            bucketName: config.bucket_name || "",
            region: config.region || "us-east-1",
            accessKeyId: config.access_key_id || "",
            secretAccessKey: config.secret_access_key || ""
          });
        }
      } catch (error) {
        console.error('Failed to load S3 config:', error);
      }
    };

    if (session) {
      loadS3Config();
    }
  }, [session]);

  const handleInputChange = (field: keyof S3Config, value: string) => {
    setS3Config(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const token = session?.session?.id;
      if (!token) {
        throw new Error('No session token');
      }

      const response = await fetch(`${API_BASE_URL}/api/s3/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bucketName: s3Config.bucketName,
          region: s3Config.region,
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        }),
      });

      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your S3 configuration has been saved successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      const token = session?.session?.id;
      if (!token) {
        throw new Error('No session token');
      }

      const response = await fetch(`${API_BASE_URL}/api/s3/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bucketName: s3Config.bucketName,
          region: s3Config.region,
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        }),
      });

      if (response.ok) {
        toast({
          title: "Connection successful",
          description: "Successfully connected to your S3 bucket.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Connection failed');
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Could not connect to S3 bucket. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure your application settings and S3 bucket connection.
        </p>
      </div>

      <div className="grid gap-6">
        {/* S3 Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              S3 Bucket Configuration
            </CardTitle>
            <CardDescription>
              Configure your AWS S3 bucket for file storage. These credentials will be used to upload and manage files.
              {session?.user?.tenant_id && (
                <span className="block mt-2 text-sm text-blue-600">
                  ℹ️ S3 configuration is shared within your tenant ({session.user.tenant_id}). 
                  All users in this tenant will use the same S3 bucket.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bucketName" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Bucket Name
                </Label>
                <Input
                  id="bucketName"
                  placeholder="my-file-bucket"
                  value={s3Config.bucketName}
                  onChange={(e) => handleInputChange('bucketName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Region
                </Label>
                <Input
                  id="region"
                  placeholder="us-east-1"
                  value={s3Config.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessKeyId" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Access Key ID
              </Label>
              <Input
                id="accessKeyId"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={s3Config.accessKeyId}
                onChange={(e) => handleInputChange('accessKeyId', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretAccessKey" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Secret Access Key
              </Label>
              <div className="relative">
                <Input
                  id="secretAccessKey"
                  type={showSecret ? "text" : "password"}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={s3Config.secretAccessKey}
                  onChange={(e) => handleInputChange('secretAccessKey', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isLoading}
              >
                <Wifi className="mr-2 h-4 w-4" />
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Information */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Your account details and permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={session?.user?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={session?.user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={session?.user?.role || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Tenant ID</Label>
                <Input value={session?.user?.tenant_id || 'default-tenant'} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 