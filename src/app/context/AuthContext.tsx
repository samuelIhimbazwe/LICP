import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { apiRequest, apiRequestSafe, ApiError } from '../lib/api';

export interface Invitation {
  token: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  organization?: string;
  department?: string;
  requireMFA: boolean;
  expirationDays: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{
    requiresMfa: boolean;
    pendingToken?: string;
    requiresEmailVerification?: boolean;
  }>;
  logout: () => Promise<void>;
  verifyMFA: (code: string, pendingToken?: string) => Promise<boolean>;
  isAuthenticated: boolean;
  needsMFA: boolean;
  pendingToken: string | null;
  resetPassword: (email: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  updateProfile: (data: { fullName?: string; phone?: string }) => Promise<void>;
  createInvitation: (data: Omit<Invitation, 'token' | 'createdAt' | 'expiresAt' | 'status'>) => Promise<{
    token: string;
    emailSent?: boolean;
    previewUrl?: string;
    emailMode?: string;
  }>;
  getInvitation: (token: string) => Promise<Invitation | null>;
  acceptInvitation: (token: string, password: string) => Promise<{ success: boolean; requiresMFA: boolean; pendingToken?: string }>;
  completeAccountSetup: (token: string, mfaCode: string, setupPendingToken?: string) => Promise<boolean>;
  refreshUser: () => Promise<User | null>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_TOKEN_KEY = 'licp_pending_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(
    () => sessionStorage.getItem(PENDING_TOKEN_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = await apiRequest<{ user: User & { emailVerified?: boolean; sessionTimeoutMinutes?: number } }>('/auth/me');
      const nextUser = {
        ...data.user,
        lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
      };
      setUser(nextUser);
      setNeedsMFA(false);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const storePendingToken = (token: string | null) => {
    setPendingToken(token);
    if (token) sessionStorage.setItem(PENDING_TOKEN_KEY, token);
    else sessionStorage.removeItem(PENDING_TOKEN_KEY);
  };

  const login = async (email: string, password: string) => {
    const data = await apiRequestSafe<{
      requiresMfa: boolean;
      pendingToken?: string;
      requiresEmailVerification?: boolean;
      user?: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.requiresMfa && data.pendingToken) {
      storePendingToken(data.pendingToken);
      setNeedsMFA(true);
      return { requiresMfa: true, pendingToken: data.pendingToken };
    }

    if (data.user) {
      setUser(data.user);
      setNeedsMFA(false);
      storePendingToken(null);
    }
    return {
      requiresMfa: false,
      requiresEmailVerification: data.requiresEmailVerification,
    };
  };

  const verifyMFA = async (code: string, tokenOverride?: string) => {
    const token = tokenOverride ?? pendingToken;
    if (!token) return false;

    const data = await apiRequestSafe<{ user: User }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ pendingToken: token, code }),
    });

    setUser(data.user);
    setNeedsMFA(false);
    storePendingToken(null);
    return true;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // clear local state even if API fails
    }
    setUser(null);
    setNeedsMFA(false);
    storePendingToken(null);
  };

  const resetPassword = async (email: string) => {
    await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return true;
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return true;
  };

  const updateProfile = async (data: { fullName?: string; phone?: string }) => {
    const result = await apiRequest<{ user: User & { lastLogin?: string } }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setUser({
      ...result.user,
      lastLogin: result.user.lastLogin ? new Date(result.user.lastLogin) : undefined,
    });
  };

  const createInvitation = async (
    data: Omit<Invitation, 'token' | 'createdAt' | 'expiresAt' | 'status'>
  ) => {
    const result = await apiRequest<{
      token: string;
      emailSent?: boolean;
      emailError?: string;
      emailMode?: string;
      previewUrl?: string;
    }>('/invitations', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department,
        requireMfa: data.requireMFA,
        expirationDays: data.expirationDays,
      }),
    });
    return result;
  };

  const getInvitation = async (token: string): Promise<Invitation | null> => {
    try {
      const data = await apiRequest<{
        status: string;
        fullName: string;
        email: string;
        phone?: string;
        role: UserRole;
        department?: string;
        requireMFA?: boolean;
        expiresAt?: string;
      }>(`/invitations/${token}`);

      return {
        token,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department,
        requireMFA: data.requireMFA ?? true,
        expirationDays: 7,
        createdAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(),
        status: data.status as Invitation['status'],
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  };

  const acceptInvitation = async (token: string, password: string) => {
    const data = await apiRequest<{
      success: boolean;
      requiresMFA: boolean;
      pendingToken?: string;
      mfa?: { secret: string; otpauthUrl: string };
    }>(`/invitations/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (data.pendingToken) storePendingToken(data.pendingToken);
    if (data.mfa?.secret) {
      sessionStorage.setItem('licp_mfa_setup_secret', data.mfa.secret);
    }
    return {
      success: data.success,
      requiresMFA: data.requiresMFA,
      pendingToken: data.pendingToken,
    };
  };

  const completeAccountSetup = async (
    token: string,
    mfaCode: string,
    setupPendingToken?: string
  ) => {
    const pt = setupPendingToken ?? pendingToken;
    if (!pt) throw new Error('Missing setup token');

    const result = await apiRequest<{ success: boolean; backupCodes?: string[] }>(
      `/invitations/${token}/setup-mfa`,
      {
        method: 'POST',
        body: JSON.stringify({ pendingToken: pt, code: mfaCode }),
      }
    );

    if (result.backupCodes?.length) {
      sessionStorage.setItem('licp_mfa_backup_codes', result.backupCodes.join(','));
    }
    storePendingToken(null);
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        verifyMFA,
        isAuthenticated: !!user,
        needsMFA,
        pendingToken,
        resetPassword,
        changePassword,
        updateProfile,
        createInvitation,
        getInvitation,
        acceptInvitation,
        completeAccountSetup,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ApiError };
