import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function checkUser() {
  try {
    console.log('🔍 Checking user details...');
    
    // Check for the specific user
    const userResult = await pool.query(`
      SELECT id, email, name, email_verified, email_verification_token, created_at
      FROM users 
      WHERE email = $1
    `, ['kamil.kosowski@pragmaticcoders.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Email Verified:', user.email_verified);
    console.log('  Verification Token:', user.email_verification_token ? 'Present' : 'None');
    console.log('  Created At:', user.created_at);
    
    // Check if password exists
    const passwordResult = await pool.query(`
      SELECT user_id FROM passwords WHERE user_id = $1
    `, [user.id]);
    
    console.log('  Password Record:', passwordResult.rows.length > 0 ? 'Exists' : 'Missing');
    
  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await pool.end();
  }
}

checkUser(); 