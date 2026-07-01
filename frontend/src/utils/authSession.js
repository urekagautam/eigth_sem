const TOKEN_KEY = "examifyToken";
const USER_KEY = "examifyUser";
const EXPIRES_AT_KEY = "examifySessionExpiresAt";
const SESSION_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export const saveSession = ({ token, user }) => {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "{}");
  } catch {
    return {};
  }
};

export const getStoredSession = (requiredRole) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0);
  const user = getStoredUser();

  if (!token || !expiresAt || Date.now() >= expiresAt) {
    clearSession();
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  return { token, user, expiresAt };
};
