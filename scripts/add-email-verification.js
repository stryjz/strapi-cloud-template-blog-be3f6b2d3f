import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function addEmailVerificationColumn() {
  try {
    console.log('🔧 Adding email verification column to users table...');
    
    // Check if the column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verification_token'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ email_verification_token column already exists');
      return;
    }
    
    // Add the email_verification_token column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN email_verification_token VARCHAR(255)
    `);
    
    console.log('✅ email_verification_token column added successfully');
    
  } catch (error) {
    console.error('❌ Failed to add email verification column:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addEmailVerificationColumn(); 