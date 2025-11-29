import { google, admin_reports_v1 } from 'googleapis';

/**
 * 監査ログのタイプ
 */
export type AuditLogType = 'login' | 'drive' | 'admin' | 'token';

/**
 * 監査ログエントリ
 */
export interface AuditLogEntry {
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

/**
 * Drive監査ログのイベント詳細
 */
export interface DriveAuditEvent extends AuditLogEntry {
  docId: string | null;
  docTitle: string | null;
  docType: string | null;
  visibility: string | null;
  targetUser: string | null;
  oldVisibility: string | null;
  newVisibility: string | null;
}

/**
 * ログイン監査ログのイベント詳細
 */
export interface LoginAuditEvent extends AuditLogEntry {
  loginType: string | null;
  isSecondFactor: boolean;
  isSuspicious: boolean;
}

/**
 * Reports APIクライアントを作成
 */
export function createReportsClient(accessToken: string): admin_reports_v1.Admin {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.admin({
    version: 'reports_v1',
    auth: oauth2Client,
  });
}

/**
 * パラメータを抽出するヘルパー関数
 */
function extractParameter(
  parameters: admin_reports_v1.Schema$NestedParameter[] | undefined,
  name: string
): string | number | boolean | null {
  if (!parameters) return null;
  const param = parameters.find((p) => p.name === name);
  if (!param) return null;

  if (param.value !== undefined && param.value !== null) return param.value;
  if (param.intValue !== undefined && param.intValue !== null) return parseInt(param.intValue, 10);
  if (param.boolValue !== undefined && param.boolValue !== null) return param.boolValue;
  if (param.multiValue !== undefined && param.multiValue !== null) return param.multiValue.join(', ');

  return null;
}

/**
 * 監査ログを共通形式に変換
 */
function parseAuditActivity(
  activity: admin_reports_v1.Schema$Activity
): AuditLogEntry | null {
  if (!activity.id?.time || !activity.events?.[0]) {
    return null;
  }

  const event = activity.events[0];
  const parameters: Record<string, string | number | boolean | null> = {};

  if (event.parameters) {
    for (const param of event.parameters) {
      if (param.name) {
        parameters[param.name] = extractParameter(event.parameters, param.name);
      }
    }
  }

  return {
    id: activity.id.uniqueQualifier || activity.id.time,
    time: activity.id.time,
    actor: {
      email: activity.actor?.email || 'unknown',
      profileId: activity.actor?.profileId || null,
    },
    ipAddress: activity.ipAddress || null,
    eventType: event.type || 'unknown',
    eventName: event.name || 'unknown',
    parameters,
  };
}

/**
 * Drive監査ログを取得
 */
export async function getDriveAuditLogs(
  accessToken: string,
  options: {
    startTime?: string;
    endTime?: string;
    userKey?: string;
    eventName?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ logs: DriveAuditEvent[]; nextPageToken: string | null }> {
  const reports = createReportsClient(accessToken);

  const response = await reports.activities.list({
    userKey: options.userKey || 'all',
    applicationName: 'drive',
    startTime: options.startTime,
    endTime: options.endTime,
    eventName: options.eventName,
    maxResults: options.maxResults || 50,
    pageToken: options.pageToken,
  });

  const logs: DriveAuditEvent[] = [];

  for (const activity of response.data.items || []) {
    const baseEntry = parseAuditActivity(activity);
    if (!baseEntry) continue;

    const driveEvent: DriveAuditEvent = {
      ...baseEntry,
      docId: baseEntry.parameters['doc_id'] as string | null,
      docTitle: baseEntry.parameters['doc_title'] as string | null,
      docType: baseEntry.parameters['doc_type'] as string | null,
      visibility: baseEntry.parameters['visibility'] as string | null,
      targetUser: baseEntry.parameters['target_user'] as string | null,
      oldVisibility: baseEntry.parameters['old_visibility'] as string | null,
      newVisibility: baseEntry.parameters['new_visibility'] as string | null,
    };

    logs.push(driveEvent);
  }

  return {
    logs,
    nextPageToken: response.data.nextPageToken || null,
  };
}

/**
 * ログイン監査ログを取得
 */
export async function getLoginAuditLogs(
  accessToken: string,
  options: {
    startTime?: string;
    endTime?: string;
    userKey?: string;
    eventName?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ logs: LoginAuditEvent[]; nextPageToken: string | null }> {
  const reports = createReportsClient(accessToken);

  const response = await reports.activities.list({
    userKey: options.userKey || 'all',
    applicationName: 'login',
    startTime: options.startTime,
    endTime: options.endTime,
    eventName: options.eventName,
    maxResults: options.maxResults || 50,
    pageToken: options.pageToken,
  });

  const logs: LoginAuditEvent[] = [];

  for (const activity of response.data.items || []) {
    const baseEntry = parseAuditActivity(activity);
    if (!baseEntry) continue;

    const loginEvent: LoginAuditEvent = {
      ...baseEntry,
      loginType: baseEntry.parameters['login_type'] as string | null,
      isSecondFactor: baseEntry.parameters['is_second_factor'] === true,
      isSuspicious: baseEntry.parameters['is_suspicious'] === true,
    };

    logs.push(loginEvent);
  }

  return {
    logs,
    nextPageToken: response.data.nextPageToken || null,
  };
}

/**
 * 管理者監査ログを取得
 */
export async function getAdminAuditLogs(
  accessToken: string,
  options: {
    startTime?: string;
    endTime?: string;
    userKey?: string;
    eventName?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ logs: AuditLogEntry[]; nextPageToken: string | null }> {
  const reports = createReportsClient(accessToken);

  const response = await reports.activities.list({
    userKey: options.userKey || 'all',
    applicationName: 'admin',
    startTime: options.startTime,
    endTime: options.endTime,
    eventName: options.eventName,
    maxResults: options.maxResults || 50,
    pageToken: options.pageToken,
  });

  const logs: AuditLogEntry[] = [];

  for (const activity of response.data.items || []) {
    const entry = parseAuditActivity(activity);
    if (entry) {
      logs.push(entry);
    }
  }

  return {
    logs,
    nextPageToken: response.data.nextPageToken || null,
  };
}

/**
 * 共有設定変更の監査ログを取得（セキュリティ重要）
 */
export async function getSharingChangeAuditLogs(
  accessToken: string,
  options: {
    startTime?: string;
    endTime?: string;
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ logs: DriveAuditEvent[]; nextPageToken: string | null }> {
  // 共有関連のイベントのみをフィルタ
  const sharingEvents = [
    'change_user_access',
    'change_document_visibility',
    'change_document_access_scope',
    'add_to_folder',
    'remove_from_folder',
  ];

  const allLogs: DriveAuditEvent[] = [];
  let nextPageToken: string | null = null;

  // 各イベントタイプを取得（API制限のため1つずつ）
  for (const eventName of sharingEvents) {
    try {
      const result = await getDriveAuditLogs(accessToken, {
        ...options,
        eventName,
        maxResults: Math.ceil((options.maxResults || 50) / sharingEvents.length),
      });
      allLogs.push(...result.logs);
    } catch (error) {
      // 特定のイベントが取得できない場合はスキップ
      console.error(`Failed to get ${eventName} logs:`, error);
    }
  }

  // 時間順にソート
  allLogs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return {
    logs: allLogs.slice(0, options.maxResults || 50),
    nextPageToken,
  };
}

/**
 * 外部共有の監査ログを取得（セキュリティ重要）
 */
export async function getExternalSharingAuditLogs(
  accessToken: string,
  organizationDomain: string,
  options: {
    startTime?: string;
    endTime?: string;
    maxResults?: number;
  } = {}
): Promise<DriveAuditEvent[]> {
  const result = await getDriveAuditLogs(accessToken, {
    ...options,
    eventName: 'change_user_access',
    maxResults: 200, // 多めに取得してフィルタ
  });

  // 外部ドメインへの共有のみをフィルタ
  const externalLogs = result.logs.filter((log) => {
    const targetUser = log.targetUser;
    if (!targetUser) return false;

    // ターゲットユーザーが組織外かどうか
    const targetDomain = targetUser.split('@')[1];
    return targetDomain && targetDomain !== organizationDomain;
  });

  return externalLogs.slice(0, options.maxResults || 50);
}

/**
 * 不審なログインを検出
 */
export async function getSuspiciousLoginLogs(
  accessToken: string,
  options: {
    startTime?: string;
    endTime?: string;
    maxResults?: number;
  } = {}
): Promise<LoginAuditEvent[]> {
  const result = await getLoginAuditLogs(accessToken, {
    ...options,
    eventName: 'login_failure',
    maxResults: 100,
  });

  // 不審フラグが立っているものをフィルタ
  const suspiciousLogs = result.logs.filter((log) => log.isSuspicious);

  return suspiciousLogs.slice(0, options.maxResults || 50);
}

/**
 * 監査ログのサマリーを取得
 */
export async function getAuditLogSummary(
  accessToken: string,
  organizationDomain: string,
  days: number = 7
): Promise<{
  totalDriveEvents: number;
  externalShares: number;
  loginFailures: number;
  suspiciousLogins: number;
  adminChanges: number;
}> {
  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);
  const startTimeStr = startTime.toISOString();

  const [driveResult, loginResult, adminResult, externalShares] = await Promise.all([
    getDriveAuditLogs(accessToken, { startTime: startTimeStr, maxResults: 1 }),
    getLoginAuditLogs(accessToken, { startTime: startTimeStr, eventName: 'login_failure', maxResults: 100 }),
    getAdminAuditLogs(accessToken, { startTime: startTimeStr, maxResults: 1 }),
    getExternalSharingAuditLogs(accessToken, organizationDomain, { startTime: startTimeStr, maxResults: 100 }),
  ]);

  const suspiciousLogins = loginResult.logs.filter((log) => log.isSuspicious);

  return {
    totalDriveEvents: driveResult.logs.length,
    externalShares: externalShares.length,
    loginFailures: loginResult.logs.length,
    suspiciousLogins: suspiciousLogins.length,
    adminChanges: adminResult.logs.length,
  };
}
