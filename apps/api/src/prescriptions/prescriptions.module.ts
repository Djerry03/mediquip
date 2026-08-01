import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { PrescriptionRequestEntity } from '../entities/prescription-request.entity';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrescriptionRequestEntity]),
    // Stockage en mémoire : le fichier n'atteint le disque qu'après
    // validation du type et de la signature binaire.
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
