import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { ScanService, ScannedFileService, ActionLogService, UserService } from '../services/firestore.js';

// ESM環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日本語フォントのパス
const JAPANESE_FONT_PATH = path.join(__dirname, '../../fonts/NotoSansJP-Regular.ttf');

// デバッグ: フォントパスとファイル存在確認をログ出力
console.log('[PDF] __dirname:', __dirname);
console.log('[PDF] JAPANESE_FONT_PATH:', JAPANESE_FONT_PATH);
console.log('[PDF] Font file exists:', fs.existsSync(JAPANESE_FONT_PATH));

const router = Router();

// PDF generation utility functions
function createPdfDocument(options?: { landscape?: boolean }): typeof PDFDocument.prototype {
  console.log('[PDF] Creating PDF document with font:', JAPANESE_FONT_PATH);
  if (!fs.existsSync(JAPANESE_FONT_PATH)) {
    console.error('[PDF] ERROR: Font file not found at:', JAPANESE_FONT_PATH);
    throw new Error(`Font file not found: ${JAPANESE_FONT_PATH}`);
  }
  const pdfOptions: {
    size: 'A4' | [number, number];
    margin: number;
    lang: string;
    layout?: 'portrait' | 'landscape';
  } = {
    size: 'A4',
    margin: 30,
    lang: 'ja',
  };
  if (options?.landscape) {
    pdfOptions.layout = 'landscape';
  }
  const doc = new PDFDocument(pdfOptions);
  // 日本語フォントを登録して設定
  doc.registerFont('NotoSansJP', JAPANESE_FONT_PATH);
  doc.font('NotoSansJP');
  console.log('[PDF] Font registered and set successfully');
  return doc;
}

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
    // 終了日はその日の終わりまでを含める
    let endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();
    // endDateを23:59:59.999に設定
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

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
          // anyoneの場合は「リンクを知っている全員」と表示
          targetEmail: log.details.targetEmail
            || (log.details.targetType === 'anyone' ? 'リンクを知っている全員' : undefined),
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

// PDF用ヘルパー関数
interface PdfPageInfo {
  organizationName: string;
  reportTitle: string;
  generatedAt: string;
}

// 縦向き（Portrait）用
function addPdfHeader(doc: typeof PDFDocument.prototype, info: PdfPageInfo) {
  const headerY = 30;
  doc.fontSize(8).fillColor('#000000');
  doc.text(info.reportTitle, 50, headerY);
  doc.text(info.organizationName, 50, headerY, { align: 'right', width: 495 });
  doc.moveTo(50, headerY + 15).lineTo(545, headerY + 15).strokeColor('#999999').stroke();
}

function addPdfFooter(doc: typeof PDFDocument.prototype, pageNum: number, generatedAt: string) {
  const footerY = 770;
  const savedY = doc.y;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#999999').stroke();
  doc.fontSize(8).fillColor('#000000');
  doc.text(`生成日時: ${generatedAt}`, 50, footerY + 5, { lineBreak: false });
  doc.text(`ページ ${pageNum}`, 450, footerY + 5, { lineBreak: false, width: 95, align: 'right' });
  doc.y = savedY;
}

// 横向き（Landscape）用 - A4横: 842 x 595
function addPdfHeaderLandscape(doc: typeof PDFDocument.prototype, info: PdfPageInfo) {
  const headerY = 20;
  doc.fontSize(7).fillColor('#000000');
  doc.text(info.reportTitle, 30, headerY, { lineBreak: false });
  doc.text(info.organizationName, 30, headerY, { align: 'right', width: 782 });
  doc.moveTo(30, headerY + 12).lineTo(812, headerY + 12).strokeColor('#999999').stroke();
}

function addPdfFooterLandscape(doc: typeof PDFDocument.prototype, pageNum: number, generatedAt: string) {
  const footerY = 550;
  const savedY = doc.y;
  doc.moveTo(30, footerY).lineTo(812, footerY).strokeColor('#999999').stroke();
  doc.fontSize(7).fillColor('#000000');
  doc.text(`生成日時: ${generatedAt}`, 30, footerY + 3, { lineBreak: false });
  doc.text(`ページ ${pageNum}`, 700, footerY + 3, { lineBreak: false, width: 112, align: 'right' });
  doc.y = savedY;
}

