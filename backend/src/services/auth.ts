import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { UserService, OrganizationService } from './firestore.js';
import type { User, Organization } from '../types/models.js';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
];

// OAuth2クライアントを遅延初期化（環境変数が確実に読み込まれた後）
let _oauth2Client: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  if (!_oauth2Client) {
    _oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/auth/callback`
    );
  }
  return _oauth2Client;
}

/**
 * 認証URLを生成
 */
export function generateAuthUrl(): string {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // refresh tokenを確実に取得
  });
}

/**
 * 認証コードをトークンに交換
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}

/**
 * トークンからユーザー情報を取得
 */
export async function getUserInfo(accessToken: string) {
  const client = new OAuth2Client();
  client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id!,
    email: data.email!,
    displayName: data.name || data.email!,
    photoUrl: data.picture || null,
  };
}

/**
 * ユーザーのドメインを取得
 */
export function getDomainFromEmail(email: string): string {
  return email.split('@')[1];
}

/**
 * ユーザーのログイン/登録処理
 */
export async function processUserLogin(
  userInfo: { id: string; email: string; displayName: string; photoUrl: string | null },
  refreshToken: string | null
): Promise<{ user: User; organization: Organization; isNewUser: boolean }> {
  const domain = getDomainFromEmail(userInfo.email);

  // 組織を検索または作成
  let organization = await OrganizationService.getByDomain(domain);
  let isNewOrg = false;

  if (!organization) {
    // 新規組織作成
    organization = await OrganizationService.create({
      name: domain, // 後でユーザーが変更可能
      domain,
      adminEmail: userInfo.email,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      plan: 'free',
      planExpiresAt: null,
      totalScans: 0,
      totalFilesScanned: 0,
      lastScanAt: null,
    });
    isNewOrg = true;
  }

  // ユーザーを検索または作成
  const existingUser = await UserService.getById(userInfo.id);
  let isNewUser = false;

  // 既存ユーザーの場合はロールを維持、新規ユーザーの場合のみロールを設定
  const role = existingUser?.role || (isNewOrg ? 'owner' : 'member');

  const userData: Omit<User, 'createdAt' | 'updatedAt'> = {
    id: userInfo.id,
    email: userInfo.email,
    displayName: userInfo.displayName,
    photoUrl: userInfo.photoUrl,
    organizationId: organization.id,
    role, // 既存ユーザーはロールを維持
    refreshToken: refreshToken || existingUser?.refreshToken || null,
    lastLoginAt: new Date(),
  };

  const user = await UserService.upsert(userData);

  if (!existingUser) {
    isNewUser = true;
  } else {
    await UserService.updateLastLogin(user.id);
  }

  return { user, organization, isNewUser };
}

/**
 * トークンを検証
 */
export async function verifyIdToken(idToken: string) {
  const ticket = await getOAuth2Client().verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

/**
 * アクセストークンをリフレッシュ
 */
export async function refreshAccessToken(refreshToken: string) {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

export { getOAuth2Client };
