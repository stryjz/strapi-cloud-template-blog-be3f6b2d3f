import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function checkTenant() {
  try {
    const email = process.argv[2] || 'kamil.kosowski+test4@pragmaticcoders.com';
    
    console.log('🔍 Checking tenant information for:', email);
    
    // Get user and tenant info
    const userResult = await pool.query(
      'SELECT id, email, name, role, tenant_id, permissions FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Tenant ID:', user.tenant_id);
    console.log('  Permissions:', user.permissions);
    
    if (user.tenant_id) {
      // Get tenant usage info
      const tenantUsersResult = await pool.query(
        'SELECT COUNT(*) as user_count FROM users WHERE tenant_id = $1',
        [user.tenant_id]
      );
      
      console.log('\n📊 Tenant Usage:');
      console.log('  Tenant ID:', user.tenant_id);
      console.log('  Total Users:', tenantUsersResult.rows[0].user_count);
      
      // Get storage usage (if you have a files table)
      try {
        const storageResult = await pool.query(
          'SELECT COUNT(*) as file_count, COALESCE(SUM(size), 0) as total_size FROM files WHERE tenant_id = $1',
          [user.tenant_id]
        );
        
        console.log('  Total Files:', storageResult.rows[0].file_count);
        console.log('  Total Storage (bytes):', storageResult.rows[0].total_size);
        console.log('  Total Storage (MB):', (storageResult.rows[0].total_size / (1024 * 1024)).toFixed(2));
      } catch (err) {
        console.log('  Storage info: Not available (files table may not exist)');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTenant(); 