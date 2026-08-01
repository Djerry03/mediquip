import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import { ENTITIES } from './entities';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

/**
 * DataSource utilisée uniquement par la CLI TypeORM (génération et
 * exécution des migrations). L'application, elle, se configure via
 * TypeOrmModule dans AppModule.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5434),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mediquip',
  entities: ENTITIES,
  migrations: [resolve(__dirname, 'migrations/*.{ts,js}')],
  // Jamais true ici : les migrations sont la seule source de vérité du schéma.
  synchronize: false,
});
