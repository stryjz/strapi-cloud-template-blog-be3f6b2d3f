import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function createTestTrialUser() {
  try {
    console.log('🧪 Creating test trial user...');
    
    const email = 'trial@test.com';
    const password = 'trial123';
    const name = 'Trial User';
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('✅ Test trial user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate unique tenant ID for new user
    const tenantId = `trial-tenant-${crypto.randomUUID()}`;
    
    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, name, role, tenant_id, permissions, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        crypto.randomUUID(),
        email,
        name,
        'tenant_admin',
        tenantId,
        JSON.stringify(['tenant_admin', 'read', 'write', 'delete']),
        true
      ]
    );

    // Create password record
    await pool.query(
      'INSERT INTO passwords (user_id, hashed_password) VALUES ($1, $2)',
      [userResult.rows[0].id, hashedPassword]
    );

    // Create trial tenant limits
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    
    await pool.query(`
      INSERT INTO tenant_limits (tenant_id, max_users, max_storage_gb, max_files, trial_start_date, trial_end_date, is_trial)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [tenantId, 1, 1, 10, trialStartDate, trialEndDate, true]);

    // Add to trial_tenants table
    await pool.query(`
      INSERT INTO trial_tenants (tenant_id, trial_start_date, trial_end_date)
      VALUES ($1, $2, $3)
    `, [tenantId, trialStartDate, trialEndDate]);

    console.log('✅ Test trial user created successfully!');
    console.log('\n📋 Test Trial User Credentials:');
    console.log('   Email: trial@test.com');
    console.log('   Password: trial123');
    console.log('   Tenant ID:', tenantId);
    console.log('   Trial End Date:', trialEndDate.toISOString());
    console.log('\n🔒 Trial Limits:');
    console.log('   • 1 user maximum');
    console.log('   • 10 files maximum');
    console.log('   • 1GB storage maximum');
    console.log('   • 500MB file size limit');
    
  } catch (error) {
    console.error('❌ Failed to create test trial user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestTrialUser(); 