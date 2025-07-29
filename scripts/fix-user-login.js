import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function fixUserLogin() {
  try {
    const email = 'kamil.kosowski+test4@pragmaticcoders.com';
    const newPassword = 'test123';
    
    console.log('🔍 Checking user login issue...');
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, name, role, tenant_id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Tenant: ${user.tenant_id}`);
    
    // Check if password exists
    const passwordResult = await pool.query(
      'SELECT hashed_password FROM passwords WHERE user_id = $1',
      [user.id]
    );
    
    if (passwordResult.rows.length === 0) {
      console.log('❌ No password found for user');
      console.log('🔧 Creating new password...');
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'INSERT INTO passwords (user_id, hashed_password) VALUES ($1, $2)',
        [user.id, hashedPassword]
      );
      console.log('✅ Password created successfully');
    } else {
      console.log('✅ Password exists, updating to new password...');
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE passwords SET hashed_password = $1 WHERE user_id = $2',
        [hashedPassword, user.id]
      );
      console.log('✅ Password updated successfully');
    }
    
    // Clear any existing sessions for this user
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    console.log('✅ Cleared existing sessions');
    
    console.log('\n🎉 Login should now work!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error fixing user login:', error);
  } finally {
    await pool.end();
  }
}

fixUserLogin(); 