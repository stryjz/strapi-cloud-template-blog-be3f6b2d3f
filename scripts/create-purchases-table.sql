-- Create purchases table to track payment transactions
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    purchase_type VARCHAR(50) NOT NULL, -- 'users' or 'storage'
    quantity INTEGER NOT NULL, -- number of users or GB of storage
    amount INTEGER NOT NULL, -- amount in cents
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_id ON purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);

-- Create tenant_limits table to track current limits
CREATE TABLE IF NOT EXISTS tenant_limits (
    tenant_id VARCHAR(255) PRIMARY KEY,
    max_users INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default limits for existing tenants
INSERT INTO tenant_limits (tenant_id, max_users, max_storage_gb)
SELECT DISTINCT tenant_id, 10, 100
FROM users 
WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id) DO NOTHING; 