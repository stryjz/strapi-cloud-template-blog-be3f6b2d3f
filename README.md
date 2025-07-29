# S3 Commando Suite

A production-ready file management system with PostgreSQL authentication and AWS S3 integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- AWS S3 bucket (for file storage)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd s3-commando-suite-main
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:8080

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Database Setup

Start PostgreSQL and initialize the database:

```bash
# Start PostgreSQL container
npm run db:setup

# Or manually:
npm run db:start
npm run db:init
```

### 4. Start the Application

```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
npm run dev:server  # Backend on port 3001
npm run dev         # Frontend on port 8080
```

### 5. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🔐 Default Super Admin Credentials

- **Email**: admin@s3commando.com
- **Password**: admin123

⚠️ **Important**: Change the super admin password in production!

## 🏢 Role Hierarchy

The system supports a hierarchical role structure:

### **Super Admin** (You)
- Manages all tenants in the system
- Can create tenant admins
- Has access to all system features
- Can view and manage all users across all tenants

### **Tenant Admin**
- **Default role for new users** - automatically assigned when registering
- Manages users within their own tenant
- Can create regular users in their tenant
- Can manage payments and subscriptions for their tenant
- Cannot access other tenants
- Cannot create other tenant admins

### **User**
- Regular user within a tenant
- Can upload and manage files
- Shares S3 bucket with other users in the same tenant

## 🏢 Tenant Management

The system supports multi-tenant architecture where users can have their own isolated tenants or share tenants with other users.

### Default Behavior: Individual Tenants

**New user registration creates individual tenants by default:**
- When a new user signs up, they automatically get their own unique tenant and become a **tenant admin**
- As a tenant admin, they can manage payments, invite users, and configure S3 settings
- Each user has their own isolated S3 bucket configuration
- Users cannot see files from other tenants unless explicitly invited

### Sharing Tenants via Invitations

**Tenant admins and super admins can invite users to share their tenant:**

1. **Go to Admin → Users** in the application
2. **Click "Invite User"** (purple outline button)
3. **Fill in user details** (name, email, role)
4. **Send invitation** - the user will receive an email with temporary credentials
5. **The invited user** will automatically be added to your tenant and share your S3 bucket

### Setting Up a New Tenant

1. **Create a tenant with multiple users:**
   ```bash
   # Create a tenant with default settings
   npm run tenant:setup
   
   # Or specify custom tenant details
   npm run tenant:setup "my-company" "admin@mycompany.com" "admin123"
   ```

2. **Log in as the tenant admin** and configure S3 settings in the Settings page

3. **Invite users to your tenant** using the "Invite User" button in Admin → Users

### Adding Users to Your Tenant

As a tenant admin, you can add users to your tenant:

1. Go to **Admin → Users** in the application
2. Click **"Invite User"** (for sharing your tenant) or **"Add User"** (for creating users in specific tenants)
3. Fill in user details
4. The new user will automatically be added to your tenant
5. The new user will automatically use the same S3 bucket as other users in the tenant

### Super Admin Features

As a super admin, you can:

1. **View all tenants** in Admin → Tenants
2. **Manage users across all tenants** in Admin → Users
3. **Create tenant admins** for new tenants
4. **Invite users to any tenant** using the invite system
5. **Monitor system usage** across all tenants

### Tenant Benefits

- **Individual Isolation**: New users get their own clean tenant by default
- **Shared Storage**: Invited users share the same S3 bucket within a tenant
- **Collaboration**: Users in the same tenant can see and manage files uploaded by other tenant members
- **Cost Efficiency**: Single S3 bucket for multiple users when sharing
- **Easy Management**: Tenant admins can manage all users in their tenant

## 📁 Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # UI components
│   ├── pages/             # Page components
│   ├── lib/               # Utilities and configurations
│   └── hooks/             # Custom React hooks
├── server/                # Backend Express server
│   └── index.js           # Main server file
├── scripts/               # Database scripts
│   └── init-db.js         # Database initialization
├── docker-compose.yml     # PostgreSQL container setup
└── env.example           # Environment variables template
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start frontend only
npm run dev:server       # Start backend only
npm run dev:full         # Start both frontend and backend

# Database
npm run db:start         # Start PostgreSQL container
npm run db:stop          # Stop PostgreSQL container
npm run db:reset         # Reset database (removes all data)
npm run db:init          # Initialize database schema and admin user
npm run db:setup         # Start DB and initialize in one command

# Build
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🔧 Production Deployment

### 1. Environment Variables

Set up production environment variables:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-db-host:5432/database
JWT_SECRET=your-production-jwt-secret
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-production-bucket
```

### 2. Database Migration

For production, use proper database migrations:

```bash
# Initialize production database
npm run db:init
```

### 3. Build and Deploy

```bash
# Build the application
npm run build

# Start production server
npm run dev:server
```

## 🔒 Security Features

- **Authentication**: JWT-based sessions with better-auth
- **Authorization**: Role-based access control (admin/user)
- **Database**: PostgreSQL with encrypted connections
- **File Storage**: AWS S3 with presigned URLs
- **CORS**: Configured for secure cross-origin requests

## 📊 API Endpoints

### Authentication
- `POST /auth/sign-up` - User registration
- `POST /auth/sign-in` - User login
- `POST /auth/sign-out` - User logout
- `GET /auth/session` - Get current session

### Protected Routes
- `GET /api/protected` - Test protected route
- `GET /api/admin` - Admin-only route

### Health Check
- `GET /health` - Server health status

## 🐛 Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL container is running:
   ```bash
   docker ps
   ```

2. Check database logs:
   ```bash
   docker logs s3-commando-postgres
   ```

3. Reset database if needed:
   ```bash
   npm run db:reset
   npm run db:init
   ```

### Authentication Issues

1. Check if admin user exists:
   ```bash
   npm run db:init
   ```

2. Verify environment variables are set correctly

3. Check server logs for authentication errors

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
