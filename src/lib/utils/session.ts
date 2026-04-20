/**
 * Session persistence utilities
 * Handles "Remember me" functionality securely
 */

const SESSION_STORAGE_KEY = "caja_session";
const SESSION_EXPIRY_DAYS = 30;

interface StoredSession {
  email: string;
  token: string;
  expiresAt: number;
  tenantId?: string;
}

export function saveSession(email: string, rememberMe: boolean, tenantId?: string): void {
  if (!rememberMe || typeof window === "undefined") {
    return;
  }

  const token = generateToken(email);
  const expiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const session: StoredSession = { email, token, expiresAt, tenantId };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    // Also save tenantId in sessionStorage for immediate access
    if (tenantId && typeof window !== "undefined") {
      sessionStorage.setItem("defaultTenantId", tenantId);
    }
  } catch (error) {
    console.warn("Failed to save session:", error);
  }
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.warn("Failed to read stored session:", error);
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear session:", error);
  }
}

export function isSessionValid(session: StoredSession): boolean {
  return Date.now() <= session.expiresAt && !!session.email && !!session.token;
}

/**
 * Generate a simple token (in production, use a proper auth service)
 */
function generateToken(email: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${btoa(email)}_${timestamp}_${random}`;
}
