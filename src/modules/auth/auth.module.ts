import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    CompaniesModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { 
        expiresIn: '24h',
        algorithm: 'HS256'
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, FirebaseConfigService, JwtStrategy],
  exports: [AuthService,JwtStrategy],
})
export class AuthModule {}