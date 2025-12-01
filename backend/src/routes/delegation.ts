/**
 * Domain-Wide Delegation設定API
 *
 * スキャン状態はFirestoreに永続化され、サーバー再起動後も維持されます。
 */

import { Router, Request, Response } from 'express';
import { OrganizationService, ScanService, ScannedFileService, IntegratedScanJobService } from '../services/firestore.js';
import {
  parseServiceAccountJson,
  verifyServiceAccountConfig,
  getRequiredScopes,
  extractClientId,
  getDomainUsers,
  createDelegatedDriveClient,
} from '../services/serviceAccount.js';
import {
  countAllFiles,
  scanAllFiles,
  getFolderNames,
  type DriveFile,
} from '../services/drive.js';
import { calculateRiskScore, calculateRiskSummary, isInternalOwner, type RiskAssessment } from '../services/risk.js';
import type { ServiceAccountConfig, ScannedFile, IntegratedScanJob, IntegratedScanUserResult } from '../types/models.js';

interface FileWithRisk extends DriveFile {
  risk: RiskAssessment;
}

const router = Router();

// アクティブなスキャンワーカーを追跡（同一プロセスでの重複実行防止用）
const activeWorkers = new Set<string>();

/**
 * GET /api/delegation/status
 * Domain-Wide Delegation設定状態を取得
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = await OrganizationService.getServiceAccountConfig(user.organizationId);

    if (!config) {
      return res.json({
        configured: false,
        verificationStatus: null,
        clientEmail: null,
        configuredAt: null,
        lastVerifiedAt: null,
        verificationError: null,
      });
    }

    return res.json({
      configured: true,
      verificationStatus: config.verificationStatus,
      clientEmail: config.clientEmail,
      configuredAt: config.configuredAt,
      lastVerifiedAt: config.lastVerifiedAt,
      verificationError: config.verificationError,
    });
  } catch (error) {
    console.error('Error getting delegation status:', error);
    return res.status(500).json({ error: 'Failed to get delegation status' });
  }
});

/**
 * POST /api/delegation/configure
 * サービスアカウントを設定
 */
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { serviceAccountJson } = req.body;

    if (!serviceAccountJson) {
      return res.status(400).json({ error: 'サービスアカウントJSONが必要です' });
    }

    // JSONをパース
    const parsed = parseServiceAccountJson(serviceAccountJson);
    if (!parsed) {
      return res.status(400).json({
        error: 'サービスアカウントJSONの形式が無効です。Google Cloud Consoleからダウンロードしたキーファイルを使用してください。',
      });
    }

    // クライアントIDを抽出
    const clientId = extractClientId(serviceAccountJson);

    // 設定を保存
    const config: ServiceAccountConfig = {
      clientEmail: parsed.clientEmail,
      privateKey: parsed.privateKey,
      configuredAt: new Date(),
      configuredBy: user.email,
      lastVerifiedAt: null,
      verificationStatus: 'pending',
      verificationError: null,
    };

    await OrganizationService.saveServiceAccountConfig(user.organizationId, config);

    return res.json({
      success: true,
      message: 'サービスアカウントを設定しました。検証を実行してください。',
      clientEmail: parsed.clientEmail,
      clientId, // 管理コンソール設定に必要
      requiredScopes: getRequiredScopes(),
    });
  } catch (error) {
    console.error('Error configuring service account:', error);
    return res.status(500).json({ error: 'サービスアカウントの設定に失敗しました' });
  }
});

