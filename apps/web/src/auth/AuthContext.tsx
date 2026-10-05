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
  getAccessToken,
  getRefreshToken,
  getRememberMe,
  saveSession,
} from './auth.storage';
import { isUserRole, type AuthUser, type UserRole } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    loginAs: UserRole,
    rememberMe?: boolean,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const onSessionExpired = () => handleLogout();
    window.addEventListener('vasthav:session-expired', onSessionExpired);
    return () => window.removeEventListener('vasthav:session-expired', onSessionExpired);
  }, [handleLogout]);

  useEffect(() => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    const rememberMe = getRememberMe();

    if (!accessToken && !refreshToken) {
      clearSession();
      setIsLoading(false);
      return;
    }

    async function restoreSession() {
      try {
        let currentUser: AuthUser;
        let currentAccessToken = accessToken;
        let currentRefreshToken = refreshToken;

        if (accessToken) {
          try {
            currentUser = await authService.getCurrentUser();
          } catch (accessError) {
            if (!refreshToken) throw accessError;
            const rotated = await authService.refresh(refreshToken);
            if (!isUserRole(rotated.user?.role)) throw new Error('Invalid account role');
            currentAccessToken = rotated.accessToken;
            currentRefreshToken = rotated.refreshToken;
            saveSession(currentAccessToken, currentRefreshToken, rotated.user, rememberMe);
            currentUser = await authService.getCurrentUser();
          }
        } else if (refreshToken) {
          const rotated = await authService.refresh(refreshToken);
          if (!isUserRole(rotated.user?.role)) throw new Error('Invalid account role');
          currentAccessToken = rotated.accessToken;
          currentRefreshToken = rotated.refreshToken;
          saveSession(currentAccessToken, currentRefreshToken, rotated.user, rememberMe);
          currentUser = await authService.getCurrentUser();
        } else {
          throw new Error('No active session');
        }

        if (!isUserRole(currentUser.role)) throw new Error('Invalid account role');
        setUser(currentUser);
        // The API response interceptor may have rotated tokens while fetching /auth/me.
        saveSession(
          getAccessToken() ?? currentAccessToken ?? '',
          getRefreshToken() ?? currentRefreshToken ?? '',
          currentUser,
          rememberMe,
        );
      } catch {
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    }

    void restoreSession();
  }, [handleLogout]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      loginAs: UserRole,
      rememberMe = true,
    ) => {
      const result = await authService.login(
        email.trim(),
        password,
        loginAs,
      );

      if (!isUserRole(result.user?.role)) {
        throw new Error('The server returned an invalid account role.');
      }

      saveSession(
        result.accessToken,
        result.refreshToken,
        result.user,
        rememberMe,
      );

      setUser(result.user);
      return result.user;
    },
    [],
  );

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
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
