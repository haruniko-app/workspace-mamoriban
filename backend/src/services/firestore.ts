import { Firestore } from '@google-cloud/firestore';
import type { Organization, User, Scan, ScannedFile } from '../types/models.js';

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

  async updateRole(id: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
    await usersRef.doc(id).update({
      role,
      updatedAt: new Date(),
    });
  },

  async delete(id: string): Promise<void> {
    await usersRef.doc(id).delete();
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

/**
 * スキャンファイル関連の操作
 */
export const ScannedFileService = {
  /**
   * ファイルをバッチで保存（サブコレクション）
   */
  async saveBatch(scanId: string, files: Omit<ScannedFile, 'scanId' | 'createdAt'>[]): Promise<void> {
    const batch = firestore.batch();
    const filesRef = scansRef.doc(scanId).collection('files');
    const now = new Date();

    for (const file of files) {
      const docRef = filesRef.doc(file.id);
      batch.set(docRef, {
        ...file,
        scanId,
        createdAt: now,
      });
    }

    await batch.commit();
  },

  /**
   * リスクレベルでフィルタリングしてファイル一覧を取得
   */
  async getByRiskLevel(
    scanId: string,
    riskLevel?: 'critical' | 'high' | 'medium' | 'low',
    limit = 50,
    startAfterScore?: number
  ): Promise<ScannedFile[]> {
    const filesRef = scansRef.doc(scanId).collection('files');

    let query = filesRef.orderBy('riskScore', 'desc').limit(limit);

    if (riskLevel) {
      query = query.where('riskLevel', '==', riskLevel);
    }

    if (startAfterScore !== undefined) {
      query = query.startAfter(startAfterScore);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as ScannedFile);
  },

  /**
   * スキャンの全ファイルを取得（ページネーション）
   */
  async getAll(
    scanId: string,
    options: {
      limit?: number;
      offset?: number;
      riskLevel?: 'critical' | 'high' | 'medium' | 'low';
      sortBy?: 'riskScore' | 'name' | 'modifiedTime';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ files: ScannedFile[]; total: number }> {
    const { limit = 20, offset = 0, riskLevel, sortBy = 'riskScore', sortOrder = 'desc' } = options;
    const filesRef = scansRef.doc(scanId).collection('files');

    // カウント用クエリ
    let countQuery: FirebaseFirestore.Query = filesRef;
    if (riskLevel) {
      countQuery = countQuery.where('riskLevel', '==', riskLevel);
    }
    const countSnapshot = await countQuery.count().get();
    const total = countSnapshot.data().count;

    // 0件の場合は早期リターン
    if (total === 0) {
      return { files: [], total: 0 };
    }

    // データ取得用クエリ
    // Note: Firestoreで where + orderBy を使う場合、複合インデックスが必要
    // riskLevelでフィルター時はソートなしで取得し、メモリ上でソート
    let dataQuery: FirebaseFirestore.Query = filesRef;
    if (riskLevel) {
      dataQuery = dataQuery.where('riskLevel', '==', riskLevel);
    } else {
      dataQuery = dataQuery.orderBy(sortBy, sortOrder);
    }

    // riskLevelフィルター時はページネーションを手動で行う
    if (riskLevel) {
      // 全件取得してメモリ上でソート・ページネーション
      const allDocs = await dataQuery.get();
      let allFiles = allDocs.docs.map((doc) => doc.data() as ScannedFile);

      // ソート
      allFiles.sort((a, b) => {
        const aVal = a[sortBy as keyof ScannedFile] as string | number;
        const bVal = b[sortBy as keyof ScannedFile] as string | number;
        if (sortOrder === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });

      // ページネーション
      const files = allFiles.slice(offset, offset + limit);
      return { files, total };
    }

    dataQuery = dataQuery.offset(offset).limit(limit);
    const snapshot = await dataQuery.get();
    const files = snapshot.docs.map((doc) => doc.data() as ScannedFile);

    return { files, total };
  },

  /**
   * 特定のファイルを取得
   */
  async getById(scanId: string, fileId: string): Promise<ScannedFile | null> {
    const doc = await scansRef.doc(scanId).collection('files').doc(fileId).get();
    if (!doc.exists) return null;
    return doc.data() as ScannedFile;
  },

  /**
   * スキャンのファイル数をカウント
   */
  async countByRiskLevel(scanId: string): Promise<Record<string, number>> {
    const filesRef = scansRef.doc(scanId).collection('files');

    const [critical, high, medium, low] = await Promise.all([
      filesRef.where('riskLevel', '==', 'critical').count().get(),
      filesRef.where('riskLevel', '==', 'high').count().get(),
      filesRef.where('riskLevel', '==', 'medium').count().get(),
      filesRef.where('riskLevel', '==', 'low').count().get(),
    ]);

    return {
      critical: critical.data().count,
      high: high.data().count,
      medium: medium.data().count,
      low: low.data().count,
    };
  },
};

export { firestore };
