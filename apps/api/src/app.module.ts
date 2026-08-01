import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { SeedModule } from './seed/seed.module';
import { DeliveryModule } from './delivery/delivery.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { NotificationsModule } from './notifications/notifications.module';

import { ENTITIES } from './entities';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    // 120 requêtes/minute par IP par défaut. Les routes sensibles
    // (connexion, inscription) resserrent ce plafond localement.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: Number(config.get<string>('POSTGRES_PORT', '5434')),
        username: config.get<string>('POSTGRES_USER', 'postgres'),
        password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
        database: config.get<string>('POSTGRES_DB', 'mediquip'),
        entities: ENTITIES,
        // `synchronize` réécrit le schéma à chaud : pratique en dev,
        // destructeur en production, où seules les migrations font foi.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),

    AuthModule,
    ProductsModule,
    OrdersModule,
    DeliveryModule,
    PaymentsModule,
    PromotionsModule,
    ReviewsModule,
    PrescriptionsModule,
    NotificationsModule,
    SeedModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
