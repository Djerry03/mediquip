import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const PLACEHOLDERS = [
  'change-me-openssl-rand-hex-32',
  'change-me-before-production',
  'change-me-webhook-secret',
];

function isPublicHttpsUrl(value: unknown): boolean {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && url.hostname !== 'localhost';
  } catch {
    return false;
  }
}

/**
 * Vérifie la configuration au démarrage. Un secret manquant ou laissé à sa
 * valeur d'exemple fait échouer le démarrage en production : mieux vaut ne
 * pas démarrer qu'exposer une API signée avec un secret public.
 */
export function validateEnv(config: Record<string, unknown>) {
  const isProduction = config.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  const jwtSecret = String(config.JWT_SECRET || '');
  if (!jwtSecret) {
    errors.push('JWT_SECRET est obligatoire.');
  } else if (PLACEHOLDERS.includes(jwtSecret)) {
    (isProduction ? errors : warnings).push(
      'JWT_SECRET est resté à sa valeur d’exemple. Générez-en un : openssl rand -hex 32',
    );
  } else if (jwtSecret.length < 32) {
    (isProduction ? errors : warnings).push('JWT_SECRET devrait faire au moins 32 caractères.');
  }

  if (isProduction) {
    if (!config.CORS_ORIGINS) errors.push('CORS_ORIGINS est obligatoire en production.');
    if (PLACEHOLDERS.includes(String(config.ADMIN_PASSWORD || ''))) {
      errors.push('ADMIN_PASSWORD est resté à sa valeur d’exemple.');
    }
    if (String(config.POSTGRES_PASSWORD || '') === 'postgres') {
      errors.push('POSTGRES_PASSWORD ne peut pas rester « postgres » en production.');
    }
    if (!isPublicHttpsUrl(config.NEXT_PUBLIC_SITE_URL)) {
      errors.push('NEXT_PUBLIC_SITE_URL doit être une URL HTTPS publique en production.');
    }
  }

  const provider = String(config.PAYMENT_PROVIDER || 'manual');
  if (!['manual', 'momo'].includes(provider)) {
    errors.push(`PAYMENT_PROVIDER inconnu : « ${provider} » (attendu : manual | momo).`);
  }
  if (provider === 'momo') {
    for (const key of ['MOMO_API_BASE_URL', 'MOMO_SUBSCRIPTION_KEY', 'MOMO_API_USER', 'MOMO_API_KEY']) {
      if (!config[key]) errors.push(`${key} est obligatoire quand PAYMENT_PROVIDER=momo.`);
    }
  }

  const transport = String(config.NOTIFICATION_TRANSPORT || 'log');
  if (!['log', 'smtp'].includes(transport)) {
    errors.push(`NOTIFICATION_TRANSPORT inconnu : « ${transport} » (attendu : log | smtp).`);
  }
  if (transport === 'smtp' && !config.SMTP_HOST) {
    errors.push('SMTP_HOST est obligatoire quand NOTIFICATION_TRANSPORT=smtp.');
  }
  if (isProduction && transport !== 'smtp') {
    errors.push('NOTIFICATION_TRANSPORT doit être « smtp » en production.');
  }
  if (isProduction && transport === 'smtp') {
    for (const key of ['SMTP_FROM', 'OPS_NOTIFICATION_EMAIL']) {
      if (!config[key]) errors.push(`${key} est obligatoire avec SMTP en production.`);
    }
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length > 0) {
    throw new Error(`Configuration invalide :\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}
