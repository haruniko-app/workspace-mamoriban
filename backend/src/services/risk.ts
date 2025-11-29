import type { DriveFile, DrivePermission } from './drive.js';
import { hasExternalSharing, hasExternalEditor, isPubliclyShared } from './drive.js';
import {
  detectSensitiveContent,
  getSensitiveCategoryLabel,
  getSensitivityPoints,
  type SensitivityLevel,
} from './sensitivePatterns.js';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  issues: RiskIssue[];
  recommendations: string[];
}

export interface RiskIssue {
  type: string;
  severity: RiskLevel;
  points: number;
  description: string;
}

// 機密性の高いファイルタイプ
const CONFIDENTIAL_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet', // スプレッドシート（データ）
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
  'application/vnd.google-apps.document', // ドキュメント
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word
];

/**
 * ファイルのリスクスコアを計算
 */
export function calculateRiskScore(
  file: DriveFile,
  organizationDomain: string
): RiskAssessment {
  const issues: RiskIssue[] = [];
  let score = 0;

  // 1. 「リンクを知っている全員」共有 (+40点)
  if (isPubliclyShared(file)) {
    const points = 40;
    score += points;
    issues.push({
      type: 'public_sharing',
      severity: 'critical',
      points,
      description: '「リンクを知っている全員」がアクセス可能',
    });
  }

  // 2. 外部共有（ドメイン外） (+20点)
  if (hasExternalSharing(file, organizationDomain)) {
    const points = 20;
    score += points;
    issues.push({
      type: 'external_sharing',
      severity: 'high',
      points,
      description: '組織外のユーザーとファイルを共有中',
    });
  }

  // 3. 外部編集権限 (+15点)
  if (hasExternalEditor(file, organizationDomain)) {
    const points = 15;
    score += points;
    issues.push({
      type: 'external_editor',
      severity: 'high',
      points,
      description: '組織外のユーザーが編集可能',
    });
  }

  // 4. 機密ファイルタイプ (+15点)
  if (CONFIDENTIAL_MIME_TYPES.includes(file.mimeType)) {
    const points = 15;
    score += points;
    issues.push({
      type: 'confidential_type',
      severity: 'medium',
      points,
      description: '機密性の高いファイル形式',
    });
  }

  // 5. 機密ファイル名検出（カテゴリ別スコアリング）
  const sensitiveResult = detectSensitiveContent(file.name);
  if (sensitiveResult.isSensitive) {
    // 最大リスクレベルに応じたポイント
    const levelPoints: Record<string, number> = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5,
    };
    const points = sensitiveResult.maxLevel ? levelPoints[sensitiveResult.maxLevel] : 10;
    const severity = sensitiveResult.maxLevel || 'medium';

    score += points;
    issues.push({
      type: 'sensitive_content',
      severity: severity as RiskLevel,
      points,
      description: `機密情報の可能性: ${sensitiveResult.details.map(d => d.description).join('、')}`,
    });
  }

  // 6. 1年以上更新なし（共有ファイルのみ） (+10点)
  if (file.shared && file.modifiedTime) {
    const daysSinceModified = getDaysSince(file.modifiedTime);
    if (daysSinceModified > 365) {
      const points = 10;
      score += points;
      issues.push({
        type: 'stale_sharing',
        severity: 'low',
        points,
        description: `1年以上更新のない共有ファイル（${daysSinceModified}日前）`,
      });
    }
  }

  // 7. 多数のユーザーと共有 (+5点)
  const sharedWithCount = file.permissions.filter(
    (p) => p.type === 'user' || p.type === 'group'
  ).length;
  if (sharedWithCount > 10) {
    const points = 5;
    score += points;
    issues.push({
      type: 'many_shares',
      severity: 'low',
      points,
      description: `${sharedWithCount}人以上と共有中`,
    });
  }

  // スコアを0-100に制限
  score = Math.min(score, 100);

  // リスクレベル判定
  const level = getRiskLevel(score);

  // 改善提案を生成
  const recommendations = generateRecommendations(issues);

  return {
    score,
    level,
    issues,
    recommendations,
  };
}

/**
 * リスクレベルを判定
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * 日数を計算
 */
function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 改善提案を生成
 */
function generateRecommendations(issues: RiskIssue[]): string[] {
  const recommendations: string[] = [];

  for (const issue of issues) {
    switch (issue.type) {
      case 'public_sharing':
        recommendations.push(
          '「リンクを知っている全員」の設定を解除し、特定のユーザーのみに共有してください'
        );
        break;
      case 'external_sharing':
        recommendations.push(
          '外部共有が必要か確認し、不要であれば共有を解除してください'
        );
        break;
      case 'external_editor':
        recommendations.push(
          '外部ユーザーの権限を「閲覧者」に変更するか、共有を解除してください'
        );
        break;
      case 'confidential_type':
        recommendations.push(
          '機密データを含む可能性があります。共有設定を確認してください'
        );
        break;
      case 'confidential_name':
        recommendations.push(
          'ファイル名から機密情報の可能性があります。共有範囲を限定してください'
        );
        break;
      case 'sensitive_content':
        recommendations.push(
          '機密情報を含む可能性が高いファイルです。共有設定を確認し、必要最小限のアクセス権に制限してください'
        );
        break;
      case 'stale_sharing':
        recommendations.push(
          '長期間更新のないファイルです。共有が今も必要か確認してください'
        );
        break;
      case 'many_shares':
        recommendations.push(
          '多くのユーザーと共有されています。アクセス権を見直してください'
        );
        break;
    }
  }

  return recommendations;
}

/**
 * 複数ファイルのリスクサマリーを計算
 */
export function calculateRiskSummary(
  files: DriveFile[],
  organizationDomain: string
): {
  totalFiles: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  averageScore: number;
  topIssues: { type: string; count: number }[];
} {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const issueTypes: Record<string, number> = {};
  let totalScore = 0;

  for (const file of files) {
    const assessment = calculateRiskScore(file, organizationDomain);
    summary[assessment.level]++;
    totalScore += assessment.score;

    for (const issue of assessment.issues) {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    }
  }

  // 上位の問題タイプ
  const topIssues = Object.entries(issueTypes)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalFiles: files.length,
    riskySummary: summary,
    averageScore: files.length > 0 ? Math.round(totalScore / files.length) : 0,
    topIssues,
  };
}

/**
 * リスクレベルの日本語ラベル
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    critical: '緊急',
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[level];
}

/**
 * 問題タイプの日本語ラベル
 */
export function getIssueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    public_sharing: '公開共有',
    external_sharing: '外部共有',
    external_editor: '外部編集権限',
    confidential_type: '機密ファイル形式',
    confidential_name: '機密ファイル名',
    sensitive_content: '機密情報検出',
    stale_sharing: '古い共有',
    many_shares: '多数共有',
  };
  return labels[type] || type;
}
