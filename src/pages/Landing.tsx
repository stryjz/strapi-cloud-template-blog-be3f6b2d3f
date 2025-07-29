import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Cloud, Shield, Users, Zap, FileText, Lock, Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Cloud,
    title: "Cloud File Storage",
    description: "Secure AWS S3-powered storage with automatic backup and redundancy"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access control, encrypted file transfers, and audit logs"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Multi-tenant architecture with user management and permissions"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized file uploads and downloads with presigned URLs"
  },
  {
    icon: FileText,
    title: "File Management",
    description: "Organize, search, and manage files with intuitive interface"
  },
  {
    icon: Lock,
    title: "Access Control",
    description: "Granular permissions and secure file sharing options"
  }
];

const pricingPlans = [
  {
    name: "User Licenses",
    price: "$10",
    period: "/user",
    description: "Purchase additional user licenses for your team",
    features: [
      "1-50 additional users",
      "User licenses are separate from storage",
      "Flexible scaling",
      "Immediate activation"
    ],
    cta: "Buy User Licenses",
    popular: true
  },
  {
    name: "Storage Plans",
    price: "$10",
    period: "/10GB",
    description: "Purchase additional storage space",
    features: [
      "10GB for $10",
      "100GB for $50",
      "Additional storage space",
      "Immediate activation"
    ],
    cta: "Buy Storage",
    popular: false
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with specific needs",
    features: [
      "Custom user limits",
      "Custom storage limits",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantees",
      "On-premise options"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

const stats = [
  { label: "Files Stored", value: "1M+" },
  { label: "Active Users", value: "10K+" },
  { label: "Uptime", value: "99.9%" },
  { label: "Countries", value: "50+" }
];

export const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">FileVault</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            🚀 Now with enhanced security features
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Secure File Storage
            <br />
            for Modern Teams
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            FileVault provides enterprise-grade file storage and management with advanced security, 
            team collaboration, and seamless integration with AWS S3. Scale your user licenses and storage independently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to manage files securely</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for teams that need enterprise-grade security without the complexity
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Flexible, pay-as-you-grow pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Purchase user licenses and storage separately based on your needs. Scale up as your team grows.
            </p>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                💡 <strong>Getting Started:</strong> First, register for a free account to access the payment portal and purchase additional resources.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-xl scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?tab=register" className="w-full">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using FileVault to manage their files securely
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FileVault</span>
              </div>
              <p className="text-muted-foreground">
                Secure file storage and management for modern teams
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground cursor-pointer">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground cursor-pointer">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="mailto:info@itlabs-ai.com" className="hover:text-foreground">info@itlabs-ai.com</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Documentation</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="/documentation" className="hover:text-foreground">S3 Setup Guide</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 FileVault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}; 