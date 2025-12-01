import { Firestore } from '@google-cloud/firestore';
import type { Organization, User, Scan, ScannedFile, ActionLog, NotificationSettings, NotificationLog, ServiceAccountConfig, IntegratedScanJob, IntegratedScanUserResult } from '../types/models.js';

// Firestore初期化
const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'workspace-mamoriban',
});

// コレクション参照
const organizationsRef = firestore.collection('organizations');
const usersRef = firestore.collection('users');
const scansRef = firestore.collection('scans');
const actionLogsRef = firestore.collection('actionLogs');
const notificationSettingsRef = firestore.collection('notificationSettings');
const notificationLogsRef = firestore.collection('notificationLogs');
const integratedScanJobsRef = firestore.collection('integratedScanJobs');

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

  /**
   * サービスアカウント設定を保存
   */
  async saveServiceAccountConfig(
    id: string,
    config: ServiceAccountConfig
  ): Promise<void> {
    await organizationsRef.doc(id).update({
      serviceAccountConfig: config,
      updatedAt: new Date(),
    });
  },

  /**
   * サービスアカウント設定を取得
   */
  async getServiceAccountConfig(id: string): Promise<ServiceAccountConfig | null> {
    const org = await this.getById(id);
    return org?.serviceAccountConfig || null;
  },

  /**
   * サービスアカウント検証状態を更新
   */
  async updateServiceAccountVerification(
    id: string,
    status: 'pending' | 'verified' | 'failed',
    error?: string
  ): Promise<void> {
    const org = await this.getById(id);
    if (!org?.serviceAccountConfig) {
      throw new Error('Service account not configured');
    }

    await organizationsRef.doc(id).update({
      'serviceAccountConfig.verificationStatus': status,
      'serviceAccountConfig.lastVerifiedAt': new Date(),
      'serviceAccountConfig.verificationError': error || null,
      updatedAt: new Date(),
    });
  },

  /**
   * サービスアカウント設定を削除
   */
  async deleteServiceAccountConfig(id: string): Promise<void> {
    await organizationsRef.doc(id).update({
      serviceAccountConfig: null,
      updatedAt: new Date(),
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

  /**
   * ユーザーがアクセス可能なスキャン一覧を取得
   * - member: 自分のスキャンのみ
   * - admin/owner: 全員のスキャン
   */
  async getAccessibleScans(
    organizationId: string,
    userId: string,
    userRole: 'owner' | 'admin' | 'member',
    limit = 10,
    offset = 0
  ): Promise<{ scans: Scan[]; total: number }> {
    let query: FirebaseFirestore.Query = scansRef.where('organizationId', '==', organizationId);

    // memberは自分のスキャンのみ閲覧可能
    if (userRole === 'member') {
      query = query.where('userId', '==', userId);
    }

    // カウント取得
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // ページネーション付きで取得
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit + offset)
      .get();

    const allScans = snapshot.docs.map((doc) => convertScanTimestamps(doc.data() as Scan));
    const scans = allScans.slice(offset, offset + limit);

    return { scans, total };
  },

  /**
   * スキャンへのアクセス権限をチェック
   */
  canAccessScan(scan: Scan, userId: string, userRole: 'owner' | 'admin' | 'member'): boolean {
    // admin/ownerは全スキャンにアクセス可能
    if (userRole === 'admin' || userRole === 'owner') {
      return true;
    }
    // memberは自分のスキャンのみ
    return scan.userId === userId;
  },

  /**
   * スキャンの編集権限をチェック
   */
  canEditScan(scan: Scan, userId: string, userRole: 'owner' | 'admin' | 'member'): boolean {
    // ownerは全スキャンを編集可能
    if (userRole === 'owner') {
      return true;
    }
    // admin/memberは自分のスキャンのみ編集可能
    return scan.userId === userId;
  },

  /**
   * 組織の全スキャンを取得（後方互換性のため残す、管理者専用）
   */
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

  /**
   * 特定ユーザーのスキャン一覧を取得（管理者用）
   */
  async getByUser(
    organizationId: string,
    targetUserId: string,
    limit = 10,
    offset = 0
  ): Promise<{ scans: Scan[]; total: number }> {
    const query = scansRef
      .where('organizationId', '==', organizationId)
      .where('userId', '==', targetUserId);

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit + offset)
      .get();

    const allScans = snapshot.docs.map((doc) => convertScanTimestamps(doc.data() as Scan));
    const scans = allScans.slice(offset, offset + limit);

    return { scans, total };
  },

  /**
   * 組織内のユーザーごとのスキャンサマリーを取得（管理者ダッシュボード用）
   */
  async getUserScanSummaries(organizationId: string): Promise<UserScanSummary[]> {
    // 全ユーザーを取得
    const users = await UserService.getByOrganization(organizationId);

    // 各ユーザーの最新スキャンを取得
    const summaries: UserScanSummary[] = [];

    for (const user of users) {
      const { scans } = await this.getByUser(organizationId, user.id, 1);
      const latestScan = scans[0] || null;

      summaries.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.displayName,
        userRole: user.role,
        lastScanAt: latestScan?.completedAt || null,
        lastScanStatus: latestScan?.status || null,
        riskySummary: latestScan?.riskySummary || null,
        totalFiles: latestScan?.totalFiles || 0,
      });
    }

    return summaries;
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
      driveChangeToken?: string | null;
      scannedNewFiles?: number;
      copiedFiles?: number;
    }
  ): Promise<void> {
    const updateData: Partial<Scan> & { completedAt: Date } = {
      status: 'completed',
      totalFiles: result.totalFiles,
      riskySummary: result.riskySummary,
      phase: result.phase || 'done',
      processedFiles: result.processedFiles ?? result.totalFiles,
      completedAt: new Date(),
    };

    // 差分スキャン関連フィールド
    if (result.driveChangeToken !== undefined) {
      updateData.driveChangeToken = result.driveChangeToken;
    }
    if (result.scannedNewFiles !== undefined) {
      updateData.scannedNewFiles = result.scannedNewFiles;
    }
    if (result.copiedFiles !== undefined) {
      updateData.copiedFiles = result.copiedFiles;
    }

    await scansRef.doc(id).update(updateData);
  },

  async fail(id: string, errorMessage: string): Promise<void> {
    await scansRef.doc(id).update({
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  },

  async cancel(id: string): Promise<boolean> {
    const scan = await this.getById(id);
    if (!scan) return false;
    if (scan.status !== 'running') return false;

    await scansRef.doc(id).update({
      status: 'cancelled',
      errorMessage: 'スキャンがキャンセルされました',
      completedAt: new Date(),
    });
    return true;
  },

  /**
   * サーバー起動時に放置された「running」状態のスキャンをクリーンアップ
   * サーバー再起動によって中断されたスキャンを検出して失敗としてマークする
   */
  async cleanupOrphanedScans(): Promise<number> {
    const snapshot = await scansRef.where('status', '==', 'running').get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = firestore.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        status: 'failed',
        errorMessage: 'サーバー再起動により中断されました',
        completedAt: new Date(),
      });
      count++;
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} orphaned running scan(s)`);
    }

    return count;
  },
};

/**
 * ユーザーのスキャンサマリー（管理者ダッシュボード用）
 */
export interface UserScanSummary {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'owner' | 'admin' | 'member';
  lastScanAt: Date | string | null;
  lastScanStatus: 'running' | 'completed' | 'failed' | 'cancelled' | null;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } | null;
  totalFiles: number;
}

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
   * スキャンの全ファイルを取得（差分スキャン用）
   * 注意: 大量ファイルがある場合はメモリを消費するため、差分スキャンでのみ使用
   */
  async getAllFiles(scanId: string): Promise<ScannedFile[]> {
    const filesRef = scansRef.doc(scanId).collection('files');
    const snapshot = await filesRef.get();
    return snapshot.docs.map((doc) => doc.data() as ScannedFile);
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
   *
   * パフォーマンス最適化:
   * - 検索なし: Firestoreクエリで直接ページネーション（高速）
   * - 検索あり: メモリフィルタリング（大量ファイルでは遅い）
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
      search?: string;
    } = {}
  ): Promise<{ files: ScannedFile[]; total: number }> {
    const { limit = 20, offset = 0, riskLevel, ownerType = 'all', sortBy = 'riskScore', sortOrder = 'desc', search } = options;
    const filesRef = scansRef.doc(scanId).collection('files');

    // 検索有無を判定
    const hasSearch = !!search;
    const hasFilter = riskLevel || (ownerType && ownerType !== 'all');

    // 基本クエリの構築
    let baseQuery: FirebaseFirestore.Query = filesRef;
    if (riskLevel) {
      baseQuery = baseQuery.where('riskLevel', '==', riskLevel);
    }
    if (ownerType === 'internal') {
      baseQuery = baseQuery.where('isInternalOwner', '==', true);
    } else if (ownerType === 'external') {
      baseQuery = baseQuery.where('isInternalOwner', '==', false);
    }

    // 検索がない場合: Firestoreクエリで直接ページネーション（高速）
    if (!hasSearch) {
      // カウント取得
      const countSnapshot = await baseQuery.count().get();
      const total = countSnapshot.data().count;

      if (total === 0) {
        return { files: [], total: 0 };
      }

      // Firestoreクエリでソート＋ページネーション
      // Note: フィルター + orderBy には複合インデックスが必要
      // インデックスがない場合は自動的にエラーになり、作成URLがログに出る
      try {
        const dataQuery = baseQuery.orderBy(sortBy, sortOrder).offset(offset).limit(limit);
        const snapshot = await dataQuery.get();
        const files = snapshot.docs.map((doc) => doc.data() as ScannedFile);
        return { files, total };
      } catch (error) {
        // インデックスエラーの場合はフォールバック
        // ただし、大量データでは遅くなる可能性があるため警告ログ
        console.warn('Firestore composite index may be missing, falling back to memory sort:', error);

        // メモリソート（フィルターありの場合のみ、インデックスがない場合の救済）
        if (hasFilter) {
          const allDocs = await baseQuery.get();
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

          const files = allFiles.slice(offset, offset + limit);
          return { files, total };
        }
        throw error;
      }
    }

    // 検索がある場合: メモリフィルタリング（部分一致検索のため）
    // Firestoreは部分一致検索をネイティブサポートしていない
    const allDocs = await baseQuery.get();
    let allFiles = allDocs.docs.map((doc) => doc.data() as ScannedFile);

    // 検索フィルター（ファイル名で部分一致検索）
    const searchLower = search.toLowerCase();
    allFiles = allFiles.filter((file) =>
      file.name.toLowerCase().includes(searchLower)
    );

    // ソート
    allFiles.sort((a, b) => {
      const aVal = a[sortBy as keyof ScannedFile] as string | number;
      const bVal = b[sortBy as keyof ScannedFile] as string | number;
      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });

    // 検索後の件数
    const filteredTotal = allFiles.length;

    // ページネーション
    const files = allFiles.slice(offset, offset + limit);
    return { files, total: filteredTotal };
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
   * フォルダごとにファイルを集計（事前計算済みサマリーを優先使用）
   */
  async getByFolder(
    scanId: string,
    options: {
      limit?: number;
      offset?: number;
      minRiskLevel?: 'critical' | 'high' | 'medium' | 'low';
      ownerType?: 'internal' | 'external';
      search?: string;
      sortBy?: 'riskScore' | 'name' | 'fileCount';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    folders: FolderSummary[];
    total: number;
  }> {
    const { limit = 20, offset = 0, minRiskLevel, ownerType, search, sortBy = 'riskScore', sortOrder = 'desc' } = options;

    // ownerType や search フィルターがある場合は事前計算済みサマリーを使用できない
    // ファイルを直接スキャンしてフィルター適用後に集計する
    const hasAdvancedFilters = ownerType || search;

    // リスクレベルを数値に変換（ソート用）
    const riskLevelPriority = (level: string): number => {
      switch (level) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    if (!hasAdvancedFilters) {
      // まず事前計算済みサマリーを試す（全件取得してソート・ページネーションはJS側で行う）
      const precomputed = await this.getFolderSummaries(scanId, { limit: 10000, offset: 0, minRiskLevel });
      if (precomputed.precomputed) {
        // ソートを適用
        let folders = [...precomputed.folders];
        folders.sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name, 'ja');
              break;
            case 'fileCount':
              comparison = a.fileCount - b.fileCount;
              break;
            case 'riskScore':
            default:
              // まず最高リスクレベルでソート
              const levelDiff = riskLevelPriority(a.highestRiskLevel) - riskLevelPriority(b.highestRiskLevel);
              if (levelDiff !== 0) {
                comparison = levelDiff;
              } else {
                // 同じリスクレベル内では、緊急→高→中→低の順でファイル数でソート
                const criticalDiff = a.riskySummary.critical - b.riskySummary.critical;
                if (criticalDiff !== 0) {
                  comparison = criticalDiff;
                } else {
                  const highDiff = a.riskySummary.high - b.riskySummary.high;
                  if (highDiff !== 0) {
                    comparison = highDiff;
                  } else {
                    const mediumDiff = a.riskySummary.medium - b.riskySummary.medium;
                    if (mediumDiff !== 0) {
                      comparison = mediumDiff;
                    } else {
                      comparison = a.riskySummary.low - b.riskySummary.low;
                    }
                  }
                }
              }
              break;
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });
        // ページネーション
        const total = folders.length;
        const paginatedFolders = folders.slice(offset, offset + limit);
        return { folders: paginatedFolders, total };
      }
    }

    // 事前計算済みサマリーがない場合、またはフィルターがある場合はフォールバック
    if (hasAdvancedFilters) {
      console.log(`Scan ${scanId}: Using file-based folder calculation due to advanced filters (ownerType=${ownerType}, search=${search})`);
    } else {
      console.log(`Scan ${scanId}: No precomputed folder summaries, falling back to legacy method`);
    }
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
    let files = snapshot.docs.map((doc) => doc.data() as ScannedFile);

    // ownerType フィルター適用
    if (ownerType === 'internal') {
      files = files.filter(f => f.isInternalOwner);
    } else if (ownerType === 'external') {
      files = files.filter(f => !f.isInternalOwner);
    }

    // search フィルター適用
    if (search) {
      const searchLower = search.toLowerCase();
      files = files.filter(f =>
        f.name.toLowerCase().includes(searchLower) ||
        f.ownerName?.toLowerCase().includes(searchLower)
      );
    }

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
        parentFolderId: null, // フォールバック用のため親フォルダIDは取得しない
        fileCount: folder.files.length,
        riskySummary,
        highestRiskLevel,
        totalRiskScore,
      });
    }

    // ソート処理
    folders.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'fileCount':
          comparison = a.fileCount - b.fileCount;
          break;
        case 'riskScore':
        default:
          // まず最高リスクレベルでソート
          const levelDiff = riskLevelPriority(a.highestRiskLevel) - riskLevelPriority(b.highestRiskLevel);
          if (levelDiff !== 0) {
            comparison = levelDiff;
          } else {
            // 同じリスクレベル内では、緊急→高→中→低の順でファイル数でソート
            const criticalDiff = a.riskySummary.critical - b.riskySummary.critical;
            if (criticalDiff !== 0) {
              comparison = criticalDiff;
            } else {
              const highDiff = a.riskySummary.high - b.riskySummary.high;
              if (highDiff !== 0) {
                comparison = highDiff;
              } else {
                const mediumDiff = a.riskySummary.medium - b.riskySummary.medium;
                if (mediumDiff !== 0) {
                  comparison = mediumDiff;
                } else {
                  comparison = a.riskySummary.low - b.riskySummary.low;
                }
              }
            }
          }
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

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

    let files: ScannedFile[];
    let total: number;

    if (isRoot) {
      // rootの場合: parentFolderIdがnull、undefined、または存在しないファイルを取得
      // Firestoreは where('field', '==', null) でフィールドが存在しない場合には一致しないため、
      // 全ファイルを取得してメモリでフィルタリングする
      const snapshot = await filesRef.get();
      const allFiles = snapshot.docs.map((doc) => doc.data() as ScannedFile);
      files = allFiles.filter((file) => !file.parentFolderId);
      total = files.length;
    } else {
      const query = filesRef.where('parentFolderId', '==', folderId);
      const snapshot = await query.get();
      files = snapshot.docs.map((doc) => doc.data() as ScannedFile);
      total = files.length;
    }

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

  /**
   * フォルダサマリーを計算して保存（スキャン完了時に呼び出す）
   * @param scanId スキャンID
   * @param folderInfoMap フォルダ情報マップ（親フォルダID解決用）
   * @param preloadedFiles 事前に取得済みのファイル配列（省略時はFirestoreから取得）
   */
  async calculateAndSaveFolderSummaries(
    scanId: string,
    folderInfoMap?: Map<string, { name: string; parentFolderId: string | null }>,
    preloadedFiles?: Omit<ScannedFile, 'scanId' | 'createdAt'>[]
  ): Promise<number> {
    const summariesRef = scansRef.doc(scanId).collection('folderSummaries');

    // ファイル取得: preloadedFilesがあればそれを使用、なければFirestoreから取得
    let files: (ScannedFile | Omit<ScannedFile, 'scanId' | 'createdAt'>)[];
    if (preloadedFiles) {
      console.log(`Using ${preloadedFiles.length} preloaded files for folder summary calculation`);
      files = preloadedFiles;
    } else {
      console.log('Fetching files from Firestore for folder summary calculation');
      const filesRef = scansRef.doc(scanId).collection('files');
      const snapshot = await filesRef.get();
      files = snapshot.docs.map((doc) => doc.data() as ScannedFile);
    }

    // フォルダごとにグループ化
    type FileData = ScannedFile | Omit<ScannedFile, 'scanId' | 'createdAt'>;
    const folderMap = new Map<string, {
      id: string;
      name: string;
      parentFolderId: string | null;
      files: FileData[];
    }>();

    for (const file of files) {
      const folderId = file.parentFolderId || 'root';
      const folderName = file.parentFolderName || 'マイドライブ';
      // フォルダ情報マップから親フォルダIDを取得
      const folderInfo = folderInfoMap?.get(folderId);
      const parentFolderId = folderInfo?.parentFolderId || null;

      if (!folderMap.has(folderId)) {
        folderMap.set(folderId, {
          id: folderId,
          name: folderName,
          parentFolderId,
          files: [],
        });
      }
      folderMap.get(folderId)!.files.push(file);
    }

    // バッチ書き込み（500件ずつ）
    const BATCH_SIZE = 500;
    const folderEntries = Array.from(folderMap.entries());

    for (let i = 0; i < folderEntries.length; i += BATCH_SIZE) {
      const batch = firestore.batch();
      const chunk = folderEntries.slice(i, i + BATCH_SIZE);

      for (const [folderId, folder] of chunk) {
        const riskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
        let totalRiskScore = 0;

        for (const file of folder.files) {
          riskySummary[file.riskLevel]++;
          totalRiskScore += file.riskScore;
        }

        // 最高リスクレベルを決定
        let highestRiskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (riskySummary.critical > 0) highestRiskLevel = 'critical';
        else if (riskySummary.high > 0) highestRiskLevel = 'high';
        else if (riskySummary.medium > 0) highestRiskLevel = 'medium';

        const summary: FolderSummary = {
          id: folderId,
          name: folder.name,
          parentFolderId: folder.parentFolderId,
          fileCount: folder.files.length,
          riskySummary,
          highestRiskLevel,
          totalRiskScore,
        };

        batch.set(summariesRef.doc(folderId), summary);
      }

      await batch.commit();
    }

    return folderMap.size;
  },

  /**
   * 事前計算済みフォルダサマリーを取得
   */
  async getFolderSummaries(
    scanId: string,
    options: {
      limit?: number;
      offset?: number;
      minRiskLevel?: 'critical' | 'high' | 'medium' | 'low';
    } = {}
  ): Promise<{
    folders: FolderSummary[];
    total: number;
    precomputed: boolean;
  }> {
    const { limit = 20, offset = 0, minRiskLevel } = options;
    const summariesRef = scansRef.doc(scanId).collection('folderSummaries');

    // 事前計算済みサマリーが存在するか確認
    const countSnapshot = await summariesRef.count().get();
    const totalCount = countSnapshot.data().count;

    if (totalCount === 0) {
      // 事前計算済みサマリーがない場合はフォールバック
      return { folders: [], total: 0, precomputed: false };
    }

    // クエリを構築
    let query: FirebaseFirestore.Query = summariesRef;

    // リスクレベルでフィルタ
    if (minRiskLevel) {
      const riskLevels = getRiskLevelsAbove(minRiskLevel);
      if (riskLevels.length > 0) {
        query = query.where('highestRiskLevel', 'in', riskLevels);
      }
    }

    // totalRiskScoreで降順ソート
    query = query.orderBy('totalRiskScore', 'desc');

    // カウント
    const filteredCountSnapshot = await query.count().get();
    const total = filteredCountSnapshot.data().count;

    // ページネーション
    query = query.offset(offset).limit(limit);
    const snapshot = await query.get();

    const folders = snapshot.docs.map((doc) => doc.data() as FolderSummary);

    return { folders, total, precomputed: true };
  },

  /**
   * フォルダサマリーが存在するか確認
   */
  async hasFolderSummaries(scanId: string): Promise<boolean> {
    const summariesRef = scansRef.doc(scanId).collection('folderSummaries');
    const countSnapshot = await summariesRef.count().get();
    return countSnapshot.data().count > 0;
  },

  /**
   * 単一フォルダサマリーをIDで取得
   */
  async getFolderSummaryById(
    scanId: string,
    folderId: string
  ): Promise<FolderSummary | null> {
    const summariesRef = scansRef.doc(scanId).collection('folderSummaries');
    const doc = await summariesRef.doc(folderId).get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as FolderSummary;
  },

  /**
   * 指定されたフォルダの直接の子サブフォルダを取得
   */
  async getSubfolders(
    scanId: string,
    parentFolderId: string
  ): Promise<FolderSummary[]> {
    const summariesRef = scansRef.doc(scanId).collection('folderSummaries');
    const query = summariesRef
      .where('parentFolderId', '==', parentFolderId)
      .orderBy('totalRiskScore', 'desc');

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as FolderSummary);
  },

  /**
   * フォルダサマリーを別のスキャンからコピー（差分スキャン最適化用）
   * @param sourceScanId コピー元スキャンID
   * @param targetScanId コピー先スキャンID
   * @returns コピーしたフォルダ数
   */
  async copyFolderSummaries(
    sourceScanId: string,
    targetScanId: string
  ): Promise<number> {
    const sourceRef = scansRef.doc(sourceScanId).collection('folderSummaries');
    const targetRef = scansRef.doc(targetScanId).collection('folderSummaries');

    // ソースのフォルダサマリを全て取得
    const snapshot = await sourceRef.get();
    if (snapshot.empty) {
      return 0;
    }

    // バッチ書き込み（500件ずつ）
    const BATCH_SIZE = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = firestore.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        const summary = doc.data() as FolderSummary;
        batch.set(targetRef.doc(doc.id), summary);
      }

      await batch.commit();
    }

    return docs.length;
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
  parentFolderId: string | null;  // 親フォルダID（サブフォルダ取得用）
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

/**
 * アクションログ関連の操作
 */
export const ActionLogService = {
  /**
   * アクションログを作成
   */
  async create(data: Omit<ActionLog, 'id' | 'createdAt'>): Promise<ActionLog> {
    console.log('[ActionLog] Creating action log:', JSON.stringify(data, null, 2));
    const docRef = actionLogsRef.doc();
    // detailsからundefined値を除去（Firestoreはundefinedを受け付けない）
    const cleanedDetails = Object.fromEntries(
      Object.entries(data.details).filter(([, value]) => value !== undefined)
    ) as ActionLog['details'];
    // errorMessageはnullまたはstringを必ず設定
    const { errorMessage, ...restData } = data;
    const log: ActionLog = {
      ...restData,
      details: cleanedDetails,
      id: docRef.id,
      createdAt: new Date(),
      errorMessage: errorMessage ?? null,
    };
    try {
      await docRef.set(log);
      console.log('[ActionLog] Successfully saved action log:', log.id);
    } catch (err) {
      console.error('[ActionLog] Failed to save action log:', err);
      throw err;
    }
    return log;
  },

  /**
   * 組織のアクションログを取得
   * Firestoreインデックスの問題を回避するため、メモリ上でソート・フィルタを実行
   */
  async getByOrganization(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      actionType?: ActionLog['actionType'];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: ActionLog[]; total: number }> {
    const { limit = 20, offset = 0, actionType, startDate, endDate } = options;
    console.log('[ActionLog] getByOrganization:', { organizationId, options });

    // シンプルなクエリでデータ取得（インデックス不要）
    const query: FirebaseFirestore.Query = actionLogsRef
      .where('organizationId', '==', organizationId);

    const snapshot = await query.get();
    console.log('[ActionLog] Found', snapshot.docs.length, 'logs for org:', organizationId);

    // メモリ上でフィルタ・ソート
    let logs = snapshot.docs.map((doc) => {
      const data = doc.data() as ActionLog;
      return {
        ...data,
        createdAt: toISOString(data.createdAt) as unknown as Date,
      };
    });

    // actionTypeでフィルタ
    if (actionType) {
      logs = logs.filter((log) => log.actionType === actionType);
    }

    // 日付範囲でフィルタ
    if (startDate) {
      logs = logs.filter((log) => new Date(log.createdAt) >= startDate);
    }
    if (endDate) {
      logs = logs.filter((log) => new Date(log.createdAt) <= endDate);
    }

    // createdAtで降順ソート
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = logs.length;

    // ページネーション
    logs = logs.slice(offset, offset + limit);

    return { logs, total };
  },

  /**
   * 権限変更ログを記録
   */
  async logPermissionChange(params: {
    organizationId: string;
    userId: string;
    userEmail: string;
    actionType: 'permission_delete' | 'permission_update' | 'permission_bulk_delete' | 'permission_bulk_update' | 'permission_restore';
    targetType: 'file' | 'folder';
    targetId: string;
    targetName: string;
    details: ActionLog['details'];
    success: boolean;
    errorMessage: string | null;
  }): Promise<ActionLog> {
    return this.create(params);
  },
};

/**
 * 通知設定関連の操作
 */
export const NotificationSettingsService = {
  /**
   * 組織の通知設定を取得（存在しない場合はデフォルト設定を作成）
   */
  async getByOrganization(organizationId: string): Promise<NotificationSettings> {
    const docRef = notificationSettingsRef.doc(organizationId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data() as NotificationSettings;
      return {
        ...data,
        createdAt: toISOString(data.createdAt) as unknown as Date,
        updatedAt: toISOString(data.updatedAt) as unknown as Date,
      };
    }

    // デフォルト設定を作成
    const now = new Date();
    const defaultSettings: NotificationSettings = {
      id: organizationId,
      organizationId,
      emailNotifications: {
        enabled: false,
        recipients: [],
        triggers: {
          scanCompleted: true,
          criticalRiskDetected: true,
          highRiskDetected: false,
          weeklyReport: false,
        },
        thresholds: {
          minRiskScore: 80,
          minCriticalCount: 1,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(defaultSettings);
    return defaultSettings;
  },

  /**
   * 通知設定を更新
   */
  async update(
    organizationId: string,
    updates: Partial<{
      emailNotifications: NotificationSettings['emailNotifications'];
      slackNotifications: NotificationSettings['slackNotifications'];
    }>
  ): Promise<NotificationSettings> {
    const docRef = notificationSettingsRef.doc(organizationId);
    const now = new Date();

    await docRef.update({
      ...updates,
      updatedAt: now,
    });

    return this.getByOrganization(organizationId);
  },

  /**
   * メール受信者を追加
   */
  async addRecipient(organizationId: string, email: string): Promise<void> {
    const settings = await this.getByOrganization(organizationId);
    if (!settings.emailNotifications.recipients.includes(email)) {
      const recipients = [...settings.emailNotifications.recipients, email];
      await this.update(organizationId, {
        emailNotifications: {
          ...settings.emailNotifications,
          recipients,
        },
      });
    }
  },

  /**
   * メール受信者を削除
   */
  async removeRecipient(organizationId: string, email: string): Promise<void> {
    const settings = await this.getByOrganization(organizationId);
    const recipients = settings.emailNotifications.recipients.filter(r => r !== email);
    await this.update(organizationId, {
      emailNotifications: {
        ...settings.emailNotifications,
        recipients,
      },
    });
  },
};

/**
 * 通知ログ関連の操作
 */
export const NotificationLogService = {
  /**
   * 通知ログを作成
   */
  async create(data: Omit<NotificationLog, 'id' | 'createdAt'>): Promise<NotificationLog> {
    const docRef = notificationLogsRef.doc();
    const log: NotificationLog = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    };
    await docRef.set(log);
    return log;
  },

  /**
   * 組織の通知ログを取得
   */
  async getByOrganization(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: NotificationLog['type'];
    } = {}
  ): Promise<{ logs: NotificationLog[]; total: number }> {
    const { limit = 20, offset = 0, type } = options;

    let query: FirebaseFirestore.Query = notificationLogsRef
      .where('organizationId', '==', organizationId);

    if (type) {
      query = query.where('type', '==', type);
    }

    // カウント取得
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // データ取得
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(limit);
    const snapshot = await query.get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data() as NotificationLog;
      return {
        ...data,
        createdAt: toISOString(data.createdAt) as unknown as Date,
      };
    });

    return { logs, total };
  },
};

/**
 * 統合スキャンジョブ関連の操作
 */
export const IntegratedScanJobService = {
  /**
   * ジョブを作成
   */
  async create(data: Omit<IntegratedScanJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegratedScanJob> {
    const docRef = integratedScanJobsRef.doc();
    const now = new Date();
    const job: IntegratedScanJob = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(job);
    return job;
  },

  /**
   * ジョブをIDで取得
   */
  async getById(id: string): Promise<IntegratedScanJob | null> {
    const doc = await integratedScanJobsRef.doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as IntegratedScanJob;
    return {
      ...data,
      startedAt: toISOString(data.startedAt) as unknown as Date,
      completedAt: toISOString(data.completedAt) as unknown as Date,
      createdAt: toISOString(data.createdAt) as unknown as Date,
      updatedAt: toISOString(data.updatedAt) as unknown as Date,
    };
  },

  /**
   * 組織のアクティブなジョブを取得
   */
  async getActiveByOrganization(organizationId: string): Promise<IntegratedScanJob | null> {
    const snapshot = await integratedScanJobsRef
      .where('organizationId', '==', organizationId)
      .where('status', 'in', ['pending', 'running'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as IntegratedScanJob;
    return {
      ...data,
      startedAt: toISOString(data.startedAt) as unknown as Date,
      completedAt: toISOString(data.completedAt) as unknown as Date,
      createdAt: toISOString(data.createdAt) as unknown as Date,
      updatedAt: toISOString(data.updatedAt) as unknown as Date,
    };
  },

  /**
   * 組織の最新ジョブを取得（完了・失敗含む）
   */
  async getLatestByOrganization(organizationId: string): Promise<IntegratedScanJob | null> {
    const snapshot = await integratedScanJobsRef
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data() as IntegratedScanJob;
    return {
      ...data,
      startedAt: toISOString(data.startedAt) as unknown as Date,
      completedAt: toISOString(data.completedAt) as unknown as Date,
      createdAt: toISOString(data.createdAt) as unknown as Date,
      updatedAt: toISOString(data.updatedAt) as unknown as Date,
    };
  },

  /**
   * ジョブのステータスを更新
   */
  async updateStatus(
    id: string,
    status: IntegratedScanJob['status'],
    updates?: Partial<IntegratedScanJob>
  ): Promise<void> {
    await integratedScanJobsRef.doc(id).update({
      status,
      ...updates,
      updatedAt: new Date(),
    });
  },

  /**
   * 現在処理中のユーザーを更新
   */
  async updateCurrentUser(
    id: string,
    currentUserEmail: string | null,
    processedUsers: number
  ): Promise<void> {
    await integratedScanJobsRef.doc(id).update({
      currentUserEmail,
      processedUsers,
      updatedAt: new Date(),
    });
  },

  /**
   * ユーザー結果を更新
   */
  async updateUserResult(
    id: string,
    userIndex: number,
    result: Partial<IntegratedScanUserResult>
  ): Promise<void> {
    const job = await this.getById(id);
    if (!job) throw new Error('Job not found');

    const userResults = [...job.userResults];
    userResults[userIndex] = {
      ...userResults[userIndex],
      ...result,
    };

    // 集計を更新
    const totalRiskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
    let totalFilesScanned = 0;

    for (const ur of userResults) {
      if (ur.status === 'completed') {
        totalRiskySummary.critical += ur.riskySummary.critical;
        totalRiskySummary.high += ur.riskySummary.high;
        totalRiskySummary.medium += ur.riskySummary.medium;
        totalRiskySummary.low += ur.riskySummary.low;
        totalFilesScanned += ur.filesScanned;
      }
    }

    await integratedScanJobsRef.doc(id).update({
      userResults,
      totalRiskySummary,
      totalFilesScanned,
      lastProcessedUserIndex: result.status === 'completed' || result.status === 'failed' || result.status === 'skipped'
        ? userIndex
        : job.lastProcessedUserIndex,
      updatedAt: new Date(),
    });
  },

  /**
   * ジョブを完了としてマーク
   */
  async complete(id: string, errorMessage?: string): Promise<void> {
    await integratedScanJobsRef.doc(id).update({
      status: errorMessage ? 'failed' : 'completed',
      completedAt: new Date(),
      errorMessage: errorMessage || null,
      currentUserEmail: null,
      updatedAt: new Date(),
    });
  },

  /**
   * ジョブをキャンセル
   */
  async cancel(id: string): Promise<void> {
    await integratedScanJobsRef.doc(id).update({
      status: 'cancelled',
      completedAt: new Date(),
      currentUserEmail: null,
      updatedAt: new Date(),
    });
  },

  /**
   * 組織のジョブ履歴を取得
   */
  async getByOrganization(
    organizationId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ jobs: IntegratedScanJob[]; total: number }> {
    const { limit = 10, offset = 0 } = options;

    const countSnapshot = await integratedScanJobsRef
      .where('organizationId', '==', organizationId)
      .count()
      .get();
    const total = countSnapshot.data().count;

    const snapshot = await integratedScanJobsRef
      .where('organizationId', '==', organizationId)
      .orderBy('createdAt', 'desc')
      .limit(limit + offset)
      .get();

    const allJobs = snapshot.docs.map((doc) => {
      const data = doc.data() as IntegratedScanJob;
      return {
        ...data,
        startedAt: toISOString(data.startedAt) as unknown as Date,
        completedAt: toISOString(data.completedAt) as unknown as Date,
        createdAt: toISOString(data.createdAt) as unknown as Date,
        updatedAt: toISOString(data.updatedAt) as unknown as Date,
      };
    });
    const jobs = allJobs.slice(offset, offset + limit);

    return { jobs, total };
  },
};

export { firestore };
