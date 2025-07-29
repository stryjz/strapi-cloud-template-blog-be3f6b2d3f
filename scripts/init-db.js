import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Create database schema for better-auth
    console.log('📋 Creating database schema...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        tenant_id VARCHAR(255),
        permissions TEXT DEFAULT '[]',
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create passwords table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS passwords (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        hashed_password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create s3_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS s3_config (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bucket_name VARCHAR(255) NOT NULL,
        region VARCHAR(50) NOT NULL,
        access_key_id VARCHAR(255) NOT NULL,
        secret_access_key VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Database schema created');
    
    // Check if admin user already exists
    const checkUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@s3commando.com']
    );
    
    if (checkUser.rows.length > 0) {
      console.log('✅ Super admin user already exists');
      return;
    }
    
    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const result = await pool.query(
      `INSERT INTO users (
        id, email, name, role, tenant_id, permissions, email_verified, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING id`,
      [
        'super-admin-user-id',
        'admin@s3commando.com',
        'Super Admin',
        'super_admin',
        'super-admin-tenant',
        JSON.stringify(['super_admin', 'admin', 'read', 'write', 'delete']),
        true
      ]
    );
    
    // Create password record
    await pool.query(
      `INSERT INTO passwords (user_id, hashed_password, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())`,
      [result.rows[0].id, hashedPassword]
    );
    
    console.log('✅ Super admin user created:', result.rows[0].id);
    console.log('\n🎉 Database initialization complete!');
    console.log('\n📋 Super Admin credentials:');
    console.log('   Email: admin@s3commando.com');
    console.log('   Password: admin123');
    console.log('\n⚠️  Remember to change the super admin password in production!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase(); 