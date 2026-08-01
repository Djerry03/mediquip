'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'mediquip_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible (navigation privée) — on ignore */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Appel API unique de l'application.
 *
 * Contrairement à l'ancien code, cette fonction ne fabrique jamais de
 * réponse de repli : si l'API est injoignable ou répond une erreur, elle
 * lève. C'est aux composants d'afficher un message honnête à l'utilisateur.
 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) || {}),
  };

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
  } catch (err) {
    throw new ApiError(
      "Impossible de joindre le serveur Mediquipe. Vérifiez votre connexion et réessayez.",
      0,
    );
  }

  const raw = await res.text();
  let body: any = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }

  if (!res.ok) {
    const message =
      (body && (Array.isArray(body.message) ? body.message.join(' ') : body.message)) ||
      `Erreur ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}
