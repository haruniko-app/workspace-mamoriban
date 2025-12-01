const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// カスタムエラークラス: 認証エラー（トークン期限切れなど）
export class AuthenticationError extends Error {
  constructor(message: string = 'セッションの有効期限が切れました。再度ログインしてください。') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// 認証エラーかどうかを判定するヘルパー関数
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    // 401 Unauthorized: 認証エラー（トークン期限切れなど）
    if (response.status === 401) {
      const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
      throw new AuthenticationError(error.error || 'セッションの有効期限が切れました。再度ログインしてください。');
    }

    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Auth API
export const authApi = {
  getLoginUrl: () => `${API_BASE}/api/auth/login`,
  getReauthorizeUrl: () => `${API_BASE}/api/auth/reauthorize`,
  getMe: () => api.get<{ user: User }>('/api/auth/me'),
  logout: () => api.post<{ message: string }>('/api/auth/logout'),
  refresh: () => api.post<{ message: string }>('/api/auth/refresh'),
};

// Organization API
export const organizationApi = {
  get: () => api.get<{ organization: Organization }>('/api/organization'),
  update: (name: string) =>
    api.put<{ organization: Organization; message: string }>('/api/organization', { name }),
  getMembers: () =>
    api.get<{ members: OrganizationMember[]; total: number }>('/api/organization/members'),
  getWorkspaceUsers: (pageToken?: string) =>
    api.get<{ users: WorkspaceUser[]; nextPageToken: string | null }>(
      '/api/organization/workspace-users',
      pageToken ? { params: { pageToken } } : undefined
    ),
  getWorkspaceInfo: () =>
    api.get<{ workspaceInfo: WorkspaceInfo }>('/api/organization/workspace-info'),
  updateMemberRole: (userId: string, role: 'admin' | 'member') =>
    api.put<{ message: string; userId: string; newRole: string }>(
      `/api/organization/members/${userId}/role`,
      { role }
    ),
  removeMember: (userId: string) =>
    api.delete<{ message: string; userId: string }>(`/api/organization/members/${userId}`),
};

// Scan API
export const scanApi = {
  start: (options?: { scanType?: 'full' | 'incremental'; baseScanId?: string }) =>
    api.post<{ scanId: string; status: string; scanType: 'full' | 'incremental'; baseScanId: string | null; message: string }>(
      '/api/scan/start',
      options || {}
    ),
  cancel: (scanId: string) =>
    api.post<{ success: boolean; message: string; scanId: string }>(`/api/scan/${scanId}/cancel`),
  getById: (scanId: string) => api.get<{ scan: Scan }>(`/api/scan/${scanId}`),
  getHistory: (limit = 10, offset = 0) =>
    api.get<{ scans: Scan[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(
      '/api/scan',
      { params: { limit: String(limit), offset: String(offset) } }
    ),
  getFiles: (scanId: string, options?: {
    limit?: number;
    offset?: number;
    riskLevel?: 'critical' | 'high' | 'medium' | 'low';
    ownerType?: 'all' | 'internal' | 'external';
    sortBy?: 'riskScore' | 'name' | 'modifiedTime';
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.riskLevel) params.riskLevel = options.riskLevel;
    if (options?.ownerType) params.ownerType = options.ownerType;
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;
    if (options?.search) params.search = options.search;
    return api.get<{ files: ScannedFile[]; pagination: Pagination }>(`/api/scan/${scanId}/files`, { params });
  },
  getFile: (scanId: string, fileId: string) => api.get<{ file: ScannedFile }>(`/api/scan/${scanId}/files/${fileId}`),
  getFolders: (scanId: string, options?: {
    limit?: number;
    offset?: number;
    minRiskLevel?: 'critical' | 'high' | 'medium' | 'low';
    ownerType?: 'internal' | 'external';
    search?: string;
    sortBy?: 'riskScore' | 'name' | 'fileCount';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.minRiskLevel) params.minRiskLevel = options.minRiskLevel;
    if (options?.ownerType) params.ownerType = options.ownerType;
    if (options?.search) params.search = options.search;
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;
    return api.get<{ folders: FolderSummary[]; pagination: Pagination }>(`/api/scan/${scanId}/folders`, { params });
  },
  getFolderById: (scanId: string, folderId: string) =>
    api.get<{ folder: FolderSummary }>(`/api/scan/${scanId}/folder/${folderId}`),
  getFolderFiles: (scanId: string, folderId: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'riskScore' | 'name' | 'modifiedTime';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;
    return api.get<{ files: ScannedFile[]; pagination: Pagination }>(`/api/scan/${scanId}/folders/${folderId}/files`, { params });
  },
  getSubfolders: (scanId: string, folderId: string) =>
    api.get<{ subfolders: FolderSummary[] }>(`/api/scan/${scanId}/folders/${folderId}/subfolders`),
  // Permission management
  deletePermission: (scanId: string, fileId: string, permissionId: string) =>
    api.delete<{ success: boolean; message: string; fileId: string; permissionId: string }>(
      `/api/scan/${scanId}/files/${fileId}/permissions/${permissionId}`
    ),
  restorePermission: (
    scanId: string,
    fileId: string,
    permission: { type: string; role: string; emailAddress?: string; domain?: string; displayName?: string }
  ) =>
    api.post<{ success: boolean; message: string; fileId: string; permission: ScannedFile['permissions'][0] }>(
      `/api/scan/${scanId}/files/${fileId}/permissions/restore`,
      permission
    ),
  updatePermissionRole: (scanId: string, fileId: string, permissionId: string, role: 'reader' | 'commenter' | 'writer') =>
    api.put<{ success: boolean; message: string; fileId: string; permissionId: string; permission: ScannedFile['permissions'][0] }>(
      `/api/scan/${scanId}/files/${fileId}/permissions/${permissionId}`,
      { role }
    ),
  getFilePermissions: (scanId: string, fileId: string) =>
    api.get<{ fileId: string; permissions: ScannedFile['permissions'] }>(
      `/api/scan/${scanId}/files/${fileId}/permissions`
    ),
  getFolderPath: (scanId: string, fileId: string) =>
    api.get<{ fileId: string; folderPath: FolderPathItem[] }>(
      `/api/scan/${scanId}/files/${fileId}/folder-path`
    ),
  getFolderPermissions: (scanId: string, folderId: string) =>
    api.get<{ folder: FolderPathItem }>(
      `/api/scan/${scanId}/folders/${folderId}/permissions`
    ),
  // Folder permission management
  deleteFolderPermission: (scanId: string, folderId: string, permissionId: string) =>
    api.delete<{ success: boolean; message: string; folderId: string; permissionId: string }>(
      `/api/scan/${scanId}/folders/${folderId}/folder-permissions/${permissionId}`
    ),
  restoreFolderPermission: (
    scanId: string,
    folderId: string,
    permission: { type: string; role: string; emailAddress?: string; domain?: string; displayName?: string }
  ) =>
    api.post<{ success: boolean; message: string; folderId: string; permission: ScannedFile['permissions'][0] }>(
      `/api/scan/${scanId}/folders/${folderId}/folder-permissions/restore`,
      permission
    ),
  updateFolderPermissionRole: (scanId: string, folderId: string, permissionId: string, role: 'reader' | 'commenter' | 'writer') =>
    api.put<{ success: boolean; message: string; folderId: string; permissionId: string; permission: ScannedFile['permissions'][0] }>(
      `/api/scan/${scanId}/folders/${folderId}/folder-permissions/${permissionId}`,
      { role }
    ),
  // 管理者用API
  admin: {
    getUsers: () =>
      api.get<{
        users: UserScanSummary[];
        stats: {
          totalUsers: number;
          usersWithScans: number;
          usersWithoutScans: number;
          totalRisks: {
            critical: number;
            high: number;
            medium: number;
            low: number;
          };
        };
      }>('/api/scan/admin/users'),
    getUserScans: (userId: string, limit = 10, offset = 0) =>
      api.get<{
        user: {
          id: string;
          email: string;
          displayName: string;
          role: 'owner' | 'admin' | 'member';
        };
        scans: Scan[];
        pagination: Pagination;
      }>(`/api/scan/admin/users/${userId}/scans`, {
        params: { limit: String(limit), offset: String(offset) },
      }),
    getAll: (limit = 20, offset = 0) =>
      api.get<{ scans: Scan[]; pagination: Pagination }>('/api/scan/admin/all', {
        params: { limit: String(limit), offset: String(offset) },
      }),
  },
  // 一括操作API
  bulk: {
    deletePermissions: (
      scanId: string,
      fileIds: string[],
      permissionFilter: BulkPermissionFilter
    ) =>
      api.post<BulkOperationResult>(
        `/api/scan/${scanId}/bulk/permissions/delete`,
        { fileIds, permissionFilter }
      ),
    demoteToReader: (
      scanId: string,
      fileIds: string[],
      permissionFilter?: { type?: 'user' | 'group' | 'domain' | 'anyone'; email?: string }
    ) =>
      api.post<BulkOperationResult>(
        `/api/scan/${scanId}/bulk/permissions/demote`,
        { fileIds, permissionFilter }
      ),
    removePublicAccess: (scanId: string, fileIds: string[]) =>
      api.post<BulkOperationResult>(
        `/api/scan/${scanId}/bulk/remove-public-access`,
        { fileIds }
      ),
  },
};

// Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  adminEmail: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  planExpiresAt: string | null;
  totalScans: number;
  totalFilesScanned: number;
  lastScanAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  visibility: 'private' | 'organization';
  scanType: 'full' | 'incremental';
  baseScanId: string | null;
  driveChangeToken: string | null;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  phase: 'counting' | 'scanning' | 'resolving' | 'saving' | 'done';
  totalFiles: number;
  processedFiles: number;
  scannedNewFiles: number;
  copiedFiles: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ScannedFile {
  id: string;
  scanId: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  iconLink: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  size: string | null;
  ownerEmail: string;
  ownerName: string;
  isInternalOwner: boolean;
  parentFolderId: string | null;
  parentFolderName: string | null;
  shared: boolean;
  permissions: {
    id: string;
    type: 'user' | 'group' | 'domain' | 'anyone';
    role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
    emailAddress: string | null;
    domain: string | null;
    displayName: string | null;
    deleted?: boolean;           // 削除済みフラグ（元に戻す用）
    deletedAt?: string;          // 削除日時
  }[];
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];
  recommendations: string[];
  createdAt: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface FolderPathItem {
  id: string;
  name: string;
  permissions: ScannedFile['permissions'];
}

export interface FolderSummary {
  id: string;
  name: string;
  parentFolderId: string | null;
  fileCount: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  highestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  totalRiskScore: number;
}

export interface OrganizationMember {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: 'owner' | 'admin' | 'member';
  lastLoginAt: string;
  createdAt: string;
}

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

export interface WorkspaceInfo {
  customerId: string;
  domain: string;
  totalUsers: number;
}

// Stripe API
export const stripeApi = {
  getPlans: () => api.get<{ plans: PlanInfo[] }>('/api/stripe/plans'),
  getSubscription: () => api.get<SubscriptionInfo>('/api/stripe/subscription'),
  createCheckout: (plan: 'basic' | 'pro' | 'enterprise') =>
    api.post<{ url: string }>('/api/stripe/checkout', { plan }),
  createPortalSession: () => api.post<{ url: string }>('/api/stripe/portal'),
};

export interface PlanInfo {
  id: 'free' | 'basic' | 'pro' | 'enterprise';
  name: string;
  price: number;
  maxUsers: number;
  maxScansPerMonth: number;
  features: string[];
}

export interface SubscriptionInfo {
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  planInfo: PlanInfo;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  limits: {
    canAddUser: boolean;
    canScan: boolean;
    usersRemaining: number;
    scansRemaining: number;
  };
}

// Audit Logs API
export const auditLogsApi = {
  getSummary: (days = 7) =>
    api.get<{ summary: AuditLogSummary; period: { days: number } }>(
      '/api/audit-logs/summary',
      { params: { days: String(days) } }
    ),
  getDriveLogs: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: DriveAuditLog[]; nextPageToken: string | null }>(
      '/api/audit-logs/drive',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getLoginLogs: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: LoginAuditLog[]; nextPageToken: string | null }>(
      '/api/audit-logs/login',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getAdminLogs: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: AuditLog[]; nextPageToken: string | null }>(
      '/api/audit-logs/admin',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getSharingChanges: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: DriveAuditLog[]; nextPageToken: string | null }>(
      '/api/audit-logs/sharing-changes',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getExternalSharing: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: DriveAuditLog[] }>(
      '/api/audit-logs/external-sharing',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getSuspiciousLogins: (options?: AuditLogQueryOptions) =>
    api.get<{ logs: LoginAuditLog[] }>(
      '/api/audit-logs/suspicious-logins',
      options ? { params: options as Record<string, string> } : undefined
    ),
  getActionLogs: (options?: {
    limit?: number;
    offset?: number;
    actionType?: ActionLog['actionType'];
    startTime?: string;
    endTime?: string;
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.actionType) params.actionType = options.actionType;
    if (options?.startTime) params.startTime = options.startTime;
    if (options?.endTime) params.endTime = options.endTime;
    return api.get<{ logs: ActionLog[]; pagination: Pagination }>(
      '/api/audit-logs/actions',
      Object.keys(params).length > 0 ? { params } : undefined
    );
  },
};

export interface AuditLogQueryOptions {
  startTime?: string;
  endTime?: string;
  userKey?: string;
  eventName?: string;
  maxResults?: string;
  pageToken?: string;
}

export interface AuditLogSummary {
  totalDriveEvents: number;
  externalShares: number;
  loginFailures: number;
  suspiciousLogins: number;
  adminChanges: number;
}

export interface AuditLog {
  id: string;
  time: string;
  actor: {
    email: string;
    profileId: string | null;
  };
  ipAddress: string | null;
  eventType: string;
  eventName: string;
  parameters: Record<string, string | number | boolean | null>;
}

export interface DriveAuditLog extends AuditLog {
  docId: string | null;
  docTitle: string | null;
  docType: string | null;
  visibility: string | null;
  targetUser: string | null;
  oldVisibility: string | null;
  newVisibility: string | null;
}

export interface LoginAuditLog extends AuditLog {
  loginType: string | null;
  isSecondFactor: boolean;
  isSuspicious: boolean;
}

// アプリ内アクションログ
export interface ActionLog {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  actionType: 'permission_delete' | 'permission_update' | 'permission_bulk_delete';
  targetType: 'file' | 'folder';
  targetId: string;
  targetName: string;
  details: {
    permissionId?: string;
    targetEmail?: string;
    targetType?: 'user' | 'group' | 'domain' | 'anyone';
    oldRole?: string;
    newRole?: string;
    affectedCount?: number;
  };
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

// 管理者ダッシュボード用
export interface UserScanSummary {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: 'owner' | 'admin' | 'member';
  lastScanAt: string | null;
  lastScanStatus: 'running' | 'completed' | 'failed' | 'cancelled' | null;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } | null;
  totalFiles: number;
}

// PDF download helper
const downloadPdf = async (endpoint: string, filename: string) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('PDF generation failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Reports API (ISMS/Pマーク対応)
export const reportsApi = {
  // スキャン実施履歴レポート
  getScanHistory: (options?: { startDate?: string; endDate?: string }) => {
    const params: Record<string, string> = {};
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    return api.get<{ report: ScanHistoryReport }>(
      '/api/reports/scan-history',
      Object.keys(params).length > 0 ? { params } : undefined
    );
  },
  getScanHistoryPdf: (options?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return downloadPdf(
      `/api/reports/scan-history/pdf${query}`,
      `scan-history-report-${new Date().toISOString().split('T')[0]}.pdf`
    );
  },
  // リスクアセスメントレポート
  getRiskAssessment: (scanId: string) =>
    api.get<{ report: RiskAssessmentReport }>(`/api/reports/risk-assessment/${scanId}`),
  getRiskAssessmentPdf: (scanId: string) =>
    downloadPdf(
      `/api/reports/risk-assessment/${scanId}/pdf`,
      `risk-assessment-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`
    ),
  // 是正対応履歴レポート
  getRemediationHistory: (options?: { startDate?: string; endDate?: string }) => {
    const params: Record<string, string> = {};
    if (options?.startDate) params.startDate = options.startDate;
    if (options?.endDate) params.endDate = options.endDate;
    return api.get<{ report: RemediationHistoryReport }>(
      '/api/reports/remediation-history',
      Object.keys(params).length > 0 ? { params } : undefined
    );
  },
  getRemediationHistoryPdf: (options?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return downloadPdf(
      `/api/reports/remediation-history/pdf${query}`,
      `remediation-history-report-${new Date().toISOString().split('T')[0]}.pdf`
    );
  },
  // 外部共有一覧レポート
  getExternalSharing: (scanId: string) =>
    api.get<{ report: ExternalSharingReport }>(`/api/reports/external-sharing/${scanId}`),
  getExternalSharingPdf: (scanId: string) =>
    downloadPdf(
      `/api/reports/external-sharing/${scanId}/pdf`,
      `external-sharing-report-${scanId}-${new Date().toISOString().split('T')[0]}.pdf`
    ),
  // 現在のリスク状況レポート
  getCurrentRisks: () =>
    api.get<{ report: CurrentRisksReport }>('/api/reports/current-risks'),
  getCurrentRisksPdf: () =>
    downloadPdf(
      '/api/reports/current-risks/pdf',
      `current-risks-report-${new Date().toISOString().split('T')[0]}.pdf`
    ),
};

// レポート型定義
export interface ScanHistoryReport {
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

export interface RiskAssessmentReport {
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
  criticalFiles: ReportFile[];
  highFiles: ReportFile[];
}

export interface ReportFile {
  id: string;
  name: string;
  ownerEmail: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  recommendations: string[];
  webViewLink: string | null;
}

export interface RemediationHistoryReport {
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

export interface ExternalSharingReport {
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

export interface CurrentRisksReport {
  reportType: 'current_risks';
  generatedAt: string;
  organization: {
    name: string;
    domain: string;
  };
  summary: {
    totalUsers: number;
    usersWithScans: number;
    usersWithoutScans: number;
    totalFiles: number;
    riskySummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    remediationRate: number;
  };
  userBreakdown: {
    userId: string;
    userName: string;
    userEmail: string;
    lastScanAt: string;
    totalFiles: number;
    riskySummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  }[];
}

// 一括操作用の型定義
export interface BulkPermissionFilter {
  type?: 'user' | 'group' | 'domain' | 'anyone';
  email?: string;
  role?: string;
}

export interface BulkOperationResult {
  success: boolean;
  message: string;
  results: {
    total: number;
    success: number;
    failed: number;
    details: {
      fileId: string;
      fileName: string;
      success: boolean;
      permissionId?: string;
      oldRole?: string;
      error?: string;
    }[];
  };
}

// Notifications API
export const notificationsApi = {
  getSettings: () =>
    api.get<{ settings: NotificationSettings }>('/api/notifications/settings'),
  updateSettings: (settings: Partial<NotificationSettings>) =>
    api.put<{ settings: NotificationSettings; message: string }>('/api/notifications/settings', settings),
  addRecipient: (email: string) =>
    api.post<{ settings: NotificationSettings; message: string }>('/api/notifications/settings/recipients', { email }),
  removeRecipient: (email: string) =>
    api.delete<{ settings: NotificationSettings; message: string }>(`/api/notifications/settings/recipients/${encodeURIComponent(email)}`),
  getLogs: (options?: { limit?: number; offset?: number; type?: NotificationLog['type'] }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.type) params.type = options.type;
    return api.get<{ logs: NotificationLog[]; pagination: Pagination }>(
      '/api/notifications/logs',
      Object.keys(params).length > 0 ? { params } : undefined
    );
  },
  sendTestNotification: () =>
    api.post<{ success: boolean; message: string; recipients: string[] }>('/api/notifications/test'),
};

// 通知設定型定義
export interface NotificationSettings {
  id: string;
  organizationId: string;
  emailNotifications: {
    enabled: boolean;
    recipients: string[];
    triggers: {
      scanCompleted: boolean;
      criticalRiskDetected: boolean;
      highRiskDetected: boolean;
      weeklyReport: boolean;
    };
    thresholds: {
      minRiskScore: number;
      minCriticalCount: number;
    };
  };
  slackNotifications?: {
    enabled: boolean;
    webhookUrl: string | null;
    channel: string | null;
    triggers: {
      scanCompleted: boolean;
      criticalRiskDetected: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  organizationId: string;
  type: 'scan_completed' | 'critical_risk' | 'high_risk' | 'weekly_report';
  channel: 'email' | 'slack';
  recipients: string[];
  subject: string;
  summary: string;
  scanId?: string;
  riskySummary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

// Domain-Wide Delegation API
export const delegationApi = {
  // 設定状態を取得
  getStatus: () =>
    api.get<DelegationStatus>('/api/delegation/status'),

  // サービスアカウントを設定
  configure: (serviceAccountJson: string) =>
    api.post<ConfigureResult>('/api/delegation/configure', { serviceAccountJson }),

  // 設定を検証
  verify: () =>
    api.post<VerifyResult>('/api/delegation/verify'),

  // 設定を削除
  delete: () =>
    api.delete<{ success: boolean; message: string }>('/api/delegation'),

  // 組織内ユーザー一覧を取得
  getUsers: () =>
    api.get<{ users: DomainUser[]; totalCount: number }>('/api/delegation/users'),

  // 設定ガイドを取得
  getSetupGuide: () =>
    api.get<SetupGuide>('/api/delegation/setup-guide'),
};

// Domain-Wide Delegation型定義
export interface DelegationStatus {
  configured: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed' | null;
  clientEmail: string | null;
  configuredAt: string | null;
  lastVerifiedAt: string | null;
  verificationError: string | null;
}

export interface ConfigureResult {
  success: boolean;
  message: string;
  clientEmail: string;
  clientId: string | null;
  requiredScopes: string[];
}

export interface VerifyResult {
  success: boolean;
  message?: string;
  error?: string;
  userCount?: number;
}

export interface DomainUser {
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export interface SetupGuide {
  requiredScopes: string[];
  clientEmail: string | null;
  steps: {
    step: number;
    title: string;
    description: string;
    link?: string;
    scopesToAdd?: string;
  }[];
}

// 統合スキャンAPI
export const integratedScanApi = {
  // 統合スキャンを開始
  start: (userEmails?: string[]) =>
    api.post<{
      success: boolean;
      message: string;
      jobId: string;
      targetUsers: number;
    }>('/api/delegation/scan/start', userEmails ? { userEmails } : {}),

  // 統合スキャンの進捗を取得
  getStatus: () =>
    api.get<IntegratedScanStatusResponse>('/api/delegation/scan/status'),

  // 統合スキャンをキャンセル
  cancel: () =>
    api.post<{ success: boolean; message: string }>('/api/delegation/scan/cancel'),
};

export interface IntegratedScanStatusResponse {
  hasActiveScan: boolean;
  status: IntegratedScanStatus | null;
}

export interface IntegratedScanStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalUsers: number;
  processedUsers: number;
  currentUser: string | null;
  userResults: IntegratedScanUserResult[];
  totalRiskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalFilesScanned: number;
  startedAt: string;
  completedAt: string | null;
}

export interface IntegratedScanUserResult {
  email: string;
  displayName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  scanId: string | null;
  filesScanned: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  error?: string;
}
