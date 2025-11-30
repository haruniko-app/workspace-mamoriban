import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, OrganizationService, ScannedFileService } from '../services/firestore.js';
import {
  createDriveClient,
  countAllFiles,
  scanAllFiles,
  getFolderNames,
  deletePermission,
  updatePermissionRole,
  deletePermissionFromFolder,
  getFilePermissions,
  type DriveFile
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
    const recentScans = await ScanService.getByOrganization(organization.id, 100);
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

/**
 * GET /api/scan/:scanId
 * スキャン結果を取得
 */
router.get('/:scanId', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;

  try {
    const scan = await ScanService.getById(scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // 所属組織のスキャンかチェック
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
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
 * GET /api/scan/history
 * スキャン履歴を取得
 */
router.get('/', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const scans = await ScanService.getByOrganization(organization.id, limit);

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

    res.json({ scans: updatedScans });
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

    const drive = createDriveClient(req.session.accessToken);
    const result = await deletePermission(drive, fileId, permissionId);

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の削除に失敗しました' });
    }

    // Firestoreのスキャンデータを更新（権限を削除）
    const scannedFile = await ScannedFileService.getById(scanId, fileId);
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

    const drive = createDriveClient(req.session.accessToken);
    const result = await updatePermissionRole(drive, fileId, permissionId, role);

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の更新に失敗しました' });
    }

    // Firestoreのスキャンデータを更新
    const scannedFile = await ScannedFileService.getById(scanId, fileId);
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