/**
 * POST /api/delegation/verify
 * サービスアカウント設定を検証
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = await OrganizationService.getServiceAccountConfig(user.organizationId);
    if (!config) {
      return res.status(400).json({ error: 'サービスアカウントが設定されていません' });
    }

    // 検証実行（管理者ユーザーで代理アクセスをテスト）
    const result = await verifyServiceAccountConfig(config, user.email);

    if (result.success) {
      await OrganizationService.updateServiceAccountVerification(
        user.organizationId,
        'verified'
      );
      return res.json({
        success: true,
        message: 'Domain-Wide Delegationの設定が正しく動作しています',
        userCount: result.userCount,
      });
    } else {
      await OrganizationService.updateServiceAccountVerification(
        user.organizationId,
        'failed',
        result.error
      );
      return res.json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error verifying service account:', error);
    return res.status(500).json({ error: '検証に失敗しました' });
  }
});

/**
 * DELETE /api/delegation
 * サービスアカウント設定を削除
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ownerのみ削除可能
    if (user.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required' });
    }

    await OrganizationService.deleteServiceAccountConfig(user.organizationId);

    return res.json({
      success: true,
      message: 'サービスアカウント設定を削除しました',
    });
  } catch (error) {
    console.error('Error deleting service account config:', error);
    return res.status(500).json({ error: '設定の削除に失敗しました' });
  }
});

/**
 * GET /api/delegation/users
 * 組織内のユーザー一覧を取得（統合スキャン対象）
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = await OrganizationService.getServiceAccountConfig(user.organizationId);
    if (!config || config.verificationStatus !== 'verified') {
      return res.status(400).json({
        error: 'Domain-Wide Delegationが設定・検証されていません',
      });
    }

    const org = await OrganizationService.getById(user.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const users = await getDomainUsers(config, user.email, org.domain);

    return res.json({
      users,
      totalCount: users.length,
    });
  } catch (error) {
    console.error('Error getting domain users:', error);
    return res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

/**
 * GET /api/delegation/setup-guide
 * 設定ガイド情報を取得
 */
router.get('/setup-guide', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await OrganizationService.getServiceAccountConfig(user.organizationId);

    return res.json({
      requiredScopes: getRequiredScopes(),
      clientEmail: config?.clientEmail || null,
      steps: [
        {
          step: 1,
          title: 'Google Cloud Consoleでサービスアカウントを作成',
          description: 'Google Cloud Console > IAMと管理 > サービスアカウント > 作成',
          link: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
        },
        {
          step: 2,
          title: 'サービスアカウントキーを生成',
          description: 'サービスアカウント詳細 > キー > 鍵を追加 > 新しい鍵を作成（JSON形式）',
        },
        {
          step: 3,
          title: 'Domain-Wide Delegationを有効化',
          description: 'サービスアカウント詳細 > 「ドメイン全体の委任を有効にする」にチェック',
        },
        {
          step: 4,
          title: 'Google Workspace管理コンソールでAPIアクセスを許可',
          description: '管理コンソール > セキュリティ > APIの制御 > ドメイン全体の委任を管理',
          link: 'https://admin.google.com/ac/owl/domainwidedelegation',
        },
        {
          step: 5,
          title: 'クライアントIDとスコープを設定',
          description: '「新しいクライアントを追加」でサービスアカウントのクライアントIDと必要なスコープを入力',
          scopesToAdd: getRequiredScopes().join(','),
        },
      ],
    });
  } catch (error) {
    console.error('Error getting setup guide:', error);
    return res.status(500).json({ error: 'Failed to get setup guide' });
  }
});

// ========================================
// 統合スキャン機能（Firestore永続化）
// ========================================

/**
 * POST /api/delegation/scan/start
 * 統合スキャンを開始
 */
