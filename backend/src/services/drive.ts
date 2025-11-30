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
  parents: string[];  // 親フォルダIDの配列
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
    fields: 'nextPageToken,files(id,name,mimeType,webViewLink,iconLink,createdTime,modifiedTime,size,parents,owners(emailAddress,displayName),sharingUser(emailAddress,displayName),shared,permissions(id,type,role,emailAddress,domain,displayName))',
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
    parents: file.parents || [],
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
 * 組織内メンバーが編集権限を持っているか（外部ファイルへの参加チェック用）
 */
export function hasInternalEditor(file: DriveFile, organizationDomain: string): boolean {
  const editRoles: DrivePermission['role'][] = ['writer', 'organizer', 'fileOrganizer'];

  return file.permissions.some((perm) => {
    if (!editRoles.includes(perm.role)) return false;

    // ユーザー/グループ共有（自ドメイン）が編集可能
    if ((perm.type === 'user' || perm.type === 'group') && perm.emailAddress) {
      const domain = perm.emailAddress.split('@')[1];
      if (domain === organizationDomain) return true;
    }

    // ドメイン共有（自ドメイン）が編集可能
    if (perm.type === 'domain' && perm.domain === organizationDomain) return true;

    return false;
  });
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
      fields: 'id,name,mimeType,webViewLink,iconLink,createdTime,modifiedTime,size,parents,owners(emailAddress,displayName),sharingUser(emailAddress,displayName),shared,permissions(id,type,role,emailAddress,domain,displayName)',
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
      parents: file.parents || [],
    };
  } catch (error) {
    console.error('Error getting file details:', error);
    return null;
  }
}

/**
 * ファイル数をカウント（IDのみ取得で高速）
 */
export async function countAllFiles(
  drive: drive_v3.Drive,
  options: {
    maxFiles?: number;
  } = {}
): Promise<{ count: number; fileIds: string[] }> {
  const { maxFiles = Infinity } = options;
  const fileIds: string[] = [];
  let pageToken: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await drive.files.list({
      pageSize: 1000, // 最大値で高速化
      pageToken,
      q: 'trashed = false',
      fields: 'nextPageToken,files(id)', // IDのみ取得で軽量化
    });

    const files = response.data?.files || [];

    for (const file of files) {
      if (file.id) {
        fileIds.push(file.id);
      }
    }

    // 最大ファイル数に達したら終了
    if (fileIds.length >= maxFiles) {
      return { count: Math.min(fileIds.length, maxFiles), fileIds: fileIds.slice(0, maxFiles) };
    }

    // 次のページがなければ終了
    if (!response.data?.nextPageToken) {
      hasMore = false;
    } else {
      pageToken = response.data.nextPageToken;
    }
  }

  return { count: fileIds.length, fileIds };
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

/**
 * フォルダ名を一括取得（キャッシュ付き）
 */
export async function getFolderNames(
  drive: drive_v3.Drive,
  folderIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniqueIds = [...new Set(folderIds.filter((id) => id))];

  if (uniqueIds.length === 0) {
    return result;
  }

  // 並列で取得（APIレート制限を考慮して10件ずつ）
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (folderId) => {
      try {
        const response = await drive.files.get({
          fileId: folderId,
          fields: 'id,name',
        });
        return { id: folderId, name: response.data.name || '' };
      } catch (error) {
        // フォルダにアクセスできない場合（権限なし、削除済み等）
        console.warn(`Failed to get folder name for ${folderId}:`, error);
        return { id: folderId, name: '' };
      }
    });

    const results = await Promise.all(promises);
    for (const { id, name } of results) {
      result.set(id, name);
    }
  }

  return result;
}

/**
 * 権限を削除
 */
export async function deletePermission(
  drive: drive_v3.Drive,
  fileId: string,
  permissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await drive.permissions.delete({
      fileId,
      permissionId,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to delete permission ${permissionId} from file ${fileId}:`, error);
    return { success: false, error: message };
  }
}

/**
 * 権限のロールを更新
 */
export async function updatePermissionRole(
  drive: drive_v3.Drive,
  fileId: string,
  permissionId: string,
  newRole: 'reader' | 'commenter' | 'writer'
): Promise<{ success: boolean; permission?: DrivePermission; error?: string }> {
  try {
    const response = await drive.permissions.update({
      fileId,
      permissionId,
      requestBody: {
        role: newRole,
      },
      fields: 'id,type,role,emailAddress,domain,displayName',
    });

    const perm = response.data;
    return {
      success: true,
      permission: {
        id: perm.id || '',
        type: perm.type as DrivePermission['type'],
        role: perm.role as DrivePermission['role'],
        emailAddress: perm.emailAddress || null,
        domain: perm.domain || null,
        displayName: perm.displayName || null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to update permission ${permissionId} on file ${fileId}:`, error);
    return { success: false, error: message };
  }
}

/**
 * フォルダ内の全ファイルの特定権限を一括削除
 */
export async function deletePermissionFromFolder(
  drive: drive_v3.Drive,
  folderId: string,
  permissionEmail: string,
  permissionType: 'user' | 'group' | 'domain' | 'anyone'
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // フォルダ内のファイルを取得
  let pageToken: string | undefined = undefined;
  do {
    const response: { data: drive_v3.Schema$FileList } = await drive.files.list({
      pageSize: 100,
      pageToken,
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,permissions(id,type,role,emailAddress,domain))',
    });

    const files = response.data.files || [];

    for (const file of files) {
      if (!file.id || !file.permissions) continue;

      // 該当する権限を探す
      const targetPerm = file.permissions.find((p: drive_v3.Schema$Permission) => {
        if (permissionType === 'anyone') {
          return p.type === 'anyone';
        }
        if (permissionType === 'domain') {
          return p.type === 'domain' && p.domain === permissionEmail;
        }
        return (
          (p.type === 'user' || p.type === 'group') &&
          p.emailAddress?.toLowerCase() === permissionEmail.toLowerCase()
        );
      });

      if (targetPerm && targetPerm.id) {
        const result = await deletePermission(drive, file.id, targetPerm.id);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${file.name}: ${result.error}`);
        }
      }
    }

    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return results;
}

/**
 * ファイルの現在の権限を取得
 */
export async function getFilePermissions(
  drive: drive_v3.Drive,
  fileId: string
): Promise<DrivePermission[]> {
  try {
    const response = await drive.permissions.list({
      fileId,
      fields: 'permissions(id,type,role,emailAddress,domain,displayName)',
    });

    return (response.data.permissions || []).map((perm) => ({
      id: perm.id || '',
      type: perm.type as DrivePermission['type'],
      role: perm.role as DrivePermission['role'],
      emailAddress: perm.emailAddress || null,
      domain: perm.domain || null,
      displayName: perm.displayName || null,
    }));
  } catch (error) {
    console.error(`Failed to get permissions for file ${fileId}:`, error);
    return [];
  }
}
