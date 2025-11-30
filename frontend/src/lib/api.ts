const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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
  start: () => api.post<{ scanId: string; status: string; message: string }>('/api/scan/start'),
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
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.riskLevel) params.riskLevel = options.riskLevel;
    if (options?.ownerType) params.ownerType = options.ownerType;
    if (options?.sortBy) params.sortBy = options.sortBy;
    if (options?.sortOrder) params.sortOrder = options.sortOrder;
    return api.get<{ files: ScannedFile[]; pagination: Pagination }>(`/api/scan/${scanId}/files`, { params });
  },
  getFile: (scanId: string, fileId: string) => api.get<{ file: ScannedFile }>(`/api/scan/${scanId}/files/${fileId}`),
  getFolders: (scanId: string, options?: {
    limit?: number;
    offset?: number;
    minRiskLevel?: 'critical' | 'high' | 'medium' | 'low';
  }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.minRiskLevel) params.minRiskLevel = options.minRiskLevel;
    return api.get<{ folders: FolderSummary[]; pagination: Pagination }>(`/api/scan/${scanId}/folders`, { params });
  },
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
  status: 'running' | 'completed' | 'failed';
  phase: 'counting' | 'scanning' | 'done';
  totalFiles: number;
  processedFiles: number;
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

export interface FolderSummary {
  id: string;
  name: string;
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