router.post('/scan/start', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = await OrganizationService.getServiceAccountConfig(user.organizationId);
    if (!config || config.verificationStatus !== 'verified') {
      return res.status(400).json({
        error: 'Domain-Wide Delegationが設定・検証されていません',
      });
    }

    const org = await OrganizationService.getById(user.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // 既に実行中の統合スキャンがあるかチェック（Firestoreから）
    const existingJob = await IntegratedScanJobService.getActiveByOrganization(user.organizationId);
    if (existingJob) {
      return res.status(409).json({
        error: '統合スキャンは既に実行中です',
        jobId: existingJob.id,
      });
    }

    // 組織内ユーザーを取得
    const domainUsers = await getDomainUsers(config, user.email, org.domain);

    // オプション：スキャン対象ユーザーを限定
    const { userEmails } = req.body;
    const targetUsers = userEmails
      ? domainUsers.filter(u => userEmails.includes(u.email))
      : domainUsers;

    if (targetUsers.length === 0) {
      return res.status(400).json({ error: '対象ユーザーがいません' });
    }

    // ジョブをFirestoreに作成
    const job = await IntegratedScanJobService.create({
      organizationId: user.organizationId,
      initiatorUserId: user.id,
      initiatorEmail: user.email,
      initiatorName: user.displayName,
      status: 'running',
      totalUsers: targetUsers.length,
      processedUsers: 0,
      currentUserEmail: null,
      targetUsers: targetUsers.map(u => ({
        email: u.email,
        displayName: u.displayName,
      })),
      userResults: targetUsers.map(u => ({
        userEmail: u.email,
        userName: u.displayName,
        status: 'pending' as const,
        scanId: null,
        filesScanned: 0,
        riskySummary: { critical: 0, high: 0, medium: 0, low: 0 },
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      })),
      totalRiskySummary: { critical: 0, high: 0, medium: 0, low: 0 },
      totalFilesScanned: 0,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      lastProcessedUserIndex: -1,
    });

    // 非同期でスキャンワーカーを開始
    startScanWorker(job.id, config, org.domain);

    return res.json({
      success: true,
      message: '統合スキャンを開始しました',
      jobId: job.id,
      targetUsers: targetUsers.length,
    });
  } catch (error) {
    console.error('Error starting integrated scan:', error);
    return res.status(500).json({ error: '統合スキャンの開始に失敗しました' });
  }
});

/**
 * GET /api/delegation/scan/status
 * 統合スキャンの進捗を取得
 */
router.get('/scan/status', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Firestoreから最新のジョブを取得
    const job = await IntegratedScanJobService.getLatestByOrganization(user.organizationId);

    if (!job) {
      return res.json({
        hasActiveScan: false,
        status: null,
      });
    }

    // runningだがワーカーが動いていない場合は再開を試みる
    if (job.status === 'running' && !activeWorkers.has(job.id)) {
      const config = await OrganizationService.getServiceAccountConfig(user.organizationId);
      const org = await OrganizationService.getById(user.organizationId);
      if (config && org) {
        console.log(`Resuming interrupted scan job: ${job.id}`);
        startScanWorker(job.id, config, org.domain);
      }
    }

    return res.json({
      hasActiveScan: job.status === 'running' || job.status === 'pending',
      status: {
        jobId: job.id,
        status: job.status,
        totalUsers: job.totalUsers,
        processedUsers: job.processedUsers,
        currentUser: job.currentUserEmail,
        userResults: job.userResults.map(r => ({
          email: r.userEmail,
          displayName: r.userName,
          status: r.status,
          scanId: r.scanId,
          filesScanned: r.filesScanned,
          riskySummary: r.riskySummary,
          error: r.errorMessage,
        })),
        totalRiskySummary: job.totalRiskySummary,
        totalFilesScanned: job.totalFilesScanned,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    console.error('Error getting scan status:', error);
    return res.status(500).json({ error: 'Failed to get scan status' });
  }
});

/**
 * POST /api/delegation/scan/cancel
 * 統合スキャンをキャンセル
 */
router.post('/scan/cancel', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 管理者のみ
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const job = await IntegratedScanJobService.getActiveByOrganization(user.organizationId);
    if (!job) {
      return res.status(404).json({ error: '実行中の統合スキャンがありません' });
    }

    await IntegratedScanJobService.cancel(job.id);
    activeWorkers.delete(job.id);

    return res.json({
      success: true,
      message: '統合スキャンをキャンセルしました',
    });
  } catch (error) {
    console.error('Error cancelling scan:', error);
    return res.status(500).json({ error: 'キャンセルに失敗しました' });
  }
});

/**
 * POST /api/delegation/scan/worker
 * スキャンワーカー（内部API - Cloud Tasks等から呼び出される）
 * このエンドポイントはポーリングで呼び出すことでスキャンを進行させる
 */