// リスク要因を短縮形に変換するヘルパー
function shortenRiskFactors(factors: string[]): string {
  return factors.map((r: string) =>
    r.replace('「リンクを知っている全員」がアクセス可能', '公開')
     .replace('組織外のユーザーとファイルを共有中', '外部')
     .replace('機密性の高いファイル', '機密')
     .replace('機密情報の可能性: ', '')
     .replace('認証・アクセス情報', '認証')
     .replace('契約・法務機密情報', '契約')
     .replace('財務機密情報', '財務')
     .replace('人事・労務機密情報', '人事')
     .replace('決済情報', '決済')
     .replace('社内文書・会議資料', '社内')
     .replace('開発機密情報', '開発')
     .replace('1年以上更新のない共有ファイル', '長期')
     .replace('機密形式', '機密型')
  ).join(', ');
}

// テキストを指定文字数で切り、超える場合は...を付ける
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 2) + '..';
}

// 横向きテーブル用（行高さを小さく、改行なし）
function drawTableRowLandscape(
  doc: typeof PDFDocument.prototype,
  y: number,
  columns: { text: string; width: number; align?: 'left' | 'center' | 'right' }[],
  options?: { isHeader?: boolean; fillColor?: string; rowHeight?: number }
) {
  const startX = 30;
  const rowHeight = options?.rowHeight || 10;
  let x = startX;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  // 背景色（グレー系で統一）
  if (options?.fillColor) {
    doc.rect(startX, y, totalWidth, rowHeight).fill(options.fillColor);
  }

  // 罫線（上）
  doc.moveTo(startX, y).lineTo(startX + totalWidth, y).strokeColor('#cccccc').stroke();

  // テキスト（黒色で統一）
  doc.fillColor('#000000');
  doc.fontSize(options?.isHeader ? 4.5 : 4.5);

  for (const col of columns) {
    // テキストを1行に収める（改行禁止）
    doc.text(col.text, x + 1, y + 1.5, {
      width: col.width - 2,
      align: col.align || 'left',
      lineBreak: false,
    });
    // 縦罫線
    doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cccccc').stroke();
    x += col.width;
  }
  // 最後の縦罫線
  doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cccccc').stroke();

  return y + rowHeight;
}

