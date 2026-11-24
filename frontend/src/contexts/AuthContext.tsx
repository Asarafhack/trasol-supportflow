import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RegistrationResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    terms_accepted?: boolean;
  }) => Promise<RegistrationResponse>;
  verifyOTP: (payload: { email: string; otp: string }) => Promise<void>;
  resendOTP: (email: string) => Promise<{ status: string; message: string; dev_otp?: string }>;
  requestLoginOTP: (email: string) => Promise<{ status: string; message: string; email: string; dev_otp?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('trasol_token');
    const savedUser = localStorage.getItem('trasol_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /auth/me in background
        api.getMe().then((freshUser) => {
          setUser(freshUser);
          localStorage.setItem('trasol_user', JSON.stringify(freshUser));
        }).catch(() => {
          // Token expired
          api.clearToken();
          setToken(null);
          setUser(null);
        }).finally(() => {
          setIsLoading(false);
        });
        return;
      } catch (err) {
        api.clearToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await api.login(credentials);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    terms_accepted?: boolean;
  }): Promise<RegistrationResponse> => {
    setIsLoading(true);
    try {
      const res = await api.register(data);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (payload: { email: string; otp: string }) => {
    setIsLoading(true);
    try {
      const res = await api.verifyOTP(payload);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async (email: string) => {
    return api.resendOTP({ email });
  };

  const requestLoginOTP = async (email: string) => {
    return api.requestLoginOTP({ email });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      localStorage.setItem('trasol_user', JSON.stringify(freshUser));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isLoading,
        login,
        register,
        verifyOTP,
        resendOTP,
        requestLoginOTP,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
