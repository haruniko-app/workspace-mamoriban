import session from 'express-session';
import { Firestore } from '@google-cloud/firestore';

/**
 * Custom Firestore session store for express-session
 * This is a simple implementation that stores sessions in Firestore
 */
export class FirestoreSessionStore extends session.Store {
  private db: Firestore;
  private collectionName: string;

  constructor(options: { database: Firestore; collection?: string }) {
    super();
    this.db = options.database;
    this.collectionName = options.collection || 'sessions';
  }

  get(
    sid: string,
    callback: (err: unknown, session?: session.SessionData | null) => void
  ): void {
    this.db.collection(this.collectionName).doc(sid).get()
      .then((doc) => {
        if (!doc.exists) {
          return callback(null, null);
        }
        const data = doc.data();
        if (!data) {
          return callback(null, null);
        }
        // Check if session has expired
        if (data.expires && new Date(data.expires) < new Date()) {
          this.destroy(sid, () => callback(null, null));
          return;
        }
        callback(null, data.session as session.SessionData);
      })
      .catch((err) => callback(err));
  }

  set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void
  ): void {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).toISOString()
      : null;
    // Convert session to plain object (Firestore doesn't support objects with custom prototypes)
    const plainSession = JSON.parse(JSON.stringify(sessionData));
    this.db.collection(this.collectionName).doc(sid).set({
      session: plainSession,
      expires,
      updatedAt: new Date().toISOString(),
    })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.db.collection(this.collectionName).doc(sid).delete()
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  touch(
    sid: string,
    sessionData: session.SessionData,
    callback?: () => void
  ): void {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).toISOString()
      : null;
    // Convert cookie to plain object
    const plainCookie = JSON.parse(JSON.stringify(sessionData.cookie));
    this.db.collection(this.collectionName).doc(sid).update({
      expires,
      'session.cookie': plainCookie,
      updatedAt: new Date().toISOString(),
    })
      .then(() => callback?.())
      .catch((err) => {
        // If document doesn't exist, create it
        if ((err as { code?: number }).code === 5) {
          this.set(sid, sessionData, callback);
          return;
        }
        // touch callback doesn't accept errors, just log it
        console.error('Session touch error:', err);
        callback?.();
      });
  }
}
