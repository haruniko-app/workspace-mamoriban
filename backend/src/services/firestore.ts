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
 * Firestore Timestampを Date または ISO文字列に変換
 */
function toISOString(value: unknown): string | null {
  if (!value) return null;
  // Firestore Timestamp
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  // Date オブジェクト
  if (value instanceof Date) {
    return value.toISOString();
  }
  // 既に文字列
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Scanオブジェクトのタイムスタンプをシリアライズ可能な形式に変換
 */
function convertScanTimestamps(scan: Scan): Scan {
  return {
    ...scan,
    startedAt: toISOString(scan.startedAt) as unknown as Date,
    completedAt: toISOString(scan.completedAt) as unknown as Date,
    createdAt: toISOString(scan.createdAt) as unknown as Date,
  };
}

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
    return convertScanTimestamps(doc.data() as Scan);
  },

  async getByOrganization(organizationId: string, limit = 10, offset = 0): Promise<{ scans: Scan[]; total: number }> {
    // Get total count
    const countSnapshot = await scansRef
      .where('organizationId', '==', organizationId)
      .count()
      .get();
    const total = countSnapshot.data().count;

    // Get paginated results (Firestore doesn't support offset natively, so we fetch limit+offset and slice)
    const snapshot = await scansRef
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(limit + offset)
      .get();

    const allScans = snapshot.docs.map((doc) => convertScanTimestamps(doc.data() as Scan));
    const scans = allScans.slice(offset, offset + limit);

    return { scans, total };
  },

  async update(id: string, data: Partial<Scan>): Promise<void> {
    await scansRef.doc(id).update(data);
  },

  async complete(
    id: string,
    result: {
      totalFiles: number;
      riskySummary: Scan['riskySummary'];
      phase?: Scan['phase'];
      processedFiles?: number;
    }
  ): Promise<void> {
    await scansRef.doc(id).update({
      status: 'completed',
      totalFiles: result.totalFiles,
      riskySummary: result.riskySummary,
      phase: result.phase || 'done',
      processedFiles: result.processedFiles ?? result.totalFiles,
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
      ownerType?: 'all' | 'internal' | 'external';
      sortBy?: 'riskScore' | 'name' | 'modifiedTime';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ files: ScannedFile[]; total: number }> {
    const { limit = 20, offset = 0, riskLevel, ownerType = 'all', sortBy = 'riskScore', sortOrder = 'desc' } = options;
    const filesRef = scansRef.doc(scanId).collection('files');

    // フィルター有無を判定
    const hasFilter = riskLevel || (ownerType && ownerType !== 'all');

    // カウント用クエリ
    let countQuery: FirebaseFirestore.Query = filesRef;
    if (riskLevel) {
      countQuery = countQuery.where('riskLevel', '==', riskLevel);
    }
    if (ownerType === 'internal') {
      countQuery = countQuery.where('isInternalOwner', '==', true);
    } else if (ownerType === 'external') {
      countQuery = countQuery.where('isInternalOwner', '==', false);
    }
    const countSnapshot = await countQuery.count().get();
    const total = countSnapshot.data().count;

    // 0件の場合は早期リターン
    if (total === 0) {
      return { files: [], total: 0 };
    }

    // データ取得用クエリ
    // Note: Firestoreで where + orderBy を使う場合、複合インデックスが必要
    // フィルター時はソートなしで取得し、メモリ上でソート
    let dataQuery: FirebaseFirestore.Query = filesRef;
    if (riskLevel) {
      dataQuery = dataQuery.where('riskLevel', '==', riskLevel);
    }
    if (ownerType === 'internal') {
      dataQuery = dataQuery.where('isInternalOwner', '==', true);
    } else if (ownerType === 'external') {
      dataQuery = dataQuery.where('isInternalOwner', '==', false);
    }

    // フィルター時はページネーションを手動で行う
    if (hasFilter) {
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

    dataQuery = dataQuery.orderBy(sortBy, sortOrder).offset(offset).limit(limit);
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

  /**
   * フォルダごとにファイルを集計
   */
  async getByFolder(
    scanId: string,
    options: {
      limit?: number;
      offset?: number;
      minRiskLevel?: 'critical' | 'high' | 'medium' | 'low';
    } = {}
  ): Promise<{
    folders: FolderSummary[];
    total: number;
  }> {
    const { limit = 20, offset = 0, minRiskLevel } = options;
    const filesRef = scansRef.doc(scanId).collection('files');

    // リスクレベルに応じてフィルタ
    let query: FirebaseFirestore.Query = filesRef;
    if (minRiskLevel) {
      const riskLevels = getRiskLevelsAbove(minRiskLevel);
      if (riskLevels.length > 0) {
        query = query.where('riskLevel', 'in', riskLevels);
      }
    }

    // 全ファイルを取得してメモリ上でグループ化
    const snapshot = await query.get();
    const files = snapshot.docs.map((doc) => doc.data() as ScannedFile);

    // フォルダごとにグループ化
    const folderMap = new Map<string, {
      id: string;
      name: string;
      files: ScannedFile[];
    }>();

    for (const file of files) {
      const folderId = file.parentFolderId || 'root';
      const folderName = file.parentFolderName || 'マイドライブ';

      if (!folderMap.has(folderId)) {
        folderMap.set(folderId, {
          id: folderId,
          name: folderName,
          files: [],
        });
      }
      folderMap.get(folderId)!.files.push(file);
    }

    // フォルダサマリーを作成
    const folders: FolderSummary[] = [];
    for (const [folderId, folder] of folderMap) {
      const riskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
      let totalRiskScore = 0;
      let highestRiskScore = 0;

      for (const file of folder.files) {
        riskySummary[file.riskLevel]++;
        totalRiskScore += file.riskScore;
        if (file.riskScore > highestRiskScore) {
          highestRiskScore = file.riskScore;
        }
      }

      // 最高リスクレベルを決定
      let highestRiskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (riskySummary.critical > 0) highestRiskLevel = 'critical';
      else if (riskySummary.high > 0) highestRiskLevel = 'high';
      else if (riskySummary.medium > 0) highestRiskLevel = 'medium';

      folders.push({
        id: folderId,
        name: folder.name,
        fileCount: folder.files.length,
        riskySummary,
        highestRiskLevel,
        totalRiskScore,
      });
    }

    // リスクスコア合計の降順でソート
    folders.sort((a, b) => b.totalRiskScore - a.totalRiskScore);

    // ページネーション
    const total = folders.length;
    const paginatedFolders = folders.slice(offset, offset + limit);

    return { folders: paginatedFolders, total };
  },

  /**
   * 特定フォルダ内のファイル一覧を取得
   */
  async getByFolderId(
    scanId: string,
    folderId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'riskScore' | 'name' | 'modifiedTime';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ files: ScannedFile[]; total: number }> {
    const { limit = 20, offset = 0, sortBy = 'riskScore', sortOrder = 'desc' } = options;
    const filesRef = scansRef.doc(scanId).collection('files');

    // フォルダIDでフィルタ
    const isRoot = folderId === 'root';
    let query: FirebaseFirestore.Query = filesRef;

    if (isRoot) {
      query = query.where('parentFolderId', '==', null);
    } else {
      query = query.where('parentFolderId', '==', folderId);
    }

    // 全件取得してメモリ上でソート・ページネーション
    const snapshot = await query.get();
    let files = snapshot.docs.map((doc) => doc.data() as ScannedFile);
    const total = files.length;

    // ソート
    files.sort((a, b) => {
      const aVal = a[sortBy as keyof ScannedFile] as string | number;
      const bVal = b[sortBy as keyof ScannedFile] as string | number;
      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });

    // ページネーション
    files = files.slice(offset, offset + limit);

    return { files, total };
  },

  /**
   * ファイルの権限情報を更新
   */
  async updatePermissions(
    scanId: string,
    fileId: string,
    permissions: ScannedFile['permissions']
  ): Promise<void> {
    const fileRef = scansRef.doc(scanId).collection('files').doc(fileId);
    await fileRef.update({ permissions });
  },
};

/**
 * 指定されたリスクレベル以上のリスクレベル一覧を返す
 */
function getRiskLevelsAbove(minLevel: 'critical' | 'high' | 'medium' | 'low'): string[] {
  const levels: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
  const index = levels.indexOf(minLevel);
  return levels.slice(0, index + 1);
}

/**
 * フォルダサマリー型
 */
export interface FolderSummary {
  id: string;
  name: string;
  fileCount: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  highestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  totalRiskScore: number;
}

export { firestore };
