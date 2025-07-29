import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function addTenantName() {
  try {
    console.log('🏷️ Adding tenant name column...');
    
    // Add tenant_name column to tenant_limits table
    await pool.query(`
      ALTER TABLE tenant_limits 
      ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255)
    `);
    console.log('✅ Added tenant_name column to tenant_limits table');

    // Add tenant_name column to trial_tenants table
    await pool.query(`
      ALTER TABLE trial_tenants 
      ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255)
    `);
    console.log('✅ Added tenant_name column to trial_tenants table');

    console.log('\n🎉 Tenant name columns added successfully!');
    console.log('\n📋 Next steps:');
    console.log('   • Update registration to save tenant names');
    console.log('   • Display tenant names in the UI');
    
  } catch (error) {
    console.error('❌ Failed to add tenant name columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addTenantName(); 