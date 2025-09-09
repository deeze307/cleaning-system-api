import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { FirebaseConfigService } from '../../config/firebase.config';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, FirebaseConfigService],
  exports: [CompaniesService],
})
export class CompaniesModule {}