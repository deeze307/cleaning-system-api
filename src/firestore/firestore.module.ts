import { Module } from '@nestjs/common';
import { FirestoreService } from './firestore.service';
import { FirebaseConfigService } from '../config/firebase.config';

@Module({
  providers: [FirestoreService, FirebaseConfigService],
  exports: [FirestoreService],
})
export class FirestoreModule {}