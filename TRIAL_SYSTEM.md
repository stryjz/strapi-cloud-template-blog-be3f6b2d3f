# Trial System Implementation

This document describes the trial system implementation for the S3 Commando Suite, which provides free trial access with limitations for new users.

## 🆓 Trial Features

### Trial Period
- **Duration**: 14 days from registration
- **Automatic expiration**: Trials automatically expire after 14 days
- **Grace period**: Users are notified 3 days before expiration

### Trial Limits
- **Users**: Maximum 1 user per tenant
- **Files**: Maximum 10 files per tenant
- **Storage**: Maximum 1GB storage per tenant
- **File Size**: Maximum 500MB per file upload

### Trial Restrictions
- **No additional users**: Cannot invite or create additional users
- **File count enforcement**: Cannot upload more than 10 files
- **Storage enforcement**: Cannot exceed 1GB total storage
- **Automatic blocking**: Access is blocked when trial expires

## 🗄️ Database Schema

### New Tables Created

#### `trial_tenants`
```sql
CREATE TABLE trial_tenants (
  tenant_id VARCHAR(255) PRIMARY KEY,
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `s3_objects`
```sql
CREATE TABLE s3_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  object_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  content_type VARCHAR(100),
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Modified Tables

#### `tenant_limits` (Added columns)
```sql
ALTER TABLE tenant_limits 
ADD COLUMN trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN max_files INTEGER DEFAULT 1000;
```

## 🔧 Implementation Details

### Registration Process
1. New user registration creates a trial tenant automatically
2. Trial start date is set to registration date
3. Trial end date is set to 14 days from registration
4. Trial limits are applied (1 user, 10 files, 1GB storage)

### Authentication Middleware
- Checks trial expiration on every authenticated request
- Blocks access if trial has expired
- Returns appropriate error messages for expired trials

### File Upload Enforcement
- Validates file count limits before upload
- Tracks uploaded files in `s3_objects` table
- Enforces 500MB file size limit
- Prevents uploads when limits are exceeded

### Trial Status Tracking
- Dashboard shows trial status and remaining days
- Warning notifications when trial is close to expiring
- Upgrade prompts for trial users

## 🚀 Setup Instructions

### 1. Run Database Setup
```bash
node scripts/setup-trial-system.js
```

### 2. Create Test Trial User (Optional)
```bash
node scripts/test-trial-user.js
```

### 3. Test Trial Features
- Login with trial user: `trial@test.com` / `trial123`
- Try uploading files (limited to 10)
- Check trial status on dashboard
- Verify expiration handling

## 📊 API Endpoints

### Get Trial Status
```
GET /api/trial/status
```
Returns trial information including:
- `isTrial`: Boolean indicating if account is on trial
- `daysRemaining`: Number of days left in trial
- `maxUsers`, `maxFiles`, `maxStorageGB`: Current limits

### Get Tenant Usage (Enhanced)
```
GET /api/tenant/usage
```
Now includes trial information:
- `is_trial`: Boolean trial status
- `trial_end_date`: Trial expiration date
- `current_files`, `max_files`: File count limits
- `status`: 'trial', 'active', or 'inactive'

## 🎨 Frontend Features

### Dashboard Trial Card
- Shows trial status and remaining days
- Warning indicator when trial expires soon
- Upgrade button linking to payments page
- Displays current trial limits

### Upload Page
- Updated file size limit to 500MB
- File count validation for trial users
- Error messages for exceeded limits

### Payments Page
- Enhanced tenant interface with trial information
- File count display and limits
- Trial status indicators

## 🔒 Security Features

### Trial Expiration Enforcement
- Server-side validation on all authenticated requests
- Automatic session termination for expired trials
- Graceful error handling with upgrade prompts

### File Upload Security
- Server-side file size validation
- File count tracking per tenant
- Secure file deletion with database cleanup

## 📈 Monitoring and Analytics

### Trial Metrics
- Trial conversion rates
- Trial expiration tracking
- File upload patterns
- Storage usage patterns

### Database Queries
```sql
-- Get active trials
SELECT * FROM trial_tenants WHERE is_active = TRUE AND trial_end_date > NOW();

-- Get expired trials
SELECT * FROM trial_tenants WHERE trial_end_date < NOW();

-- Get trial conversion stats
SELECT 
  COUNT(*) as total_trials,
  COUNT(CASE WHEN trial_end_date < NOW() THEN 1 END) as expired_trials,
  COUNT(CASE WHEN trial_end_date > NOW() THEN 1 END) as active_trials
FROM trial_tenants;
```

## 🔄 Upgrade Process

### From Trial to Paid
1. User visits payments page
2. Selects upgrade plan
3. Completes payment via Stripe
4. Tenant limits are updated automatically
5. Trial status is removed
6. Full access is granted

### Manual Upgrade (Admin)
```sql
-- Remove trial status and set paid limits
UPDATE tenant_limits 
SET is_trial = FALSE, 
    max_users = 10, 
    max_files = 1000, 
    max_storage_gb = 100
WHERE tenant_id = 'tenant-id';
```

## 🐛 Troubleshooting

### Common Issues

1. **Trial not showing on dashboard**
   - Check if `tenant_limits` table has trial data
   - Verify `is_trial` flag is set to TRUE

2. **File upload limits not working**
   - Check `s3_objects` table for file tracking
   - Verify file count queries are working

3. **Trial expiration not enforced**
   - Check authentication middleware
   - Verify trial end date is set correctly

### Debug Queries
```sql
-- Check trial status for specific tenant
SELECT * FROM tenant_limits WHERE tenant_id = 'your-tenant-id';

-- Check file count for tenant
SELECT COUNT(*) FROM s3_objects WHERE tenant_id = 'your-tenant-id';

-- Check trial expiration
SELECT 
  tenant_id,
  trial_end_date,
  NOW() as current_time,
  trial_end_date < NOW() as is_expired
FROM trial_tenants;
```

## 📝 Future Enhancements

### Planned Features
- Trial extension capabilities
- Trial-to-paid conversion tracking
- Automated trial expiration emails
- Trial usage analytics dashboard
- Custom trial periods for enterprise

### Configuration Options
- Configurable trial duration
- Adjustable trial limits
- Trial extension policies
- Conversion tracking metrics 