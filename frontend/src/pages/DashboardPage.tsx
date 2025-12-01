import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scanApi, authApi, isAuthenticationError, type Scan } from '../lib/api';
import { Layout } from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';

function RiskCard({
  level,
  count,
  color,
  bgColor,
  icon,
}: {
  level: string;
  count: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-5 ${bgColor}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className={`text-sm font-medium ${color}`}>{level}</span>
      </div>
      <p className={`text-4xl font-normal ${color}`}>{count}</p>
      <p className="text-xs text-[#5f6368] mt-1">ファイル</p>
    </div>
  );
}

function ScanHistoryItem({ scan, onClick, onCancel, isCancelling }: { scan: Scan; onClick: () => void; onCancel?: () => void; isCancelling?: boolean }) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '日時不明';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '日時不明';
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = () => {
    switch (scan.status) {
      case 'completed':
        return { bg: 'bg-[#e6f4ea]', text: `${scan.totalFiles.toLocaleString()}件のファイルをスキャン` };
      case 'running':
        return { bg: 'bg-[#e8f0fe]', text: 'スキャン中...' };
      case 'cancelled':
        return { bg: 'bg-[#f1f3f4]', text: 'キャンセル済み' };
      default:
        return { bg: 'bg-[#fce8e6]', text: 'スキャン失敗' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-3 px-4 hover:bg-[#f1f3f4] rounded-lg transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${statusInfo.bg}`}
        >
          {scan.status === 'completed' ? (
            <svg className="w-5 h-5 text-[#1e8e3e]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : scan.status === 'running' ? (
            <svg className="w-5 h-5 text-[#1a73e8] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : scan.status === 'cancelled' ? (
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#d93025]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[#202124]">
            {statusInfo.text}
          </p>
          <p className="text-xs text-[#5f6368]">{formatDate(scan.startedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {scan.status === 'running' && onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            disabled={isCancelling}
            className="text-xs px-3 py-1.5 rounded-full bg-[#fce8e6] text-[#c5221f] font-medium hover:bg-[#f8d7da] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'キャンセル中...' : '停止'}
          </button>
        )}
        {scan.status === 'completed' && (
          <>
            {scan.riskySummary.critical > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#fce8e6] text-[#c5221f] font-medium">
                緊急 {scan.riskySummary.critical}
              </span>
            )}
            {scan.riskySummary.high > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#fef7e0] text-[#e37400] font-medium">
                高 {scan.riskySummary.high}
              </span>
            )}
            {scan.riskySummary.critical === 0 && scan.riskySummary.high === 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#e6f4ea] text-[#137333] font-medium">
                問題なし
              </span>
            )}
            <svg className="w-5 h-5 text-[#5f6368] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [showFailed, setShowFailed] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancellingScanId, setCancellingScanId] = useState<string | null>(null);
  const limit = 5;

  const {
    data: historyData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['scanHistory', offset],
    queryFn: () => scanApi.getHistory(limit + 10, offset), // Fetch more to account for filtering
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      // Auto-refresh if there's a running scan
      const hasRunning = query.state.data?.scans.some((s) => s.status === 'running');
      return hasRunning ? 3000 : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (scanId: string) => scanApi.cancel(scanId),
    onMutate: (scanId) => {
      setCancellingScanId(scanId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
    },
    onSettled: () => {
      setCancellingScanId(null);
    },
  });

  // Filter and paginate scans
  const filteredScans = historyData?.scans.filter(
    (scan) => (showFailed || scan.status !== 'failed') && (showCancelled || scan.status !== 'cancelled')
  ) || [];
  const displayedScans = filteredScans.slice(0, limit);
  const failedCount = (historyData?.scans.filter((s) => s.status === 'failed') || []).length;
  const cancelledCount = (historyData?.scans.filter((s) => s.status === 'cancelled') || []).length;

  const latestScan = historyData?.scans.find((s) => s.status === 'completed');
  const pagination = historyData?.pagination;

  const handleScanClick = (scan: Scan) => {
    if (scan.status === 'completed') {
      navigate(`/scan/${scan.id}/files`);
    } else if (scan.status === 'running') {
      // スキャン中の場合はプログレス画面に遷移
      navigate(`/scan?id=${scan.id}`);
    }
  };

  const handleCancelScan = (scanId: string) => {
    cancelMutation.mutate(scanId);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal text-[#202124]">ダッシュボード</h1>
            <p className="text-sm text-[#5f6368] mt-1">
              Google Drive のセキュリティ状況を確認
            </p>
          </div>
          <Link
            to="/scan"
            className="btn-google-primary"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            新規スキャン
          </Link>
        </div>

        {/* Risk Summary Cards */}
        {isLoading && !historyData ? (
          <div className="bg-white rounded-2xl border border-[#dadce0] p-12 flex justify-center">
            <svg className="w-8 h-8 text-[#1a73e8] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : latestScan ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RiskCard
                level="緊急"
                count={latestScan.riskySummary.critical}
                color="text-[#c5221f]"
                bgColor="bg-[#fce8e6]"
                icon={
                  <svg className="w-6 h-6 text-[#c5221f]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                }
              />
              <RiskCard
                level="高"
                count={latestScan.riskySummary.high}
                color="text-[#e37400]"
                bgColor="bg-[#fef7e0]"
                icon={
                  <svg className="w-6 h-6 text-[#e37400]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                }
              />
              <RiskCard
                level="中"
                count={latestScan.riskySummary.medium}
                color="text-[#f9ab00]"
                bgColor="bg-[#fef7e0]"
                icon={
                  <svg className="w-6 h-6 text-[#f9ab00]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                }
              />
              <RiskCard
                level="低"
                count={latestScan.riskySummary.low}
                color="text-[#137333]"
                bgColor="bg-[#e6f4ea]"
                icon={
                  <svg className="w-6 h-6 text-[#137333]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                }
              />
            </div>

            {/* Risk Distribution */}
            <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-[#202124]">リスク分布</h2>
                <span className="text-sm text-[#5f6368]">
                  {latestScan.totalFiles.toLocaleString()} ファイル
                </span>
              </div>
              <div className="h-2 bg-[#e8eaed] rounded-full overflow-hidden flex">
                {latestScan.riskySummary.critical > 0 && (
                  <div
                    className="bg-[#d93025] transition-all"
                    style={{
                      width: `${(latestScan.riskySummary.critical / latestScan.totalFiles) * 100}%`,
                    }}
                  />
                )}
                {latestScan.riskySummary.high > 0 && (
                  <div
                    className="bg-[#f9ab00] transition-all"
                    style={{
                      width: `${(latestScan.riskySummary.high / latestScan.totalFiles) * 100}%`,
                    }}
                  />
                )}
                {latestScan.riskySummary.medium > 0 && (
                  <div
                    className="bg-[#fbbc04] transition-all"
                    style={{
                      width: `${(latestScan.riskySummary.medium / latestScan.totalFiles) * 100}%`,
                    }}
                  />
                )}
                {latestScan.riskySummary.low > 0 && (
                  <div
                    className="bg-[#34a853] transition-all"
                    style={{
                      width: `${(latestScan.riskySummary.low / latestScan.totalFiles) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#d93025]"></div>
                  <span className="text-[#5f6368]">緊急</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#f9ab00]"></div>
                  <span className="text-[#5f6368]">高</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#fbbc04]"></div>
                  <span className="text-[#5f6368]">中</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#34a853]"></div>
                  <span className="text-[#5f6368]">低</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#dadce0] p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-[#f1f3f4] flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-[#9aa0a6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-[#202124] mb-2">
              まだスキャンがありません
            </h3>
            <p className="text-sm text-[#5f6368] mb-6 max-w-sm mx-auto">
              最初のスキャンを実行して、Google Drive のセキュリティ状況を確認しましょう
            </p>
            <Link
              to="/scan"
              className="btn-google-primary"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              スキャンを開始
            </Link>
          </div>
        )}

        {/* Recent Scans */}
        <div className="bg-white rounded-2xl border border-[#dadce0]">
          <div className="px-6 py-4 border-b border-[#e8eaed] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium text-[#202124]">最近のスキャン</h2>
              {failedCount > 0 && !showFailed && (
                <button
                  onClick={() => setShowFailed(true)}
                  className="text-xs px-2 py-1 rounded-full bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed] transition-colors"
                >
                  +{failedCount}件の失敗を表示
                </button>
              )}
              {showFailed && failedCount > 0 && (
                <button
                  onClick={() => setShowFailed(false)}
                  className="text-xs px-2 py-1 rounded-full bg-[#fce8e6] text-[#c5221f] hover:bg-[#f8d7da] transition-colors"
                >
                  失敗を非表示
                </button>
              )}
              {cancelledCount > 0 && !showCancelled && (
                <button
                  onClick={() => setShowCancelled(true)}
                  className="text-xs px-2 py-1 rounded-full bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed] transition-colors"
                >
                  +{cancelledCount}件のキャンセルを表示
                </button>
              )}
              {showCancelled && cancelledCount > 0 && (
                <button
                  onClick={() => setShowCancelled(false)}
                  className="text-xs px-2 py-1 rounded-full bg-[#fef7e0] text-[#b06000] hover:bg-[#fdf0c8] transition-colors"
                >
                  キャンセルを非表示
                </button>
              )}
            </div>
            <Link to="/scan" className="text-sm text-[#1a73e8] hover:text-[#174ea6] font-medium">
              すべて表示
            </Link>
          </div>
          <div className="p-2">
            {isLoading && !historyData ? (
              <div className="py-8 flex justify-center">
                <svg className="w-8 h-8 text-[#1a73e8] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                {isAuthenticationError(error) ? (
                  <>
                    <svg className="w-12 h-12 text-[#e37400] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                    </svg>
                    <p className="text-sm text-[#e37400] font-medium">セッションの有効期限が切れました</p>
                    <p className="mt-1 text-xs text-[#5f6368]">Google認証が必要です。再度ログインしてください。</p>
                    <a
                      href={authApi.getLoginUrl()}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white text-sm font-medium rounded-lg hover:bg-[#1557b0] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                      再ログイン
                    </a>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-[#d93025] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <p className="text-sm text-[#d93025]">データの取得に失敗しました</p>
                  </>
                )}
              </div>
            ) : displayedScans.length === 0 ? (
              <div className="py-8 text-center">
                <svg className="w-12 h-12 text-[#9aa0a6] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <p className="text-sm text-[#5f6368]">
                  {failedCount > 0 ? '成功したスキャンがありません' : 'スキャン履歴がありません'}
                </p>
              </div>
            ) : (
              <div className={`divide-y divide-[#e8eaed] transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
                {displayedScans.map((scan) => (
                  <ScanHistoryItem
                    key={scan.id}
                    scan={scan}
                    onClick={() => handleScanClick(scan)}
                    onCancel={() => handleCancelScan(scan.id)}
                    isCancelling={cancellingScanId === scan.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="px-6 py-3 border-t border-[#e8eaed] flex items-center justify-between">
              <p className="text-sm text-[#5f6368]">
                {offset + 1} - {Math.min(offset + (historyData?.scans.length || 0), pagination.total)} / {pagination.total}件
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={!pagination.hasMore}
                  className="px-3 py-1.5 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
