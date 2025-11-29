import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  iconLink: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  size: string | null;
  owners: { email: string; displayName: string }[];
  sharingUser: { email: string; displayName: string } | null;
  shared: boolean;
  permissions: DrivePermission[];
}

export interface DrivePermission {
  id: string;
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  emailAddress: string | null;
  domain: string | null;
  displayName: string | null;
}

/**
 * Drive APIクライアントを作成
 */
export function createDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new OAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * ファイル一覧を取得（ページネーション対応）
 */
export async function listFiles(
  drive: drive_v3.Drive,
  options: {
    pageSize?: number;
    pageToken?: string;
    query?: string;
  } = {}
): Promise<{
  files: DriveFile[];
  nextPageToken: string | null;
}> {
  const { pageSize = 100, pageToken, query } = options;

  // クエリ構築（ゴミ箱除外）
  let q = 'trashed = false';
  if (query) {
    q += ` and ${query}`;
  }

  const response = await drive.files.list({
    pageSize,
    pageToken: pageToken || undefined,
    q,
    fields: 'nextPageToken,files(id,name,mimeType,webViewLink,iconLink,createdTime,modifiedTime,size,owners(emailAddress,displayName),sharingUser(emailAddress,displayName),shared,permissions(id,type,role,emailAddress,domain,displayName))',
  });

  const files: DriveFile[] = (response.data.files || []).map((file) => ({
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || '',
    webViewLink: file.webViewLink || null,
    iconLink: file.iconLink || null,
    createdTime: file.createdTime || null,
    modifiedTime: file.modifiedTime || null,
    size: file.size || null,
    owners: (file.owners || []).map((owner) => ({
      email: owner.emailAddress || '',
      displayName: owner.displayName || '',
    })),
    sharingUser: file.sharingUser
      ? {
          email: file.sharingUser.emailAddress || '',
          displayName: file.sharingUser.displayName || '',
        }
      : null,
    shared: file.shared || false,
    permissions: (file.permissions || []).map((perm) => ({
      id: perm.id || '',
      type: perm.type as DrivePermission['type'],
      role: perm.role as DrivePermission['role'],
      emailAddress: perm.emailAddress || null,
      domain: perm.domain || null,
      displayName: perm.displayName || null,
    })),
  }));

  return {
    files,
    nextPageToken: response.data.nextPageToken || null,
  };
}

/**
 * 共有されているファイルのみ取得
 */
export async function listSharedFiles(
  drive: drive_v3.Drive,
  options: {
    pageSize?: number;
    pageToken?: string;
  } = {}
): Promise<{
  files: DriveFile[];
  nextPageToken: string | null;
}> {
  return listFiles(drive, {
    ...options,
    query: 'shared = true',
  });
}

/**
 * 外部共有（ドメイン外）のファイルを検出
 */
export function hasExternalSharing(file: DriveFile, organizationDomain: string): boolean {
  return file.permissions.some((perm) => {
    // 「リンクを知っている全員」
    if (perm.type === 'anyone') return true;

    // ドメイン共有（別ドメイン）
    if (perm.type === 'domain' && perm.domain !== organizationDomain) return true;

    // ユーザー共有（別ドメイン）
    if (perm.type === 'user' && perm.emailAddress) {
      const userDomain = perm.emailAddress.split('@')[1];
      if (userDomain !== organizationDomain) return true;
    }

    // グループ共有（別ドメイン）
    if (perm.type === 'group' && perm.emailAddress) {
      const groupDomain = perm.emailAddress.split('@')[1];
      if (groupDomain !== organizationDomain) return true;
    }

    return false;
  });
}

/**
 * 外部編集権限があるか
 */
export function hasExternalEditor(file: DriveFile, organizationDomain: string): boolean {
  const editRoles: DrivePermission['role'][] = ['writer', 'organizer', 'fileOrganizer'];

  return file.permissions.some((perm) => {
    if (!editRoles.includes(perm.role)) return false;

    // 「リンクを知っている全員」が編集可能
    if (perm.type === 'anyone') return true;

    // ドメイン共有（別ドメイン）が編集可能
    if (perm.type === 'domain' && perm.domain !== organizationDomain) return true;

    // ユーザー/グループ共有（別ドメイン）が編集可能
    if ((perm.type === 'user' || perm.type === 'group') && perm.emailAddress) {
      const domain = perm.emailAddress.split('@')[1];
      if (domain !== organizationDomain) return true;
    }

    return false;
  });
}

/**
 * 「リンクを知っている全員」共有か
 */
export function isPubliclyShared(file: DriveFile): boolean {
  return file.permissions.some((perm) => perm.type === 'anyone');
}

/**
 * ファイルの詳細を取得
 */
export async function getFileDetails(
  drive: drive_v3.Drive,
  fileId: string
): Promise<DriveFile | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,webViewLink,iconLink,createdTime,modifiedTime,size,owners(emailAddress,displayName),sharingUser(emailAddress,displayName),shared,permissions(id,type,role,emailAddress,domain,displayName)',
    });

    const file = response.data;

    return {
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      webViewLink: file.webViewLink || null,
      iconLink: file.iconLink || null,
      createdTime: file.createdTime || null,
      modifiedTime: file.modifiedTime || null,
      size: file.size || null,
      owners: (file.owners || []).map((owner) => ({
        email: owner.emailAddress || '',
        displayName: owner.displayName || '',
      })),
      sharingUser: file.sharingUser
        ? {
            email: file.sharingUser.emailAddress || '',
            displayName: file.sharingUser.displayName || '',
          }
        : null,
      shared: file.shared || false,
      permissions: (file.permissions || []).map((perm) => ({
        id: perm.id || '',
        type: perm.type as DrivePermission['type'],
        role: perm.role as DrivePermission['role'],
        emailAddress: perm.emailAddress || null,
        domain: perm.domain || null,
        displayName: perm.displayName || null,
      })),
    };
  } catch (error) {
    console.error('Error getting file details:', error);
    return null;
  }
}

/**
 * 全ファイルをスキャン（バッチ処理）
 */
export async function* scanAllFiles(
  drive: drive_v3.Drive,
  options: {
    batchSize?: number;
    maxFiles?: number;
  } = {}
): AsyncGenerator<DriveFile[], void, unknown> {
  const { batchSize = 100, maxFiles = Infinity } = options;
  let pageToken: string | null = null;
  let totalFiles = 0;

  do {
    const result = await listFiles(drive, {
      pageSize: batchSize,
      pageToken: pageToken || undefined,
    });

    yield result.files;

    totalFiles += result.files.length;
    pageToken = result.nextPageToken;

    // 最大ファイル数に達したら終了
    if (totalFiles >= maxFiles) break;
  } while (pageToken);
}
