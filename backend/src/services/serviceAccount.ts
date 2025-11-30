/**
 * サービスアカウント認証サービス
 * Domain-Wide Delegationを使用したユーザー代理アクセス
 */

import { google, drive_v3, admin_directory_v1 } from 'googleapis';
import { JWT } from 'google-auth-library';
import type { ServiceAccountConfig } from '../types/models.js';

// Domain-Wide Delegationに必要なスコープ
const DELEGATION_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
];

/**
 * サービスアカウント認証クライアントを作成
 * @param config サービスアカウント設定
 * @param subjectEmail 代理するユーザーのメールアドレス
 */
export function createServiceAccountClient(
  config: ServiceAccountConfig,
  subjectEmail: string
): JWT {
  return new JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: DELEGATION_SCOPES,
    subject: subjectEmail, // このユーザーとして動作
  });
}

/**
 * サービスアカウントでDrive APIクライアントを作成
 */
export function createDelegatedDriveClient(
  config: ServiceAccountConfig,
  userEmail: string
): drive_v3.Drive {
  const auth = createServiceAccountClient(config, userEmail);
  return google.drive({ version: 'v3', auth });
}

/**
 * サービスアカウントでAdmin Directory APIクライアントを作成
 */
export function createDelegatedAdminClient(
  config: ServiceAccountConfig,
  adminEmail: string
): admin_directory_v1.Admin {
  const auth = createServiceAccountClient(config, adminEmail);
  return google.admin({ version: 'directory_v1', auth });
}

/**
 * サービスアカウント設定を検証
 * @returns 検証結果
 */
export async function verifyServiceAccountConfig(
  config: ServiceAccountConfig,
  testUserEmail: string
): Promise<{ success: boolean; error?: string; userCount?: number }> {
  try {
    // Admin APIでユーザー一覧を取得できるか確認
    const admin = createDelegatedAdminClient(config, testUserEmail);

    const domain = testUserEmail.split('@')[1];
    const response = await admin.users.list({
      domain,
      maxResults: 1,
      projection: 'basic',
    });

    const userCount = response.data.users?.length ?? 0;

    // Drive APIも確認
    const drive = createDelegatedDriveClient(config, testUserEmail);
    await drive.about.get({
      fields: 'user',
    });

    return {
      success: true,
      userCount: userCount > 0 ? userCount : undefined
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // よくあるエラーメッセージを日本語化
    let translatedError = message;
    if (message.includes('invalid_grant')) {
      translatedError = 'サービスアカウントの認証に失敗しました。秘密鍵が正しいか確認してください。';
    } else if (message.includes('Not Authorized')) {
      translatedError = 'Domain-Wide Delegationが設定されていません。Google Workspace管理コンソールでサービスアカウントに必要なスコープを付与してください。';
    } else if (message.includes('invalid_client')) {
      translatedError = 'サービスアカウントのメールアドレスが無効です。';
    } else if (message.includes('403')) {
      translatedError = 'アクセスが拒否されました。管理コンソールでDomain-Wide Delegationを有効にしてください。';
    }

    return { success: false, error: translatedError };
  }
}

/**
 * 組織内の全ユーザーを取得（サービスアカウント経由）
 */
export async function getDomainUsers(
  config: ServiceAccountConfig,
  adminEmail: string,
  domain: string
): Promise<{ email: string; displayName: string; isAdmin: boolean }[]> {
  const admin = createDelegatedAdminClient(config, adminEmail);
  const users: { email: string; displayName: string; isAdmin: boolean }[] = [];
  let pageToken: string | undefined;

  do {
    const response = await admin.users.list({
      domain,
      maxResults: 500,
      pageToken,
      projection: 'basic',
      query: 'isSuspended=false', // アクティブユーザーのみ
    });

    for (const user of response.data.users || []) {
      if (user.primaryEmail) {
        users.push({
          email: user.primaryEmail,
          displayName: user.name?.fullName || user.primaryEmail,
          isAdmin: user.isAdmin || false,
        });
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return users;
}

/**
 * サービスアカウントJSONファイルをパース
 */
export function parseServiceAccountJson(
  jsonString: string
): { clientEmail: string; privateKey: string } | null {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed.client_email || !parsed.private_key) {
      return null;
    }

    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };
  } catch {
    return null;
  }
}

/**
 * Domain-Wide Delegation設定に必要なスコープ一覧を取得
 */
export function getRequiredScopes(): string[] {
  return DELEGATION_SCOPES;
}

/**
 * サービスアカウントのクライアントIDを抽出（JSONから）
 * 管理コンソールでの設定に必要
 */
export function extractClientId(jsonString: string): string | null {
  try {
    const parsed = JSON.parse(jsonString);
    // client_id はサービスアカウントJSONに含まれる
    return parsed.client_id || null;
  } catch {
    return null;
  }
}
