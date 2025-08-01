import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Resend } from 'resend';
import Stripe from 'stripe';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));

// Body parsing middleware with increased limits for file uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Request logging middleware (after body parsing)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.path.startsWith('/auth/')) {
    console.log(`🔐 Auth request body:`, req.body);
  }
  next();
});

// Authentication middleware
const requireAuth = async (req, res, next) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId) {
      return res.status(401).json({ error: 'No session token' });
    }

    const sessionResult = await pool.query(
      'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = $1 AND s.expires_at > NOW()',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = sessionResult.rows[0];

    // Check trial expiration for non-admin users
    if (req.user.role !== 'super_admin' && req.user.tenant_id) {
      const trialResult = await pool.query(`
        SELECT trial_end_date, is_trial 
        FROM tenant_limits 
        WHERE tenant_id = $1 AND is_trial = TRUE
      `, [req.user.tenant_id]);

      if (trialResult.rows.length > 0) {
        const trial = trialResult.rows[0];
        const now = new Date();
        const trialEndDate = new Date(trial.trial_end_date);

        if (now > trialEndDate) {
          return res.status(403).json({ 
            error: 'Trial expired', 
            message: 'Your trial period has expired. Please upgrade to continue using the service.',
            trialExpired: true
          });
        }
      }
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Auth routes
app.post('/auth/sign-up', async (req, res) => {
  try {
    const { email, password, name, tenantName } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate unique tenant ID for new user
    const tenantId = `tenant-${crypto.randomUUID()}`;
    
    // Create user with email verification token and unique tenant
    const verificationToken = crypto.randomUUID();
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
        false,
        verificationToken
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
    
    // Use provided tenant name or generate a default one
    const finalTenantName = tenantName || `${name}'s Workspace`;
    
    await pool.query(`
      INSERT INTO tenant_limits (tenant_id, tenant_name, max_users, max_storage_gb, max_files, trial_start_date, trial_end_date, is_trial)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id) DO UPDATE SET
        tenant_name = EXCLUDED.tenant_name,
        max_users = EXCLUDED.max_users,
        max_storage_gb = EXCLUDED.max_storage_gb,
        max_files = EXCLUDED.max_files,
        trial_start_date = EXCLUDED.trial_start_date,
        trial_end_date = EXCLUDED.trial_end_date,
        is_trial = EXCLUDED.is_trial,
        updated_at = NOW()
    `, [tenantId, finalTenantName, 1, 1, 10, trialStartDate, trialEndDate, true]);

    // Add to trial_tenants table
    await pool.query(`
      INSERT INTO trial_tenants (tenant_id, tenant_name, trial_start_date, trial_end_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id) DO UPDATE SET
        tenant_name = EXCLUDED.tenant_name,
        trial_start_date = EXCLUDED.trial_start_date,
        trial_end_date = EXCLUDED.trial_end_date,
        updated_at = NOW()
    `, [tenantId, finalTenantName, trialStartDate, trialEndDate]);

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}`;
      
      await resend.emails.send({
        from: 'S3 Commando <noreply@itlabs-ai.com>',
        to: [email],
        subject: 'Verify your email address - S3 Commando',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to S3 Commando!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The S3 Commando Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail the registration if email fails
    }
    
    console.log(`✅ Email sending attempt completed for: ${email}`);

    res.json({ 
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: { ...userResult.rows[0], email_verified: false }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`🔐 Sign-in attempt for email: ${email}`);
    
    // Get user and password
    const userResult = await pool.query(
      'SELECT u.*, p.hashed_password FROM users u JOIN passwords p ON u.id = p.user_id WHERE u.email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    console.log(`✅ User found: ${user.email}, role: ${user.role}, verified: ${user.email_verified}`);
    
    const isValidPassword = await bcrypt.compare(password, user.hashed_password);
    console.log(`🔑 Password validation: ${isValidPassword ? '✅ Valid' : '❌ Invalid'}`);

    if (!isValidPassword) {
      console.log(`❌ Invalid password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      console.log(`❌ Email not verified for user: ${email}`);
      return res.status(401).json({ error: 'Please verify your email address before signing in' });
    }

    // Create session
    const sessionId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionId, user.id, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    // Remove hashed_password from response
    delete user.hashed_password;

    console.log(`🎉 Successful login for user: ${email}, session created: ${sessionId}`);

    res.json({ 
      user, 
      session: { id: sessionId, userId: user.id }
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Email verification endpoint
app.get('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this verification token
    const userResult = await pool.query(
      'SELECT id, email, name, email_verified FROM users WHERE email_verification_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Verify the email
    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ 
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Resend verification email endpoint
app.post('/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, name, email_verified, email_verification_token FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomUUID();
    await pool.query(
      'UPDATE users SET email_verification_token = $1 WHERE id = $2',
      [verificationToken, user.id]
    );

    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}`;
      
      await resend.emails.send({
        from: 'S3 Commando <noreply@itlabs-ai.com>',
        to: [email],
        subject: 'Verify your email address - S3 Commando',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email address</h2>
            <p>Hi ${user.name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The S3 Commando Team</p>
          </div>
        `
      });

      res.json({ 
        success: true,
        message: 'Verification email sent successfully!'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/sign-out', requireAuth, async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/auth/session', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionId) {
      return res.status(401).json({ error: 'No session token' });
    }

    const sessionResult = await pool.query(
      'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = $1 AND s.expires_at > NOW()',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = sessionResult.rows[0];
    delete user.hashed_password;

    res.json({ 
      user, 
      session: { id: sessionId, userId: user.id }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(400).json({ error: error.message });
  }
});

// S3 Configuration routes
app.post('/api/s3/config', requireAuth, async (req, res) => {
  try {
    const { bucketName, region, accessKeyId, secretAccessKey } = req.body;
    
    // Store S3 configuration at tenant level instead of user level
    await pool.query(`
      INSERT INTO s3_config (user_id, bucket_name, region, access_key_id, secret_access_key, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        bucket_name = EXCLUDED.bucket_name,
        region = EXCLUDED.region,
        access_key_id = EXCLUDED.access_key_id,
        secret_access_key = EXCLUDED.secret_access_key,
        updated_at = NOW()
    `, [req.user.id, bucketName, region, accessKeyId, secretAccessKey]);
    
    res.json({ success: true, message: 'S3 configuration saved successfully' });
  } catch (error) {
    console.error('Save S3 config error:', error);
    res.status(500).json({ error: 'Failed to save S3 configuration' });
  }
});

app.get('/api/s3/config', requireAuth, async (req, res) => {
  try {
    // First try to get tenant-level S3 config
    const tenantResult = await pool.query(`
      SELECT s3.bucket_name, s3.region, s3.access_key_id, s3.secret_access_key 
      FROM s3_config s3
      JOIN users u ON s3.user_id = u.id
      WHERE u.tenant_id = $1
      LIMIT 1
    `, [req.user.tenant_id]);
    
    if (tenantResult.rows.length > 0) {
      res.json(tenantResult.rows[0]);
    } else {
      // Fallback to user-specific config
      const result = await pool.query(
        'SELECT bucket_name, region, access_key_id, secret_access_key FROM s3_config WHERE user_id = $1',
        [req.user.id]
      );
      
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.json({ bucketName: '', region: 'us-east-1', accessKeyId: '', secretAccessKey: '' });
      }
    }
  } catch (error) {
    console.error('Get S3 config error:', error);
    res.status(500).json({ error: 'Failed to get S3 configuration' });
  }
});

app.post('/api/s3/test', requireAuth, async (req, res) => {
  try {
    const { bucketName, region, accessKeyId, secretAccessKey } = req.body;
    
    // Create S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    
    // Test connection by listing buckets
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    // Check if the specified bucket exists
    const bucketExists = response.Buckets?.some(bucket => bucket.Name === bucketName);
    
    if (bucketExists) {
      res.json({ success: true, message: 'Successfully connected to S3 bucket' });
    } else {
      res.status(400).json({ error: 'Bucket not found or access denied' });
    }
  } catch (error) {
    console.error('S3 test connection error:', error);
    res.status(500).json({ error: 'Failed to connect to S3. Please check your credentials.' });
  }
});

// File upload endpoints
app.post('/api/upload', requireAuth, async (req, res) => {
  try {
    // Check trial limits for non-admin users
    if (req.user.role !== 'super_admin' && req.user.tenant_id) {
      const trialResult = await pool.query(`
        SELECT max_files, is_trial 
        FROM tenant_limits 
        WHERE tenant_id = $1
      `, [req.user.tenant_id]);

      if (trialResult.rows.length > 0) {
        const limits = trialResult.rows[0];
        
        // Check file count limit for trial tenants
        if (limits.is_trial) {
          const fileCountResult = await pool.query(`
            SELECT COUNT(*) as file_count
            FROM s3_objects 
            WHERE tenant_id = $1
          `, [req.user.tenant_id]);
          
          const currentFileCount = parseInt(fileCountResult.rows[0]?.file_count || 0);
          
          if (currentFileCount >= limits.max_files) {
            return res.status(403).json({ 
              error: 'File limit exceeded', 
              message: `Trial accounts are limited to ${limits.max_files} files. Please upgrade to upload more files.`,
              trialLimit: true
            });
          }
        }
      }
    }

    // Check file size (base64 encoded data is ~33% larger than original)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    const requestBodySize = JSON.stringify(req.body).length;
    
    if (requestBodySize > maxFileSize) {
      return res.status(413).json({ 
        error: 'File too large', 
        message: 'The uploaded file exceeds the maximum allowed size of 500MB' 
      });
    }
    
    // Get tenant's S3 configuration (fallback to user-specific)
    const result = await pool.query(`
      SELECT s3.bucket_name, s3.region, s3.access_key_id, s3.secret_access_key 
      FROM s3_config s3
      JOIN users u ON s3.user_id = u.id
      WHERE u.tenant_id = $1
      LIMIT 1
    `, [req.user.tenant_id]);
    
    let s3Config;
    if (result.rows.length > 0) {
      s3Config = result.rows[0];
    } else {
      // Fallback to user-specific config
      const userResult = await pool.query(
        'SELECT bucket_name, region, access_key_id, secret_access_key FROM s3_config WHERE user_id = $1',
        [req.user.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'S3 configuration not found. Please configure your S3 settings first.' });
      }
      s3Config = userResult.rows[0];
    }
    
    // Create S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key,
      },
    });
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomString}-${req.body.fileName}`;
    
    // Upload file to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: s3Config.bucket_name,
      Key: fileName,
      Body: Buffer.from(req.body.fileData, 'base64'),
      ContentType: req.body.contentType,
      Metadata: {
        originalName: req.body.fileName,
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString(),
      }
    });
    
    await s3Client.send(uploadCommand);
    
    // Track the uploaded file in s3_objects table
    const fileSize = Buffer.from(req.body.fileData, 'base64').length;
    await pool.query(`
      INSERT INTO s3_objects (tenant_id, object_key, original_name, file_size, content_type, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.user.tenant_id, fileName, req.body.fileName, fileSize, req.body.contentType, req.user.id]);
    
    res.json({ 
      success: true, 
      fileName: fileName,
      originalName: req.body.fileName,
      url: `https://${s3Config.bucket_name}.s3.${s3Config.region}.amazonaws.com/${fileName}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file to S3' });
  }
});

app.get('/api/files', requireAuth, async (req, res) => {
  try {
    // Get tenant's S3 configuration (fallback to user-specific)
    const result = await pool.query(`
      SELECT s3.bucket_name, s3.region, s3.access_key_id, s3.secret_access_key 
      FROM s3_config s3
      JOIN users u ON s3.user_id = u.id
      WHERE u.tenant_id = $1
      LIMIT 1
    `, [req.user.tenant_id]);
    
    let s3Config;
    if (result.rows.length > 0) {
      s3Config = result.rows[0];
    } else {
      // Fallback to user-specific config
      const userResult = await pool.query(
        'SELECT bucket_name, region, access_key_id, secret_access_key FROM s3_config WHERE user_id = $1',
        [req.user.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.json({ files: [] });
      }
      s3Config = userResult.rows[0];
    }
    
    // Create S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key,
      },
    });
    
    // List objects in bucket (this is a simplified version - in production you'd want pagination)
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const listCommand = new ListObjectsV2Command({
      Bucket: s3Config.bucket_name,
      MaxKeys: 1000
    });
    
    const response = await s3Client.send(listCommand);
    
    const files = response.Contents?.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${s3Config.bucket_name}.s3.${s3Config.region}.amazonaws.com/${obj.Key}`
    })) || [];
    
    res.json({ files });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Delete file endpoint
app.delete('/api/files/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Get tenant's S3 configuration (fallback to user-specific)
    const result = await pool.query(`
      SELECT s3.bucket_name, s3.region, s3.access_key_id, s3.secret_access_key 
      FROM s3_config s3
      JOIN users u ON s3.user_id = u.id
      WHERE u.tenant_id = $1
      LIMIT 1
    `, [req.user.tenant_id]);
    
    let s3Config;
    if (result.rows.length > 0) {
      s3Config = result.rows[0];
    } else {
      // Fallback to user-specific config
      const userResult = await pool.query(
        'SELECT bucket_name, region, access_key_id, secret_access_key FROM s3_config WHERE user_id = $1',
        [req.user.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(400).json({ error: 'S3 configuration not found' });
      }
      s3Config = userResult.rows[0];
    }
    
    // Create S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.access_key_id,
        secretAccessKey: s3Config.secret_access_key,
      },
    });
    
    // Delete object from S3
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: s3Config.bucket_name,
      Key: decodeURIComponent(key),
    });
    
    await s3Client.send(deleteCommand);
    
    // Remove the file record from s3_objects table
    await pool.query(`
      DELETE FROM s3_objects 
      WHERE tenant_id = $1 AND object_key = $2
    `, [req.user.tenant_id, decodeURIComponent(key)]);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected route example
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ 
    message: 'This is a protected route',
    user: req.user 
  });
});

