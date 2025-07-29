import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function fixAdminRoles() {
  try {
    console.log('🔧 Fixing admin role inconsistencies...');
    
    // First, let's see what roles exist in the system
    const roleCheck = await pool.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Current role distribution:');
    roleCheck.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} users`);
    });
    
    // Find users with the old "admin" role
    const adminUsers = await pool.query(`
      SELECT id, email, name, role, tenant_id 
      FROM users 
      WHERE role = 'admin'
    `);
    
    if (adminUsers.rows.length === 0) {
      console.log('\n✅ No users with old "admin" role found. System is consistent!');
      return;
    }
    
    console.log(`\n🔍 Found ${adminUsers.rows.length} users with old "admin" role:`);
    adminUsers.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) in tenant: ${user.tenant_id}`);
    });
    
    // Update users with "admin" role to "tenant_admin"
    const result = await pool.query(`
      UPDATE users 
      SET role = 'tenant_admin', 
          permissions = '["tenant_admin", "read", "write", "delete"]',
          updated_at = NOW()
      WHERE role = 'admin'
      RETURNING id, email, name, role, tenant_id
    `);
    
    console.log(`\n✅ Successfully updated ${result.rows.length} users from "admin" to "tenant_admin":`);
    result.rows.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) in tenant: ${user.tenant_id}`);
    });
    
    // Verify the fix
    const verification = await pool.query(`
      SELECT tenant_id, COUNT(*) as user_count,
             MAX(CASE WHEN role IN ('tenant_admin', 'admin') THEN 1 ELSE 0 END) as has_admin
      FROM users 
      WHERE tenant_id IS NOT NULL
      GROUP BY tenant_id
      ORDER BY has_admin DESC, user_count DESC
    `);
    
    console.log('\n📋 Tenant admin status after fix:');
    verification.rows.forEach(tenant => {
      const status = tenant.has_admin ? '✅ Has Admin' : '❌ No Admin';
      console.log(`   ${tenant.tenant_id}: ${tenant.user_count} users - ${status}`);
    });
    
    console.log('\n🎉 Admin role fix completed successfully!');
    console.log('\n🔄 Please refresh the Tenants page to see the updated admin status.');
    
  } catch (error) {
    console.error('❌ Failed to fix admin roles:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminRoles(); 