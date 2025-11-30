import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, OrganizationService, ScannedFileService, ActionLogService, UserService } from '../services/firestore.js';
import type { UserScanSummary } from '../services/firestore.js';
import {
  createDriveClient,
  countAllFiles,
  scanAllFiles,
  getFolderNames,
  deletePermission,
  updatePermissionRole,
  deletePermissionFromFolder,
  getFilePermissions,
  getFileFolderPath,
  type DriveFile,
  type FolderInfo
} from '../services/drive.js';
import { calculateRiskScore, calculateRiskSummary, isInternalOwner, type RiskAssessment } from '../services/risk.js';
import { PLANS, type ScannedFile } from '../types/models.js';

const router = Router();

// 認証必須
router.use(requireAuth);

export interface FileWithRisk extends DriveFile {
  risk: RiskAssessment;
}

/**
 * POST /api/scan/start
 * スキャンを開始
 */
router.post('/start', async (req: Request, res: Response) => {
  const user = req.user!;
  const organization = req.organization!;

  try {
    // プラン制限チェック
    const plan = PLANS[organization.plan];
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // 今月のスキャン回数を取得
    const { scans: recentScans } = await ScanService.getByOrganization(organization.id, 100);
    const monthlyScans = recentScans.filter(
      (scan) => new Date(scan.createdAt) >= thisMonth
    );

    if (plan.scansPerMonth !== -1 && monthlyScans.length >= plan.scansPerMonth) {
      return res.status(403).json({
        error: 'Monthly scan limit reached',
        limit: plan.scansPerMonth,
        used: monthlyScans.length,
      });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    // スキャンレコードを作成
    const scan = await ScanService.create({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.displayName,
      visibility: 'private',  // デフォルトは本人のみ閲覧可能
      status: 'running',
      phase: 'counting',
      totalFiles: 0,
      processedFiles: 0,
      riskySummary: { critical: 0, high: 0, medium: 0, low: 0 },
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    // 非同期でスキャンを実行
    performScan(scan.id, req.session.accessToken, organization.id, organization.domain, plan.maxFilesPerScan);

    res.json({
      scanId: scan.id,
      status: 'running',
      message: 'スキャンを開始しました',
    });
  } catch (err) {
    console.error('Start scan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// 管理者用API（:scanIdパラメータより先に定義）
// ========================================

/**
 * GET /api/scan/admin/users
 * 組織内ユーザーのスキャンサマリーを取得（管理者専用）
 */
router.get('/admin/users', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const summaries = await ScanService.getUserScanSummaries(organization.id);

    // スキャン実施状況の統計
    const stats = {
      totalUsers: summaries.length,
      usersWithScans: summaries.filter(s => s.lastScanAt !== null).length,
      usersWithoutScans: summaries.filter(s => s.lastScanAt === null).length,
      totalRisks: {
        critical: summaries.reduce((acc, s) => acc + (s.riskySummary?.critical || 0), 0),
        high: summaries.reduce((acc, s) => acc + (s.riskySummary?.high || 0), 0),
        medium: summaries.reduce((acc, s) => acc + (s.riskySummary?.medium || 0), 0),
        low: summaries.reduce((acc, s) => acc + (s.riskySummary?.low || 0), 0),
      },
    };

    res.json({ users: summaries, stats });
  } catch (err) {
    console.error('Get user scan summaries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/admin/users/:userId/scans
 * 特定ユーザーのスキャン一覧を取得（管理者専用）
 */
router.get('/admin/users/:userId/scans', async (req: Request, res: Response) => {
  const { userId: targetUserId } = req.params;
  const organization = req.organization!;
  const user = req.user!;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // 対象ユーザーが同じ組織に所属しているか確認
    const targetUser = await UserService.getById(targetUserId);
    if (!targetUser || targetUser.organizationId !== organization.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { scans, total } = await ScanService.getByUser(organization.id, targetUserId, limit, offset);

    res.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        role: targetUser.role,
      },
      scans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scans.length < total,
      },
    });
  } catch (err) {
    console.error('Get user scans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/admin/all
 * 組織の全スキャンを取得（管理者専用）
 */
router.get('/admin/all', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const { scans, total } = await ScanService.getByOrganization(organization.id, limit, offset);

    res.json({
      scans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scans.length < total,
      },
    });
  } catch (err) {
    console.error('Get all scans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// 通常API（:scanIdパラメータを使用）
// ========================================

/**
 * GET /api/scan/:scanId
 * スキャン結果を取得
 */
router.get('/:scanId', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    const scan = await ScanService.getById(scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // 所属組織のスキャンかチェック
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // アクセス権限チェック
    if (!ScanService.canAccessScan(scan, user.id, user.role)) {
      return res.status(403).json({ error: 'このスキャン結果へのアクセス権限がありません' });
    }

    res.json({ scan });
  } catch (err) {
    console.error('Get scan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/files
 * スキャンしたファイル一覧を取得
 */
router.get('/:scanId/files', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // アクセス権限チェック
    if (!ScanService.canAccessScan(scan, user.id, user.role)) {
      return res.status(403).json({ error: 'このスキャン結果へのアクセス権限がありません' });
    }

    // クエリパラメータ
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const riskLevel = req.query.riskLevel as 'critical' | 'high' | 'medium' | 'low' | undefined;
    const ownerType = req.query.ownerType as 'all' | 'internal' | 'external' | undefined;
    const sortBy = (req.query.sortBy as 'riskScore' | 'name' | 'modifiedTime') || 'riskScore';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const { files, total } = await ScannedFileService.getAll(scanId, {
      limit,
      offset,
      riskLevel,
      ownerType,
      sortBy,
      sortOrder,
    });

    res.json({
      files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + files.length < total,
      },
    });
  } catch (err) {
    console.error('Get scan files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/files/:fileId
 * 特定ファイルの詳細を取得
 */
router.get('/:scanId/files/:fileId', async (req: Request, res: Response) => {
  const { scanId, fileId } = req.params;
  const organization = req.organization!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const file = await ScannedFileService.getById(scanId, fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ file });
  } catch (err) {
    console.error('Get scan file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/folders
 * フォルダ別にファイルを集計
 */
router.get('/:scanId/folders', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // クエリパラメータ
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const minRiskLevel = req.query.minRiskLevel as 'critical' | 'high' | 'medium' | 'low' | undefined;

    const { folders, total } = await ScannedFileService.getByFolder(scanId, {
      limit,
      offset,
      minRiskLevel,
    });

    res.json({
      folders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + folders.length < total,
      },
    });
  } catch (err) {
    console.error('Get scan folders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/folders/:folderId/files
 * 特定フォルダ内のファイル一覧を取得
 */
router.get('/:scanId/folders/:folderId/files', async (req: Request, res: Response) => {
  const { scanId, folderId } = req.params;
  const organization = req.organization!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // クエリパラメータ
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as 'riskScore' | 'name' | 'modifiedTime') || 'riskScore';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const { files, total } = await ScannedFileService.getByFolderId(scanId, folderId, {
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    res.json({
      files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + files.length < total,
      },
    });
  } catch (err) {
    console.error('Get folder files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// スキャンタイムアウト: 10分
const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * GET /api/scan
 * スキャン履歴を取得（アクセス権限に応じてフィルタ）
 * - member: 自分のスキャンのみ
 * - admin/owner: 全員のスキャン
 */
router.get('/', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // アクセス権限に応じてスキャン一覧を取得
    const { scans, total } = await ScanService.getAccessibleScans(
      organization.id,
      user.id,
      user.role,
      limit,
      offset
    );

    // 古いrunning状態のスキャンをタイムアウトとしてマーク
    const now = Date.now();
    const updatedScans = await Promise.all(
      scans.map(async (scan) => {
        if (scan.status === 'running') {
          const startedAt = new Date(scan.startedAt).getTime();
          if (now - startedAt > SCAN_TIMEOUT_MS) {
            // タイムアウトとして更新
            await ScanService.fail(scan.id, 'スキャンがタイムアウトしました');
            return {
              ...scan,
              status: 'failed' as const,
              errorMessage: 'スキャンがタイムアウトしました',
            };
          }
        }
        return scan;
      })
    );

    res.json({
      scans: updatedScans,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scans.length < total,
      },
    });
  } catch (err) {
    console.error('Get scan history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * スキャン実行（非同期）- 2フェーズ方式
 * Phase 1: ファイル数カウント（高速）
 * Phase 2: 詳細スキャン（進捗表示付き）
 */
async function performScan(
  scanId: string,
  accessToken: string,
  organizationId: string,
  organizationDomain: string,
  maxFiles: number
): Promise<void> {
  try {
    const drive = createDriveClient(accessToken);

    // ========================================
    // Phase 1: ファイル数カウント（高速）
    // ========================================
    console.log(`Scan ${scanId}: Phase 1 - Counting files...`);
    await ScanService.update(scanId, {
      phase: 'counting',
      processedFiles: 0,
    });

    const { count: totalFileCount } = await countAllFiles(drive, { maxFiles });

    console.log(`Scan ${scanId}: Found ${totalFileCount} files`);

    // カウント完了、スキャンフェーズへ移行
    await ScanService.update(scanId, {
      totalFiles: totalFileCount,
      phase: 'scanning',
      processedFiles: 0,
    });

    // ========================================
    // Phase 2: 詳細スキャン
    // ========================================
    console.log(`Scan ${scanId}: Phase 2 - Scanning files...`);
    const allFiles: FileWithRisk[] = [];
    let processedCount = 0;

    // ファイルをスキャン
    for await (const files of scanAllFiles(drive, { maxFiles })) {
      for (const file of files) {
        const risk = calculateRiskScore(file, organizationDomain);
        allFiles.push({ ...file, risk });
      }

      processedCount += files.length;

      // 定期的に進捗を更新
      await ScanService.update(scanId, {
        processedFiles: processedCount,
      });
    }

    // リスクサマリーを計算
    const summary = calculateRiskSummary(
      allFiles.map((f) => ({
        ...f,
        permissions: f.permissions,
      })),
      organizationDomain
    );

    // ========================================
    // 親フォルダ名を一括取得
    // ========================================
    console.log(`Scan ${scanId}: Resolving folder names...`);
    const parentFolderIds = allFiles
      .map((file) => file.parents?.[0])
      .filter((id): id is string => !!id);
    const folderNameMap = await getFolderNames(drive, parentFolderIds);
    console.log(`Scan ${scanId}: Resolved ${folderNameMap.size} folder names`);

    // ファイルをFirestoreに保存（バッチで保存）
    const BATCH_SIZE = 500; // Firestoreのバッチ上限
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      const filesToSave: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = batch.map((file) => {
        const parentFolderId = file.parents?.[0] || null;
        const parentFolderName = parentFolderId ? folderNameMap.get(parentFolderId) || null : null;

        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          webViewLink: file.webViewLink,
          iconLink: file.iconLink,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          size: file.size,
          ownerEmail: file.owners[0]?.email || '',
          ownerName: file.owners[0]?.displayName || '',
          isInternalOwner: isInternalOwner(file, organizationDomain),
          parentFolderId,
          parentFolderName,
          shared: file.shared,
          permissions: file.permissions.map((p) => ({
            id: p.id,
            type: p.type,
            role: p.role,
            emailAddress: p.emailAddress,
            domain: p.domain,
            displayName: p.displayName,
          })),
          riskScore: file.risk.score,
          riskLevel: file.risk.level,
          riskFactors: file.risk.issues.map((issue) => issue.description),
          recommendations: file.risk.recommendations,
        };
      });

      await ScannedFileService.saveBatch(scanId, filesToSave);
    }

    // スキャン完了
    await ScanService.complete(scanId, {
      totalFiles: summary.totalFiles,
      riskySummary: summary.riskySummary,
      phase: 'done',
      processedFiles: summary.totalFiles,
    });

    // 組織の統計を更新
    await OrganizationService.incrementScanStats(organizationId, summary.totalFiles);

    console.log(`Scan ${scanId} completed: ${summary.totalFiles} files saved to Firestore`);
  } catch (err) {
    console.error(`Scan ${scanId} failed:`, err);
    await ScanService.fail(scanId, (err as Error).message);
  }
}

// ========================================
// 権限変更API
// ========================================

/**
 * DELETE /api/scan/:scanId/files/:fileId/permissions/:permissionId
 * ファイルから権限を削除
 */
router.delete('/:scanId/files/:fileId/permissions/:permissionId', async (req: Request, res: Response) => {
  const { scanId, fileId, permissionId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    // スキャンファイル情報を取得（ログ用）
    const scannedFile = await ScannedFileService.getById(scanId, fileId);
    const targetPermission = scannedFile?.permissions.find(p => p.id === permissionId);

    const drive = createDriveClient(req.session.accessToken);
    const result = await deletePermission(drive, fileId, permissionId);

    // アクションログを記録
    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_delete',
      targetType: 'file',
      targetId: fileId,
      targetName: scannedFile?.name || fileId,
      details: {
        permissionId,
        targetEmail: targetPermission?.emailAddress || targetPermission?.domain || undefined,
        targetType: targetPermission?.type,
        oldRole: targetPermission?.role,
      },
      success: result.success,
      errorMessage: result.error,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の削除に失敗しました' });
    }

    // Firestoreのスキャンデータを更新（権限を削除）
    if (scannedFile) {
      const updatedPermissions = scannedFile.permissions.filter(p => p.id !== permissionId);
      await ScannedFileService.updatePermissions(scanId, fileId, updatedPermissions);
    }

    res.json({
      success: true,
      message: '権限を削除しました',
      fileId,
      permissionId,
    });
  } catch (err) {
    console.error('Delete permission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/scan/:scanId/files/:fileId/permissions/:permissionId
 * 権限のロールを更新
 */
router.put('/:scanId/files/:fileId/permissions/:permissionId', async (req: Request, res: Response) => {
  const { scanId, fileId, permissionId } = req.params;
  const { role } = req.body;
  const organization = req.organization!;
  const user = req.user!;

  // ロールのバリデーション
  const validRoles = ['reader', 'commenter', 'writer'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: '有効なロールを指定してください: reader, commenter, writer' });
  }

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    // スキャンファイル情報を取得（ログ用）
    const scannedFile = await ScannedFileService.getById(scanId, fileId);
    const targetPermission = scannedFile?.permissions.find(p => p.id === permissionId);
    const oldRole = targetPermission?.role;

    const drive = createDriveClient(req.session.accessToken);
    const result = await updatePermissionRole(drive, fileId, permissionId, role);

    // アクションログを記録
    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_update',
      targetType: 'file',
      targetId: fileId,
      targetName: scannedFile?.name || fileId,
      details: {
        permissionId,
        targetEmail: targetPermission?.emailAddress || targetPermission?.domain || undefined,
        targetType: targetPermission?.type,
        oldRole,
        newRole: role,
      },
      success: result.success,
      errorMessage: result.error,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の更新に失敗しました' });
    }

    // Firestoreのスキャンデータを更新
    if (scannedFile && result.permission) {
      const updatedPermissions = scannedFile.permissions.map(p =>
        p.id === permissionId ? { ...p, role: result.permission!.role } : p
      );
      await ScannedFileService.updatePermissions(scanId, fileId, updatedPermissions);
    }

    res.json({
      success: true,
      message: '権限を更新しました',
      fileId,
      permissionId,
      permission: result.permission,
    });
  } catch (err) {
    console.error('Update permission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/files/:fileId/permissions
 * ファイルの最新の権限情報を取得（Drive APIから直接取得）
 */
router.get('/:scanId/files/:fileId/permissions', async (req: Request, res: Response) => {
  const { scanId, fileId } = req.params;
  const organization = req.organization!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    const drive = createDriveClient(req.session.accessToken);
    const permissions = await getFilePermissions(drive, fileId);

    res.json({
      fileId,
      permissions,
    });
  } catch (err) {
    console.error('Get permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scan/:scanId/files/:fileId/folder-path
 * ファイルのフォルダ階層（パス）を取得（権限情報付き）
 */
router.get('/:scanId/files/:fileId/folder-path', async (req: Request, res: Response) => {
  const { scanId, fileId } = req.params;
  const organization = req.organization!;

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    // スキャンデータからファイル情報を取得（parentFolderIdを取得するため）
    const scannedFile = await ScannedFileService.getById(scanId, fileId);
    if (!scannedFile) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 親フォルダIDがない場合は空のパスを返す（マイドライブ直下）
    if (!scannedFile.parentFolderId) {
      return res.json({
        fileId,
        folderPath: [],
      });
    }

    const drive = createDriveClient(req.session.accessToken);
    const folderPath = await getFileFolderPath(drive, scannedFile.parentFolderId);

    res.json({
      fileId,
      folderPath,
    });
  } catch (err) {
    console.error('Get folder path error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// 一括操作API
// ========================================

/**
 * POST /api/scan/:scanId/bulk/permissions/delete
 * 複数ファイルから権限を一括削除
 */
router.post('/:scanId/bulk/permissions/delete', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const { fileIds, permissionFilter } = req.body as {
    fileIds: string[];
    permissionFilter: {
      type?: 'user' | 'group' | 'domain' | 'anyone';
      email?: string;
      role?: string;
    };
  };
  const organization = req.organization!;
  const user = req.user!;

  // バリデーション
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'ファイルIDを指定してください' });
  }
  if (fileIds.length > 100) {
    return res.status(400).json({ error: '一度に処理できるファイルは100件までです' });
  }
  if (!permissionFilter || (!permissionFilter.type && !permissionFilter.email && !permissionFilter.role)) {
    return res.status(400).json({ error: '削除する権限の条件を指定してください' });
  }

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    const drive = createDriveClient(req.session.accessToken);
    const results: { fileId: string; fileName: string; success: boolean; permissionId?: string; error?: string }[] = [];

    // 各ファイルを処理
    for (const fileId of fileIds) {
      const scannedFile = await ScannedFileService.getById(scanId, fileId);
      if (!scannedFile) {
        results.push({ fileId, fileName: fileId, success: false, error: 'ファイルが見つかりません' });
        continue;
      }

      // 自社所有のファイルのみ操作可能
      if (!scannedFile.isInternalOwner) {
        results.push({ fileId, fileName: scannedFile.name, success: false, error: '外部所有のファイルは変更できません' });
        continue;
      }

      // 条件に一致する権限を検索
      const matchingPermissions = scannedFile.permissions.filter(p => {
        if (p.role === 'owner') return false; // オーナーは削除不可
        if (permissionFilter.type && p.type !== permissionFilter.type) return false;
        if (permissionFilter.email && p.emailAddress !== permissionFilter.email && p.domain !== permissionFilter.email) return false;
        if (permissionFilter.role && p.role !== permissionFilter.role) return false;
        return true;
      });

      if (matchingPermissions.length === 0) {
        results.push({ fileId, fileName: scannedFile.name, success: true, error: '削除対象の権限がありません' });
        continue;
      }

      // 各権限を削除
      for (const perm of matchingPermissions) {
        const result = await deletePermission(drive, fileId, perm.id);

        results.push({
          fileId,
          fileName: scannedFile.name,
          success: result.success,
          permissionId: perm.id,
          error: result.error,
        });

        // Firestoreの権限情報を更新
        if (result.success) {
          const updatedPermissions = scannedFile.permissions.filter(p => p.id !== perm.id);
          await ScannedFileService.updatePermissions(scanId, fileId, updatedPermissions);
        }
      }
    }

    // アクションログを記録
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_bulk_delete',
      targetType: 'file',
      targetId: scanId,
      targetName: `${fileIds.length}件のファイル`,
      details: {
        fileIds,
        filter: permissionFilter,
        successCount,
        failedCount,
      },
      success: successCount > 0,
      errorMessage: failedCount > 0 ? `${failedCount}件の削除に失敗` : undefined,
    });

    res.json({
      success: true,
      message: `${successCount}件の権限を削除しました`,
      results: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        details: results,
      },
    });
  } catch (err) {
    console.error('Bulk delete permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/scan/:scanId/bulk/permissions/demote
 * 複数ファイルの編集者権限を閲覧者に一括変更
 */
router.post('/:scanId/bulk/permissions/demote', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const { fileIds, permissionFilter } = req.body as {
    fileIds: string[];
    permissionFilter?: {
      type?: 'user' | 'group' | 'domain' | 'anyone';
      email?: string;
    };
  };
  const organization = req.organization!;
  const user = req.user!;

  // バリデーション
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'ファイルIDを指定してください' });
  }
  if (fileIds.length > 100) {
    return res.status(400).json({ error: '一度に処理できるファイルは100件までです' });
  }

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    const drive = createDriveClient(req.session.accessToken);
    const results: { fileId: string; fileName: string; success: boolean; permissionId?: string; oldRole?: string; error?: string }[] = [];

    // 各ファイルを処理
    for (const fileId of fileIds) {
      const scannedFile = await ScannedFileService.getById(scanId, fileId);
      if (!scannedFile) {
        results.push({ fileId, fileName: fileId, success: false, error: 'ファイルが見つかりません' });
        continue;
      }

      // 自社所有のファイルのみ操作可能
      if (!scannedFile.isInternalOwner) {
        results.push({ fileId, fileName: scannedFile.name, success: false, error: '外部所有のファイルは変更できません' });
        continue;
      }

      // 編集者権限を検索（writer, organizer, fileOrganizer）
      const editorPermissions = scannedFile.permissions.filter(p => {
        if (p.role === 'owner') return false;
        if (!['writer', 'organizer', 'fileOrganizer'].includes(p.role)) return false;
        if (permissionFilter?.type && p.type !== permissionFilter.type) return false;
        if (permissionFilter?.email && p.emailAddress !== permissionFilter.email && p.domain !== permissionFilter.email) return false;
        return true;
      });

      if (editorPermissions.length === 0) {
        results.push({ fileId, fileName: scannedFile.name, success: true, error: '変更対象の編集者権限がありません' });
        continue;
      }

      // 各権限を閲覧者に変更
      for (const perm of editorPermissions) {
        const result = await updatePermissionRole(drive, fileId, perm.id, 'reader');

        results.push({
          fileId,
          fileName: scannedFile.name,
          success: result.success,
          permissionId: perm.id,
          oldRole: perm.role,
          error: result.error,
        });

        // Firestoreの権限情報を更新
        if (result.success && result.permission) {
          const updatedPermissions = scannedFile.permissions.map(p =>
            p.id === perm.id ? { ...p, role: result.permission!.role } : p
          );
          await ScannedFileService.updatePermissions(scanId, fileId, updatedPermissions);
        }
      }
    }

    // アクションログを記録
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_bulk_update',
      targetType: 'file',
      targetId: scanId,
      targetName: `${fileIds.length}件のファイル`,
      details: {
        fileIds,
        filter: permissionFilter,
        newRole: 'reader',
        successCount,
        failedCount,
      },
      success: successCount > 0,
      errorMessage: failedCount > 0 ? `${failedCount}件の変更に失敗` : undefined,
    });

    res.json({
      success: true,
      message: `${successCount}件の権限を閲覧者に変更しました`,
      results: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        details: results,
      },
    });
  } catch (err) {
    console.error('Bulk demote permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/scan/:scanId/bulk/remove-public-access
 * 複数ファイルの「リンクを知っている全員」アクセスを一括削除
 */
router.post('/:scanId/bulk/remove-public-access', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const { fileIds } = req.body as { fileIds: string[] };
  const organization = req.organization!;
  const user = req.user!;

  // バリデーション
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'ファイルIDを指定してください' });
  }
  if (fileIds.length > 100) {
    return res.status(400).json({ error: '一度に処理できるファイルは100件までです' });
  }

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    const drive = createDriveClient(req.session.accessToken);
    const results: { fileId: string; fileName: string; success: boolean; error?: string }[] = [];

    // 各ファイルを処理
    for (const fileId of fileIds) {
      const scannedFile = await ScannedFileService.getById(scanId, fileId);
      if (!scannedFile) {
        results.push({ fileId, fileName: fileId, success: false, error: 'ファイルが見つかりません' });
        continue;
      }

      // 自社所有のファイルのみ操作可能
      if (!scannedFile.isInternalOwner) {
        results.push({ fileId, fileName: scannedFile.name, success: false, error: '外部所有のファイルは変更できません' });
        continue;
      }

      // anyoneタイプの権限を検索
      const anyonePermission = scannedFile.permissions.find(p => p.type === 'anyone');
      if (!anyonePermission) {
        results.push({ fileId, fileName: scannedFile.name, success: true, error: '公開アクセスがありません' });
        continue;
      }

      // 権限を削除
      const result = await deletePermission(drive, fileId, anyonePermission.id);

      results.push({
        fileId,
        fileName: scannedFile.name,
        success: result.success,
        error: result.error,
      });

      // Firestoreの権限情報を更新
      if (result.success) {
        const updatedPermissions = scannedFile.permissions.filter(p => p.type !== 'anyone');
        await ScannedFileService.updatePermissions(scanId, fileId, updatedPermissions);
      }
    }

    // アクションログを記録
    const successCount = results.filter(r => r.success && !r.error?.includes('公開アクセスがありません')).length;
    const failedCount = results.filter(r => !r.success).length;

    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_bulk_delete',
      targetType: 'file',
      targetId: scanId,
      targetName: `${fileIds.length}件のファイル`,
      details: {
        fileIds,
        action: 'remove_public_access',
        successCount,
        failedCount,
      },
      success: successCount > 0,
      errorMessage: failedCount > 0 ? `${failedCount}件の削除に失敗` : undefined,
    });

    res.json({
      success: true,
      message: `${successCount}件のファイルの公開アクセスを削除しました`,
      results: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        details: results,
      },
    });
  } catch (err) {
    console.error('Bulk remove public access error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/scan/:scanId/folders/:folderId/permissions
 * フォルダ内の全ファイルから特定の権限を一括削除
 */
router.delete('/:scanId/folders/:folderId/permissions', async (req: Request, res: Response) => {
  const { scanId, folderId } = req.params;
  const { email, type } = req.body;
  const organization = req.organization!;
  const user = req.user!;

  // バリデーション
  const validTypes = ['user', 'group', 'domain', 'anyone'];
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: '有効な権限タイプを指定してください: user, group, domain, anyone' });
  }
  if (type !== 'anyone' && !email) {
    return res.status(400).json({ error: 'メールアドレスまたはドメインを指定してください' });
  }

  try {
    // スキャンの存在確認と権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // admin/ownerのみ権限変更可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '権限変更は管理者のみ実行できます' });
    }

    // アクセストークンの確認
    if (!req.session.accessToken) {
      return res.status(401).json({ error: 'Access token not available' });
    }

    const drive = createDriveClient(req.session.accessToken);
    const result = await deletePermissionFromFolder(drive, folderId, email || '', type);

    // アクションログを記録
    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_bulk_delete',
      targetType: 'folder',
      targetId: folderId,
      targetName: folderId, // フォルダ名は取得していないのでIDを使用
      details: {
        targetEmail: email || undefined,
        targetType: type as 'user' | 'group' | 'domain' | 'anyone',
        affectedCount: result.success,
      },
      success: result.success > 0,
      errorMessage: result.failed > 0 ? `${result.failed}件の削除に失敗` : undefined,
    });

    res.json({
      success: true,
      message: `${result.success}件の権限を削除しました`,
      folderId,
      results: {
        success: result.success,
        failed: result.failed,
        errors: result.errors.slice(0, 10), // エラーは最大10件まで返す
      },
    });
  } catch (err) {
    console.error('Delete folder permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
