declare module 'firestore-store' {
  import { Firestore } from '@google-cloud/firestore';
  import { Store } from 'express-session';

  interface FirestoreStoreOptions {
    database: Firestore;
    collection?: string;
    parser?: {
      read: (doc: unknown) => unknown;
      save: (data: unknown) => unknown;
    };
  }

  export class FirestoreStore extends Store {
    constructor(options: FirestoreStoreOptions);
  }
}
