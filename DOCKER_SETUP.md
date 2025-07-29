# S3 Commando Suite - Docker Setup

This guide explains how to run the entire S3 Commando Suite application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- Environment variables configured (see Environment Setup section)

## Quick Start

1. **Clone the repository and navigate to the project directory**
   ```bash
   cd s3-commando-suite-main
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env file with your actual values
   ```

3. **Start the entire application stack**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001
   - Database: localhost:5432

## Environment Setup

Create a `.env` file in the project root with the following variables:

```env
# Database (these are set automatically by Docker Compose)
DATABASE_URL=postgresql://s3_commando_user:s3_commando_password@postgres:5432/s3_commando

# Frontend URL
FRONTEND_URL=http://localhost:8080

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Optional: Custom ports (defaults shown)
PORT=3001
```

## Services Overview

### 1. PostgreSQL Database (`postgres`)
- **Port**: 5432
- **Database**: s3_commando
- **User**: s3_commando_user
- **Password**: s3_commando_password
- **Data Persistence**: Docker volume `postgres_data`
- **Initialization**: Automatic schema creation via `init-db.sql`

### 2. Backend Server (`server`)
- **Port**: 3001
- **Framework**: Node.js with Express
- **Features**: 
  - Authentication & authorization
  - S3 file management
  - Stripe payment processing
  - Email verification
  - Multi-tenant support
- **Health Check**: http://localhost:3001/health

### 3. Frontend Application (`frontend`)
- **Port**: 8080
- **Framework**: React with Vite
- **Features**:
  - Modern UI with shadcn/ui components
  - File upload/management
  - User management
  - Payment processing
  - Responsive design
- **Served by**: Nginx with optimized configuration

## Database Schema

The application automatically creates the following tables:

- `users` - User accounts and authentication
- `passwords` - Hashed passwords
- `sessions` - User sessions
- `s3_config` - S3 bucket configurations
- `purchases` - Payment records
- `tenant_limits` - Tenant resource limits
- `trial_tenants` - Trial account tracking
- `s3_objects` - File metadata tracking

## Default Admin Account

A super admin account is automatically created:

- **Email**: admin@s3commando.com
- **Password**: admin123
- **Role**: super_admin

⚠️ **Important**: Change the default password in production!

## Docker Commands

### Start all services
```bash
docker-compose up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ This will delete all data)
```bash
docker-compose down -v
```

### Rebuild services
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Access database
```bash
docker-compose exec postgres psql -U s3_commando_user -d s3_commando
```

### Access server container
```bash
docker-compose exec server sh
```

### Access frontend container
```bash
docker-compose exec frontend sh
```

## Development Workflow

### Making Changes to the Backend
1. Edit files in the `server/` directory
2. Rebuild the server container:
   ```bash
   docker-compose build server
   docker-compose up -d server
   ```

### Making Changes to the Frontend
1. Edit files in the `src/` directory
2. Rebuild the frontend container:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Database Migrations
The database schema is automatically created on first run. For additional migrations:

1. Create a new SQL file in the project root
2. Add it to the `docker-compose.yml` volume mapping:
   ```yaml
   volumes:
     - ./your-migration.sql:/docker-entrypoint-initdb.d/02-your-migration.sql
   ```
3. Restart the database:
   ```bash
   docker-compose restart postgres
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   - Check if ports 3001, 8080, or 5432 are already in use
   - Modify ports in `docker-compose.yml` if needed

2. **Database connection issues**
   - Ensure the database container is healthy: `docker-compose ps`
   - Check database logs: `docker-compose logs postgres`

3. **Environment variables not loading**
   - Verify `.env` file exists and has correct format
   - Restart containers: `docker-compose restart`

4. **Frontend not loading**
   - Check if the build was successful: `docker-compose logs frontend`
   - Rebuild if needed: `docker-compose build frontend`

### Health Checks

All services include health checks:

```bash
# Check service status
docker-compose ps

# Check health status
docker inspect s3-commando-server | grep Health -A 10
docker inspect s3-commando-frontend | grep Health -A 10
docker inspect s3-commando-postgres | grep Health -A 10
```

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs server
docker-compose logs frontend
docker-compose logs postgres
```

## Production Considerations

1. **Security**
   - Change default admin password
   - Use strong database passwords
   - Configure proper SSL/TLS certificates
   - Set up proper firewall rules

2. **Performance**
   - Configure database connection pooling
   - Set up Redis for session storage
   - Use CDN for static assets
   - Configure proper nginx caching

3. **Monitoring**
   - Set up log aggregation
   - Configure health checks
   - Monitor resource usage
   - Set up alerts

4. **Backup**
   - Regular database backups
   - Volume snapshots
   - Configuration backups

## Support

For issues or questions:
1. Check the logs: `docker-compose logs`
2. Verify environment variables
3. Check service health: `docker-compose ps`
4. Review this documentation

The application includes comprehensive logging and health checks to help diagnose issues quickly. 