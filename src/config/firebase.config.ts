import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseConfigService {
  private readonly firebaseApp: admin.app.App;
  private firestoreInstance: admin.firestore.Firestore;

  constructor(private configService: ConfigService) {
    const serviceAccount = {
      projectId: this.configService.get('FIREBASE_PROJECT_ID'),
      privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
    };

    let isNewApp = false;

    try {
      this.firebaseApp = admin.app('[DEFAULT]');
    } catch (error) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
      });
      isNewApp = true;
    }

    // Solo configurar settings si es una app nueva
    this.firestoreInstance = this.firebaseApp.firestore();
    
    if (isNewApp) {
      this.firestoreInstance.settings({
        ignoreUndefinedProperties: true,
      });
    }
  }

  get auth(): admin.auth.Auth {
    return this.firebaseApp.auth();
  }

  get firestore(): admin.firestore.Firestore {
    return this.firestoreInstance;
  }

  get storage(): admin.storage.Storage {
    return this.firebaseApp.storage();
  }
}