router.post('/scan/worker', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await IntegratedScanJobService.getById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'running') {
      return res.json({ success: true, message: 'Job is not running', status: job.status });
    }

    const config = await OrganizationService.getServiceAccountConfig(job.organizationId);
    if (!config) {
      await IntegratedScanJobService.complete(jobId, 'サービスアカウントが設定されていません');
      return res.status(400).json({ error: 'Service account not configured' });
    }

    const org = await OrganizationService.getById(job.organizationId);
    if (!org) {
      await IntegratedScanJobService.complete(jobId, '組織が見つかりません');
      return res.status(404).json({ error: 'Organization not found' });
    }

    // 次に処理するユーザーのインデックス
    const nextIndex = job.lastProcessedUserIndex + 1;

    if (nextIndex >= job.targetUsers.length) {
      // 全ユーザー処理完了
      await IntegratedScanJobService.complete(jobId);
      return res.json({ success: true, message: 'All users processed', completed: true });
    }

    // 1ユーザーを処理
    const processed = await processOneUser(jobId, job, config, org.domain, nextIndex);

    return res.json({
      success: true,
      processed,
      nextIndex: nextIndex + 1,
      totalUsers: job.targetUsers.length,
      completed: nextIndex + 1 >= job.targetUsers.length,
    });
  } catch (error) {
    console.error('Error in scan worker:', error);
    return res.status(500).json({ error: 'Worker processing failed' });
  }
});

/**
 * スキャンワーカーを開始（バックグラウンドで実行）
 */
function startScanWorker(
  jobId: string,
  config: ServiceAccountConfig,
  domain: string
): void {
  // 既にワーカーが動いている場合はスキップ
  if (activeWorkers.has(jobId)) {
    console.log(`Worker already running for job: ${jobId}`);
    return;
  }

  activeWorkers.add(jobId);
  console.log(`Starting scan worker for job: ${jobId}`);

  // 非同期で実行
  runScanWorkerLoop(jobId, config, domain).catch(error => {
    console.error(`Scan worker failed for job ${jobId}:`, error);
    activeWorkers.delete(jobId);
  });
}

/**
 * スキャンワーカーのメインループ
 */
