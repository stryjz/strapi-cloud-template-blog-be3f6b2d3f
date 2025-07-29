import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get stored session token
const getSessionToken = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session).session?.id : null;
};

// Get stored session data
const getStoredSession = () => {
  const session = localStorage.getItem('session');
  return session ? JSON.parse(session) : null;
};

// Real auth client that connects to the backend
export const signUp = {
  email: async ({ email, password, name, tenantName }: { email: string; password: string; name?: string; tenantName?: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/sign-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, tenantName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign up failed');
    }

    const result = await response.json();
    console.log('Sign up result:', result);
    localStorage.setItem('session', JSON.stringify(result));
    return result;
  }
};

export const signIn = {
  email: async ({ email, password }: { email: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Invalid email or password');
    }

    const result = await response.json();
    console.log('Sign in result:', result);
    
    // Store session info in localStorage for persistence
    localStorage.setItem('session', JSON.stringify(result));
    console.log('Session stored in localStorage');
    
    return result;
  }
};

export const signOut = async () => {
  try {
    const token = getSessionToken();
    if (token) {
      await fetch(`${API_BASE_URL}/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Sign out error:', error);
  } finally {
    localStorage.removeItem('session');
    window.location.href = '/';
  }
};

export const useSession = () => {
  const [session, setSession] = useState(() => {
    // Initialize with stored session immediately
    const storedSession = getStoredSession();
    return storedSession && storedSession.user ? storedSession : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only check with backend if we don't have a session
    if (session) {
      return;
    }

    const checkSession = async () => {
      console.log('useSession: Checking session with backend...');
      setLoading(true);
      
      try {
        const token = getSessionToken();
        if (!token) {
          console.log('useSession: No token found');
          setSession(null);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/session`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const sessionData = await response.json();
          console.log('useSession: Backend session data:', sessionData);
          setSession(sessionData);
          localStorage.setItem('session', JSON.stringify(sessionData));
        } else {
          console.log('useSession: Backend session check failed');
          localStorage.removeItem('session');
          setSession(null);
        }
      } catch (error) {
        console.error('useSession: Session check error:', error);
        localStorage.removeItem('session');
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [session]);

  console.log('useSession: Current session state:', { session, loading });
  return { data: session, isLoading: loading };
};

export const getSession = async () => {
  try {
    const token = getSessionToken();
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};