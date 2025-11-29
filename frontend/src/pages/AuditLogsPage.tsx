import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, type DriveAuditLog, type LoginAuditLog } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'summary' | 'drive' | 'login' | 'external' | 'suspicious';

const TAB_LABELS: Record<TabType, string> = {
  summary: 'サマリー',
  drive: 'Drive操作',
  login: 'ログイン',
  external: '外部共有',
  suspicious: '不審なログイン',
};

export function AuditLogsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [period, setPeriod] = useState(7);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  // サマリーデータ取得
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['auditLogSummary', period],
    queryFn: () => auditLogsApi.getSummary(period),
    enabled: isAdmin,
  });

  // Drive監査ログ取得
  const { data: driveData, isLoading: driveLoading } = useQuery({
    queryKey: ['auditLogsDrive'],
    queryFn: () => auditLogsApi.getDriveLogs({ maxResults: '50' }),
    enabled: isAdmin && activeTab === 'drive',
  });

  // ログイン監査ログ取得
  const { data: loginData, isLoading: loginLoading } = useQuery({
    queryKey: ['auditLogsLogin'],
    queryFn: () => auditLogsApi.getLoginLogs({ maxResults: '50' }),
    enabled: isAdmin && activeTab === 'login',
  });

  // 外部共有ログ取得
  const { data: externalData, isLoading: externalLoading } = useQuery({
    queryKey: ['auditLogsExternal'],
    queryFn: () => auditLogsApi.getExternalSharing({ maxResults: '50' }),
    enabled: isAdmin && activeTab === 'external',
  });

  // 不審なログイン取得
  const { data: suspiciousData, isLoading: suspiciousLoading } = useQuery({
    queryKey: ['auditLogsSuspicious'],
    queryFn: () => auditLogsApi.getSuspiciousLogins({ maxResults: '50' }),
    enabled: isAdmin && activeTab === 'suspicious',
  });

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg className="w-16 h-16 text-[#dadce0] mx-auto mb-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <h2 className="text-lg font-medium text-[#202124] mb-2">アクセス権限がありません</h2>
            <p className="text-sm text-[#5f6368]">
              監査ログは管理者のみ閲覧できます。
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const summary = summaryData?.summary;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-[#202124]">監査ログ</h1>
            <p className="text-sm text-[#5f6368] mt-1">
              Google Workspaceの操作履歴を確認
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#5f6368]">期間:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="text-sm border border-[#dadce0] rounded-lg px-3 py-2"
            >
              <option value={1}>過去1日</option>
              <option value={7}>過去7日</option>
              <option value={30}>過去30日</option>
              <option value={90}>過去90日</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {summaryError && (
          <div className="bg-[#fce8e6] text-[#c5221f] p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <span className="text-sm font-medium">
                {(summaryError as Error).message?.includes('403')
                  ? '監査ログへのアクセス権限がありません。Google Workspace管理者権限が必要です。'
                  : '監査ログの取得に失敗しました'}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[#e8eaed]">
          <div className="flex gap-1">
            {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-[#1a73e8] text-[#1a73e8]'
                    : 'border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard
              title="Drive操作"
              value={summary?.totalDriveEvents || 0}
              icon="drive"
              loading={summaryLoading}
            />
            <SummaryCard
              title="外部共有"
              value={summary?.externalShares || 0}
              icon="share"
              loading={summaryLoading}
              alert={summary?.externalShares ? summary.externalShares > 0 : false}
            />
            <SummaryCard
              title="ログイン失敗"
              value={summary?.loginFailures || 0}
              icon="login"
              loading={summaryLoading}
            />
            <SummaryCard
              title="不審なログイン"
              value={summary?.suspiciousLogins || 0}
              icon="warning"
              loading={summaryLoading}
              alert={summary?.suspiciousLogins ? summary.suspiciousLogins > 0 : false}
            />
            <SummaryCard
              title="管理者操作"
              value={summary?.adminChanges || 0}
              icon="admin"
              loading={summaryLoading}
            />
          </div>
        )}

        {activeTab === 'drive' && (
          <AuditLogTable
            logs={driveData?.logs || []}
            loading={driveLoading}
            type="drive"
          />
        )}

        {activeTab === 'login' && (
          <AuditLogTable
            logs={loginData?.logs || []}
            loading={loginLoading}
            type="login"
          />
        )}

        {activeTab === 'external' && (
          <AuditLogTable
            logs={externalData?.logs || []}
            loading={externalLoading}
            type="external"
          />
        )}

        {activeTab === 'suspicious' && (
          <AuditLogTable
            logs={suspiciousData?.logs || []}
            loading={suspiciousLoading}
            type="suspicious"
          />
        )}

        {/* Note about permissions */}
        <div className="bg-[#e8f0fe] rounded-xl p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-[#1a73e8] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <div>
              <p className="text-sm text-[#202124]">
                監査ログの取得には、Google Workspace管理者権限と
                <code className="mx-1 px-1 bg-white rounded text-xs">admin.reports.audit.readonly</code>
                スコープが必要です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
  alert,
}: {
  title: string;
  value: number;
  icon: string;
  loading: boolean;
  alert?: boolean;
}) {
  const iconMap: Record<string, JSX.Element> = {
    drive: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    ),
    share: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
      </svg>
    ),
    login: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
      </svg>
    ),
    admin: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
      </svg>
    ),
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-[#e37400]' : 'border-[#dadce0]'}`}>
      <div className={`mb-2 ${alert ? 'text-[#e37400]' : 'text-[#5f6368]'}`}>
        {iconMap[icon]}
      </div>
      <p className="text-xs text-[#5f6368] mb-1">{title}</p>
      {loading ? (
        <div className="h-8 bg-[#f1f3f4] rounded animate-pulse" />
      ) : (
        <p className={`text-2xl font-medium ${alert ? 'text-[#e37400]' : 'text-[#202124]'}`}>
          {value.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function AuditLogTable({
  logs,
  loading,
  type,
}: {
  logs: (DriveAuditLog | LoginAuditLog)[];
  loading: boolean;
  type: 'drive' | 'login' | 'external' | 'suspicious';
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#dadce0] p-8 text-center">
        <svg className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-[#5f6368] mt-2">読み込み中...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#dadce0] p-8 text-center">
        <svg className="w-12 h-12 text-[#dadce0] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <p className="text-sm text-[#5f6368]">ログがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#f8f9fa]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">日時</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">ユーザー</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">イベント</th>
              {(type === 'drive' || type === 'external') && (
                <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">ファイル</th>
              )}
              {type === 'external' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">共有先</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-[#5f6368]">IPアドレス</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[#e8eaed] hover:bg-[#f8f9fa]">
                <td className="px-4 py-3 text-sm text-[#202124]">
                  {new Date(log.time).toLocaleString('ja-JP')}
                </td>
                <td className="px-4 py-3 text-sm text-[#202124]">{log.actor.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-[#f1f3f4] text-[#5f6368] rounded">
                    {log.eventName}
                  </span>
                </td>
                {(type === 'drive' || type === 'external') && (
                  <td className="px-4 py-3 text-sm text-[#202124] max-w-[200px] truncate">
                    {(log as DriveAuditLog).docTitle || '-'}
                  </td>
                )}
                {type === 'external' && (
                  <td className="px-4 py-3 text-sm text-[#e37400]">
                    {(log as DriveAuditLog).targetUser || '-'}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-[#5f6368]">{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
