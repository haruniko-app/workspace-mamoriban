import { Firestore } from '@google-cloud/firestore';
import type { Organization, User, Scan } from '../types/models.js';

// Firestore初期化
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'workspace-mamoriban',
});

// コレクション参照
const organizationsRef = firestore.collection('organizations');
const usersRef = firestore.collection('users');
const scansRef = firestore.collection('scans');

/**
 * 組織関連の操作
 */
export const OrganizationService = {
  async create(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization> {
    const docRef = organizationsRef.doc();
    const now = new Date();
    const organization: Organization = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(organization);
    return organization;
  },

  async getById(id: string): Promise<Organization | null> {
    const doc = await organizationsRef.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Organization;
  },

  async getByDomain(domain: string): Promise<Organization | null> {
    const snapshot = await organizationsRef.where('domain', '==', domain).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Organization;
  },

  async getByStripeCustomerId(stripeCustomerId: string): Promise<Organization | null> {
    const snapshot = await organizationsRef
      .where('stripeCustomerId', '==', stripeCustomerId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Organization;
  },

  async update(id: string, data: Partial<Organization>): Promise<void> {
    await organizationsRef.doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async updatePlan(
    id: string,
    plan: Organization['plan'],
    stripeSubscriptionId: string | null,
    expiresAt: Date | null
  ): Promise<void> {
    await organizationsRef.doc(id).update({
      plan,
      stripeSubscriptionId,
      planExpiresAt: expiresAt,
      updatedAt: new Date(),
    });
  },

  async incrementScanStats(id: string, filesScanned: number): Promise<void> {
    const docRef = organizationsRef.doc(id);
    await firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Organization not found');

      const data = doc.data() as Organization;
      transaction.update(docRef, {
        totalScans: data.totalScans + 1,
        totalFilesScanned: data.totalFilesScanned + filesScanned,
        lastScanAt: new Date(),
        updatedAt: new Date(),
      });
    });
  },
};

/**
 * ユーザー関連の操作
 */
export const UserService = {
  async create(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date();
    const user: User = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await usersRef.doc(data.id).set(user);
    return user;
  },

  async getById(id: string): Promise<User | null> {
    const doc = await usersRef.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as User;
  },

  async getByEmail(email: string): Promise<User | null> {
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as User;
  },

  async getByOrganization(organizationId: string): Promise<User[]> {
    const snapshot = await usersRef.where('organizationId', '==', organizationId).get();
    return snapshot.docs.map((doc) => doc.data() as User);
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    await usersRef.doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
  },

  async updateLastLogin(id: string): Promise<void> {
    await usersRef.doc(id).update({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
  },

  async upsert(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const existing = await this.getById(data.id);
    if (existing) {
      await this.update(data.id, data);
      return { ...existing, ...data, updatedAt: new Date() };
    }
    return this.create(data);
  },
};

/**
 * スキャン関連の操作
 */
export const ScanService = {
  async create(data: Omit<Scan, 'id' | 'createdAt'>): Promise<Scan> {
    const docRef = scansRef.doc();
    const scan: Scan = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    };
    await docRef.set(scan);
    return scan;
  },

  async getById(id: string): Promise<Scan | null> {
    const doc = await scansRef.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Scan;
  },

  async getByOrganization(organizationId: string, limit = 10): Promise<Scan[]> {
    const snapshot = await scansRef
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => doc.data() as Scan);
  },

  async update(id: string, data: Partial<Scan>): Promise<void> {
    await scansRef.doc(id).update(data);
  },

  async complete(
    id: string,
    result: {
      totalFiles: number;
      riskySummary: Scan['riskySummary'];
    }
  ): Promise<void> {
    await scansRef.doc(id).update({
      status: 'completed',
      totalFiles: result.totalFiles,
      riskySummary: result.riskySummary,
      completedAt: new Date(),
    });
  },

  async fail(id: string, errorMessage: string): Promise<void> {
    await scansRef.doc(id).update({
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  },
};

export { firestore };
