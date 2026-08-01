import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Le .env est lu depuis la racine du monorepo, puis surchargé par un
// éventuel .env local à l'application. Doit précéder l'import d'AppModule.
dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

function parseOrigins(raw?: string): string[] {
  return (raw || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS restreint aux origines déclarées. En développement, si rien n'est
  // configuré, on autorise le front local plutôt que le web entier.
  const origins = parseOrigins(process.env.CORS_ORIGINS);
  const isProduction = process.env.NODE_ENV === 'production';

  if (origins.length === 0 && isProduction) {
    throw new Error(
      'CORS_ORIGINS doit être défini en production : refus de démarrer avec un CORS ouvert.',
    );
  }

  app.enableCors({
    origin: origins.length > 0 ? origins : ['http://localhost:3004', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // `whitelist` supprime les champs non déclarés dans les DTO et
      // `forbidNonWhitelisted` rejette la requête plutôt que de les ignorer :
      // impossible d'injecter un champ (rôle, prix, statut…) par le corps.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // En production on n'expose pas la structure interne des DTO.
      disableErrorMessages: false,
    }),
  );

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port);
  logger.log(`API Mediquipe démarrée sur http://localhost:${port}/api`);
}

bootstrap();
