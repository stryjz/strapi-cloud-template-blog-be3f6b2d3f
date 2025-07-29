-- S3 Commando Database Initialization Script
-- This script creates all necessary tables and initial data for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  tenant_id VARCHAR(255),
  permissions TEXT DEFAULT '[]',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create passwords table
CREATE TABLE IF NOT EXISTS passwords (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hashed_password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create s3_config table
CREATE TABLE IF NOT EXISTS s3_config (
  user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bucket_name VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  access_key_id VARCHAR(255) NOT NULL,
  secret_access_key VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  purchase_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_limits table
CREATE TABLE IF NOT EXISTS tenant_limits (
  tenant_id VARCHAR(255) PRIMARY KEY,
  tenant_name VARCHAR(255),
  max_users INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 100,
  max_files INTEGER DEFAULT 1000,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  is_trial BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trial_tenants table
CREATE TABLE IF NOT EXISTS trial_tenants (
  tenant_id VARCHAR(255) PRIMARY KEY,
  tenant_name VARCHAR(255),
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create s3_objects table
CREATE TABLE IF NOT EXISTS s3_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  content_type VARCHAR(100),
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_id ON purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_trial_tenants_end_date ON trial_tenants(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_trial_tenants_active ON trial_tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_s3_objects_tenant_id ON s3_objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_s3_objects_uploaded_by ON s3_objects(uploaded_by);

-- Insert super admin user (password: admin123)
INSERT INTO users (
  id, email, name, role, tenant_id, permissions, email_verified, created_at, updated_at
) VALUES (
  'super-admin-user-id',
  'admin@s3commando.com',
  'Super Admin',
  'super_admin',
  'super-admin-tenant',
  '["super_admin", "admin", "read", "write", "delete"]',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert super admin password (bcrypt hash of 'admin123')
INSERT INTO passwords (user_id, hashed_password, created_at, updated_at)
VALUES (
  'super-admin-user-id',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Insert default tenant limits for super admin
INSERT INTO tenant_limits (
  tenant_id, tenant_name, max_users, max_storage_gb, max_files, is_trial
) VALUES (
  'super-admin-tenant',
  'Super Admin Workspace',
  1000,
  10000,
  100000,
  false
) ON CONFLICT (tenant_id) DO NOTHING; 