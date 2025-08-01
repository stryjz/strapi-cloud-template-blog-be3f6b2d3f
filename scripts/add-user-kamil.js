import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function addUserKamil() {
  try {
    const email = 'kamilkosowski@itlabs-ai.com';
    const password = 'admin123';
    const name = 'Kamil Kosowski';
    const tenantName = 'ITLabs AI';
    
    console.log('👤 Adding user Kamil...');
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️ User already exists:');
      console.log(`  ID: ${existingUser.rows[0].id}`);
      console.log(`  Email: ${existingUser.rows[0].email}`);
      console.log(`  Name: ${existingUser.rows[0].name}`);
      console.log(`  Role: ${existingUser.rows[0].role}`);
      return;
    }
    
    // Generate unique tenant ID
    const tenantId = `tenant-${crypto.randomUUID()}`;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, name, role, tenant_id, permissions, email_verified, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        crypto.randomUUID(),
        email,
        name,
        'tenant_admin',
        tenantId,
        JSON.stringify(['tenant_admin', 'read', 'write', 'delete']),
        true, // Email verified
        null
      ]
    );
    
    const user = userResult.rows[0];
    console.log('✅ User created:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Tenant: ${user.tenant_id}`);
    
    // Create password record
    await pool.query(
      'INSERT INTO passwords (user_id, hashed_password) VALUES ($1, $2)',
      [user.id, hashedPassword]
    );
    console.log('🔑 Password created successfully');
    
    // Create tenant limits
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days trial
    
    await pool.query(
      `INSERT INTO tenant_limits (tenant_id, tenant_name, max_users, max_storage_gb, max_files, trial_start_date, trial_end_date, is_trial)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenantId, tenantName, 10, 100, 1000, trialStartDate, trialEndDate, true]
    );
    console.log('🏢 Tenant limits created');
    
    // Create trial tenant record
    await pool.query(
      `INSERT INTO trial_tenants (tenant_id, tenant_name, trial_start_date, trial_end_date, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, tenantName, trialStartDate, trialEndDate, true]
    );
    console.log('📅 Trial tenant record created');
    
    console.log('\n🎉 User Kamil added successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🏢 Tenant: ${tenantName}`);
    console.log(`⏰ Trial ends: ${trialEndDate.toDateString()}`);
    
  } catch (error) {
    console.error('❌ Error adding user Kamil:', error);
  } finally {
    await pool.end();
  }
}

addUserKamil(); 