// Admin routes - Super Admin can access all tenants, Tenant Admin can only access their tenant
app.get('/api/admin', requireAuth, (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ 
    message: 'Admin access granted',
    user: req.user,
    adminType: req.user.role
  });
});

app.get('/api/admin/users', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    let result;
    if (req.user.role === 'super_admin') {
      // Super admin can see all users
      result = await pool.query('SELECT COUNT(*) as count FROM users');
    } else {
      // Tenant admin can only see users in their tenant
      result = await pool.query('SELECT COUNT(*) as count FROM users WHERE tenant_id = $1', [req.user.tenant_id]);
    }
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get users count error:', error);
    res.status(500).json({ error: 'Failed to get users count' });
  }
});

// Get users list - filtered by admin type
app.get('/api/admin/users/list', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    let result;
    if (req.user.role === 'super_admin') {
      // Super admin can see all users
      result = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.email_verified, u.created_at
        FROM users u
        ORDER BY u.created_at DESC
      `);
    } else {
      // Tenant admin can only see users in their tenant
      result = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, u.tenant_id, u.email_verified, u.created_at
        FROM users u
        WHERE u.tenant_id = $1
        ORDER BY u.created_at DESC
      `, [req.user.tenant_id]);
    }
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({ error: 'Failed to get users list' });
  }
});

