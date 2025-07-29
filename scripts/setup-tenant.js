import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function setupTenant() {
  try {
    console.log('🏢 Setting up tenant with multiple users...');
    
    const tenantId = process.argv[2] || 'my-company-tenant';
    const adminEmail = process.argv[3] || 'admin@mycompany.com';
    const adminPassword = process.argv[4] || 'admin123';
    
    console.log(`📋 Tenant ID: ${tenantId}`);
    console.log(`👤 Admin Email: ${adminEmail}`);
    
    // Check if tenant admin already exists
    const checkUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (checkUser.rows.length > 0) {
      console.log('⚠️  Admin user already exists, skipping creation');
    } else {
      // Create tenant admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const result = await pool.query(
        `INSERT INTO users (
          id, email, name, role, tenant_id, permissions, email_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING id`,
        [
          crypto.randomUUID(),
          adminEmail,
          'Tenant Admin',
          'tenant_admin',
          tenantId,
          JSON.stringify(['tenant_admin', 'read', 'write', 'delete']),
          true
        ]
      );
      
      // Create password record
      await pool.query(
        `INSERT INTO passwords (user_id, hashed_password, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [result.rows[0].id, hashedPassword]
      );
      
      console.log('✅ Tenant admin created:', result.rows[0].id);
    }
    
    // Create sample users for the tenant
    const sampleUsers = [
      { name: 'John Doe', email: 'john@mycompany.com', password: 'user123' },
      { name: 'Jane Smith', email: 'jane@mycompany.com', password: 'user123' },
      { name: 'Bob Wilson', email: 'bob@mycompany.com', password: 'user123' },
    ];
    
    for (const user of sampleUsers) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existingUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        const userResult = await pool.query(
          `INSERT INTO users (
            id, email, name, role, tenant_id, permissions, email_verified, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
          ) RETURNING id`,
          [
            crypto.randomUUID(),
            user.email,
            user.name,
            'user',
            tenantId,
            JSON.stringify(['read', 'write']),
            true
          ]
        );
        
        // Create password record
        await pool.query(
          `INSERT INTO passwords (user_id, hashed_password, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [userResult.rows[0].id, hashedPassword]
        );
        
        console.log(`✅ User created: ${user.name} (${user.email})`);
      } else {
        console.log(`⚠️  User already exists: ${user.email}`);
      }
    }
    
    console.log('\n🎉 Tenant setup complete!');
    console.log('\n📋 Tenant Information:');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log('\n👥 Sample Users:');
    sampleUsers.forEach(user => {
      console.log(`   ${user.name}: ${user.email} / ${user.password}`);
    });
    console.log('\n📝 Next Steps:');
    console.log('   1. Log in as admin and configure S3 settings');
    console.log('   2. All users in the tenant will share the same S3 bucket');
    console.log('   3. Users can upload and manage files together');
    
  } catch (error) {
    console.error('❌ Tenant setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupTenant(); 