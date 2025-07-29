import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function verifyUser() {
  try {
    console.log('🔧 Manually verifying user email...');
    
    // Update the user to be verified
    const result = await pool.query(`
      UPDATE users 
      SET email_verified = true, email_verification_token = NULL
      WHERE email = $1
      RETURNING id, email, name, email_verified
    `, ['kamil.kosowski@pragmaticcoders.com']);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User verified successfully:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Email Verified:', user.email_verified);
    console.log('\n🎉 You can now sign in with your email and password!');
    
  } catch (error) {
    console.error('❌ Error verifying user:', error);
  } finally {
    await pool.end();
  }
}

verifyUser(); 