// テーブル描画ヘルパー
function drawTableRow(
  doc: typeof PDFDocument.prototype,
  y: number,
  columns: { text: string; width: number; align?: 'left' | 'center' | 'right' }[],
  options?: { isHeader?: boolean; fillColor?: string }
) {
  const startX = 50;
  const rowHeight = 20;
  let x = startX;

  // 背景色
  if (options?.fillColor) {
    doc.rect(startX, y, 495, rowHeight).fill(options.fillColor);
  }

  // 罫線（上）
  doc.moveTo(startX, y).lineTo(startX + 495, y).strokeColor('#cccccc').stroke();

  // テキスト（黒色で統一）
  doc.fillColor('#000000');
  doc.fontSize(options?.isHeader ? 8 : 9);

  for (const col of columns) {
    doc.text(col.text, x + 3, y + 5, {
      width: col.width - 6,
      align: col.align || 'left',
      lineBreak: false,
    });
    // 縦罫線
    doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cccccc').stroke();
    x += col.width;
  }
  // 最後の縦罫線
  doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor('#cccccc').stroke();

  return y + rowHeight;
}

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

    // PDF生成（横向き・日本語フォント対応）
    const doc = createPdfDocument({ landscape: true });
    const generatedAt = formatDate(new Date().toISOString());
    const pageInfo: PdfPageInfo = {
      organizationName: organization.name,
      reportTitle: 'スキャン実施履歴レポート',
      generatedAt,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scan-history-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    let currentPage = 1;
    const pageBreakY = 520; // 横向きのページ下限

    // 1ページ目のヘッダー
    addPdfHeaderLandscape(doc, pageInfo);

    // タイトル（コンパクト）
    doc.fontSize(14).fillColor('#000000').text('スキャン実施履歴レポート', 30, 38, { align: 'center', width: 782 });
    doc.fontSize(8).text(`組織: ${organization.name} (${organization.domain}) | 期間: ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`, 30, 55, { align: 'center', width: 782 });

    // サマリー（1行）
    doc.fontSize(7).text(
      `【サマリー】 総スキャン: ${filteredScans.length}回 | 完了: ${completedScans.length}回 | 失敗: ${failedScans.length}回 | スキャン済みファイル: ${totalFilesScanned.toLocaleString()}件 | 実行ユーザー: ${uniqueUsers}人`,
      30, 68, { align: 'left', width: 782 }
    );

    // テーブルカラム定義（横向き用・幅広く）
    const columns = [
      { text: 'No.', width: 30, align: 'center' as const },
      { text: '状態', width: 45, align: 'center' as const },
      { text: '実行日時', width: 130, align: 'center' as const },
      { text: '実行者', width: 200, align: 'left' as const },
      { text: 'ファイル数', width: 80, align: 'right' as const },
      { text: '緊急', width: 60, align: 'right' as const },
      { text: '高', width: 60, align: 'right' as const },
      { text: '中', width: 60, align: 'right' as const },
      { text: '低', width: 117, align: 'right' as const },
    ];

    // ヘッダー行
    let tableY = 85;
    tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });

    // データ行
    for (let i = 0; i < filteredScans.length; i++) {
      const scan = filteredScans[i];

      // ページ送り確認（横向きのフッターエリア手前で改ページ）
      if (tableY > pageBreakY) {
        // 現在のテーブル下部罫線
        doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
        // フッター
        addPdfFooterLandscape(doc, currentPage, generatedAt);
        // 新しいページ
        doc.addPage();
        currentPage++;
        addPdfHeaderLandscape(doc, pageInfo);
        tableY = 40;
        // ヘッダー行を再描画
        tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });
      }

      const statusLabel = scan.status === 'completed' ? '完了' : scan.status === 'failed' ? '失敗' : '実行中';
      const rowData = [
        { text: String(i + 1), width: 30, align: 'center' as const },
        { text: statusLabel, width: 45, align: 'center' as const },
        { text: formatDate(scan.startedAt?.toString()), width: 130, align: 'center' as const },
        { text: truncateText(scan.userName || scan.userEmail || '-', 30), width: 200, align: 'left' as const },
        { text: scan.totalFiles.toLocaleString(), width: 80, align: 'right' as const },
        { text: String(scan.riskySummary.critical), width: 60, align: 'right' as const },
        { text: String(scan.riskySummary.high), width: 60, align: 'right' as const },
        { text: String(scan.riskySummary.medium), width: 60, align: 'right' as const },
        { text: String(scan.riskySummary.low), width: 117, align: 'right' as const },
      ];

      const fillColor = i % 2 === 1 ? '#f8f9fa' : undefined;
      tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
    }

    // 最後の罫線
    doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();

    // 凡例を追加
    doc.fontSize(7).fillColor('#666666');
    doc.text('【注釈】 緊急=Critical, 高=High, 中=Medium, 低=Low', 30, tableY + 5, { width: 782 });

    // フッター
    addPdfFooterLandscape(doc, currentPage, generatedAt);

    doc.end();
  } catch (err) {
    console.error('Generate scan history PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/risk-assessment/:scanId/pdf
 * リスクアセスメントレポートをPDFで出力（横向き・高密度）
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
    // ISMSレポートでは全件表示が必要
    const { files: criticalFiles } = await ScannedFileService.getAll(scanId, { riskLevel: 'critical', limit: 10000 });
    const { files: highFiles } = await ScannedFileService.getAll(scanId, { riskLevel: 'high', limit: 10000 });

    // 横向きPDF（A4 Landscape: 842 x 595）
    const doc = createPdfDocument({ landscape: true });
    const generatedAt = formatDate(new Date().toISOString());
    const pageInfo: PdfPageInfo = {
      organizationName: organization.name,
      reportTitle: 'リスクアセスメントレポート',
      generatedAt,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=risk-assessment-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    let currentPage = 1;
    const pageBreakY = 520; // 横向きのページ下限
    const tableStartY = 40;

    // ヘッダー
    addPdfHeaderLandscape(doc, pageInfo);

    // タイトル（コンパクト）
    doc.fontSize(14).fillColor('#000000').text('リスクアセスメントレポート', 30, 38, { align: 'center', width: 782 });
    doc.fontSize(8).text(`組織: ${organization.name} (${organization.domain}) | スキャン: ${formatDate(scan.completedAt?.toString() || scan.startedAt?.toString())} | 実行者: ${scanUser?.displayName || scan.userEmail || '-'}`, 30, 55, { align: 'center', width: 782 });

    // サマリー（1行）
    doc.fontSize(7).text(
      `【サマリー】 総ファイル: ${scan.totalFiles.toLocaleString()}件 | 緊急(Critical): ${scan.riskySummary.critical}件 | 高(High): ${scan.riskySummary.high}件 | 中(Medium): ${scan.riskySummary.medium}件 | 低(Low): ${scan.riskySummary.low}件`,
      30, 68, { align: 'left', width: 782 }
    );

    // 横向きテーブルカラム定義（より多くの情報）
    // 合計幅: 782px (25+30+35+290+100+302)
    const columns = [
      { text: 'No.', width: 25, align: 'center' as const },
      { text: 'スコア', width: 30, align: 'center' as const },
      { text: 'レベル', width: 35, align: 'center' as const },
      { text: 'ファイル名', width: 290, align: 'left' as const },
      { text: 'オーナー', width: 100, align: 'left' as const },
      { text: 'リスク要因', width: 302, align: 'left' as const },
    ];

    let tableY = 82;
    let rowNum = 0;

    // Criticalファイル セクション
    if (criticalFiles.length > 0) {
      doc.fontSize(7).fillColor('#000000').text(`■ 緊急リスクファイル (Critical) - ${criticalFiles.length}件`, 30, tableY);
      tableY += 10;
      tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });

      for (let i = 0; i < criticalFiles.length; i++) {
        const file = criticalFiles[i];
        if (tableY > pageBreakY) {
          doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
          addPdfFooterLandscape(doc, currentPage, generatedAt);
          doc.addPage();
          currentPage++;
          addPdfHeaderLandscape(doc, pageInfo);
          tableY = tableStartY;
          tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });
        }
        rowNum++;
        const riskShort = shortenRiskFactors(file.riskFactors);
        const rowData = [
          { text: String(rowNum), width: 25, align: 'center' as const },
          { text: String(file.riskScore), width: 30, align: 'center' as const },
          { text: '緊急', width: 35, align: 'center' as const },
          { text: truncateText(file.name, 50), width: 290, align: 'left' as const },
          { text: truncateText(file.ownerEmail, 24), width: 100, align: 'left' as const },
          { text: truncateText(riskShort, 50), width: 302, align: 'left' as const },
        ];
        const fillColor = i % 2 === 1 ? '#f5f5f5' : undefined;
        tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
      }
      doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
      tableY += 6;
    }

    // Highファイル セクション
    if (highFiles.length > 0) {
      if (tableY > pageBreakY - 20) {
        addPdfFooterLandscape(doc, currentPage, generatedAt);
        doc.addPage();
        currentPage++;
        addPdfHeaderLandscape(doc, pageInfo);
        tableY = tableStartY;
      }

      doc.fontSize(7).fillColor('#000000').text(`■ 高リスクファイル (High) - ${highFiles.length}件`, 30, tableY);
      tableY += 10;
      tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });

      for (let i = 0; i < highFiles.length; i++) {
        const file = highFiles[i];
        if (tableY > pageBreakY) {
          doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
          addPdfFooterLandscape(doc, currentPage, generatedAt);
          doc.addPage();
          currentPage++;
          addPdfHeaderLandscape(doc, pageInfo);
          tableY = tableStartY;
          tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });
        }
        rowNum++;
        const riskShort = shortenRiskFactors(file.riskFactors);
        const rowData = [
          { text: String(rowNum), width: 25, align: 'center' as const },
          { text: String(file.riskScore), width: 30, align: 'center' as const },
          { text: '高', width: 35, align: 'center' as const },
          { text: truncateText(file.name, 50), width: 290, align: 'left' as const },
          { text: truncateText(file.ownerEmail, 24), width: 100, align: 'left' as const },
          { text: truncateText(riskShort, 50), width: 302, align: 'left' as const },
        ];
        const fillColor = i % 2 === 1 ? '#f5f5f5' : undefined;
        tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
      }
      doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
      tableY += 6;
    }

    // 略語注釈と推奨対応策
    if (tableY > pageBreakY - 60) {
      addPdfFooterLandscape(doc, currentPage, generatedAt);
      doc.addPage();
      currentPage++;
      addPdfHeaderLandscape(doc, pageInfo);
      tableY = tableStartY;
    }
    doc.fontSize(7).fillColor('#666666');
    doc.text('【略語注釈】 公開=リンクを知っている全員がアクセス可能 | 外部=組織外ユーザーと共有中 | 機密=機密性の高いファイル | 機密型=機密形式 | 認証=認証・アクセス情報 | 契約=契約・法務機密情報 | 財務=財務機密情報 | 人事=人事・労務機密情報 | 決済=決済情報 | 社内=社内文書・会議資料 | 開発=開発機密情報 | 長期=1年以上更新のない共有ファイル', 30, tableY, { width: 782 });
    tableY += 22;
    doc.fontSize(7).fillColor('#000000');
    doc.text('【推奨対応策】 公開→共有を「制限付き」に変更 | 外部→必要性を確認し不要なら削除 | 機密→特定ユーザーのみに制限', 30, tableY, { width: 782 });

    addPdfFooterLandscape(doc, currentPage, generatedAt);
    doc.end();
  } catch (err) {
    console.error('Generate risk assessment PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/remediation-history/pdf
 * 是正対応履歴レポートをPDFで出力（横向き・高密度）
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
    // 終了日はその日の終わりまでを含める
    let endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date();
    // endDateを23:59:59.999に設定
    endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

    let logs: Awaited<ReturnType<typeof ActionLogService.getByOrganization>>['logs'] = [];
    try {
      // 日付範囲フィルタなしで取得（Firestoreインデックスの問題を回避）
      const result = await ActionLogService.getByOrganization(organization.id, {
        limit: 1000,
      });
      // メモリ上で日付フィルタを適用
      logs = result.logs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return logDate >= startDate && logDate <= endDate;
      });
    } catch (logErr) {
      console.error('ActionLogService error:', logErr);
      // ログ取得に失敗しても空で続行
    }

    const successfulActions = logs.filter((l) => l.success);
    const permissionsDeleted = logs.filter(
      (l) => l.actionType === 'permission_delete' || l.actionType === 'permission_bulk_delete'
    ).length;
    const permissionsUpdated = logs.filter((l) => l.actionType === 'permission_update').length;

    // 横向きPDF
    const doc = createPdfDocument({ landscape: true });
    const generatedAt = formatDate(new Date().toISOString());
    const pageInfo: PdfPageInfo = {
      organizationName: organization.name,
      reportTitle: '是正対応履歴レポート',
      generatedAt,
    };

    const actionTypeLabels: Record<string, string> = {
      permission_delete: '削除',
      permission_update: '変更',
      permission_bulk_delete: '一括削除',
      permission_bulk_update: '一括変更',
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=remediation-history-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    let currentPage = 1;
    const pageBreakY = 520;
    const tableStartY = 40;

    // ヘッダー
    addPdfHeaderLandscape(doc, pageInfo);

    // タイトル（コンパクト）
    doc.fontSize(14).fillColor('#000000').text('是正対応履歴レポート', 30, 38, { align: 'center', width: 782 });
    doc.fontSize(8).text(`組織: ${organization.name} (${organization.domain}) | 期間: ${formatDate(startDate.toISOString())} - ${formatDate(endDate.toISOString())}`, 30, 55, { align: 'center', width: 782 });

    // サマリー（1行）
    doc.fontSize(7).text(
      `【サマリー】 総アクション: ${logs.length}件 | 成功: ${successfulActions.length}件 | 失敗: ${logs.length - successfulActions.length}件 | 権限削除: ${permissionsDeleted}件 | 権限変更: ${permissionsUpdated}件`,
      30, 68, { align: 'left', width: 782 }
    );

    // 横向きテーブルカラム定義（782px）
    const columns = [
      { text: 'No.', width: 30, align: 'center' as const },
      { text: '結果', width: 40, align: 'center' as const },
      { text: '日時', width: 120, align: 'center' as const },
      { text: '種類', width: 60, align: 'center' as const },
      { text: '対象ファイル', width: 280, align: 'left' as const },
      { text: '対象ユーザー', width: 130, align: 'left' as const },
      { text: '実行者', width: 122, align: 'left' as const },
    ];

    let tableY = 82;
    tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (tableY > pageBreakY) {
        doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
        addPdfFooterLandscape(doc, currentPage, generatedAt);
        doc.addPage();
        currentPage++;
        addPdfHeaderLandscape(doc, pageInfo);
        tableY = tableStartY;
        tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e0e0e0' });
      }
      // 対象ユーザーの表示（anyoneの場合は「リンクを知っている全員」）
      const targetUserDisplay = log.details?.targetEmail
        || (log.details?.targetType === 'anyone' ? 'リンクを知っている全員' : '-');
      const rowData = [
        { text: String(i + 1), width: 30, align: 'center' as const },
        { text: log.success ? '成功' : '失敗', width: 40, align: 'center' as const },
        { text: formatDate(log.createdAt?.toString()), width: 120, align: 'center' as const },
        { text: actionTypeLabels[log.actionType] || log.actionType, width: 60, align: 'center' as const },
        { text: truncateText(log.targetName, 50), width: 280, align: 'left' as const },
        { text: truncateText(targetUserDisplay, 24), width: 130, align: 'left' as const },
        { text: truncateText(log.userEmail, 22), width: 122, align: 'left' as const },
      ];
      const fillColor = i % 2 === 1 ? '#f5f5f5' : undefined;
      tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
    }

    doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
    addPdfFooterLandscape(doc, currentPage, generatedAt);
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
          extPerms.push('公開');
        } else if (perm.type === 'domain' && perm.domain !== organization.domain) {
          extPerms.push(perm.domain || '外部ドメイン');
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

    // PDF生成（横向き・日本語フォント対応）
    const doc = createPdfDocument({ landscape: true });
    const generatedAt = formatDate(new Date().toISOString());
    const pageInfo: PdfPageInfo = {
      organizationName: organization.name,
      reportTitle: '外部共有一覧レポート',
      generatedAt,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=external-sharing-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    let currentPage = 1;
    const pageBreakY = 520; // 横向きのページ下限

    // ヘッダー
    addPdfHeaderLandscape(doc, pageInfo);

    // タイトル（コンパクト）
    doc.fontSize(14).fillColor('#000000').text('外部共有一覧レポート', 30, 38, { align: 'center', width: 782 });
    doc.fontSize(8).text(`組織: ${organization.name} (${organization.domain}) | スキャン日時: ${formatDate(scan.completedAt?.toString() || scan.startedAt?.toString())}`, 30, 55, { align: 'center', width: 782 });

    // サマリー（1行）
    doc.fontSize(7).text(
      `【サマリー】 外部共有ファイル: ${externalFiles.length}件 | 公開リンク: ${publicShares}件 | 外部ユーザー共有: ${externalUserShares}件`,
      30, 68, { align: 'left', width: 782 }
    );

    // テーブルカラム定義（横向き用・幅広く）
    const columns = [
      { text: 'No.', width: 30, align: 'center' as const },
      { text: 'リスク', width: 50, align: 'center' as const },
      { text: 'ファイル名', width: 280, align: 'left' as const },
      { text: 'オーナー', width: 150, align: 'left' as const },
      { text: '共有先', width: 272, align: 'left' as const },
    ];

    let tableY = 85;
    tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });

    for (let i = 0; i < externalFiles.length; i++) {
      const file = externalFiles[i];
      if (tableY > pageBreakY) {
        doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
        addPdfFooterLandscape(doc, currentPage, generatedAt);
        doc.addPage();
        currentPage++;
        addPdfHeaderLandscape(doc, pageInfo);
        tableY = 40;
        tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });
      }
      const rowData = [
        { text: String(i + 1), width: 30, align: 'center' as const },
        { text: getRiskLevelLabel(file.riskLevel), width: 50, align: 'center' as const },
        { text: truncateText(file.name, 45), width: 280, align: 'left' as const },
        { text: truncateText(file.ownerEmail, 24), width: 150, align: 'left' as const },
        { text: truncateText(file.externalPermissions.join(', '), 45), width: 272, align: 'left' as const },
      ];
      const fillColor = i % 2 === 1 ? '#f8f9fa' : undefined;
      tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
    }

    doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();

    // 凡例を追加
    doc.fontSize(7).fillColor('#666666');
    doc.text('【注釈】 リスク: 緊急=Critical, 高=High, 中=Medium, 低=Low | 公開=「リンクを知っている全員」がアクセス可能', 30, tableY + 5, { width: 782 });

    addPdfFooterLandscape(doc, currentPage, generatedAt);
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

    // PDF生成（横向き・日本語フォント対応）
    const doc = createPdfDocument({ landscape: true });
    const generatedAt = formatDate(new Date().toISOString());
    const pageInfo: PdfPageInfo = {
      organizationName: organization.name,
      reportTitle: '現在のリスク状況レポート',
      generatedAt,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=current-risks-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    let currentPage = 1;
    const pageBreakY = 520; // 横向きのページ下限

    // ヘッダー
    addPdfHeaderLandscape(doc, pageInfo);

    // タイトル（コンパクト）
    doc.fontSize(14).fillColor('#000000').text('現在のリスク状況レポート', 30, 38, { align: 'center', width: 782 });
    doc.fontSize(8).text(`組織: ${organization.name} (${organization.domain}) | 生成日時: ${generatedAt}`, 30, 55, { align: 'center', width: 782 });

    // サマリー（1行）
    doc.fontSize(7).text(
      `【組織全体サマリー】 総ユーザー: ${users.length}人 | スキャン実施済み: ${latestScans.length}人 | 未実施: ${users.length - latestScans.length}人 | 総ファイル: ${aggregated.totalFiles.toLocaleString()}件 | 緊急: ${aggregated.critical}件 | 高: ${aggregated.high}件 | 中: ${aggregated.medium}件 | 低: ${aggregated.low}件`,
      30, 68, { align: 'left', width: 782 }
    );

    // テーブルカラム定義（横向き用・幅広く）
    const columns = [
      { text: 'No.', width: 30, align: 'center' as const },
      { text: 'ユーザー名', width: 180, align: 'left' as const },
      { text: 'メールアドレス', width: 200, align: 'left' as const },
      { text: '最終スキャン', width: 130, align: 'center' as const },
      { text: 'ファイル数', width: 80, align: 'right' as const },
      { text: '緊急', width: 42, align: 'right' as const },
      { text: '高', width: 40, align: 'right' as const },
      { text: '中', width: 40, align: 'right' as const },
      { text: '低', width: 40, align: 'right' as const },
    ];

    let tableY = 85;
    tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });

    for (let i = 0; i < latestScans.length; i++) {
      const item = latestScans[i];

      // ページ送り確認
      if (tableY > pageBreakY) {
        doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();
        addPdfFooterLandscape(doc, currentPage, generatedAt);
        doc.addPage();
        currentPage++;
        addPdfHeaderLandscape(doc, pageInfo);
        tableY = 40;
        tableY = drawTableRowLandscape(doc, tableY, columns, { isHeader: true, fillColor: '#e9ecef' });
      }

      const rowData = [
        { text: String(i + 1), width: 30, align: 'center' as const },
        { text: truncateText(item.userName || '-', 25), width: 180, align: 'left' as const },
        { text: truncateText(item.userEmail, 30), width: 200, align: 'left' as const },
        { text: formatDate(item.lastScanAt), width: 130, align: 'center' as const },
        { text: item.totalFiles.toLocaleString(), width: 80, align: 'right' as const },
        { text: String(item.riskySummary.critical), width: 42, align: 'right' as const },
        { text: String(item.riskySummary.high), width: 40, align: 'right' as const },
        { text: String(item.riskySummary.medium), width: 40, align: 'right' as const },
        { text: String(item.riskySummary.low), width: 40, align: 'right' as const },
      ];

      const fillColor = i % 2 === 1 ? '#f8f9fa' : undefined;
      tableY = drawTableRowLandscape(doc, tableY, rowData, { fillColor });
    }

    // 最後の罫線
    doc.moveTo(30, tableY).lineTo(812, tableY).strokeColor('#cccccc').stroke();

    // 凡例
    doc.fontSize(7).fillColor('#666666');
    doc.text('【注釈】 緊急=Critical, 高=High, 中=Medium, 低=Low', 30, tableY + 5, { width: 782 });

    // フッター
    addPdfFooterLandscape(doc, currentPage, generatedAt);

    doc.end();
  } catch (err) {
    console.error('Generate current risks PDF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