async function runScanWorkerLoop(
  jobId: string,
  config: ServiceAccountConfig,
  domain: string
): Promise<void> {
  const maxFilesPerUser = 10000;

  try {
    while (true) {
      // 最新のジョブ状態を取得
      const job = await IntegratedScanJobService.getById(jobId);
      if (!job) {
        console.log(`Job ${jobId} not found, stopping worker`);
        break;
      }

      // キャンセルされた場合は終了
      if (job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled, stopping worker`);
        break;
      }

      // 完了または失敗の場合は終了
      if (job.status === 'completed' || job.status === 'failed') {
        console.log(`Job ${jobId} is ${job.status}, stopping worker`);
        break;
      }

      // 次に処理するユーザーのインデックス
      const nextIndex = job.lastProcessedUserIndex + 1;

      if (nextIndex >= job.targetUsers.length) {
        // 全ユーザー処理完了
        await IntegratedScanJobService.complete(jobId);

        // 組織の統計を更新
        const updatedJob = await IntegratedScanJobService.getById(jobId);
        if (updatedJob) {
          await OrganizationService.incrementScanStats(job.organizationId, updatedJob.totalFilesScanned);
        }

        console.log(`Job ${jobId} completed: ${job.totalUsers} users processed`);
        break;
      }

      // 1ユーザーを処理
      await processOneUser(jobId, job, config, domain, nextIndex);
    }
  } finally {
    activeWorkers.delete(jobId);
    console.log(`Worker stopped for job: ${jobId}`);
  }
}

/**
 * 1ユーザーのスキャンを処理
 */
async function processOneUser(
  jobId: string,
  job: IntegratedScanJob,
  config: ServiceAccountConfig,
  domain: string,
  userIndex: number
): Promise<boolean> {
  const maxFilesPerUser = 10000;
  const targetUser = job.targetUsers[userIndex];

  console.log(`Processing user ${targetUser.email} (${userIndex + 1}/${job.totalUsers})`);

  // 現在処理中のユーザーを更新
  await IntegratedScanJobService.updateCurrentUser(jobId, targetUser.email, job.processedUsers);

  // ユーザーのステータスをrunningに更新
  await IntegratedScanJobService.updateUserResult(jobId, userIndex, {
    status: 'running',
    startedAt: new Date(),
  });

  try {
    // ユーザーのDriveにサービスアカウントでアクセス
    const drive = createDelegatedDriveClient(config, targetUser.email);

    // スキャンレコードを作成
    const scan = await ScanService.create({
      organizationId: job.organizationId,
      userId: job.initiatorUserId,
      userEmail: targetUser.email,
      userName: targetUser.displayName,
      visibility: 'organization',
      scanType: 'full',
      baseScanId: null,
      driveChangeToken: null,
      status: 'running',
      phase: 'counting',
      totalFiles: 0,
      processedFiles: 0,
      scannedNewFiles: 0,
      copiedFiles: 0,
      riskySummary: { critical: 0, high: 0, medium: 0, low: 0 },
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });

    // scanIdを更新
    await IntegratedScanJobService.updateUserResult(jobId, userIndex, {
      scanId: scan.id,
    });

    // ファイル数カウント
    const { count: totalFileCount } = await countAllFiles(drive, { maxFiles: maxFilesPerUser });

    await ScanService.update(scan.id, {
      totalFiles: totalFileCount,
      phase: 'scanning',
    });

    // ファイルスキャン
    const allFiles: FileWithRisk[] = [];
    let processedCount = 0;

    for await (const files of scanAllFiles(drive, { maxFiles: maxFilesPerUser })) {
      for (const file of files) {
        const risk = calculateRiskScore(file, domain);
        allFiles.push({ ...file, risk });
      }
      processedCount += files.length;
      await ScanService.update(scan.id, { processedFiles: processedCount });
    }

    // リスクサマリー計算
    const summary = calculateRiskSummary(
      allFiles.map(f => ({ ...f, permissions: f.permissions })),
      domain
    );

    // フォルダ名を取得
    const parentFolderIds = allFiles
      .map(file => file.parents?.[0])
      .filter((id): id is string => !!id);
    const folderNameMap = await getFolderNames(drive, parentFolderIds);

    // ファイルを保存
    const BATCH_SIZE = 500;
    for (let j = 0; j < allFiles.length; j += BATCH_SIZE) {
      const batch = allFiles.slice(j, j + BATCH_SIZE);
      const filesToSave: Omit<ScannedFile, 'scanId' | 'createdAt'>[] = batch.map(file => {
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
          isInternalOwner: isInternalOwner(file, domain),
          parentFolderId,
          parentFolderName,
          shared: file.shared,
          permissions: file.permissions.map(p => ({
            id: p.id,
            type: p.type,
            role: p.role,
            emailAddress: p.emailAddress,
            domain: p.domain,
            displayName: p.displayName,
          })),
          riskScore: file.risk.score,
          riskLevel: file.risk.level,
          riskFactors: file.risk.issues.map(issue => issue.description),
          recommendations: file.risk.recommendations,
        };
      });

      await ScannedFileService.saveBatch(scan.id, filesToSave);
    }

    // スキャン完了
    await ScanService.complete(scan.id, {
      totalFiles: summary.totalFiles,
      riskySummary: summary.riskySummary,
      phase: 'done',
      processedFiles: summary.totalFiles,
    });

    // ユーザー結果を更新
    await IntegratedScanJobService.updateUserResult(jobId, userIndex, {
      status: 'completed',
      filesScanned: summary.totalFiles,
      riskySummary: summary.riskySummary,
      completedAt: new Date(),
    });

    // processedUsersを更新
    await IntegratedScanJobService.updateCurrentUser(jobId, null, userIndex + 1);

    console.log(`User ${targetUser.email} completed - ${summary.totalFiles} files`);
    return true;

  } catch (error) {
    console.error(`User ${targetUser.email} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // ユーザー結果を更新
    await IntegratedScanJobService.updateUserResult(jobId, userIndex, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });

    // processedUsersを更新
    await IntegratedScanJobService.updateCurrentUser(jobId, null, userIndex + 1);

    return false;
  }
}

export default router;
