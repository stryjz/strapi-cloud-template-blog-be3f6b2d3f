import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function setupTrialSystem() {
  try {
    console.log('🆓 Setting up trial system...');
    
    // Add trial-related columns to tenant_limits table
    await pool.query(`
      ALTER TABLE tenant_limits 
      ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS max_files INTEGER DEFAULT 1000
    `);
    console.log('✅ Added trial columns to tenant_limits table');

    // Update existing tenants to have trial status
    await pool.query(`
      UPDATE tenant_limits 
      SET 
        trial_start_date = created_at,
        trial_end_date = created_at + INTERVAL '14 days',
        is_trial = TRUE,
        max_users = 1,
        max_files = 10
      WHERE trial_start_date IS NULL
    `);
    console.log('✅ Updated existing tenants with trial settings');

    // Create trial_tenants table for better tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trial_tenants (
        tenant_id VARCHAR(255) PRIMARY KEY,
        trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created trial_tenants table');

    // Insert existing tenants into trial_tenants table
    await pool.query(`
      INSERT INTO trial_tenants (tenant_id, trial_start_date, trial_end_date)
      SELECT 
        tenant_id, 
        COALESCE(trial_start_date, created_at) as trial_start_date,
        COALESCE(trial_end_date, created_at + INTERVAL '14 days') as trial_end_date
      FROM tenant_limits 
      WHERE is_trial = TRUE
      ON CONFLICT (tenant_id) DO NOTHING
    `);
    console.log('✅ Populated trial_tenants table');

    // Create index for faster trial queries
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trial_tenants_end_date ON trial_tenants(trial_end_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_trial_tenants_active ON trial_tenants(is_active)');
    console.log('✅ Created trial indexes');

    // Create s3_objects table to track files for trial limits
    await pool.query(`
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
      )
    `);
    console.log('✅ Created s3_objects table');

    // Create indexes for s3_objects
    await pool.query('CREATE INDEX IF NOT EXISTS idx_s3_objects_tenant_id ON s3_objects(tenant_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_s3_objects_uploaded_by ON s3_objects(uploaded_by)');
    console.log('✅ Created s3_objects indexes');

    console.log('\n🎉 Trial system setup complete!');
    console.log('\n📋 Trial Features:');
    console.log('   • 14-day trial period');
    console.log('   • 1 user limit for trial tenants');
    console.log('   • 10 file limit for trial tenants');
    console.log('   • 500MB file size limit');
    console.log('   • Automatic trial expiration tracking');
    
  } catch (error) {
    console.error('❌ Trial system setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupTrialSystem(); 