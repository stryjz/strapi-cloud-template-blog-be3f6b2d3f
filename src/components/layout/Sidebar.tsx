import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "@/lib/auth-client";
import { 
  Files, 
  Users, 
  Settings, 
  Upload,
  Shield,
  LayoutDashboard,
  CreditCard
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navigationItems = [
  {
    title: "File Manager",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "My Files", href: "/dashboard/files", icon: Files },
      { name: "Upload", href: "/dashboard/upload", icon: Upload },
    ]
  },
  {
    title: "Admin",
    items: [
      { name: "Users", href: "/dashboard/admin/users", icon: Users, adminOnly: true },
      { name: "Tenants", href: "/dashboard/admin/tenants", icon: Shield, superAdminOnly: true },
      { name: "Payments", href: "/dashboard/admin/payments", icon: CreditCard, adminOnly: true },
    ]
  },
  {
    title: "Settings",
    items: [
      { name: "Profile", href: "/dashboard/settings", icon: Settings },
    ]
  }
];

export const Sidebar = () => {
  const location = useLocation();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const isTenantAdmin = session?.user?.role === "tenant_admin";
  const isAdmin = isSuperAdmin || isTenantAdmin;

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow bg-card border-r border-border">
        <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Files className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="ml-3 text-lg font-semibold text-foreground">FileVault</span>
          </div>
        </div>
        
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {navigationItems.map((group) => (
              <div key={group.title}>
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => {
                    // Check if item should be shown based on user role
                    if (item.adminOnly && !isAdmin) return null;
                    if (item.superAdminOnly && !isSuperAdmin) return null;
                    
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </div>
  );
};