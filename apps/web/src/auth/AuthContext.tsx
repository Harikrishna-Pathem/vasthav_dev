import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as authService from './auth.service';
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  saveSession,
} from './auth.storage';
import type { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const storedUser = getStoredUser();

    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    authService
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        saveSession(
          localStorage.getItem('vasthav_access_token') ?? '',
          localStorage.getItem('vasthav_refresh_token') ?? '',
          currentUser,
        );
      })
      .catch(handleLogout)
      .finally(() => {
        setIsLoading(false);
      });
  }, [handleLogout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email.trim(), password);

    saveSession(
      result.accessToken,
      result.refreshToken,
      result.user,
    );

    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      handleLogout();
    }
  }, [handleLogout]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}