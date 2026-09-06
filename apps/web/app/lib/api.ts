'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/** Origine de l'API, sans le suffixe `/api` : http://localhost:4000 */
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/**
 * Résout l'adresse publique d'un média.
 *
 * Deux familles de chemins coexistent :
 *  - `/products/p1.svg` — visuels livrés avec le site, servis par Next
 *    depuis `public/` ; le chemin relatif convient tel quel ;
 *  - `/api/uploads/…` — visuels téléversés depuis le back-office, servis par
 *    l'API sur un autre port (et un autre domaine en production). Sans
 *    préfixe, le navigateur les chercherait sur le frontend et n'obtiendrait
 *    qu'un 404.
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return path.startsWith('/api/') ? `${API_ORIGIN}${path}` : path;
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
  const { auth: _auth = false, headers, ...rest } = options;
  // L'option est conservée temporairement pour ne pas casser les appelants :
  // l'authentification repose désormais systématiquement sur le cookie HttpOnly.
  void _auth;

  const finalHeaders: Record<string, string> = {
    ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      // La session est dans un cookie HttpOnly : elle n'est jamais lisible
      // par le JavaScript de la page, mais doit accompagner les appels API.
      credentials: 'include',
    });
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
