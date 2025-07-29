import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function debugPayments() {
  try {
    console.log('🔍 Debugging payment system...\n');

    // Get all tenants with their limits
    console.log('📊 Current tenant limits:');
    const tenantLimits = await pool.query(`
      SELECT 
        tl.tenant_id,
        tl.tenant_name,
        tl.max_users,
        tl.max_storage_gb,
        tl.max_files,
        tl.is_trial,
        tl.trial_end_date,
        COUNT(u.id) as current_users
      FROM tenant_limits tl
      LEFT JOIN users u ON tl.tenant_id = u.tenant_id
      GROUP BY tl.tenant_id, tl.tenant_name, tl.max_users, tl.max_storage_gb, tl.max_files, tl.is_trial, tl.trial_end_date
      ORDER BY tl.tenant_id
    `);

    tenantLimits.rows.forEach(tenant => {
      console.log(`  ${tenant.tenant_id}:`);
      console.log(`    Name: ${tenant.tenant_name}`);
      console.log(`    Users: ${tenant.current_users}/${tenant.max_users}`);
      console.log(`    Storage: ${tenant.max_storage_gb}GB`);
      console.log(`    Files: ${tenant.max_files}`);
      console.log(`    Trial: ${tenant.is_trial}`);
      console.log(`    Trial End: ${tenant.trial_end_date}`);
      console.log('');
    });

    // Get all purchase records
    console.log('💰 Purchase records:');
    const purchases = await pool.query(`
      SELECT 
        p.id,
        p.tenant_id,
        p.user_id,
        p.payment_intent_id,
        p.purchase_type,
        p.quantity,
        p.amount,
        p.created_at,
        u.email as purchaser_email
      FROM purchases p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    purchases.rows.forEach(purchase => {
      console.log(`  ${purchase.id}:`);
      console.log(`    Tenant: ${purchase.tenant_id}`);
      console.log(`    Purchaser: ${purchase.purchaser_email} (${purchase.user_id})`);
      console.log(`    Type: ${purchase.purchase_type}`);
      console.log(`    Quantity: ${purchase.quantity}`);
      console.log(`    Amount: $${(purchase.amount / 100).toFixed(2)}`);
      console.log(`    Payment Intent: ${purchase.payment_intent_id}`);
      console.log(`    Date: ${purchase.created_at}`);
      console.log('');
    });

    // Get trial tenants
    console.log('🆓 Trial tenants:');
    const trialTenants = await pool.query(`
      SELECT 
        tt.tenant_id,
        tt.trial_start_date,
        tt.trial_end_date,
        tt.is_active,
        tl.tenant_name
      FROM trial_tenants tt
      LEFT JOIN tenant_limits tl ON tt.tenant_id = tl.tenant_id
      ORDER BY tt.tenant_id
    `);

    trialTenants.rows.forEach(trial => {
      console.log(`  ${trial.tenant_id}:`);
      console.log(`    Name: ${trial.tenant_name || 'Unknown'}`);
      console.log(`    Start: ${trial.trial_start_date}`);
      console.log(`    End: ${trial.trial_end_date}`);
      console.log(`    Active: ${trial.is_active}`);
      console.log('');
    });

    // Summary
    console.log('📈 Summary:');
    console.log(`  Total tenants with limits: ${tenantLimits.rows.length}`);
    console.log(`  Total purchase records: ${purchases.rows.length}`);
    console.log(`  Total trial tenants: ${trialTenants.rows.length}`);
    
    const activeTenants = tenantLimits.rows.filter(t => !t.is_trial).length;
    const trialTenantsCount = tenantLimits.rows.filter(t => t.is_trial).length;
    
    console.log(`  Active (paid) tenants: ${activeTenants}`);
    console.log(`  Trial tenants: ${trialTenantsCount}`);

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugPayments(); 