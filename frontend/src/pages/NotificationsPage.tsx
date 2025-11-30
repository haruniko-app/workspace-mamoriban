import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationSettings, type NotificationLog } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [newRecipient, setNewRecipient] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 通知設定を取得
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: () => notificationsApi.getSettings(),
  });

  // 通知履歴を取得
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: ['notificationLogs'],
    queryFn: () => notificationsApi.getLogs({ limit: 20 }),
    enabled: activeTab === 'history',
  });

  const settings = settingsData?.settings;
  const logs = logsData?.logs || [];

  // 設定更新ミューテーション
  const updateSettingsMutation = useMutation({
    mutationFn: (updates: Partial<NotificationSettings>) => notificationsApi.updateSettings(updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      setResult({ type: 'success', message: data.message });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ type: 'error', message: error instanceof Error ? error.message : '更新に失敗しました' });
    },
  });

  // 受信者追加ミューテーション
  const addRecipientMutation = useMutation({
    mutationFn: (email: string) => notificationsApi.addRecipient(email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      setNewRecipient('');
      setResult({ type: 'success', message: data.message });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ type: 'error', message: error instanceof Error ? error.message : '追加に失敗しました' });
    },
  });

  // 受信者削除ミューテーション
  const removeRecipientMutation = useMutation({
    mutationFn: (email: string) => notificationsApi.removeRecipient(email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      setResult({ type: 'success', message: data.message });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ type: 'error', message: error instanceof Error ? error.message : '削除に失敗しました' });
    },
  });

  // テスト通知ミューテーション
  const testNotificationMutation = useMutation({
    mutationFn: () => notificationsApi.sendTestNotification(),
    onSuccess: (data) => {
      setResult({ type: 'success', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['notificationLogs'] });
      setTimeout(() => setResult(null), 3000);
    },
    onError: (error) => {
      setResult({ type: 'error', message: error instanceof Error ? error.message : 'テスト通知に失敗しました' });
    },
  });

  const handleToggleEnabled = () => {
    if (!settings) return;
    updateSettingsMutation.mutate({
      emailNotifications: {
        ...settings.emailNotifications,
        enabled: !settings.emailNotifications.enabled,
      },
    });
  };

  const handleToggleTrigger = (trigger: keyof NotificationSettings['emailNotifications']['triggers']) => {
    if (!settings) return;
    updateSettingsMutation.mutate({
      emailNotifications: {
        ...settings.emailNotifications,
        triggers: {
          ...settings.emailNotifications.triggers,
          [trigger]: !settings.emailNotifications.triggers[trigger],
        },
      },
    });
  };

  const handleAddRecipient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecipient && newRecipient.includes('@')) {
      addRecipientMutation.mutate(newRecipient);
    }
  };

  const getLogTypeLabel = (type: NotificationLog['type']) => {
    switch (type) {
      case 'scan_completed': return 'スキャン完了';
      case 'critical_risk': return 'Criticalリスク検出';
      case 'high_risk': return 'Highリスク検出';
      case 'weekly_report': return '週次レポート';
      default: return type;
    }
  };

  const getLogTypeColor = (type: NotificationLog['type']) => {
    switch (type) {
      case 'critical_risk': return 'bg-[#fce8e6] text-[#c5221f]';
      case 'high_risk': return 'bg-[#fef7e0] text-[#e37400]';
      case 'weekly_report': return 'bg-[#e8f0fe] text-[#1a73e8]';
      default: return 'bg-[#e6f4ea] text-[#137333]';
    }
  };

  if (isSettingsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-sm text-[#5f6368]">読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-[#202124]">通知設定</h1>
            <p className="text-sm text-[#5f6368] mt-1">
              リスク検出やスキャン完了時の通知を設定します
            </p>
          </div>
          {settings?.emailNotifications.enabled && isAdmin && (
            <button
              onClick={() => testNotificationMutation.mutate()}
              disabled={testNotificationMutation.isPending || settings.emailNotifications.recipients.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#1a73e8] rounded-lg hover:bg-[#e8f0fe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              {testNotificationMutation.isPending ? '送信中...' : 'テスト通知を送信'}
            </button>
          )}
        </div>

        {/* Result Toast */}
        {result && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            result.type === 'success' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'
          }`}>
            {result.type === 'success' ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
            <span className="text-sm font-medium">{result.message}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#f1f3f4] rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-[#202124] shadow-sm'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            通知設定
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-[#202124] shadow-sm'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            通知履歴
          </button>
        </div>

        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="bg-white rounded-xl border border-[#dadce0] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-[#202124]">メール通知</h2>
                  <p className="text-sm text-[#5f6368] mt-1">
                    リスク検出時やスキャン完了時にメールで通知します
                  </p>
                </div>
                <button
                  onClick={handleToggleEnabled}
                  disabled={!isAdmin || updateSettingsMutation.isPending}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.emailNotifications.enabled ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'
                  } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      settings.emailNotifications.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Recipients */}
            <div className="bg-white rounded-xl border border-[#dadce0] p-6">
              <h2 className="text-base font-medium text-[#202124] mb-4">通知受信者</h2>

              {isAdmin && (
                <form onSubmit={handleAddRecipient} className="flex gap-3 mb-4">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    placeholder="メールアドレスを入力"
                    className="flex-1 px-3 py-2 border border-[#dadce0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newRecipient || !newRecipient.includes('@') || addRecipientMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] rounded-lg hover:bg-[#1557b0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    追加
                  </button>
                </form>
              )}

              {settings.emailNotifications.recipients.length === 0 ? (
                <p className="text-sm text-[#5f6368]">通知受信者が設定されていません</p>
              ) : (
                <div className="space-y-2">
                  {settings.emailNotifications.recipients.map((email) => (
                    <div key={email} className="flex items-center justify-between py-2 px-3 bg-[#f8f9fa] rounded-lg">
                      <span className="text-sm text-[#202124]">{email}</span>
                      {isAdmin && (
                        <button
                          onClick={() => removeRecipientMutation.mutate(email)}
                          disabled={removeRecipientMutation.isPending}
                          className="p-1 text-[#5f6368] hover:text-[#c5221f] transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Triggers */}
            <div className="bg-white rounded-xl border border-[#dadce0] p-6">
              <h2 className="text-base font-medium text-[#202124] mb-4">通知トリガー</h2>
              <div className="space-y-4">
                {[
                  { key: 'scanCompleted' as const, label: 'スキャン完了時', description: 'スキャンが完了したら通知します' },
                  { key: 'criticalRiskDetected' as const, label: 'Criticalリスク検出時', description: 'Criticalレベルのリスクが検出されたら即時通知します' },
                  { key: 'highRiskDetected' as const, label: 'Highリスク検出時', description: 'Highレベルのリスクが検出されたら通知します' },
                  { key: 'weeklyReport' as const, label: '週次レポート', description: '毎週月曜日にサマリーレポートを送信します' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-[#202124]">{label}</p>
                      <p className="text-xs text-[#5f6368]">{description}</p>
                    </div>
                    <button
                      onClick={() => handleToggleTrigger(key)}
                      disabled={!isAdmin || updateSettingsMutation.isPending}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        settings.emailNotifications.triggers[key] ? 'bg-[#1a73e8]' : 'bg-[#dadce0]'
                      } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          settings.emailNotifications.triggers[key] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {!isAdmin && (
              <div className="bg-[#fef7e0] rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-[#e37400] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="text-sm text-[#e37400]">
                  通知設定の変更は管理者のみ実行できます
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
            {isLogsLoading ? (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-[#dadce0] mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" />
                </svg>
                <p className="mt-2 text-sm text-[#5f6368]">通知履歴がありません</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8eaed]">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-[#f8f9fa]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLogTypeColor(log.type)}`}>
                            {getLogTypeLabel(log.type)}
                          </span>
                          {!log.success && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#fce8e6] text-[#c5221f]">
                              失敗
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[#202124]">{log.subject}</p>
                        <p className="text-xs text-[#5f6368] mt-1">{log.summary}</p>
                        <p className="text-xs text-[#5f6368] mt-2">
                          送信先: {log.recipients.join(', ')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-[#5f6368]">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    {log.errorMessage && (
                      <p className="text-xs text-[#c5221f] mt-2">エラー: {log.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
