import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  onModuleInit() {
    if (admin.apps.length === 0) {
      let credential: admin.credential.Credential;

      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        // Railway / production: service account as base64 env var
        const decoded = Buffer.from(
          process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          'base64',
        ).toString('utf-8');
        const serviceAccount = JSON.parse(decoded);
        credential = admin.credential.cert(serviceAccount);
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Docker / local: service account file
        credential = admin.credential.applicationDefault();
      } else {
        throw new Error(
          'No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS',
        );
      }

      this.app = admin.initializeApp({
        credential,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } else {
      this.app = admin.apps[0]!;
    }
  }

  get firestore(): admin.firestore.Firestore {
    return this.app.firestore();
  }

  get storage(): admin.storage.Storage {
    return this.app.storage();
  }

  get auth(): admin.auth.Auth {
    return this.app.auth();
  }

  get fieldValue() {
    return admin.firestore.FieldValue;
  }

  get timestamp() {
    return admin.firestore.Timestamp;
  }
}
