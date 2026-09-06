import { extractSessionCookie, SESSION_COOKIE_NAME } from './session-cookie';

describe('extractSessionCookie', () => {
  it('extrait uniquement le cookie de session parmi les cookies reçus', () => {
    expect(
      extractSessionCookie({
        headers: { cookie: `theme=dark; ${SESSION_COOKIE_NAME}=header.payload.signature; locale=fr` },
      }),
    ).toBe('header.payload.signature');
  });

  it('retourne null lorsqu’aucune session navigateur n’est présente', () => {
    expect(extractSessionCookie({ headers: { cookie: 'theme=dark' } })).toBeNull();
    expect(extractSessionCookie()).toBeNull();
  });

  it('ignore un cookie mal encodé', () => {
    expect(
      extractSessionCookie({ headers: { cookie: `${SESSION_COOKIE_NAME}=%E0%A4%A` } }),
    ).toBeNull();
  });
});
