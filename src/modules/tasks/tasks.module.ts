import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { FirebaseConfigService } from '../../config/firebase.config';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RoomsModule, UsersModule],
  controllers: [TasksController],
  providers: [TasksService, FirebaseConfigService],
  exports: [TasksService],
})
export class TasksModule {}