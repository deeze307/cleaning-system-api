import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { BuildingsModule } from '../buildings/buildings.module';

@Module({
  imports: [BuildingsModule],
  controllers: [RoomsController],
  providers: [RoomsService, FirebaseConfigService],
  exports: [RoomsService],
})
export class RoomsModule {}