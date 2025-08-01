import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function updateAdminPassword() {
  try {
    const email = 'admin@s3commando.com';
    const newPassword = 'admin123';
    
    console.log('🔧 Updating admin password...');
    
    // Check if admin user exists
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Admin user found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('🔑 Password hashed successfully');
    
    // Update the password
    await pool.query(
      'UPDATE passwords SET hashed_password = $1 WHERE user_id = $2',
      [hashedPassword, user.id]
    );
    console.log('✅ Password updated successfully');
    
    // Clear any existing sessions for this user
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    console.log('✅ Cleared existing sessions');
    
    console.log('\n🎉 Admin password update complete!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  } finally {
    await pool.end();
  }
}

updateAdminPassword(); 