import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, ScannedFileService, ActionLogService, UserService } from '../services/firestore.js';

const router = Router();

// PDF generation utility functions
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRiskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    critical: '緊急',
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[level] || level;
}

// 認証必須
router.use(requireAuth);

/**
 * レポートデータの型定義
 */
interface ScanHistoryReport {
  reportType: 'scan_history';
  generatedAt: string;
  organization: {
    name: string;
    domain: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalScans: number;
    completedScans: number;
    failedScans: number;
    totalFilesScanned: number;
    uniqueUsers: number;
  };
  scans: {
    id: string;
    userName: string;
    userEmail: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    totalFiles: number;
    riskySummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }[];
}

interface RiskAssessmentReport {
  reportType: 'risk_assessment';
  generatedAt: string;
  organization: {
    name: string;
    domain: string;
  };
  scanInfo: {
    scanId: string;
    scannedAt: string;
    scannedBy: string;
  };
  summary: {
    totalFiles: number;
    riskySummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    externalShareCount: number;
    publicShareCount: number;
  };
  criticalFiles: {
    id: string;
    name: string;
    ownerEmail: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    recommendations: string[];
    webViewLink: string | null;
  }[];
  highFiles: {
    id: string;
    name: string;
    ownerEmail: string;
    riskScore: number;
    riskLevel: string;
    riskFactors: string[];
    recommendations: string[];
    webViewLink: string | null;
  }[];
}

interface RemediationHistoryReport {
  reportType: 'remediation_history';
  generatedAt: string;
  organization: {
    name: string;
    domain: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    permissionsDeleted: number;
    permissionsUpdated: number;
  };
  actions: {
    id: string;
    userEmail: string;
    actionType: string;
    targetName: string;
    targetType: string;
    details: {
      targetEmail?: string;
      oldRole?: string;
      newRole?: string;
    };
    success: boolean;
    createdAt: string;
  }[];
}

interface ExternalSharingReport {
  reportType: 'external_sharing';
  generatedAt: string;
  organization: {
    name: string;
    domain: string;
  };
  scanInfo: {
    scanId: string;
    scannedAt: string;
  };
  summary: {
    totalExternalShares: number;
    publicShares: number;
    externalUserShares: number;
    externalDomainShares: number;
  };
  files: {
    id: string;
    name: string;
    ownerEmail: string;
    riskLevel: string;
    externalPermissions: {
      type: string;
      email: string | null;
      domain: string | null;
      role: string;
    }[];
    webViewLink: string | null;
  }[];
}

/**
 * GET /api/reports/scan-history
 * スキャン実施履歴レポート
 */
