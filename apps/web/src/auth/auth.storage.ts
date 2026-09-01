import type { AuthUser } from './types';

const ACCESS_TOKEN_KEY = 'vasthav_access_token';
const REFRESH_TOKEN_KEY = 'vasthav_refresh_token';
const USER_KEY = 'vasthav_user';
const REMEMBER_ME_KEY = 'vasthav_remember_me';

type StorageType = Storage;

function getStorage(rememberMe = true): StorageType {
  return rememberMe ? localStorage : sessionStorage;
}

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ??
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function getStoredUser(): AuthUser | null {
  const value =
    localStorage.getItem(USER_KEY) ??
    sessionStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function saveSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
  rememberMe = true,
): void {
  const storage = getStorage(rememberMe);
  const otherStorage = rememberMe ? sessionStorage : localStorage;

  // Make sure an old session from the other storage does not remain.
  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);
  otherStorage.removeItem(USER_KEY);

  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  storage.setItem(USER_KEY, JSON.stringify(user));

  localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