// Create new user - with role restrictions
app.post('/api/admin/users', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { name, email, password, role, tenantId } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Role restrictions
    if (req.user.role === 'tenant_admin') {
      // Tenant admin can only create 'user' roles in their own tenant
      if (role && role !== 'user') {
        return res.status(403).json({ error: 'Tenant admins can only create regular users' });
      }
      if (tenantId && tenantId !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Tenant admins can only create users in their own tenant' });
      }
    }
    
    // Super admin restrictions
    if (req.user.role === 'super_admin' && role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot create super admin users via API' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Determine tenant ID
    let finalTenantId;
    if (req.user.role === 'super_admin') {
      finalTenantId = tenantId || req.user.tenant_id;
    } else {
      finalTenantId = req.user.tenant_id; // Tenant admin can only create in their tenant
    }
    
    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, name, role, tenant_id, permissions, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        crypto.randomUUID(),
        email,
        name,
        role || 'user',
        finalTenantId,
        role === 'tenant_admin' ? JSON.stringify(['tenant_admin', 'read', 'write', 'delete']) : JSON.stringify(['read', 'write']),
        true
      ]
    );

    // Create password record
    await pool.query(
      'INSERT INTO passwords (user_id, hashed_password) VALUES ($1, $2)',
      [userResult.rows[0].id, hashedPassword]
    );

    res.json({ 
      success: true, 
      user: userResult.rows[0],
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user - with role restrictions
app.put('/api/admin/users/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { id } = req.params;
    const { name, email, role, tenantId } = req.body;
    
    // Check if user exists and get their details
    const existingUser = await pool.query('SELECT id, tenant_id, role FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = existingUser.rows[0];
    
    // Tenant admin restrictions
    if (req.user.role === 'tenant_admin') {
      if (targetUser.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Can only modify users in your own tenant' });
      }
      if (role && role !== 'user') {
        return res.status(403).json({ error: 'Tenant admins can only assign user roles' });
      }
    }
    
    // Super admin restrictions
    if (req.user.role === 'super_admin' && role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify super admin users via API' });
    }
    
    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
    }
    
    // Update user
    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           role = COALESCE($3, role),
           tenant_id = COALESCE($4, tenant_id),
           updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [name, email, role, tenantId, id]
    );

    res.json({ 
      success: true, 
      user: result.rows[0],
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user - with role restrictions
app.delete('/api/admin/users/:id', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists and get their details
    const existingUser = await pool.query('SELECT id, tenant_id, role FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const targetUser = existingUser.rows[0];
    
    // Tenant admin restrictions
    if (req.user.role === 'tenant_admin') {
      if (targetUser.tenant_id !== req.user.tenant_id) {
        return res.status(403).json({ error: 'Can only delete users in your own tenant' });
      }
      if (targetUser.role === 'super_admin' || targetUser.role === 'tenant_admin') {
        return res.status(403).json({ error: 'Cannot delete admin users' });
      }
    }
    
    // Super admin restrictions
    if (req.user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin users' });
    }
    
    // Delete user's sessions
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [id]);
    
    // Delete user's password
    await pool.query('DELETE FROM passwords WHERE user_id = $1', [id]);
    
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get tenants list (super admin only)
app.get('/api/admin/tenants', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  try {
    const result = await pool.query(`
      SELECT tenant_id, COUNT(*) as user_count, 
             MIN(created_at) as created_at,
             MAX(CASE WHEN role IN ('tenant_admin', 'admin') THEN 1 ELSE 0 END) as has_admin
      FROM users 
      WHERE tenant_id IS NOT NULL
      GROUP BY tenant_id
      ORDER BY created_at DESC
    `);
    res.json({ tenants: result.rows });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: 'Failed to get tenants list' });
  }
});

// Create new tenant (super admin only)
app.post('/api/admin/tenants', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  try {
    const { tenantId, adminName, adminEmail, adminPassword } = req.body;
    
    // Validate required fields
    if (!tenantId || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Tenant ID, admin name, email, and password are required' });
    }
    
    // Validate tenant ID format (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(tenantId)) {
      return res.status(400).json({ error: 'Tenant ID can only contain letters, numbers, and hyphens' });
    }
    
    // Check if tenant already exists
    const existingTenant = await pool.query('SELECT tenant_id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    if (existingTenant.rows.length > 0) {
      return res.status(400).json({ error: 'Tenant with this ID already exists' });
    }
    
    // Check if admin email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Admin user with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Create tenant admin user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, name, role, tenant_id, permissions, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        crypto.randomUUID(),
        adminEmail,
        adminName,
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

    res.json({ 
      success: true, 
      tenant: {
        tenant_id: tenantId,
        admin: userResult.rows[0],
        message: 'Tenant created successfully'
      }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Invite user to tenant (tenant admin and super admin only)
app.post('/api/admin/invite', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'tenant_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { email, name, role = 'user' } = req.body;
    
    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    
    // Validate role
    if (role !== 'user' && role !== 'tenant_admin') {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "tenant_admin"' });
    }
    
    // Tenant admin restrictions
    if (req.user.role === 'tenant_admin') {
      if (role === 'tenant_admin') {
        return res.status(403).json({ error: 'Tenant admins can only invite regular users' });
      }
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id, tenant_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Determine tenant ID
    const tenantId = req.user.tenant_id;
    
    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    
    // Create user in the inviting admin's tenant
    const userResult = await pool.query(
      `INSERT INTO users (id, email, name, role, tenant_id, permissions, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        crypto.randomUUID(),
        email,
        name,
        role,
        tenantId,
        JSON.stringify([role, 'read', 'write', 'delete']),
        true // Auto-verify invited users
      ]
    );

    // Create password record
    await pool.query(
      'INSERT INTO passwords (user_id, hashed_password) VALUES ($1, $2)',
      [userResult.rows[0].id, hashedPassword]
    );

    // Send invitation email
    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth`;
      
      await resend.emails.send({
        from: 'S3 Commando <noreply@itlabs-ai.com>',
        to: [email],
        subject: `You've been invited to join ${req.user.name || 'our team'} - S3 Commando`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">You've been invited!</h2>
            <p>Hi ${name},</p>
            <p>You've been invited by ${req.user.name || 'an administrator'} to join their team on S3 Commando.</p>
            <p>Your temporary login credentials:</p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        display: inline-block;">
                Login to S3 Commando
              </a>
            </div>
            <p><strong>Important:</strong> Please change your password after your first login for security.</p>
            <p>Best regards,<br>The S3 Commando Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the invitation if email fails
    }

    res.json({ 
      success: true,
      user: { ...userResult.rows[0], email_verified: true },
      tempPassword,
      message: 'User invited successfully'
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Verify user endpoint (super admin only)
app.post('/api/admin/users/:userId/verify', requireAuth, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, name, email_verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    // Verify the user
    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL WHERE id = $1',
      [userId]
    );

    res.json({ 
      success: true,
      message: 'User verified successfully',
      user: { ...user, email_verified: true }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// ===== STRIPE PAYMENT ENDPOINTS =====

// Create payment intent
app.post('/payments/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { amount, currency, description, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    console.log(`💳 Creating payment intent for user: ${req.user.email} (${req.user.id})`);
    console.log(`💳 Amount: $${amount}, Currency: ${currency || 'usd'}`);
    console.log(`💳 Description: ${description}`);
    console.log(`💳 Metadata:`, metadata);

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency || 'usd',
      description: description,
      metadata: {
        user_id: req.user.id,
        user_email: req.user.email,
        tenant_id: req.user.tenant_id,
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);
    console.log(`💳 Client secret: ${paymentIntent.client_secret?.substring(0, 20)}...`);

    res.json({
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
app.post('/payments/confirm-payment', requireAuth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }

    console.log(`💰 Processing payment confirmation for intent: ${paymentIntentId}`);
    console.log(`👤 User: ${req.user.email} (${req.user.id})`);
    console.log(`🏢 Tenant: ${req.user.tenant_id}`);

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`💳 Payment intent status: ${paymentIntent.status}`);
    console.log(`💳 Payment amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
    console.log(`💳 Payment metadata:`, paymentIntent.metadata);

    if (paymentIntent.status === 'succeeded') {
      // Payment was successful, update tenant limits based on metadata
      const metadata = paymentIntent.metadata;
      const tenantId = metadata.tenant_id;
      const purchaseType = metadata.purchase_type;
      const additionalUsers = parseInt(metadata.additional_users) || 0;
      const storageGB = parseInt(metadata.storage_gb) || 0;

      console.log(`📊 Payment details: ${additionalUsers} users, ${storageGB}GB storage, type: ${purchaseType}`);

      if (tenantId && (additionalUsers > 0 || storageGB > 0)) {
        // Get current tenant limits first
        const currentLimitsResult = await pool.query(
          'SELECT max_users, max_storage_gb, max_files, is_trial FROM tenant_limits WHERE tenant_id = $1',
          [tenantId]
        );
        
        let currentUsers = 0;
        let currentStorageGB = 10;
        let currentFiles = 1000;
        let isCurrentlyTrial = true;
        
        if (currentLimitsResult.rows.length > 0) {
          const current = currentLimitsResult.rows[0];
          currentUsers = current.max_users || 0;
          currentStorageGB = current.max_storage_gb || 10;
          currentFiles = current.max_files || 1000;
          isCurrentlyTrial = current.is_trial || false;
          console.log(`📊 Current limits: ${currentUsers} users, ${currentStorageGB}GB storage, ${currentFiles} files, trial: ${isCurrentlyTrial}`);
        } else {
          console.log(`📊 No existing limits found for tenant ${tenantId}, using defaults`);
        }
        
        // Store the purchase record
        console.log(`💾 Storing purchase record...`);
        await pool.query(
          `INSERT INTO purchases (id, tenant_id, user_id, payment_intent_id, purchase_type, quantity, amount, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            crypto.randomUUID(),
            tenantId,
            req.user.id,
            paymentIntentId,
            purchaseType,
            purchaseType === 'users' ? additionalUsers : storageGB,
            paymentIntent.amount,
          ]
        );
        console.log(`✅ Purchase record stored`);

        // Calculate new limits (ADD to existing, don't replace)
        const newUsers = currentUsers + additionalUsers;
        const newStorageGB = currentStorageGB + storageGB;
        const newFiles = Math.max(currentFiles, 1000); // At least 1000 files for paid users
        
        console.log(`📊 New limits will be: ${newUsers} users (+${additionalUsers}), ${newStorageGB}GB storage (+${storageGB}), ${newFiles} files`);

        // Update tenant limits and remove trial status
        const result = await pool.query(
          `INSERT INTO tenant_limits (tenant_id, max_users, max_storage_gb, max_files, is_trial) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (tenant_id) 
           DO UPDATE SET 
             max_users = $2, 
             max_storage_gb = $3,
             max_files = $4,
             is_trial = FALSE,
             updated_at = NOW()
           RETURNING max_users, max_storage_gb, max_files`,
          [tenantId, newUsers, newStorageGB, newFiles, false]
        );
        
        console.log(`✅ Tenant limits updated successfully`);
        console.log(`📊 Final limits: ${result.rows[0]?.max_users} users, ${result.rows[0]?.max_storage_gb}GB storage, ${result.rows[0]?.max_files} files`);

        // Remove tenant from trial_tenants table since they've purchased licenses
        await pool.query(
          'DELETE FROM trial_tenants WHERE tenant_id = $1',
          [tenantId]
        );
        console.log(`✅ Removed tenant ${tenantId} from trial_tenants table`);
        
        console.log(`🎉 Payment processing completed successfully for tenant ${tenantId}`);
      } else {
        console.log(`⚠️ No valid purchase data found in payment metadata`);
      }
      
      res.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
        updatedLimits: {
          additionalUsers,
          storageGB,
          purchaseType
        }
      });
    } else {
      res.status(400).json({ 
        error: 'Payment not completed',
        status: paymentIntent.status 
      });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Get payment history
app.get('/payments/history', requireAuth, async (req, res) => {
  try {
    console.log(`📊 Fetching payment history for user: ${req.user.email} (${req.user.id})`);
    console.log(`🏢 Tenant: ${req.user.tenant_id}`);

    // Get payments for the current user/tenant
    const payments = await stripe.paymentIntents.list({
      limit: 50,
      metadata: {
        user_id: req.user.id,
      },
    });

    console.log(`📊 Found ${payments.data.length} payment intents from Stripe`);

    const paymentHistory = payments.data.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      created: payment.created,
      description: payment.description,
      metadata: payment.metadata,
    }));

    // Also get purchase records from database
    const purchaseRecords = await pool.query(
      'SELECT * FROM purchases WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.tenant_id]
    );

    console.log(`📊 Found ${purchaseRecords.rows.length} purchase records from database`);

    res.json({
      stripePayments: paymentHistory,
      databasePurchases: purchaseRecords.rows,
      summary: {
        totalStripePayments: paymentHistory.length,
        totalDatabasePurchases: purchaseRecords.rows.length,
        successfulPayments: paymentHistory.filter(p => p.status === 'succeeded').length
      }
    });
  } catch (error) {
    console.error('❌ Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// Get trial status
app.get('/api/trial/status', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant ID found for user' });
    }

    const trialResult = await pool.query(`
      SELECT 
        is_trial,
        trial_start_date,
        trial_end_date,
        max_users,
        max_files,
        max_storage_gb
      FROM tenant_limits 
      WHERE tenant_id = $1
    `, [tenantId]);

    if (trialResult.rows.length === 0) {
      return res.json({
        isTrial: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemaining: null,
        maxUsers: 10,
        maxFiles: 1000,
        maxStorageGB: 100
      });
    }

    const trial = trialResult.rows[0];
    const now = new Date();
    const trialEndDate = new Date(trial.trial_end_date);
    const daysRemaining = trial.is_trial ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;

    res.json({
      isTrial: trial.is_trial,
      trialStartDate: trial.trial_start_date,
      trialEndDate: trial.trial_end_date,
      daysRemaining,
      maxUsers: trial.max_users,
      maxFiles: trial.max_files,
      maxStorageGB: trial.max_storage_gb
    });
  } catch (error) {
    console.error('Get trial status error:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
});

// Get tenant usage information
app.get('/api/tenant/usage', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'No tenant ID found for user' });
    }

    console.log(`📊 Fetching usage data for tenant: ${tenantId}`);
    console.log(`👤 Requested by user: ${req.user.email} (${req.user.id})`);

    // Get user count for this tenant
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as user_count FROM users WHERE tenant_id = $1',
      [tenantId]
    );

    // Get file count and storage from s3_objects table
    let fileCount = 0;
    let totalStorageBytes = 0;
    
    try {
      const fileStatsResult = await pool.query(`
        SELECT COUNT(*) as file_count, COALESCE(SUM(file_size), 0) as total_size
        FROM s3_objects 
        WHERE tenant_id = $1
      `, [tenantId]);
      
      if (fileStatsResult.rows.length > 0) {
        fileCount = parseInt(fileStatsResult.rows[0].file_count);
        totalStorageBytes = parseInt(fileStatsResult.rows[0].total_size);
      }
      
      console.log(`📊 File stats for tenant ${tenantId}: ${fileCount} files, ${totalStorageBytes} bytes`);
    } catch (err) {
      console.log('File stats calculation failed, using default values:', err.message);
    }

    // Get tenant limits from tenant_limits table
    const currentUsers = parseInt(userCountResult.rows[0].user_count);
    
    let maxUsers = 10; // Default limit
    let maxStorageGB = 100; // Default limit
    let maxFiles = 1000; // Default limit
    let isTrial = false;
    let trialEndDate = null;
    let tenantName = `${req.user.name}'s Workspace`; // Default tenant name
    
    try {
      const limitsResult = await pool.query(
        'SELECT tenant_name, max_users, max_storage_gb, max_files, is_trial, trial_end_date FROM tenant_limits WHERE tenant_id = $1',
        [tenantId]
      );
      
      if (limitsResult.rows.length > 0) {
        tenantName = limitsResult.rows[0].tenant_name;
        maxUsers = limitsResult.rows[0].max_users;
        maxStorageGB = limitsResult.rows[0].max_storage_gb;
        maxFiles = limitsResult.rows[0].max_files;
        isTrial = limitsResult.rows[0].is_trial;
        trialEndDate = limitsResult.rows[0].trial_end_date;
        console.log(`📊 Tenant ${tenantId} (${tenantName}) limits: ${currentUsers}/${maxUsers} users, ${maxStorageGB}GB storage, ${maxFiles} files, trial: ${isTrial}`);
      } else {
        console.log(`📊 Tenant ${tenantId} not found in limits table, using defaults`);
      }
    } catch (err) {
      console.log('Tenant limits table not available, using defaults');
    }
    
    const currentStorageGB = totalStorageBytes / (1024 * 1024 * 1024); // Convert bytes to GB

    const response = {
      tenant_id: tenantId,
      tenant_name: tenantName,
      current_users: currentUsers,
      max_users: maxUsers,
      current_storage_gb: currentStorageGB,
      max_storage_gb: maxStorageGB,
      current_files: fileCount,
      max_files: maxFiles,
      is_trial: isTrial,
      trial_end_date: trialEndDate,
      status: isTrial ? 'trial' : 'active'
    };

    console.log(`📊 Usage response for tenant ${tenantId}:`, response);
    res.json(response);
  } catch (error) {
    console.error('❌ Get tenant usage error:', error);
    res.status(500).json({ error: 'Failed to get tenant usage' });
  }
});

// ===== STRIPE SUBSCRIPTION ENDPOINTS =====

// Create subscription
app.post('/subscriptions/create', requireAuth, async (req, res) => {
  try {
    const { priceId, metadata } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: req.user.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          user_id: req.user.id,
          tenant_id: req.user.tenant_id,
        },
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      metadata: {
        user_id: req.user.id,
        tenant_id: req.user.tenant_id,
        ...metadata,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Get subscription status
app.get('/subscriptions/status', requireAuth, async (req, res) => {
  try {
    // Get customer's subscriptions
    const customers = await stripe.customers.list({
      email: req.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.json({ subscriptions: [] });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'all',
    });

    res.json({
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        metadata: sub.metadata,
      })),
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Cancel subscription
app.post('/subscriptions/cancel', requireAuth, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ===== STRIPE WEBHOOK ENDPOINT =====

// Webhook endpoint to handle Stripe events
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Webhook event handlers
async function handleSubscriptionCreated(subscription) {
  console.log('🔄 Handling subscription created:', subscription.id);
  console.log(`📊 Subscription status: ${subscription.status}`);
  console.log(`📊 Subscription metadata:`, subscription.metadata);
  
  const metadata = subscription.metadata;
  const tenantId = metadata.tenant_id;
  
  if (tenantId) {
    // Update tenant limits based on subscription
    const additionalUsers = parseInt(metadata.additional_users) || 0;
    const storageGB = parseInt(metadata.storage_gb) || 0;
    
    console.log(`📊 Subscription details: ${additionalUsers} users, ${storageGB}GB storage for tenant ${tenantId}`);
    
    await updateTenantLimits(tenantId, additionalUsers, storageGB, false);
    console.log(`✅ Updated tenant ${tenantId} limits for new subscription`);
  } else {
    console.log(`⚠️ No tenant_id found in subscription metadata`);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Handling subscription updated:', subscription.id);
  
  const metadata = subscription.metadata;
  const tenantId = metadata.tenant_id;
  
  if (tenantId) {
    if (subscription.status === 'active') {
      // Subscription is active, ensure tenant has proper limits
      const additionalUsers = parseInt(metadata.additional_users) || 0;
      const storageGB = parseInt(metadata.storage_gb) || 0;
      
      await updateTenantLimits(tenantId, additionalUsers, storageGB, false);
      console.log(`✅ Updated tenant ${tenantId} limits for active subscription`);
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      // Subscription is canceled or unpaid, revert to trial limits
      await updateTenantLimits(tenantId, 5, 10, true);
      console.log(`⚠️ Reverted tenant ${tenantId} to trial limits due to subscription status: ${subscription.status}`);
    }
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🔄 Handling subscription deleted:', subscription.id);
  
  const metadata = subscription.metadata;
  const tenantId = metadata.tenant_id;
  
  if (tenantId) {
    // Revert to trial limits when subscription is deleted
    await updateTenantLimits(tenantId, 5, 10, true);
    console.log(`⚠️ Reverted tenant ${tenantId} to trial limits due to subscription deletion`);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  console.log('🔄 Handling invoice payment succeeded:', invoice.id);
  console.log(`💳 Invoice amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
  console.log(`💳 Invoice status: ${invoice.status}`);
  
  if (invoice.subscription) {
    console.log(`📊 Processing subscription invoice: ${invoice.subscription}`);
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const metadata = subscription.metadata;
    const tenantId = metadata.tenant_id;
    
    console.log(`📊 Subscription metadata:`, metadata);
    
    if (tenantId) {
      // Payment succeeded, ensure tenant has proper limits
      const additionalUsers = parseInt(metadata.additional_users) || 0;
      const storageGB = parseInt(metadata.storage_gb) || 0;
      
      console.log(`📊 Invoice payment details: ${additionalUsers} users, ${storageGB}GB storage for tenant ${tenantId}`);
      
      await updateTenantLimits(tenantId, additionalUsers, storageGB, false);
      console.log(`✅ Updated tenant ${tenantId} limits after successful payment`);
      
      // Store the payment record
      console.log(`💾 Storing subscription payment record...`);
      await pool.query(
        `INSERT INTO purchases (id, tenant_id, user_id, payment_intent_id, purchase_type, quantity, amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          crypto.randomUUID(),
          tenantId,
          metadata.user_id || 'unknown',
          invoice.payment_intent,
          metadata.purchase_type || 'subscription',
          metadata.purchase_type === 'users' ? additionalUsers : storageGB,
          invoice.amount_paid,
        ]
      );
      console.log(`✅ Subscription payment record stored`);
    } else {
      console.log(`⚠️ No tenant_id found in subscription metadata`);
    }
  } else {
    console.log(`⚠️ Invoice has no associated subscription`);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('🔄 Handling invoice payment failed:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const metadata = subscription.metadata;
    const tenantId = metadata.tenant_id;
    
    if (tenantId) {
      // Payment failed, revert to trial limits
      await updateTenantLimits(tenantId, 5, 10, true);
      console.log(`⚠️ Reverted tenant ${tenantId} to trial limits due to payment failure`);
    }
  }
}

// Helper function to update tenant limits
async function updateTenantLimits(tenantId, additionalUsers, storageGB, isTrial) {
  try {
    console.log(`🔄 Updating tenant limits for ${tenantId}: +${additionalUsers} users, +${storageGB}GB storage, trial: ${isTrial}`);
    
    // Get current limits first
    const currentLimitsResult = await pool.query(
      'SELECT max_users, max_storage_gb, max_files FROM tenant_limits WHERE tenant_id = $1',
      [tenantId]
    );
    
    let currentUsers = 0;
    let currentStorageGB = 10;
    let currentFiles = 1000;
    
    if (currentLimitsResult.rows.length > 0) {
      const current = currentLimitsResult.rows[0];
      currentUsers = current.max_users || 0;
      currentStorageGB = current.max_storage_gb || 10;
      currentFiles = current.max_files || 1000;
      console.log(`📊 Current limits: ${currentUsers} users, ${currentStorageGB}GB storage, ${currentFiles} files`);
    }
    
    // Calculate new limits (ADD to existing, don't replace)
    const newUsers = currentUsers + additionalUsers;
    const newStorageGB = currentStorageGB + storageGB;
    const newFiles = Math.max(currentFiles, 1000); // At least 1000 files for paid users
    
    console.log(`📊 New limits will be: ${newUsers} users (+${additionalUsers}), ${newStorageGB}GB storage (+${storageGB}), ${newFiles} files`);
    
    if (additionalUsers > 0) {
      await pool.query(
        `INSERT INTO tenant_limits (tenant_id, max_users, max_storage_gb, max_files, is_trial) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (tenant_id) 
         DO UPDATE SET 
           max_users = $2, 
           max_storage_gb = $3,
           max_files = $4,
           is_trial = $5,
           updated_at = NOW()`,
        [tenantId, newUsers, newStorageGB, newFiles, isTrial]
      );
      console.log(`✅ Tenant limits updated successfully`);
    }
    
    if (isTrial) {
      // Add back to trial_tenants table if reverting to trial
      console.log(`🔄 Adding tenant ${tenantId} back to trial_tenants table`);
      await pool.query(
        `INSERT INTO trial_tenants (tenant_id, trial_start_date, trial_end_date, is_active)
         VALUES ($1, NOW(), NOW() + INTERVAL '30 days', TRUE)
         ON CONFLICT (tenant_id) 
         DO UPDATE SET 
           trial_start_date = NOW(),
           trial_end_date = NOW() + INTERVAL '30 days',
           is_active = TRUE`,
        [tenantId]
      );
      console.log(`✅ Tenant ${tenantId} added to trial_tenants table`);
    } else {
      // Remove from trial_tenants table if converting to paid
      console.log(`🔄 Removing tenant ${tenantId} from trial_tenants table`);
      await pool.query(
        'DELETE FROM trial_tenants WHERE tenant_id = $1',
        [tenantId]
      );
      console.log(`✅ Tenant ${tenantId} removed from trial_tenants table`);
    }
  } catch (error) {
    console.error('❌ Error updating tenant limits:', error);
    throw error;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      error: 'File too large', 
      message: 'The uploaded file exceeds the maximum allowed size of 500MB' 
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON', 
      message: 'The request body contains invalid JSON' 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/auth`);
}); 