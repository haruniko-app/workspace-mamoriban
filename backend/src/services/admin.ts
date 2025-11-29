import { google, admin_directory_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface WorkspaceUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  creationTime: string | null;
  lastLoginTime: string | null;
}

export interface WorkspaceOrganizationInfo {
  customerId: string;
  domain: string;
  totalUsers: number;
}

/**
 * Admin Directory APIクライアントを作成
 */
export function createAdminClient(accessToken: string) {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.admin({ version: 'directory_v1', auth });
}

/**
 * 組織のユーザー一覧を取得
 * Note: 管理者権限が必要（Google Workspace管理者のみ）
 */
export async function listWorkspaceUsers(
  admin: admin_directory_v1.Admin,
  domain: string,
  options: {
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{
  users: WorkspaceUser[];
  nextPageToken: string | null;
}> {
  try {
    const { maxResults = 100, pageToken } = options;

    const response = await admin.users.list({
      domain,
      maxResults,
      pageToken: pageToken || undefined,
      orderBy: 'email',
      projection: 'basic',
    });

    const users: WorkspaceUser[] = (response.data.users || []).map((user) => ({
      id: user.id || '',
      email: user.primaryEmail || '',
      displayName: user.name?.fullName || user.primaryEmail || '',
      photoUrl: user.thumbnailPhotoUrl || null,
      isAdmin: user.isAdmin || false,
      isSuspended: user.suspended || false,
      creationTime: user.creationTime || null,
      lastLoginTime: user.lastLoginTime || null,
    }));

    return {
      users,
      nextPageToken: response.data.nextPageToken || null,
    };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 403) {
      throw new Error(
        'Admin API access denied. This feature requires Google Workspace admin privileges.'
      );
    }
    throw error;
  }
}

/**
 * 全ユーザーを取得（ページネーション処理）
 */
export async function getAllWorkspaceUsers(
  admin: admin_directory_v1.Admin,
  domain: string,
  maxUsers: number = 500
): Promise<WorkspaceUser[]> {
  const allUsers: WorkspaceUser[] = [];
  let pageToken: string | null = null;

  do {
    const result = await listWorkspaceUsers(admin, domain, {
      maxResults: Math.min(100, maxUsers - allUsers.length),
      pageToken: pageToken || undefined,
    });

    allUsers.push(...result.users);
    pageToken = result.nextPageToken;

    if (allUsers.length >= maxUsers) {
      break;
    }
  } while (pageToken);

  return allUsers;
}

/**
 * 特定のユーザー情報を取得
 */
export async function getWorkspaceUser(
  admin: admin_directory_v1.Admin,
  userKey: string
): Promise<WorkspaceUser | null> {
  try {
    const response = await admin.users.get({
      userKey,
      projection: 'basic',
    });

    const user = response.data;
    return {
      id: user.id || '',
      email: user.primaryEmail || '',
      displayName: user.name?.fullName || user.primaryEmail || '',
      photoUrl: user.thumbnailPhotoUrl || null,
      isAdmin: user.isAdmin || false,
      isSuspended: user.suspended || false,
      creationTime: user.creationTime || null,
      lastLoginTime: user.lastLoginTime || null,
    };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 組織情報を取得
 */
export async function getCustomerInfo(
  admin: admin_directory_v1.Admin,
  customerKey: string = 'my_customer'
): Promise<WorkspaceOrganizationInfo | null> {
  try {
    // Customer情報を取得
    const customerResponse = await admin.customers.get({
      customerKey,
    });

    // ユーザー数をカウント
    let totalUsers = 0;
    let pageToken: string | undefined;

    do {
      const usersResponse = await admin.users.list({
        customer: customerKey,
        maxResults: 500,
        pageToken,
      });

      totalUsers += usersResponse.data.users?.length || 0;
      pageToken = usersResponse.data.nextPageToken || undefined;
    } while (pageToken);

    const customer = customerResponse.data;
    return {
      customerId: customer.id || '',
      domain: customer.customerDomain || '',
      totalUsers,
    };
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 403 || err.code === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * ユーザーが管理者かどうかを確認
 */
export async function isUserAdmin(
  admin: admin_directory_v1.Admin,
  userEmail: string
): Promise<boolean> {
  try {
    const user = await getWorkspaceUser(admin, userEmail);
    return user?.isAdmin || false;
  } catch {
    return false;
  }
}

/**
 * 組織のアクティブユーザー数を取得
 */
export async function getActiveUserCount(
  admin: admin_directory_v1.Admin,
  domain: string
): Promise<number> {
  const users = await getAllWorkspaceUsers(admin, domain);
  return users.filter((u) => !u.isSuspended).length;
}
