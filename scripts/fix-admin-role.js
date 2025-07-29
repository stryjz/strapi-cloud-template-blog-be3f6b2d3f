import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role...');
    
    // Update the admin user to have super_admin role
    const result = await pool.query(`
      UPDATE users 
      SET role = 'super_admin', 
          permissions = '["super_admin", "admin", "read", "write", "delete"]',
          updated_at = NOW()
      WHERE email = 'admin@s3commando.com'
      RETURNING id, email, role
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin user role updated successfully!');
      console.log(`   User ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   New Role: ${result.rows[0].role}`);
      console.log('\n🔄 Please log out and log back in to see the admin pages.');
    } else {
      console.log('⚠️  Admin user not found. Make sure you have run npm run db:init first.');
    }
    
  } catch (error) {
    console.error('❌ Failed to fix admin role:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAdminRole(); 