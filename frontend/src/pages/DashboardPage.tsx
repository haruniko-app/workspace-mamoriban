import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scanApi, type Scan } from '../lib/api';
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

function ScanHistoryItem({ scan, onClick }: { scan: Scan; onClick: () => void }) {
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

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-3 px-4 hover:bg-[#f1f3f4] rounded-lg transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            scan.status === 'completed'
              ? 'bg-[#e6f4ea]'
              : scan.status === 'running'
              ? 'bg-[#e8f0fe]'
              : 'bg-[#fce8e6]'
          }`}
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
          ) : (
            <svg className="w-5 h-5 text-[#d93025]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-[#202124]">
            {scan.status === 'completed'
              ? `${scan.totalFiles.toLocaleString()}件のファイルをスキャン`
              : scan.status === 'running'
              ? 'スキャン中...'
              : 'スキャン失敗'}
          </p>
          <p className="text-xs text-[#5f6368]">{formatDate(scan.startedAt)}</p>
        </div>
      </div>
      {scan.status === 'completed' && (
        <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const limit = 5;

  const {
    data: historyData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['scanHistory', offset],
    queryFn: () => scanApi.getHistory(limit, offset),
  });

  const latestScan = historyData?.scans.find((s) => s.status === 'completed');
  const pagination = historyData?.pagination;

  const handleScanClick = (scan: Scan) => {
    if (scan.status === 'completed') {
      navigate(`/scan/${scan.id}/files`);
    }
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
        {latestScan ? (
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
            <h2 className="text-base font-medium text-[#202124]">最近のスキャン</h2>
            <Link to="/scan" className="text-sm text-[#1a73e8] hover:text-[#174ea6] font-medium">
              すべて表示
            </Link>
          </div>
          <div className="p-2">
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <svg className="w-8 h-8 text-[#1a73e8] animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <svg className="w-12 h-12 text-[#d93025] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="text-sm text-[#d93025]">データの取得に失敗しました</p>
              </div>
            ) : historyData?.scans.length === 0 ? (
              <div className="py-8 text-center">
                <svg className="w-12 h-12 text-[#9aa0a6] mx-auto mb-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <p className="text-sm text-[#5f6368]">スキャン履歴がありません</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8eaed]">
                {historyData?.scans.map((scan) => (
                  <ScanHistoryItem key={scan.id} scan={scan} onClick={() => handleScanClick(scan)} />
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
