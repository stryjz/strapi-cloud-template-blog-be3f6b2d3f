import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

async function updateUsersToUUID() {
  try {
    console.log('🔄 Updating users table to use UUID...');
    
    // First, let's check the current structure
    const currentStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table structure:');
    currentStructure.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Check if we need to update
    const idColumn = currentStructure.rows.find(col => col.column_name === 'id');
    if (idColumn && idColumn.data_type === 'uuid') {
      console.log('✅ Users table already uses UUID for ID column');
      return;
    }

    console.log('⚠️  Converting users table ID column to UUID...');
    
    // This is a complex migration - we need to be careful with foreign keys
    // For now, let's create a backup and then update
    console.log('📋 Creating backup of current users...');
    
    const users = await pool.query('SELECT * FROM users');
    console.log(`Found ${users.rows.length} users to migrate`);

    // Create new UUIDs for existing users
    const updatedUsers = users.rows.map(user => ({
      ...user,
      new_id: crypto.randomUUID()
    }));

    // Update sessions table first (if it exists)
    try {
      await pool.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey');
      console.log('✅ Dropped sessions foreign key constraint');
    } catch (err) {
      console.log('ℹ️  Sessions table foreign key not found or already dropped');
    }

    // Update passwords table first (if it exists)
    try {
      await pool.query('ALTER TABLE passwords DROP CONSTRAINT IF EXISTS passwords_user_id_fkey');
      console.log('✅ Dropped passwords foreign key constraint');
    } catch (err) {
      console.log('ℹ️  Passwords table foreign key not found or already dropped');
    }

    // Update s3_config table first (if it exists)
    try {
      await pool.query('ALTER TABLE s3_config DROP CONSTRAINT IF EXISTS s3_config_user_id_fkey');
      console.log('✅ Dropped s3_config foreign key constraint');
    } catch (err) {
      console.log('ℹ️  s3_config table foreign key not found or already dropped');
    }

    // Create temporary table with UUID
    await pool.query(`
      CREATE TABLE users_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        tenant_id VARCHAR(255),
        permissions TEXT DEFAULT '[]',
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Created new users table with UUID');

    // Copy data with new UUIDs
    for (const user of updatedUsers) {
      await pool.query(`
        INSERT INTO users_new (id, email, name, role, tenant_id, permissions, email_verified, email_verification_token, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        user.new_id,
        user.email,
        user.name,
        user.role,
        user.tenant_id,
        user.permissions,
        user.email_verified,
        user.email_verification_token,
        user.created_at,
        user.updated_at
      ]);
    }
    console.log('✅ Copied user data with new UUIDs');

    // Update sessions table
    for (const user of updatedUsers) {
      await pool.query('UPDATE sessions SET user_id = $1 WHERE user_id = $2', [user.new_id, user.id]);
    }
    console.log('✅ Updated sessions table');

    // Update passwords table
    for (const user of updatedUsers) {
      await pool.query('UPDATE passwords SET user_id = $1 WHERE user_id = $2', [user.new_id, user.id]);
    }
    console.log('✅ Updated passwords table');

    // Update s3_config table
    for (const user of updatedUsers) {
      await pool.query('UPDATE s3_config SET user_id = $1 WHERE user_id = $2', [user.new_id, user.id]);
    }
    console.log('✅ Updated s3_config table');

    // Update user_id columns to UUID type
    await pool.query('ALTER TABLE sessions ALTER COLUMN user_id TYPE UUID USING user_id::uuid');
    await pool.query('ALTER TABLE passwords ALTER COLUMN user_id TYPE UUID USING user_id::uuid');
    await pool.query('ALTER TABLE s3_config ALTER COLUMN user_id TYPE UUID USING user_id::uuid');
    console.log('✅ Updated user_id columns to UUID type');

    // Drop old table and rename new one
    await pool.query('DROP TABLE users');
    await pool.query('ALTER TABLE users_new RENAME TO users');
    console.log('✅ Replaced old users table with new one');

    // Recreate foreign key constraints
    await pool.query('ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)');
    await pool.query('ALTER TABLE passwords ADD CONSTRAINT passwords_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)');
    await pool.query('ALTER TABLE s3_config ADD CONSTRAINT s3_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)');
    console.log('✅ Recreated foreign key constraints');

    console.log('🎉 Successfully migrated users table to UUID!');
    
  } catch (error) {
    console.error('❌ Error updating users table:', error);
  } finally {
    await pool.end();
  }
}

updateUsersToUUID(); 