router.get('/scan-history', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // クエリパラメータ
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // デフォルト: 過去90日
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // スキャン履歴を取得
    const { scans } = await ScanService.getByOrganization(organization.id, 1000);

    // 期間でフィルタ
    const filteredScans = scans.filter((scan) => {
      const scanDate = new Date(scan.startedAt);
      return scanDate >= startDate && scanDate <= endDate;
    });

    // サマリー計算
    const completedScans = filteredScans.filter((s) => s.status === 'completed');
    const failedScans = filteredScans.filter((s) => s.status === 'failed');
    const totalFilesScanned = completedScans.reduce((acc, s) => acc + s.totalFiles, 0);
    const uniqueUsers = new Set(filteredScans.map((s) => s.userId)).size;

    const report: ScanHistoryReport = {
      reportType: 'scan_history',
      generatedAt: new Date().toISOString(),
      organization: {
        name: organization.name,
        domain: organization.domain,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalScans: filteredScans.length,
        completedScans: completedScans.length,
        failedScans: failedScans.length,
        totalFilesScanned,
        uniqueUsers,
      },
      scans: filteredScans.map((scan) => ({
        id: scan.id,
        userName: scan.userName || '',
        userEmail: scan.userEmail || '',
        startedAt: scan.startedAt?.toString() || '',
        completedAt: scan.completedAt?.toString() || null,
        status: scan.status,
        totalFiles: scan.totalFiles,
        riskySummary: scan.riskySummary,
      })),
    };

    res.json({ report });
  } catch (err) {
    console.error('Get scan history report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/risk-assessment/:scanId
 * リスクアセスメントレポート
 */
router.get('/risk-assessment/:scanId', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // スキャンの存在確認
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // スキャンユーザー情報を取得
    const scanUser = await UserService.getById(scan.userId);

    // Critical/Highファイルを取得
    const { files: criticalFiles } = await ScannedFileService.getAll(scanId, {
      riskLevel: 'critical',
      limit: 100,
    });
    const { files: highFiles } = await ScannedFileService.getAll(scanId, {
      riskLevel: 'high',
      limit: 100,
    });

    // 全ファイルから外部共有カウント
    const { files: allFiles } = await ScannedFileService.getAll(scanId, { limit: 10000 });
    let externalShareCount = 0;
    let publicShareCount = 0;

    for (const file of allFiles) {
      const hasPublic = file.permissions.some((p) => p.type === 'anyone');
      const hasExternal = file.permissions.some(
        (p) =>
          (p.type === 'user' || p.type === 'group') &&
          p.emailAddress &&
          !p.emailAddress.endsWith(`@${organization.domain}`)
      );

      if (hasPublic) publicShareCount++;
      if (hasExternal) externalShareCount++;
    }

    const report: RiskAssessmentReport = {
      reportType: 'risk_assessment',
      generatedAt: new Date().toISOString(),
      organization: {
        name: organization.name,
        domain: organization.domain,
      },
      scanInfo: {
        scanId: scan.id,
        scannedAt: scan.completedAt?.toString() || scan.startedAt?.toString() || '',
        scannedBy: scanUser?.displayName || scan.userEmail || '',
      },
      summary: {
        totalFiles: scan.totalFiles,
        riskySummary: scan.riskySummary,
        externalShareCount,
        publicShareCount,
      },
      criticalFiles: criticalFiles.map((f) => ({
        id: f.id,
        name: f.name,
        ownerEmail: f.ownerEmail,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        riskFactors: f.riskFactors,
        recommendations: f.recommendations,
        webViewLink: f.webViewLink,
      })),
      highFiles: highFiles.map((f) => ({
        id: f.id,
        name: f.name,
        ownerEmail: f.ownerEmail,
        riskScore: f.riskScore,
        riskLevel: f.riskLevel,
        riskFactors: f.riskFactors,
        recommendations: f.recommendations,
        webViewLink: f.webViewLink,
      })),
    };

    res.json({ report });
  } catch (err) {
    console.error('Get risk assessment report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/remediation-history
 * 是正対応履歴レポート
 */
router.get('/remediation-history', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // クエリパラメータ
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    // アクションログを取得
    const { logs } = await ActionLogService.getByOrganization(organization.id, {
      limit: 1000,
      startDate,
      endDate,
    });

    // サマリー計算
    const successfulActions = logs.filter((l) => l.success);
    const failedActions = logs.filter((l) => !l.success);
    const permissionsDeleted = logs.filter(
      (l) => l.actionType === 'permission_delete' || l.actionType === 'permission_bulk_delete'
    ).length;
    const permissionsUpdated = logs.filter((l) => l.actionType === 'permission_update').length;

    const report: RemediationHistoryReport = {
      reportType: 'remediation_history',
      generatedAt: new Date().toISOString(),
      organization: {
        name: organization.name,
        domain: organization.domain,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalActions: logs.length,
        successfulActions: successfulActions.length,
        failedActions: failedActions.length,
        permissionsDeleted,
        permissionsUpdated,
      },
      actions: logs.map((log) => ({
        id: log.id,
        userEmail: log.userEmail,
        actionType: log.actionType,
        targetName: log.targetName,
        targetType: log.targetType,
        details: {
          targetEmail: log.details.targetEmail,
          oldRole: log.details.oldRole,
          newRole: log.details.newRole,
        },
        success: log.success,
        createdAt: log.createdAt?.toString() || '',
      })),
    };

    res.json({ report });
  } catch (err) {
    console.error('Get remediation history report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/external-sharing/:scanId
 * 外部共有一覧レポート
 */
router.get('/external-sharing/:scanId', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // スキャンの存在確認
    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 全ファイルを取得して外部共有をフィルタ
    const { files: allFiles } = await ScannedFileService.getAll(scanId, { limit: 10000 });

    const externalFiles: ExternalSharingReport['files'] = [];
    let publicShares = 0;
    let externalUserShares = 0;
    let externalDomainShares = 0;

    for (const file of allFiles) {
      const externalPermissions: ExternalSharingReport['files'][0]['externalPermissions'] = [];

      for (const perm of file.permissions) {
        // リンクを知っている全員
        if (perm.type === 'anyone') {
          publicShares++;
          externalPermissions.push({
            type: 'anyone',
            email: null,
            domain: null,
            role: perm.role,
          });
        }
        // 外部ドメイン共有
        else if (perm.type === 'domain' && perm.domain !== organization.domain) {
          externalDomainShares++;
          externalPermissions.push({
            type: 'domain',
            email: null,
            domain: perm.domain,
            role: perm.role,
          });
        }
        // 外部ユーザー共有
        else if (
          (perm.type === 'user' || perm.type === 'group') &&
          perm.emailAddress &&
          !perm.emailAddress.endsWith(`@${organization.domain}`)
        ) {
          externalUserShares++;
          externalPermissions.push({
            type: perm.type,
            email: perm.emailAddress,
            domain: null,
            role: perm.role,
          });
        }
      }

      if (externalPermissions.length > 0) {
        externalFiles.push({
          id: file.id,
          name: file.name,
          ownerEmail: file.ownerEmail,
          riskLevel: file.riskLevel,
          externalPermissions,
          webViewLink: file.webViewLink,
        });
      }
    }

    // リスクレベルでソート
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    externalFiles.sort((a, b) => riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder]);

    const report: ExternalSharingReport = {
      reportType: 'external_sharing',
      generatedAt: new Date().toISOString(),
      organization: {
        name: organization.name,
        domain: organization.domain,
      },
      scanInfo: {
        scanId: scan.id,
        scannedAt: scan.completedAt?.toString() || scan.startedAt?.toString() || '',
      },
      summary: {
        totalExternalShares: externalFiles.length,
        publicShares,
        externalUserShares,
        externalDomainShares,
      },
      files: externalFiles,
    };

    res.json({ report });
  } catch (err) {
    console.error('Get external sharing report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/current-risks
 * 現在のリスク状況サマリーレポート
 */
router.get('/current-risks', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    // admin/ownerのみアクセス可能
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    // 最新の完了済みスキャンを各ユーザーから取得
    const users = await UserService.getByOrganization(organization.id);
    const latestScans: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      scan: Awaited<ReturnType<typeof ScanService.getById>>;
    }> = [];

    for (const u of users) {
      const { scans } = await ScanService.getByUser(organization.id, u.id, 1);
      const latestScan = scans.find((s) => s.status === 'completed');
      if (latestScan) {
        latestScans.push({
          userId: u.id,
          userName: u.displayName,
          userEmail: u.email,
          scan: latestScan,
        });
      }
    }

    // 集計
    const aggregated = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      totalFiles: 0,
    };

    for (const item of latestScans) {
      if (item.scan) {
        aggregated.critical += item.scan.riskySummary.critical;
        aggregated.high += item.scan.riskySummary.high;
        aggregated.medium += item.scan.riskySummary.medium;
        aggregated.low += item.scan.riskySummary.low;
        aggregated.totalFiles += item.scan.totalFiles;
      }
    }

    const report = {
      reportType: 'current_risks',
      generatedAt: new Date().toISOString(),
      organization: {
        name: organization.name,
        domain: organization.domain,
      },
      summary: {
        totalUsers: users.length,
        usersWithScans: latestScans.length,
        usersWithoutScans: users.length - latestScans.length,
        totalFiles: aggregated.totalFiles,
        riskySummary: {
          critical: aggregated.critical,
          high: aggregated.high,
          medium: aggregated.medium,
          low: aggregated.low,
        },
        remediationRate:
          aggregated.critical + aggregated.high > 0
            ? 0 // 要計算（是正済み / 検出数）
            : 100,
      },
      userBreakdown: latestScans.map((item) => ({
        userId: item.userId,
        userName: item.userName,
        userEmail: item.userEmail,
        lastScanAt: item.scan?.completedAt?.toString() || '',
        totalFiles: item.scan?.totalFiles || 0,
        riskySummary: item.scan?.riskySummary || { critical: 0, high: 0, medium: 0, low: 0 },
      })),
    };

    res.json({ report });
  } catch (err) {
    console.error('Get current risks report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// PDF生成エンドポイント
// ========================================

/**
 * GET /api/reports/scan-history/pdf
 * スキャン履歴レポートをPDFで出力
 */
router.get('/scan-history/pdf', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const { scans } = await ScanService.getByOrganization(organization.id, 1000);
    const filteredScans = scans.filter((scan) => {
      const scanDate = new Date(scan.startedAt);
      return scanDate >= startDate && scanDate <= endDate;
    });

    const completedScans = filteredScans.filter((s) => s.status === 'completed');
    const failedScans = filteredScans.filter((s) => s.status === 'failed');
    const totalFilesScanned = completedScans.reduce((acc, s) => acc + s.totalFiles, 0);
    const uniqueUsers = new Set(filteredScans.map((s) => s.userId)).size;

    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50, lang: 'ja' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scan-history-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // タイトル
    doc.fontSize(20).text('スキャン実施履歴レポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`組織: ${organization.name} (${organization.domain})`, { align: 'center' });
    doc.fontSize(10).text(`期間: ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`, { align: 'center' });
    doc.text(`生成日時: ${formatDate(new Date().toISOString())}`, { align: 'center' });
    doc.moveDown(2);

    // サマリー
    doc.fontSize(14).text('サマリー', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`総スキャン回数: ${filteredScans.length}回`);
    doc.text(`完了: ${completedScans.length}回 / 失敗: ${failedScans.length}回`);
    doc.text(`スキャンしたファイル数: ${totalFilesScanned.toLocaleString()}件`);
    doc.text(`実行ユーザー数: ${uniqueUsers}人`);
    doc.moveDown(2);

    // スキャン一覧
    doc.fontSize(14).text('スキャン一覧', { underline: true });
    doc.moveDown(0.5);

    for (const scan of filteredScans.slice(0, 50)) {
      doc.fontSize(10);
      doc.text(`[${scan.status === 'completed' ? '完了' : scan.status === 'failed' ? '失敗' : '実行中'}] ${formatDate(scan.startedAt?.toString())}`);
      doc.text(`  実行者: ${scan.userName || scan.userEmail || '-'}`);
      doc.text(`  ファイル数: ${scan.totalFiles.toLocaleString()}件`);
      doc.text(`  リスク: Critical ${scan.riskySummary.critical} / High ${scan.riskySummary.high} / Medium ${scan.riskySummary.medium} / Low ${scan.riskySummary.low}`);
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    if (filteredScans.length > 50) {
      doc.text(`... 他 ${filteredScans.length - 50}件`);
    }

    doc.end();
  } catch (err) {
    console.error('Generate scan history PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/risk-assessment/:scanId/pdf
 * リスクアセスメントレポートをPDFで出力
 */
router.get('/risk-assessment/:scanId/pdf', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const scanUser = await UserService.getById(scan.userId);
    const { files: criticalFiles } = await ScannedFileService.getAll(scanId, { riskLevel: 'critical', limit: 100 });
    const { files: highFiles } = await ScannedFileService.getAll(scanId, { riskLevel: 'high', limit: 100 });

    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50, lang: 'ja' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=risk-assessment-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // タイトル
    doc.fontSize(20).text('リスクアセスメントレポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`組織: ${organization.name} (${organization.domain})`, { align: 'center' });
    doc.fontSize(10).text(`スキャン日時: ${formatDate(scan.completedAt?.toString() || scan.startedAt?.toString())}`, { align: 'center' });
    doc.text(`実行者: ${scanUser?.displayName || scan.userEmail || '-'}`, { align: 'center' });
    doc.text(`生成日時: ${formatDate(new Date().toISOString())}`, { align: 'center' });
    doc.moveDown(2);

    // サマリー
    doc.fontSize(14).text('サマリー', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`総ファイル数: ${scan.totalFiles.toLocaleString()}件`);
    doc.text(`リスク検出:`);
    doc.text(`  - 緊急 (Critical): ${scan.riskySummary.critical}件`);
    doc.text(`  - 高 (High): ${scan.riskySummary.high}件`);
    doc.text(`  - 中 (Medium): ${scan.riskySummary.medium}件`);
    doc.text(`  - 低 (Low): ${scan.riskySummary.low}件`);
    doc.moveDown(2);

    // Critical ファイル
    if (criticalFiles.length > 0) {
      doc.fontSize(14).text('緊急リスクファイル (Critical)', { underline: true });
      doc.moveDown(0.5);

      for (const file of criticalFiles) {
        doc.fontSize(10);
        doc.text(`[${file.riskScore}点] ${file.name}`);
        doc.text(`  オーナー: ${file.ownerEmail}`);
        doc.text(`  リスク要因: ${file.riskFactors.join(', ')}`);
        doc.moveDown(0.5);

        if (doc.y > 700) {
          doc.addPage();
        }
      }
      doc.moveDown();
    }

    // High ファイル
    if (highFiles.length > 0) {
      doc.fontSize(14).text('高リスクファイル (High)', { underline: true });
      doc.moveDown(0.5);

      for (const file of highFiles.slice(0, 30)) {
        doc.fontSize(10);
        doc.text(`[${file.riskScore}点] ${file.name}`);
        doc.text(`  オーナー: ${file.ownerEmail}`);
        doc.text(`  リスク要因: ${file.riskFactors.join(', ')}`);
        doc.moveDown(0.5);

        if (doc.y > 700) {
          doc.addPage();
        }
      }

      if (highFiles.length > 30) {
        doc.text(`... 他 ${highFiles.length - 30}件`);
      }
    }

    doc.end();
  } catch (err) {
    console.error('Generate risk assessment PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/remediation-history/pdf
 * 是正対応履歴レポートをPDFで出力
 */
router.get('/remediation-history/pdf', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();

    const { logs } = await ActionLogService.getByOrganization(organization.id, {
      limit: 1000,
      startDate,
      endDate,
    });

    const successfulActions = logs.filter((l) => l.success);
    const permissionsDeleted = logs.filter(
      (l) => l.actionType === 'permission_delete' || l.actionType === 'permission_bulk_delete'
    ).length;
    const permissionsUpdated = logs.filter((l) => l.actionType === 'permission_update').length;

    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50, lang: 'ja' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=remediation-history-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // タイトル
    doc.fontSize(20).text('是正対応履歴レポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`組織: ${organization.name} (${organization.domain})`, { align: 'center' });
    doc.fontSize(10).text(`期間: ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`, { align: 'center' });
    doc.text(`生成日時: ${formatDate(new Date().toISOString())}`, { align: 'center' });
    doc.moveDown(2);

    // サマリー
    doc.fontSize(14).text('サマリー', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`総アクション数: ${logs.length}件`);
    doc.text(`成功: ${successfulActions.length}件 / 失敗: ${logs.length - successfulActions.length}件`);
    doc.text(`権限削除: ${permissionsDeleted}件`);
    doc.text(`権限変更: ${permissionsUpdated}件`);
    doc.moveDown(2);

    // アクション一覧
    doc.fontSize(14).text('アクション履歴', { underline: true });
    doc.moveDown(0.5);

    const actionTypeLabels: Record<string, string> = {
      permission_delete: '権限削除',
      permission_update: '権限変更',
      permission_bulk_delete: '一括削除',
      permission_bulk_update: '一括変更',
    };

    for (const log of logs.slice(0, 50)) {
      doc.fontSize(10);
      doc.text(`[${log.success ? '成功' : '失敗'}] ${formatDate(log.createdAt?.toString())}`);
      doc.text(`  種類: ${actionTypeLabels[log.actionType] || log.actionType}`);
      doc.text(`  対象: ${log.targetName}`);
      doc.text(`  実行者: ${log.userEmail}`);
      if (log.details.targetEmail) {
        doc.text(`  対象ユーザー: ${log.details.targetEmail}`);
      }
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    if (logs.length > 50) {
      doc.text(`... 他 ${logs.length - 50}件`);
    }

    doc.end();
  } catch (err) {
    console.error('Generate remediation history PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/external-sharing/:scanId/pdf
 * 外部共有一覧レポートをPDFで出力
 */
router.get('/external-sharing/:scanId/pdf', async (req: Request, res: Response) => {
  const { scanId } = req.params;
  const organization = req.organization!;
  const user = req.user!;

  try {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const scan = await ScanService.getById(scanId);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    if (scan.organizationId !== organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { files: allFiles } = await ScannedFileService.getAll(scanId, { limit: 10000 });

    const externalFiles: Array<{
      name: string;
      ownerEmail: string;
      riskLevel: string;
      externalPermissions: string[];
    }> = [];
    let publicShares = 0;
    let externalUserShares = 0;

    for (const file of allFiles) {
      const extPerms: string[] = [];

      for (const perm of file.permissions) {
        if (perm.type === 'anyone') {
          publicShares++;
          extPerms.push('リンクを知っている全員');
        } else if (perm.type === 'domain' && perm.domain !== organization.domain) {
          extPerms.push(`${perm.domain} のユーザー`);
        } else if (
          (perm.type === 'user' || perm.type === 'group') &&
          perm.emailAddress &&
          !perm.emailAddress.endsWith(`@${organization.domain}`)
        ) {
          externalUserShares++;
          extPerms.push(perm.emailAddress);
        }
      }

      if (extPerms.length > 0) {
        externalFiles.push({
          name: file.name,
          ownerEmail: file.ownerEmail,
          riskLevel: file.riskLevel,
          externalPermissions: extPerms,
        });
      }
    }

    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50, lang: 'ja' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=external-sharing-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // タイトル
    doc.fontSize(20).text('外部共有一覧レポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`組織: ${organization.name} (${organization.domain})`, { align: 'center' });
    doc.fontSize(10).text(`スキャン日時: ${formatDate(scan.completedAt?.toString() || scan.startedAt?.toString())}`, { align: 'center' });
    doc.text(`生成日時: ${formatDate(new Date().toISOString())}`, { align: 'center' });
    doc.moveDown(2);

    // サマリー
    doc.fontSize(14).text('サマリー', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`外部共有ファイル数: ${externalFiles.length}件`);
    doc.text(`公開リンク共有: ${publicShares}件`);
    doc.text(`外部ユーザー共有: ${externalUserShares}件`);
    doc.moveDown(2);

    // ファイル一覧
    doc.fontSize(14).text('外部共有ファイル一覧', { underline: true });
    doc.moveDown(0.5);

    for (const file of externalFiles.slice(0, 50)) {
      doc.fontSize(10);
      doc.text(`[${getRiskLevelLabel(file.riskLevel)}] ${file.name}`);
      doc.text(`  オーナー: ${file.ownerEmail}`);
      doc.text(`  共有先: ${file.externalPermissions.join(', ')}`);
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    if (externalFiles.length > 50) {
      doc.text(`... 他 ${externalFiles.length - 50}件`);
    }

    doc.end();
  } catch (err) {
    console.error('Generate external sharing PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/current-risks/pdf
 * 現在のリスク状況レポートをPDFで出力
 */
router.get('/current-risks/pdf', async (req: Request, res: Response) => {
  const organization = req.organization!;
  const user = req.user!;

  try {
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({ error: '管理者権限が必要です' });
    }

    const users = await UserService.getByOrganization(organization.id);
    const latestScans: Array<{
      userName: string;
      userEmail: string;
      lastScanAt: string;
      totalFiles: number;
      riskySummary: { critical: number; high: number; medium: number; low: number };
    }> = [];

    let aggregated = { critical: 0, high: 0, medium: 0, low: 0, totalFiles: 0 };

    for (const u of users) {
      const { scans } = await ScanService.getByUser(organization.id, u.id, 1);
      const latestScan = scans.find((s) => s.status === 'completed');
      if (latestScan) {
        latestScans.push({
          userName: u.displayName,
          userEmail: u.email,
          lastScanAt: latestScan.completedAt?.toString() || '',
          totalFiles: latestScan.totalFiles,
          riskySummary: latestScan.riskySummary,
        });
        aggregated.critical += latestScan.riskySummary.critical;
        aggregated.high += latestScan.riskySummary.high;
        aggregated.medium += latestScan.riskySummary.medium;
        aggregated.low += latestScan.riskySummary.low;
        aggregated.totalFiles += latestScan.totalFiles;
      }
    }

    // PDF生成
    const doc = new PDFDocument({ size: 'A4', margin: 50, lang: 'ja' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=current-risks-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // タイトル
    doc.fontSize(20).text('現在のリスク状況レポート', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`組織: ${organization.name} (${organization.domain})`, { align: 'center' });
    doc.fontSize(10).text(`生成日時: ${formatDate(new Date().toISOString())}`, { align: 'center' });
    doc.moveDown(2);

    // サマリー
    doc.fontSize(14).text('組織全体のサマリー', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`総ユーザー数: ${users.length}人`);
    doc.text(`スキャン実施済み: ${latestScans.length}人`);
    doc.text(`総ファイル数: ${aggregated.totalFiles.toLocaleString()}件`);
    doc.text(`リスク検出:`);
    doc.text(`  - 緊急 (Critical): ${aggregated.critical}件`);
    doc.text(`  - 高 (High): ${aggregated.high}件`);
    doc.text(`  - 中 (Medium): ${aggregated.medium}件`);
    doc.text(`  - 低 (Low): ${aggregated.low}件`);
    doc.moveDown(2);

    // ユーザー別
    doc.fontSize(14).text('ユーザー別リスク状況', { underline: true });
    doc.moveDown(0.5);

    for (const item of latestScans) {
      doc.fontSize(10);
      doc.text(`${item.userName} (${item.userEmail})`);
      doc.text(`  最終スキャン: ${formatDate(item.lastScanAt)}`);
      doc.text(`  ファイル数: ${item.totalFiles.toLocaleString()}件`);
      doc.text(`  リスク: C:${item.riskySummary.critical} / H:${item.riskySummary.high} / M:${item.riskySummary.medium} / L:${item.riskySummary.low}`);
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    }

    doc.end();
  } catch (err) {
    console.error('Generate current risks PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
