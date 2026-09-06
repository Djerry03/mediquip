import { validateEnv } from './env.validation';

const productionConfig = {
  NODE_ENV: 'production',
  JWT_SECRET: 'cle-secrete-de-production-assez-longue-et-unique',
  ADMIN_PASSWORD: 'mot-de-passe-admin-unique',
  POSTGRES_PASSWORD: 'mot-de-passe-base-unique',
  CORS_ORIGINS: 'https://mediquipe.cm',
  NEXT_PUBLIC_SITE_URL: 'https://mediquipe.cm',
  PAYMENT_PROVIDER: 'manual',
  NOTIFICATION_TRANSPORT: 'smtp',
  SMTP_HOST: 'smtp.mediquipe.cm',
  SMTP_FROM: 'Mediquipe <no-reply@mediquipe.cm>',
  OPS_NOTIFICATION_EMAIL: 'commandes@mediquipe.cm',
};

describe('validateEnv', () => {
  it('accepte une configuration de production exploitable sans Mobile Money', () => {
    expect(validateEnv(productionConfig)).toBe(productionConfig);
  });

  it('refuse une production sans URL HTTPS et sans transport SMTP', () => {
    expect(() =>
      validateEnv({
        ...productionConfig,
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3004',
        NOTIFICATION_TRANSPORT: 'log',
        SMTP_HOST: undefined,
        SMTP_FROM: undefined,
        OPS_NOTIFICATION_EMAIL: undefined,
      }),
    ).toThrow(/NEXT_PUBLIC_SITE_URL[\s\S]*NOTIFICATION_TRANSPORT/);
  });
});
