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

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
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
  userId: string;                  // 実行したユーザー

  // スキャン結果サマリー
  status: 'running' | 'completed' | 'failed';
  totalFiles: number;
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
