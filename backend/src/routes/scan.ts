import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, OrganizationService, ScannedFileService } from '../services/firestore.js';
import { createDriveClient, scanAllFiles, type DriveFile } from '../services/drive.js';
import { calculateRiskScore, calculateRiskSummary, type RiskAssessment } from '../services/risk.js';
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
      totalFiles: 0,
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
    const sortBy = (req.query.sortBy as 'riskScore' | 'name' | 'modifiedTime') || 'riskScore';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const { files, total } = await ScannedFileService.getAll(scanId, {
      limit,
      offset,
      riskLevel,
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
 * GET /api/scan/history
 * スキャン履歴を取得
 */
router.get('/', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const scans = await ScanService.getByOrganization(organization.id, limit);
    res.json({ scans });
  } catch (err) {
    console.error('Get scan history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * スキャン実行（非同期）
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
    const allFiles: FileWithRisk[] = [];

    // ファイルをスキャン
    for await (const files of scanAllFiles(drive, { maxFiles })) {
      for (const file of files) {
        const risk = calculateRiskScore(file, organizationDomain);
        allFiles.push({ ...file, risk });
      }

      // 定期的に進捗を更新
      await ScanService.update(scanId, {
        totalFiles: allFiles.length,
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

    // ファイルをFirestoreに保存（バッチで保存）
    const BATCH_SIZE = 500; // Firestoreのバッチ上限
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      const filesToSave: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = batch.map((file) => ({
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
      }));

      await ScannedFileService.saveBatch(scanId, filesToSave);
    }

    // スキャン完了
    await ScanService.complete(scanId, {
      totalFiles: summary.totalFiles,
      riskySummary: summary.riskySummary,
    });

    // 組織の統計を更新
    await OrganizationService.incrementScanStats(organizationId, summary.totalFiles);

    console.log(`Scan ${scanId} completed: ${summary.totalFiles} files saved to Firestore`);
  } catch (err) {
    console.error(`Scan ${scanId} failed:`, err);
    await ScanService.fail(scanId, (err as Error).message);
  }
}

export default router;
