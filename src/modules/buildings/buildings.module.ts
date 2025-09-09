import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  controllers: [BuildingsController],
  providers: [BuildingsService, FirebaseConfigService],
  exports: [BuildingsService],
})
export class BuildingsModule {}