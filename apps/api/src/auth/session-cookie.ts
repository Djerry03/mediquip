/** Nom unique du cookie de session navigateur. */
export const SESSION_COOKIE_NAME = 'mediquip_session';

/**
 * Passport-JWT n'analyse pas les cookies sans middleware supplémentaire.
 * Le jeton étant composé uniquement de caractères sûrs pour un cookie, une
 * extraction minimale et explicite suffit ici.
 */
export function extractSessionCookie(request?: { headers?: { cookie?: string } }): string | null {
  const header = request?.headers?.cookie;
  if (!header) return null;

  const prefix = `${SESSION_COOKIE_NAME}=`;
  const entry = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!entry) return null;

  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    // Un en-tête Cookie malformé ne doit pas transformer une requête non
    // authentifiée en erreur serveur.
    return null;
  }
}
