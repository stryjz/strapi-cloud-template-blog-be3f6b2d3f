import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function setupPurchasesSimple() {
  try {
    console.log('🛒 Setting up purchases and tenant limits tables...');
    
    // Create purchases table with VARCHAR user_id to match current users table
    await pool.query(`
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
      )
    `);
    console.log('✅ Purchases table created');

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_purchases_tenant_id ON purchases(tenant_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at)');
    console.log('✅ Indexes created');

    // Create tenant_limits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_limits (
        tenant_id VARCHAR(255) PRIMARY KEY,
        max_users INTEGER DEFAULT 10,
        max_storage_gb INTEGER DEFAULT 100,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Tenant limits table created');

    // Insert default limits for existing tenants
    const result = await pool.query(`
      INSERT INTO tenant_limits (tenant_id, max_users, max_storage_gb)
      SELECT DISTINCT tenant_id, 10, 100
      FROM users 
      WHERE tenant_id IS NOT NULL
      ON CONFLICT (tenant_id) DO NOTHING
    `);
    console.log(`✅ Default limits set for existing tenants`);

    console.log('🎉 Purchases setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up purchases:', error);
  } finally {
    await pool.end();
  }
}

setupPurchasesSimple(); 