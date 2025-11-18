import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
interface User {
  id: string;
  email: string;
  name: string;
}
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
interface AuthProviderProps {
  children: ReactNode;
}
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // API Base URL - replace with your actual backend URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('signalscope_token');
    const storedUser = localStorage.getItem('signalscope_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      const data = await response.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('signalscope_token', data.access_token);
      localStorage.setItem('signalscope_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          name
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      const data = await response.json();
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('signalscope_token', data.access_token);
      localStorage.setItem('signalscope_user', JSON.stringify(data.user));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('signalscope_token');
    localStorage.removeItem('signalscope_user');
  };
  const value = {
    user,
    token,
    login,
    register,
    logout,
    isLoading
  };
  return <AuthContext.Provider value={value} data-magicpath-id="0" data-magicpath-path="AuthContext.tsx">{children}</AuthContext.Provider>;
};