const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get stored session token
const getSessionToken = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session).session?.id : null;
};

// Helper function for authenticated API calls
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getSessionToken();
  if (!token) {
    throw new Error('No session token available');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

// Dashboard statistics API
export const getDashboardStats = async () => {
  try {
    // Get files data
    const filesResponse = await authenticatedFetch('/api/files');
    const files = filesResponse.files || [];
    
    // Calculate statistics
    const totalFiles = files.length;
    const totalSize = files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const recentUploads = files.filter((file: any) => {
      const fileDate = new Date(file.lastModified);
      return fileDate >= todayStart;
    }).length;

    // Format storage size
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Get user count (for admin users)
    let totalUsers = 0;
    try {
      const usersResponse = await authenticatedFetch('/api/admin/users');
      totalUsers = usersResponse.count || 0;
    } catch (error) {
      // Non-admin users won't have access to user count
      console.log('User count not available for non-admin users');
    }

    return {
      totalFiles,
      storageUsed: formatBytes(totalSize),
      recentUploads,
      totalUsers,
      files: files.slice(0, 10), // Recent files for activity feed
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Get recent activity
export const getRecentActivity = async () => {
  try {
    const filesResponse = await authenticatedFetch('/api/files');
    const files = filesResponse.files || [];
    
    // Sort files by last modified date and take the most recent 5
    const recentFiles = files
      .sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5)
      .map((file: any) => ({
        action: 'uploaded',
        fileName: file.key.split('/').pop() || file.key,
        timestamp: new Date(file.lastModified),
        type: 'upload'
      }));

    return recentFiles;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
}; 