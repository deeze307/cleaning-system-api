import { forwardRef, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { FirestoreService } from '../../firestore/firestore.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, FirestoreService, FirebaseConfigService],
  exports: [CompaniesService],
  imports:[forwardRef(() => AuthModule)]
})
export class CompaniesModule {}