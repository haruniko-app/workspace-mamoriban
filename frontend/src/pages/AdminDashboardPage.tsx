import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { scanApi, type UserScanSummary } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 管理者権限チェック
  if (user?.role === 'member') {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h2 className="text-lg font-medium text-yellow-800">アクセス権限がありません</h2>
            <p className="mt-2 text-yellow-700">
              このページは管理者（admin/owner）のみアクセスできます。
            </p>
            <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ユーザーサマリー取得
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => scanApi.admin.getUsers(),
  });

  // 選択したユーザーのスキャン履歴
  const { data: userScansData, isLoading: isLoadingUserScans } = useQuery({
    queryKey: ['admin', 'users', selectedUserId, 'scans'],
    queryFn: () => scanApi.admin.getUserScans(selectedUserId!, 5),
    enabled: !!selectedUserId,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      owner: 'オーナー',
      admin: '管理者',
      member: 'メンバー',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[role] || colors.member}`}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">未実施</span>;
    const colors: Record<string, string> = {
      running: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      running: '実行中',
      completed: '完了',
      failed: '失敗',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTotalRisks = (summary: UserScanSummary['riskySummary']) => {
    if (!summary) return 0;
    return summary.critical + summary.high + summary.medium + summary.low;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">
            組織全体のスキャン状況を確認できます
          </p>
        </div>
      </div>

      {/* 統計サマリー */}
      {usersData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">総ユーザー数</div>
            <div className="mt-1 text-2xl font-bold">{usersData.stats.totalUsers}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">スキャン実施済み</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {usersData.stats.usersWithScans}
              <span className="text-sm text-gray-400 ml-1">
                / {usersData.stats.totalUsers}人
              </span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">未実施ユーザー</div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">
              {usersData.stats.usersWithoutScans}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-500">総リスクファイル</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-red-600">
                {usersData.stats.totalRisks.critical + usersData.stats.totalRisks.high}
              </span>
              <span className="text-sm text-gray-400">
                Critical/High
              </span>
            </div>
          </div>
        </div>
      )}

      {/* リスク内訳 */}
      {usersData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-medium mb-4">組織全体のリスク状況</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">Critical</span>
              <span className="font-bold">{usersData.stats.totalRisks.critical}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600">High</span>
              <span className="font-bold">{usersData.stats.totalRisks.high}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-gray-600">Medium</span>
              <span className="font-bold">{usersData.stats.totalRisks.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Low</span>
              <span className="font-bold">{usersData.stats.totalRisks.low}</span>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー別スキャン状況 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium">ユーザー別スキャン状況</h2>
        </div>

        {isLoadingUsers ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ユーザー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    最終スキャン
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    リスクファイル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    総ファイル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersData?.users.map((userSummary) => (
                  <tr
                    key={userSummary.userId}
                    className={`hover:bg-gray-50 ${
                      selectedUserId === userSummary.userId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">
                          {userSummary.userName}
                        </div>
                        <div className="text-sm text-gray-500">{userSummary.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge(userSummary.userRole)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(userSummary.lastScanAt)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(userSummary.lastScanStatus)}
                    </td>
                    <td className="px-4 py-3">
                      {userSummary.riskySummary ? (
                        <div className="flex items-center gap-2 text-sm">
                          {userSummary.riskySummary.critical > 0 && (
                            <span className="text-red-600 font-medium">
                              C:{userSummary.riskySummary.critical}
                            </span>
                          )}
                          {userSummary.riskySummary.high > 0 && (
                            <span className="text-orange-600 font-medium">
                              H:{userSummary.riskySummary.high}
                            </span>
                          )}
                          {userSummary.riskySummary.medium > 0 && (
                            <span className="text-yellow-600">
                              M:{userSummary.riskySummary.medium}
                            </span>
                          )}
                          {getTotalRisks(userSummary.riskySummary) === 0 && (
                            <span className="text-green-600">リスクなし</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {userSummary.totalFiles > 0 ? userSummary.totalFiles.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedUserId(
                          selectedUserId === userSummary.userId ? null : userSummary.userId
                        )}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {selectedUserId === userSummary.userId ? '閉じる' : '詳細'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 選択したユーザーのスキャン履歴 */}
      {selectedUserId && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium">
              {userScansData?.user.displayName} のスキャン履歴
            </h2>
            <button
              onClick={() => setSelectedUserId(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {isLoadingUserScans ? (
            <div className="p-8 text-center text-gray-500">読み込み中...</div>
          ) : userScansData?.scans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              スキャン履歴がありません
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {userScansData?.scans.map((scan) => (
                <div
                  key={scan.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <div className="text-sm text-gray-500">
                      {formatDate(scan.startedAt)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(scan.status)}
                      <span className="text-sm text-gray-600">
                        {scan.totalFiles.toLocaleString()} ファイル
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {scan.status === 'completed' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-600">C:{scan.riskySummary.critical}</span>
                        <span className="text-orange-600">H:{scan.riskySummary.high}</span>
                        <span className="text-yellow-600">M:{scan.riskySummary.medium}</span>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/files?scanId=${scan.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      詳細を見る
                    </button>
                  </div>
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
