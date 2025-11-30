/**
 * Domain-Wide Delegation設定ページ
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { delegationApi, integratedScanApi, type ConfigureResult } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function DelegationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [jsonInput, setJsonInput] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [configResult, setConfigResult] = useState<ConfigureResult | null>(null);

  // 設定状態を取得
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['delegation', 'status'],
    queryFn: () => delegationApi.getStatus(),
  });

  // 設定ガイドを取得
  const { data: guide } = useQuery({
    queryKey: ['delegation', 'guide'],
    queryFn: () => delegationApi.getSetupGuide(),
    enabled: showSetupGuide || !status?.configured,
  });

  // ユーザー一覧を取得（設定済みの場合）
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['delegation', 'users'],
    queryFn: () => delegationApi.getUsers(),
    enabled: status?.configured && status?.verificationStatus === 'verified',
  });

  // 統合スキャンのステータス
  const { data: scanStatus, refetch: refetchScanStatus } = useQuery({
    queryKey: ['delegation', 'scanStatus'],
    queryFn: () => integratedScanApi.getStatus(),
    enabled: status?.configured && status?.verificationStatus === 'verified',
    refetchInterval: (query) => (query.state.data?.hasActiveScan ? 2000 : false),
  });

  // 統合スキャン開始ミューテーション
  const startScanMutation = useMutation({
    mutationFn: (userEmails?: string[]) => integratedScanApi.start(userEmails),
    onSuccess: () => {
      refetchScanStatus();
    },
  });

  // 統合スキャンキャンセルミューテーション
  const cancelScanMutation = useMutation({
    mutationFn: () => integratedScanApi.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'scanStatus'] });
    },
  });

  // 設定ミューテーション
  const configureMutation = useMutation({
    mutationFn: (json: string) => delegationApi.configure(json),
    onSuccess: (result) => {
      setConfigResult(result);
      queryClient.invalidateQueries({ queryKey: ['delegation', 'status'] });
      setJsonInput('');
    },
  });

  // 検証ミューテーション
  const verifyMutation = useMutation({
    mutationFn: () => delegationApi.verify(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['delegation', 'users'] });
    },
  });

  // 削除ミューテーション
  const deleteMutation = useMutation({
    mutationFn: () => delegationApi.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'status'] });
      setConfigResult(null);
    },
  });

  // 管理者のみアクセス可能
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">この機能は管理者のみ利用できます。</p>
        </div>
      </div>
    );
  }

  if (statusLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-[#202124]">Domain-Wide Delegation設定</h1>
      </div>

      {/* 概要説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Domain-Wide Delegationとは？</h3>
        <p className="text-sm text-blue-800">
          Domain-Wide Delegationを使用すると、組織内の全ユーザーのGoogle Driveを一括でスキャンできます。
          これにより、組織全体のセキュリティリスクを把握することが可能になります。
        </p>
        <p className="text-sm text-blue-700 mt-2">
          ※ Google Workspace管理者権限が必要です。
        </p>
      </div>

      {/* 現在の設定状態 */}
      <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
        <h2 className="text-lg font-medium text-[#202124] mb-4">設定状態</h2>

        {status?.configured ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status.verificationStatus === 'verified' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ 設定済み・検証完了
                </span>
              ) : status.verificationStatus === 'pending' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  ⏳ 検証待ち
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  ✗ 検証失敗
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">サービスアカウント:</span>
                <p className="font-mono text-[#202124]">{status.clientEmail}</p>
              </div>
              <div>
                <span className="text-gray-500">設定日時:</span>
                <p className="text-[#202124]">
                  {status.configuredAt
                    ? new Date(status.configuredAt).toLocaleString('ja-JP')
                    : '-'}
                </p>
              </div>
              {status.lastVerifiedAt && (
                <div>
                  <span className="text-gray-500">最終検証:</span>
                  <p className="text-[#202124]">
                    {new Date(status.lastVerifiedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}
            </div>

            {status.verificationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{status.verificationError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {verifyMutation.isPending ? '検証中...' : '再検証'}
              </button>
              {user?.role === 'owner' && (
                <button
                  onClick={() => {
                    if (confirm('サービスアカウント設定を削除しますか？統合スキャン機能が利用できなくなります。')) {
                      deleteMutation.mutate();
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '削除中...' : '設定を削除'}
                </button>
              )}
            </div>

            {verifyMutation.isSuccess && verifyMutation.data && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  verifyMutation.data.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <p
                  className={`text-sm ${
                    verifyMutation.data.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {verifyMutation.data.success
                    ? verifyMutation.data.message
                    : verifyMutation.data.error}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">Domain-Wide Delegationはまだ設定されていません。</p>
            <button
              onClick={() => setShowSetupGuide(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              設定を開始
            </button>
          </div>
        )}
      </div>

      {/* 設定ガイド */}
      {(showSetupGuide || !status?.configured) && guide && (
        <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
          <h2 className="text-lg font-medium text-[#202124] mb-4">設定手順</h2>

          <div className="space-y-6">
            {guide.steps.map((step) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-medium">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[#202124]">{step.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                    >
                      → 設定ページを開く
                    </a>
                  )}
                  {step.scopesToAdd && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">必要なスコープ（コピーして使用）:</p>
                      <code className="text-xs text-[#202124] break-all">{step.scopesToAdd}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* サービスアカウントJSON入力 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-[#202124] mb-3">
                サービスアカウントキー（JSON）を入力
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Google Cloud Consoleからダウンロードしたサービスアカウントキーファイル（.json）の内容を貼り付けてください。
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"type": "service_account", ...}'
                className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {configureMutation.error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    {configureMutation.error instanceof Error
                      ? configureMutation.error.message
                      : 'エラーが発生しました'}
                  </p>
                </div>
              )}

              {configResult && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-green-700">{configResult.message}</p>
                  {configResult.clientId && (
                    <div className="bg-white border border-green-300 rounded p-2">
                      <p className="text-xs text-gray-500">
                        管理コンソールで入力するクライアントID:
                      </p>
                      <code className="text-sm font-mono">{configResult.clientId}</code>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    Google Workspace管理コンソールでDomain-Wide Delegationを設定した後、「再検証」ボタンをクリックしてください。
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => configureMutation.mutate(jsonInput)}
                  disabled={!jsonInput.trim() || configureMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {configureMutation.isPending ? '設定中...' : 'サービスアカウントを設定'}
                </button>
                {status?.configured && (
                  <button
                    onClick={() => setShowSetupGuide(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    閉じる
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー一覧（検証済みの場合） */}
      {status?.configured && status?.verificationStatus === 'verified' && (
        <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#202124]">組織内ユーザー</h2>
            {usersData && (
              <span className="text-sm text-gray-500">{usersData.totalCount}名</span>
            )}
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : usersData?.users && usersData.users.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      権限
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usersData.users.slice(0, 20).map((user) => (
                    <tr key={user.email}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#202124]">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            管理者
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            メンバー
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usersData.users.length > 20 && (
                <p className="text-sm text-gray-500 text-center py-3 border-t">
                  他 {usersData.users.length - 20} 名...
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">ユーザーが見つかりません</p>
          )}
        </div>
      )}

      {/* 統合スキャン機能（検証済みの場合） */}
      {status?.configured && status?.verificationStatus === 'verified' && (
        <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
          <h2 className="text-lg font-medium text-[#202124] mb-4">統合スキャン</h2>
          <p className="text-sm text-gray-600 mb-4">
            組織内の全ユーザーのGoogle Driveを一括でスキャンし、セキュリティリスクを検出します。
          </p>

          {/* スキャン実行中の場合 */}
          {scanStatus?.hasActiveScan && scanStatus.status && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-700">
                    統合スキャン実行中... ({scanStatus.status.processedUsers}/{scanStatus.status.totalUsers}名)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {scanStatus.status.currentUser && (
                    <span className="text-sm text-gray-500">
                      現在: {scanStatus.status.currentUser}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('統合スキャンをキャンセルしますか？進行中のスキャンは中断されます。')) {
                        cancelScanMutation.mutate();
                      }
                    }}
                    disabled={cancelScanMutation.isPending}
                    className="px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelScanMutation.isPending ? 'キャンセル中...' : 'キャンセル'}
                  </button>
                </div>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(scanStatus.status.processedUsers / scanStatus.status.totalUsers) * 100}%`,
                  }}
                ></div>
              </div>

              {/* ユーザーごとの進捗 */}
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ユーザー</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状態</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ファイル数</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">リスク</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scanStatus.status.userResults.map((result) => (
                      <tr key={result.email}>
                        <td className="px-4 py-2 text-sm">
                          <div>{result.displayName}</div>
                          <div className="text-xs text-gray-500">{result.email}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {result.status === 'pending' && (
                            <span className="text-gray-400">待機中</span>
                          )}
                          {result.status === 'running' && (
                            <span className="text-blue-600 flex items-center gap-1">
                              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
                              スキャン中
                            </span>
                          )}
                          {result.status === 'completed' && (
                            <span className="text-green-600">完了</span>
                          )}
                          {result.status === 'failed' && (
                            <span className="text-red-600" title={result.error}>失敗</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{result.filesScanned}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {result.status === 'completed' && (
                            <div className="flex gap-1 justify-end">
                              {result.riskySummary.critical > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                  {result.riskySummary.critical}
                                </span>
                              )}
                              {result.riskySummary.high > 0 && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                  {result.riskySummary.high}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* スキャンキャンセル済みの場合 */}
          {scanStatus?.status && scanStatus.status.status === 'cancelled' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700 font-medium">統合スキャンがキャンセルされました</p>
                <p className="text-sm text-yellow-600 mt-1">
                  {scanStatus.status.processedUsers}/{scanStatus.status.totalUsers}名のスキャンが完了していました。
                </p>
              </div>
            </div>
          )}

          {/* スキャン完了後の結果表示 */}
          {scanStatus?.status && scanStatus.status.status === 'completed' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium">統合スキャンが完了しました</p>
                <p className="text-sm text-green-600 mt-1">
                  {scanStatus.status.userResults.filter(r => r.status === 'completed').length}名のユーザーをスキャンし、
                  合計{scanStatus.status.totalFilesScanned.toLocaleString()}ファイルを検査しました。
                </p>
              </div>

              {/* 結果サマリー */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {scanStatus.status.totalRiskySummary.critical}
                  </p>
                  <p className="text-xs text-red-700">Critical</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {scanStatus.status.totalRiskySummary.high}
                  </p>
                  <p className="text-xs text-orange-700">High</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {scanStatus.status.totalRiskySummary.medium}
                  </p>
                  <p className="text-xs text-yellow-700">Medium</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">
                    {scanStatus.status.totalRiskySummary.low}
                  </p>
                  <p className="text-xs text-gray-700">Low</p>
                </div>
              </div>

              {/* 各ユーザーの結果へのリンク */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ユーザー</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ファイル数</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">リスク</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scanStatus.status.userResults
                      .filter(r => r.status === 'completed' && r.scanId)
                      .map((result) => (
                        <tr key={result.email}>
                          <td className="px-4 py-2 text-sm">
                            <div>{result.displayName}</div>
                            <div className="text-xs text-gray-500">{result.email}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">{result.filesScanned}</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-1 justify-end">
                              {result.riskySummary.critical > 0 && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                  {result.riskySummary.critical}
                                </span>
                              )}
                              {result.riskySummary.high > 0 && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                                  {result.riskySummary.high}
                                </span>
                              )}
                              {result.riskySummary.medium > 0 && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                                  {result.riskySummary.medium}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Link
                              to={`/scan/${result.scanId}/files`}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              詳細を見る →
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* スキャン開始ボタン（実行中でない場合） */}
          {!scanStatus?.hasActiveScan && (
            <div className="flex gap-3">
              <button
                onClick={() => startScanMutation.mutate(undefined)}
                disabled={startScanMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {startScanMutation.isPending ? '開始中...' : '全ユーザーをスキャン'}
              </button>
              {usersData && usersData.users.length > 5 && (
                <span className="text-sm text-gray-500 self-center">
                  {usersData.users.length}名のユーザーをスキャンします
                </span>
              )}
            </div>
          )}

          {startScanMutation.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                {startScanMutation.error instanceof Error
                  ? startScanMutation.error.message
                  : 'スキャンの開始に失敗しました'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
