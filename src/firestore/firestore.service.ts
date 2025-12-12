import { Injectable } from '@nestjs/common';
import { FirebaseConfigService } from '../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirestoreService {
  private readonly firestore: admin.firestore.Firestore;

  constructor(private firebaseConfig: FirebaseConfigService) {
    this.firestore = this.firebaseConfig.firestore;
  }

  private convertTimestamps(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const converted: any = {};
    
    for (const key in data) {
      const value = data[key];
      
      // Si es un objeto con _seconds (Timestamp de Firestore)
      if (value && typeof value === 'object' && '_seconds' in value) {
        converted[key] = new Date(
          value._seconds * 1000 + (value._nanoseconds || 0) / 1000000
        ).toISOString();
      } 
      // Si es un objeto anidado, aplicar recursivamente
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        converted[key] = this.convertTimestamps(value);
      }
      // Si es un array
      else if (Array.isArray(value)) {
        converted[key] = value.map(item => 
          typeof item === 'object' ? this.convertTimestamps(item) : item
        );
      }
      // Cualquier otro valor
      else {
        converted[key] = value;
      }
    }
    
    return converted;
  }

  async create(collection: string, data: any): Promise<admin.firestore.DocumentReference> {
    return this.firestore.collection(collection).add(data);
  }

  async findAll<T>(collection: string): Promise<T[]> {
    const snapshot = await this.firestore.collection(collection).get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...this.convertTimestamps(data),
      } as T;
    });
  }

  async findById<T>(collection: string, id: string): Promise<T | null> {
    const doc = await this.firestore.collection(collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...this.convertTimestamps(doc.data()),
    } as T;
  }

  async findByField<T>(collection: string, field: string, value: any): Promise<T[]> {
    const snapshot = await this.firestore
      .collection(collection)
      .where(field, '==', value)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...this.convertTimestamps(doc.data()),
    })) as T[];
  }

  async findByMultipleFields<T>(collection: string, filters: Record<string, any>): Promise<T[]> {
    let query: admin.firestore.Query = this.firestore.collection(collection);
    
    for (const [field, value] of Object.entries(filters)) {
      query = query.where(field, '==', value);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...this.convertTimestamps(doc.data()),
    })) as T[];
  }

  async update(collection: string, id: string, data: any): Promise<void> {
    await this.firestore.collection(collection).doc(id).update(data);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.firestore.collection(collection).doc(id).delete();
  }

  async findWithPagination<T>(
    collection: string,
    limit: number,
    lastDoc?: admin.firestore.DocumentSnapshot
  ): Promise<{ data: T[]; lastDoc?: admin.firestore.DocumentSnapshot }> {
    let query = this.firestore.collection(collection).limit(limit);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...this.convertTimestamps(doc),
    })) as T[];
    
    const lastDocument = snapshot.docs[snapshot.docs.length - 1];
    
    return {
      data,
      lastDoc: lastDocument,
    };
  }

  async count(collection: string): Promise<number> {
    const snapshot = await this.firestore.collection(collection).get();
    return snapshot.size;
  }
}