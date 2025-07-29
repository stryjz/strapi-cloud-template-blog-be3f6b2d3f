import pg from 'pg';
import { Resend } from 'resend';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://s3_commando_user:s3_commando_password@localhost:5432/s3_commando",
});

const resend = new Resend(process.env.RESEND_API_KEY);

async function resendVerification() {
  try {
    console.log('📧 Resending verification email...');
    
    const email = 'kamil.kosowski@pragmaticcoders.com';
    
    // Get user details
    const userResult = await pool.query(`
      SELECT id, email, name, email_verified, email_verification_token 
      FROM users 
      WHERE email = $1
    `, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = userResult.rows[0];
    
    if (user.email_verified) {
      console.log('✅ User is already verified');
      return;
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomUUID();
    await pool.query(
      'UPDATE users SET email_verification_token = $1 WHERE id = $2',
      [verificationToken, user.id]
    );
    
    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}`;
    
    await resend.emails.send({
      from: 'onboarding@resend.dev',
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
    
    console.log('✅ Verification email sent successfully!');
    console.log('📧 Check your email at:', email);
    console.log('🔗 Verification URL:', verificationUrl);
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
  } finally {
    await pool.end();
  }
}

resendVerification(); 