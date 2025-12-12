import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesModule } from '../companies/companies.module';
import { FirestoreModule } from 'src/firestore/firestore.module';

@Module({
  imports: [CompaniesModule, FirestoreModule],
  controllers: [UsersController],
  providers: [UsersService, FirebaseConfigService],
  exports: [UsersService],
})
export class UsersModule {}