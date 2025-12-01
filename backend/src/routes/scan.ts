import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, OrganizationService, ScannedFileService, ActionLogService, UserService } from '../services/firestore.js';
import type { UserScanSummary } from '../services/firestore.js';
import {
  createDriveClient,
  scanAllFiles,
  countAllFiles,
  getFolderNames,
  getFolderInfoBatch,
  deletePermission,
  updatePermissionRole,
  deletePermissionFromFolder,
  getFilePermissions,
  getFileFolderPath,
  getStartPageToken,
  getChangedFileIds,
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
  const { scanType = 'full', baseScanId } = req.body as { scanType?: 'full' | 'incremental'; baseScanId?: string };

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

    // 差分スキャンの場合、ベーススキャンを確認
    let baseScan = null;
    let changeToken: string | null = null;
    if (scanType === 'incremental') {
      if (!baseScanId) {
        // baseScanIdが指定されていない場合、最新の完了済みスキャンを自動取得
        const { scans } = await ScanService.getAccessibleScans(organization.id, user.id, user.role, 10, 0);
        baseScan = scans.find(s => s.status === 'completed' && s.driveChangeToken);
        if (!baseScan) {
          return res.status(400).json({
            error: '差分スキャンには完了済みのフルスキャンが必要です。先にフルスキャンを実行してください。',
          });
        }
      } else {
        baseScan = await ScanService.getById(baseScanId);
        if (!baseScan || baseScan.organizationId !== organization.id) {
          return res.status(404).json({ error: 'ベーススキャンが見つかりません' });
        }
        if (!baseScan.driveChangeToken) {
          return res.status(400).json({
            error: 'このスキャンには差分スキャン用のトークンがありません。フルスキャンを実行してください。',
          });
        }
      }
      changeToken = baseScan.driveChangeToken;
    }

    // スキャンレコードを作成
    const scan = await ScanService.create({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      userName: user.displayName,
      visibility: 'private',  // デフォルトは本人のみ閲覧可能
      scanType,
      baseScanId: baseScan?.id || null,
      driveChangeToken: null,  // スキャン完了時に設定
      status: 'running',
      phase: 'scanning',  // カウントフェーズをスキップして直接スキャン開始
      totalFiles: 0,
      processedFiles: 0,
      scannedNewFiles: 0,
      copiedFiles: 0,
      riskySummary: { critical: 0, high: 0, medium: 0, low: 0 },
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    // 非同期でスキャンを実行
    if (scanType === 'incremental' && baseScan && changeToken) {
      performIncrementalScan(
        scan.id,
        req.session.accessToken,
        organization.id,
        organization.domain,
        plan.maxFilesPerScan,
        baseScan.id,
        changeToken
      );
    } else {
      performScan(scan.id, req.session.accessToken, organization.id, organization.domain, plan.maxFilesPerScan);
    }

    res.json({
      scanId: scan.id,
      status: 'running',
      scanType,
      baseScanId: baseScan?.id || null,
      message: scanType === 'incremental' ? '差分スキャンを開始しました' : 'フルスキャンを開始しました',
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
    const search = req.query.search as string | undefined;

    const { files, total } = await ScannedFileService.getAll(scanId, {
      limit,
      offset,
      riskLevel,
      ownerType,
      sortBy,
      sortOrder,
      search,
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
 * GET /api/scan/:scanId/folder/:folderId
 * 単一フォルダのサマリーを取得
 */
router.get('/:scanId/folder/:folderId', async (req: Request, res: Response) => {
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

    const folder = await ScannedFileService.getFolderSummaryById(scanId, folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  } catch (err) {
    console.error('Get folder summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/scan/:scanId/folders/recalculate
 * フォルダサマリーを再計算（既存スキャン用）
 */
router.post('/:scanId/folders/recalculate', async (req: Request, res: Response) => {
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

    // スキャンが完了していることを確認
    if (scan.status !== 'completed') {
      return res.status(400).json({ error: 'Scan is not completed yet' });
    }

    console.log(`Recalculating folder summaries for scan ${scanId}...`);
    const folderCount = await ScannedFileService.calculateAndSaveFolderSummaries(scanId);
    console.log(`Recalculated ${folderCount} folder summaries for scan ${scanId}`);

    res.json({
      success: true,
      message: `${folderCount}件のフォルダサマリーを再計算しました`,
      folderCount,
    });
  } catch (err) {
    console.error('Recalculate folder summaries error:', err);
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

/**
 * GET /api/scan/:scanId/folders/:folderId/subfolders
 * 特定フォルダのサブフォルダ一覧を取得
 */
router.get('/:scanId/folders/:folderId/subfolders', async (req: Request, res: Response) => {
  const { scanId, folderId } = req.params;

  try {
    // スキャンの存在確認とアクセス権限チェック
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // 組織IDが一致するか確認
    const organization = req.organization!;
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // サブフォルダを取得
    const subfolders = await ScannedFileService.getSubfolders(scanId, folderId);

    res.json({ subfolders });
  } catch (err) {
    console.error('Get subfolders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// スキャンタイムアウト: 3時間
const SCAN_TIMEOUT_MS = 3 * 60 * 60 * 1000;

/**
 * POST /api/scan/:scanId/cancel
 * 実行中のスキャンをキャンセル
 */
router.post('/:scanId/cancel', async (req: Request, res: Response) => {
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

    // 編集権限チェック（自分のスキャンかowner）
    if (!ScanService.canEditScan(scan, user.id, user.role)) {
      return res.status(403).json({ error: 'このスキャンをキャンセルする権限がありません' });
    }

    // 実行中のスキャンのみキャンセル可能
    if (scan.status !== 'running') {
      return res.status(400).json({ error: 'このスキャンは実行中ではありません' });
    }

    console.log(`Cancelling scan ${scanId}...`);
    const cancelled = await ScanService.cancel(scanId);
    if (!cancelled) {
      console.log(`Failed to cancel scan ${scanId}`);
      return res.status(400).json({ error: 'スキャンのキャンセルに失敗しました' });
    }

    console.log(`Scan ${scanId} cancelled successfully`);
    res.json({
      success: true,
      message: 'スキャンをキャンセルしました',
      scanId,
    });
  } catch (err) {
    console.error('Cancel scan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
 * スキャン実行（非同期）- 最適化版
 * Phase 1のファイルカウントをスキップし、直接スキャンを開始
 * ファイル数はスキャン中にカウント
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
    // Phase 1: スキャンとカウントを並列実行
    // ========================================
    console.log(`Scan ${scanId}: Starting scan with parallel counting...`);
    await ScanService.update(scanId, {
      phase: 'scanning',
      totalFiles: 0, // カウント完了時に設定
      processedFiles: 0,
    });
    const allFiles: FileWithRisk[] = [];
    let processedCount = 0;
    let lastLoggedCount = 0;
    let totalFilesCount = 0;
    let countingComplete = false;

    // 並列でファイル数をカウント（別のDrive APIセッション）
    const countPromise = (async () => {
      try {
        console.log(`Scan ${scanId}: Starting parallel file count...`);
        const countResult = await countAllFiles(drive, { maxFiles });
        totalFilesCount = countResult.count;
        countingComplete = true;
        console.log(`Scan ${scanId}: Parallel count completed: ${totalFilesCount} files`);
        // カウント完了時にtotalFilesを更新
        await ScanService.update(scanId, {
          totalFiles: totalFilesCount,
        });
      } catch (err) {
        console.warn(`Scan ${scanId}: Parallel count failed:`, err);
        // カウント失敗してもスキャンは続行
      }
    })();

    // ファイルをスキャン（メイン処理）
    console.log(`Scan ${scanId}: Scanning files from Drive API...`);
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

      // 10000件ごとにログ出力
      if (processedCount - lastLoggedCount >= 10000) {
        const progress = countingComplete ? ` (${Math.round((processedCount / totalFilesCount) * 100)}%)` : '';
        console.log(`Scan ${scanId}: Scanned ${processedCount} files${progress}...`);
        lastLoggedCount = processedCount;
      }
    }

    // カウントの完了を待つ（すでに完了している場合は即座に解決）
    await countPromise;
    console.log(`Scan ${scanId}: Completed scanning ${allFiles.length} files from Drive API`);

    // リスクサマリーを計算
    const summary = calculateRiskSummary(
      allFiles.map((f) => ({
        ...f,
        permissions: f.permissions,
      })),
      organizationDomain
    );

    // ========================================
    // Phase 3: 親フォルダ情報を一括取得（名前と親フォルダID）
    // ========================================
    console.log(`Scan ${scanId}: Resolving folder info...`);
    await ScanService.update(scanId, {
      phase: 'resolving',
    });

    const parentFolderIds = allFiles
      .map((file) => file.parents?.[0])
      .filter((id): id is string => !!id);
    const uniqueParentFolderIds = [...new Set(parentFolderIds)];
    const folderInfoMap = await getFolderInfoBatch(drive, uniqueParentFolderIds);
    // 名前だけのマップも作成（ファイル保存用）
    const folderNameMap = new Map<string, string>();
    folderInfoMap.forEach((info, id) => folderNameMap.set(id, info.name));
    console.log(`Scan ${scanId}: Resolved ${folderInfoMap.size} folder infos`);

    // ========================================
    // Phase 4: Firestoreに保存（並列書き込み）
    // ========================================
    console.log(`Scan ${scanId}: Phase 4 - Saving to Firestore...`);
    await ScanService.update(scanId, {
      phase: 'saving',
    });

    // ファイルをFirestoreに保存（並列バッチで保存）+ Phase 5用にデータを収集
    const BATCH_SIZE = 500; // Firestoreのバッチ上限
    const CONCURRENT_BATCHES = 5; // 同時実行バッチ数（Firestoreレート制限を考慮）
    const allSavedFiles: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = [];

    // 全バッチデータを事前に作成
    const allBatches: Omit<ScannedFile, 'scanId' | 'createdAt'>[][] = [];
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
      allBatches.push(filesToSave);
      allSavedFiles.push(...filesToSave); // Phase 5用に収集
    }

    // 並列でFirestoreに保存
    console.log(`Scan ${scanId}: Saving ${allBatches.length} batches (${CONCURRENT_BATCHES} concurrent)...`);
    for (let i = 0; i < allBatches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = allBatches.slice(i, i + CONCURRENT_BATCHES);
      await Promise.all(concurrentBatches.map(batch => ScannedFileService.saveBatch(scanId, batch)));
    }

    // ========================================
    // Phase 5: フォルダサマリーを事前計算（Firestore再取得をスキップ）
    // ========================================
    console.log(`Scan ${scanId}: Phase 5 - Calculating folder summaries...`);
    const folderCount = await ScannedFileService.calculateAndSaveFolderSummaries(scanId, folderInfoMap, allSavedFiles);
    console.log(`Scan ${scanId}: Calculated ${folderCount} folder summaries`);

    // ========================================
    // Phase 6: 次回差分スキャン用のトークンを取得
    // ========================================
    console.log(`Scan ${scanId}: Phase 6 - Getting change token for incremental scans...`);
    let driveChangeToken: string | null = null;
    try {
      driveChangeToken = await getStartPageToken(drive);
      console.log(`Scan ${scanId}: Change token acquired`);
    } catch (tokenErr) {
      console.warn(`Scan ${scanId}: Failed to get change token, incremental scan will not be available:`, tokenErr);
    }

    // スキャン完了
    await ScanService.complete(scanId, {
      totalFiles: summary.totalFiles,
      riskySummary: summary.riskySummary,
      phase: 'done',
      processedFiles: summary.totalFiles,
      driveChangeToken,
    });

    // 組織の統計を更新
    await OrganizationService.incrementScanStats(organizationId, summary.totalFiles);

    console.log(`Scan ${scanId} completed: ${summary.totalFiles} files, ${folderCount} folders saved to Firestore`);
  } catch (err) {
    console.error(`Scan ${scanId} failed:`, err);
    await ScanService.fail(scanId, (err as Error).message);
  }
}

/**
 * 差分スキャン実行（非同期）
 * 前回スキャンからの変更ファイルのみをスキャンし、未変更ファイルはコピー
 */
async function performIncrementalScan(
  scanId: string,
  accessToken: string,
  organizationId: string,
  organizationDomain: string,
  maxFiles: number,
  baseScanId: string,
  changeToken: string
): Promise<void> {
  try {
    const drive = createDriveClient(accessToken);

    // ========================================
    // Phase 1: 変更されたファイルIDを取得
    // ========================================
    console.log(`Scan ${scanId}: Phase 1 - Getting changed files from Drive API...`);
    await ScanService.update(scanId, {
      phase: 'counting',
      processedFiles: 0,
    });

    const { changedFileIds, removedFileIds, newStartPageToken } = await getChangedFileIds(drive, changeToken);
    console.log(`Scan ${scanId}: Found ${changedFileIds.size} changed files, ${removedFileIds.size} removed files`);

    // ========================================
    // Phase 2: ベーススキャンから未変更ファイルをコピー
    // ========================================
    console.log(`Scan ${scanId}: Phase 2 - Copying unchanged files from base scan...`);
    await ScanService.update(scanId, {
      phase: 'scanning',
    });

    // ベーススキャンの全ファイルを取得
    const baseFiles = await ScannedFileService.getAllFiles(baseScanId);
    console.log(`Scan ${scanId}: Base scan has ${baseFiles.length} files`);

    // 変更・削除されていないファイルをコピー
    const unchangedFiles: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = [];
    for (const file of baseFiles) {
      if (!changedFileIds.has(file.id) && !removedFileIds.has(file.id)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { scanId: _scanId, createdAt: _createdAt, ...fileData } = file as ScannedFile & { createdAt?: Date };
        unchangedFiles.push(fileData);
      }
    }
    console.log(`Scan ${scanId}: ${unchangedFiles.length} unchanged files to copy`);

    // 未変更ファイルを並列バッチ保存
    const BATCH_SIZE = 500;
    const CONCURRENT_BATCHES = 5; // 同時実行バッチ数
    const unchangedBatches: Omit<ScannedFile, 'scanId' | 'createdAt'>[][] = [];
    for (let i = 0; i < unchangedFiles.length; i += BATCH_SIZE) {
      unchangedBatches.push(unchangedFiles.slice(i, i + BATCH_SIZE));
    }
    console.log(`Scan ${scanId}: Saving ${unchangedBatches.length} unchanged file batches (${CONCURRENT_BATCHES} concurrent)...`);
    for (let i = 0; i < unchangedBatches.length; i += CONCURRENT_BATCHES) {
      const concurrentBatches = unchangedBatches.slice(i, i + CONCURRENT_BATCHES);
      await Promise.all(concurrentBatches.map(batch => ScannedFileService.saveBatch(scanId, batch)));
    }

    // ========================================
    // Phase 3: 変更されたファイルをスキャン
    // ========================================
    console.log(`Scan ${scanId}: Phase 3 - Scanning changed files...`);
    const changedFilesArray: FileWithRisk[] = [];
    let scannedCount = 0;

    // 変更されたファイルのみをスキャン
    for await (const files of scanAllFiles(drive, { maxFiles })) {
      for (const file of files) {
        // 変更されたファイルのみ処理
        if (changedFileIds.has(file.id)) {
          const risk = calculateRiskScore(file, organizationDomain);
          changedFilesArray.push({ ...file, risk });
          scannedCount++;
        }
      }

      // 全ての変更ファイルをスキャンしたら終了
      if (scannedCount >= changedFileIds.size) {
        break;
      }

      // 進捗更新
      await ScanService.update(scanId, {
        processedFiles: unchangedFiles.length + scannedCount,
        scannedNewFiles: scannedCount,
        copiedFiles: unchangedFiles.length,
      });
    }

    console.log(`Scan ${scanId}: Scanned ${changedFilesArray.length} changed files`);

    // ========================================
    // Phase 4: 変更ファイルの親フォルダ情報を取得して保存
    // ========================================
    console.log(`Scan ${scanId}: Phase 4 - Resolving folder info and saving changed files...`);
    await ScanService.update(scanId, {
      phase: 'resolving',
    });

    const parentFolderIds = changedFilesArray
      .map((file) => file.parents?.[0])
      .filter((id): id is string => !!id);
    const uniqueParentFolderIds = [...new Set(parentFolderIds)];
    const folderInfoMap = await getFolderInfoBatch(drive, uniqueParentFolderIds);
    const folderNameMap = new Map<string, string>();
    folderInfoMap.forEach((info, id) => folderNameMap.set(id, info.name));

    // 変更ファイルをFirestoreに並列保存 + Phase 5/6用にデータを収集
    await ScanService.update(scanId, {
      phase: 'saving',
    });

    const changedFilesToSave: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = [];
    const changedBatches: Omit<ScannedFile, 'scanId' | 'createdAt'>[][] = [];

    for (let i = 0; i < changedFilesArray.length; i += BATCH_SIZE) {
      const batch = changedFilesArray.slice(i, i + BATCH_SIZE);
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
      changedBatches.push(filesToSave);
      changedFilesToSave.push(...filesToSave); // 収集
    }

    // 並列でFirestoreに保存
    if (changedBatches.length > 0) {
      console.log(`Scan ${scanId}: Saving ${changedBatches.length} changed file batches (${CONCURRENT_BATCHES} concurrent)...`);
      for (let i = 0; i < changedBatches.length; i += CONCURRENT_BATCHES) {
        const concurrentBatches = changedBatches.slice(i, i + CONCURRENT_BATCHES);
        await Promise.all(concurrentBatches.map(batch => ScannedFileService.saveBatch(scanId, batch)));
      }
    }

    // ========================================
    // Phase 5: リスクサマリーを計算（Firestore再取得をスキップ）
    // ========================================
    // 未変更ファイル + 変更ファイルを結合
    const allSavedFiles = [...unchangedFiles, ...changedFilesToSave];
    const totalFiles = allSavedFiles.length;
    const riskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const file of allSavedFiles) {
      riskySummary[file.riskLevel]++;
    }

    // ========================================
    // Phase 6: フォルダサマリーを事前計算（Firestore再取得をスキップ）
    // ========================================
    console.log(`Scan ${scanId}: Phase 6 - Calculating folder summaries...`);
    // 全ファイルの親フォルダ情報を取得
    const allParentFolderIds = allSavedFiles
      .map((file) => file.parentFolderId)
      .filter((id): id is string => !!id);
    const allUniqueFolderIds = [...new Set(allParentFolderIds)];
    const allFolderInfoMap = await getFolderInfoBatch(drive, allUniqueFolderIds);

    const folderCount = await ScannedFileService.calculateAndSaveFolderSummaries(scanId, allFolderInfoMap, allSavedFiles);
    console.log(`Scan ${scanId}: Calculated ${folderCount} folder summaries`);

    // スキャン完了
    await ScanService.complete(scanId, {
      totalFiles,
      riskySummary,
      phase: 'done',
      processedFiles: totalFiles,
      scannedNewFiles: changedFilesArray.length,
      copiedFiles: unchangedFiles.length,
      driveChangeToken: newStartPageToken,
    });

    // 組織の統計を更新
    await OrganizationService.incrementScanStats(organizationId, totalFiles);

    console.log(`Scan ${scanId} (incremental) completed: ${totalFiles} total files (${changedFilesArray.length} new/changed, ${unchangedFiles.length} copied)`);
  } catch (err) {
    console.error(`Scan ${scanId} (incremental) failed:`, err);
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
    console.error('Error details:', {
      scanId,
      fileId,
      permissionId,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      errorStack: err instanceof Error ? err.stack : undefined,
    });
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

// ========================================
// フォルダ自体の権限変更API
// ========================================

/**
 * DELETE /api/scan/:scanId/folders/:folderId/folder-permissions/:permissionId
 * フォルダ自体の権限を削除
 */
router.delete('/:scanId/folders/:folderId/folder-permissions/:permissionId', async (req: Request, res: Response) => {
  const { scanId, folderId, permissionId } = req.params;
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

    // フォルダ名を取得（ログ用）
    let folderName = folderId;
    try {
      const folder = await drive.files.get({ fileId: folderId, fields: 'name' });
      folderName = folder.data.name || folderId;
    } catch {
      // フォルダ名取得に失敗してもエラーにはしない
    }

    // フォルダの権限を削除（フォルダもファイルと同じDrive APIを使用）
    const result = await deletePermission(drive, folderId, permissionId);

    // アクションログを記録
    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_delete',
      targetType: 'folder',
      targetId: folderId,
      targetName: folderName,
      details: {
        permissionId,
      },
      success: result.success,
      errorMessage: result.error,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の削除に失敗しました' });
    }

    res.json({
      success: true,
      message: 'フォルダ権限を削除しました',
      folderId,
      permissionId,
    });
  } catch (err) {
    console.error('Delete folder permission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/scan/:scanId/folders/:folderId/folder-permissions/:permissionId
 * フォルダ自体の権限ロールを更新
 */
router.put('/:scanId/folders/:folderId/folder-permissions/:permissionId', async (req: Request, res: Response) => {
  const { scanId, folderId, permissionId } = req.params;
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

    // フォルダ名を取得（ログ用）
    let folderName = folderId;
    try {
      const folder = await drive.files.get({ fileId: folderId, fields: 'name' });
      folderName = folder.data.name || folderId;
    } catch {
      // フォルダ名取得に失敗してもエラーにはしない
    }

    // フォルダの権限を更新
    const result = await updatePermissionRole(drive, folderId, permissionId, role);

    // アクションログを記録
    await ActionLogService.logPermissionChange({
      organizationId: organization.id,
      userId: user.id,
      userEmail: user.email,
      actionType: 'permission_update',
      targetType: 'folder',
      targetId: folderId,
      targetName: folderName,
      details: {
        permissionId,
        newRole: role,
      },
      success: result.success,
      errorMessage: result.error,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || '権限の更新に失敗しました' });
    }

    res.json({
      success: true,
      message: 'フォルダ権限を更新しました',
      folderId,
      permissionId,
      permission: result.permission,
    });
  } catch (err) {
    console.error('Update folder permission error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
