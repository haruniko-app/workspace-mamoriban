/**
 * Firestore データモデル定義
 */

// 組織（契約単位）
export interface Organization {
  id: string;
  name: string;                    // 会社名
  domain: string;                  // Google Workspaceドメイン
  adminEmail: string;              // 管理者メールアドレス

  // Stripe連携
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;

  // プラン情報
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  planExpiresAt: Date | null;

  // 利用統計
  totalScans: number;
  totalFilesScanned: number;
  lastScanAt: Date | null;

  // Domain-Wide Delegation設定
  serviceAccountConfig?: ServiceAccountConfig | null;

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

// サービスアカウント設定（Domain-Wide Delegation用）
export interface ServiceAccountConfig {
  // サービスアカウントのメールアドレス
  clientEmail: string;
  // 秘密鍵（暗号化して保存推奨）
  privateKey: string;
  // 設定日時
  configuredAt: Date;
  // 設定したユーザー
  configuredBy: string;
  // 最後に検証された日時
  lastVerifiedAt: Date | null;
  // 検証状態
  verificationStatus: 'pending' | 'verified' | 'failed';
  // 失敗時のエラーメッセージ
  verificationError: string | null;
}

// ユーザー（組織に所属）
export interface User {
  id: string;                      // Google UID
  email: string;
  displayName: string;
  photoUrl: string | null;

  // 所属組織
  organizationId: string;
  role: 'owner' | 'admin' | 'member';

  // 認証情報（暗号化して保存）
  refreshToken: string | null;     // Google OAuth refresh token

  // メタデータ
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// スキャン履歴
export interface Scan {
  id: string;
  organizationId: string;
  userId: string;                  // 実行したユーザー（所有者）
  userEmail: string;               // 実行したユーザーのメール（表示用）
  userName: string;                // 実行したユーザー名（表示用）

  // アクセス制御
  visibility: 'private' | 'organization';  // private: 本人のみ, organization: 組織全体
  // アクセス権限:
  // - private: 本人 + admin/owner が閲覧可能
  // - organization: 組織メンバー全員が閲覧可能

  // スキャン結果サマリー
  status: 'running' | 'completed' | 'failed';
  phase: 'counting' | 'scanning' | 'done';  // スキャンフェーズ
  totalFiles: number;              // 総ファイル数（カウント完了後に確定）
  processedFiles: number;          // 処理済みファイル数
  riskySummary: {
    critical: number;              // 80-100点
    high: number;                  // 60-79点
    medium: number;                // 40-59点
    low: number;                   // 0-39点
  };

  // 実行情報
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;

  createdAt: Date;
}

// スキャンされたファイル（scans/{scanId}/files サブコレクション）
export interface ScannedFile {
  id: string;                      // Google Drive file ID
  scanId: string;

  // ファイル情報
  name: string;
  mimeType: string;
  webViewLink: string | null;
  iconLink: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  size: string | null;

  // 所有者情報
  ownerEmail: string;
  ownerName: string;
  isInternalOwner: boolean;        // オーナーが組織内メンバーか

  // 親フォルダ情報
  parentFolderId: string | null;   // 親フォルダのID
  parentFolderName: string | null; // 親フォルダ名

  // 共有状態
  shared: boolean;
  permissions: {
    id: string;
    type: 'user' | 'group' | 'domain' | 'anyone';
    role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
    emailAddress: string | null;
    domain: string | null;
    displayName: string | null;
  }[];

  // リスク評価
  riskScore: number;               // 0-100
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];           // ['外部公開', 'リンク共有', etc.]
  recommendations: string[];       // ['リンク共有を無効にする', etc.]

