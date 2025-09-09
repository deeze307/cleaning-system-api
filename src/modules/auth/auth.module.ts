import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [CompaniesModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseConfigService],
  exports: [AuthService],
})
export class AuthModule {}