  createdAt: Date;
}

// プラン定義
export const PLANS = {
  free: {
    name: '無料プラン',
    price: 0,
    maxUsers: 5,
    maxFilesPerScan: 100000,  // 開発用に一時的に緩和（本番では1000）
    scansPerMonth: 100,       // 開発用に一時的に緩和（本番では2）
    features: ['基本スキャン', 'リスクスコア表示'],
  },
  basic: {
    name: 'ベーシック',
    price: 200,
    maxUsers: 20,
    maxFilesPerScan: 10000,
    scansPerMonth: 10,
    features: ['基本スキャン', 'リスクスコア表示', '週次レポート', 'メールアラート'],
  },
  pro: {
    name: 'プロ',
    price: 500,
    maxUsers: 100,
    maxFilesPerScan: 100000,
    scansPerMonth: -1, // 無制限
    features: ['全機能', 'ISMS/Pマークレポート', 'API連携', '優先サポート'],
  },
  enterprise: {
    name: 'エンタープライズ',
    price: -1, // 要相談
    maxUsers: -1,
    maxFilesPerScan: -1,
    scansPerMonth: -1,
    features: ['全機能', 'カスタムレポート', '専任サポート', 'SLA保証'],
  },
} as const;

export type PlanType = keyof typeof PLANS;

// アクションログ（権限変更などのユーザーアクションを記録）
export interface ActionLog {
  id: string;
  organizationId: string;
  userId: string;                  // 実行したユーザー
  userEmail: string;               // 実行したユーザーのメール

  // アクション情報
  actionType: 'permission_delete' | 'permission_update' | 'permission_bulk_delete';
  targetType: 'file' | 'folder';
  targetId: string;                // ファイルまたはフォルダID
  targetName: string;              // ファイルまたはフォルダ名

  // 変更詳細
  details: {
    permissionId?: string;
    targetEmail?: string;          // 対象ユーザーのメール
    targetType?: 'user' | 'group' | 'domain' | 'anyone';
    oldRole?: string;
    newRole?: string;
    affectedCount?: number;        // 一括操作の場合の件数
  };

  // 結果
  success: boolean;
  errorMessage?: string;

  createdAt: Date;
}

// 通知設定（組織単位）
export interface NotificationSettings {
  id: string;                      // organizationIdと同じ
  organizationId: string;

  // メール通知設定
  emailNotifications: {
    enabled: boolean;
    recipients: string[];          // 通知を受け取るメールアドレス一覧

    // 通知トリガー
    triggers: {
      scanCompleted: boolean;      // スキャン完了時
      criticalRiskDetected: boolean;  // Criticalリスク検出時
      highRiskDetected: boolean;   // Highリスク検出時
      weeklyReport: boolean;       // 週次サマリーレポート
    };

    // 閾値設定
    thresholds: {
      minRiskScore: number;        // この点数以上のファイルを通知 (0-100)
      minCriticalCount: number;    // Critical件数がこれ以上で即時通知
    };
  };

  // Slack通知（将来拡張用）
  slackNotifications?: {
    enabled: boolean;
    webhookUrl: string | null;
    channel: string | null;
    triggers: {
      scanCompleted: boolean;
      criticalRiskDetected: boolean;
    };
  };

  createdAt: Date;
  updatedAt: Date;
}

// 通知履歴
export interface NotificationLog {
  id: string;
  organizationId: string;

  // 通知タイプ
  type: 'scan_completed' | 'critical_risk' | 'high_risk' | 'weekly_report';
  channel: 'email' | 'slack';

  // 通知内容
  recipients: string[];
  subject: string;
  summary: string;

  // 関連情報
  scanId?: string;
  riskySummary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  // 結果
  success: boolean;
  errorMessage?: string;

  createdAt: Date;
}

// 統合スキャンジョブ（Domain-Wide Delegation用）
export interface IntegratedScanJob {
  id: string;
  organizationId: string;

  // 開始者情報
  initiatorUserId: string;
  initiatorEmail: string;
  initiatorName: string;

  // 全体ステータス
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  // ユーザー情報
  totalUsers: number;
  processedUsers: number;
  currentUserEmail: string | null;  // 現在処理中のユーザー

  // 対象ユーザー一覧
  targetUsers: {
    email: string;
    displayName: string;
  }[];

  // 各ユーザーの結果
  userResults: IntegratedScanUserResult[];

  // 集計サマリー
  totalRiskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalFilesScanned: number;

  // 実行情報
  startedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;

  // 再開用情報
  lastProcessedUserIndex: number;  // 最後に処理完了したユーザーのインデックス

  createdAt: Date;
  updatedAt: Date;
}

// 統合スキャンの各ユーザー結果
export interface IntegratedScanUserResult {
  userEmail: string;
  userName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  scanId: string | null;           // 作成されたスキャンID
  filesScanned: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}
