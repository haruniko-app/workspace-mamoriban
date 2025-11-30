import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { scanApi, stripeApi, type Scan } from '../lib/api';
import { Layout } from '../components/Layout';

const SCAN_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 hours

function ScanProgress({ scan, onReset }: { scan: Scan; onReset: () => void }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const total =
    scan.riskySummary.critical +
    scan.riskySummary.high +
    scan.riskySummary.medium +
    scan.riskySummary.low;

  // Calculate elapsed time and check for timeout
  useEffect(() => {
    if (scan.status !== 'running') {
      setIsTimedOut(false);
      return;
    }

    const startTime = new Date(scan.startedAt).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedTime(elapsed);

      if (elapsed >= SCAN_TIMEOUT_MS) {
        setIsTimedOut(true);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [scan.status, scan.startedAt]);

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#dadce0] p-6">
      <div className="flex items-center gap-4 mb-6">
        {scan.status === 'running' && !isTimedOut ? (
          <div className="w-12 h-12 rounded-full bg-[#e8f0fe] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#1a73e8] animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : scan.status === 'running' && isTimedOut ? (
          <div className="w-12 h-12 rounded-full bg-[#fef7e0] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#e37400]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
          </div>
        ) : scan.status === 'completed' ? (
          <div className="w-12 h-12 rounded-full bg-[#e6f4ea] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#1e8e3e]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#fce8e6] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#d93025]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-[#202124]">
              {scan.status === 'running' && !isTimedOut
                ? scan.phase === 'counting'
                  ? 'ファイル数を把握中...'
                  : scan.phase === 'scanning'
                  ? 'スキャン中...'
                  : scan.phase === 'resolving'
                  ? 'フォルダ情報を取得中...'
                  : scan.phase === 'saving'
                  ? 'データを保存中...'
                  : 'スキャン中...'
                : scan.status === 'running' && isTimedOut
                ? 'スキャンがタイムアウトしました'
                : scan.status === 'completed'
                ? 'スキャン完了'
                : 'スキャン失敗'}
            </h3>
            {scan.status === 'running' && (
              <span className="text-sm text-[#5f6368] tabular-nums">
                経過時間: {formatElapsedTime(elapsedTime)}
              </span>
            )}
          </div>
          <p className="text-sm text-[#5f6368]">
            {scan.status === 'running' && !isTimedOut
              ? scan.phase === 'counting'
                ? 'Google Drive内のファイルを数えています...'
                : scan.phase === 'scanning'
                ? `${scan.processedFiles.toLocaleString()} / ${scan.totalFiles.toLocaleString()}件のファイルを処理中`
                : scan.phase === 'resolving'
                ? 'フォルダ名を取得しています...'
                : scan.phase === 'saving'
                ? 'スキャン結果をデータベースに保存しています...'
                : `${scan.processedFiles.toLocaleString()} / ${scan.totalFiles.toLocaleString()}件のファイルを処理中`
              : scan.status === 'running' && isTimedOut
              ? 'スキャンが長時間完了しませんでした。新しいスキャンを開始してください。'
              : scan.status === 'completed'
              ? `${scan.totalFiles.toLocaleString()}件のファイルをスキャンしました`
              : scan.errorMessage}
          </p>
        </div>
      </div>

      {/* Progress bar for running scan */}
      {scan.status === 'running' && !isTimedOut && (
        <div className="mb-6">
          {scan.phase === 'counting' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#5f6368]">ファイル数を把握中</span>
                <span className="text-sm font-medium text-[#1a73e8]">準備中...</span>
              </div>
              <div className="h-2 bg-[#e8eaed] rounded-full overflow-hidden">
                <div className="h-full bg-[#1a73e8] rounded-full animate-pulse w-full opacity-60" />
              </div>
              <p className="text-xs text-[#5f6368] mt-2">
                Google Drive内のファイルの全体数を把握しています...
              </p>
            </>
          ) : scan.phase === 'resolving' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#5f6368]">フォルダ情報を取得中</span>
                <span className="text-sm font-medium text-[#1a73e8]">仕上げ中...</span>
              </div>
              <div className="h-2 bg-[#e8eaed] rounded-full overflow-hidden">
                <div className="h-full bg-[#f9ab00] rounded-full animate-pulse w-full opacity-80" />
              </div>
              <p className="text-xs text-[#5f6368] mt-2">
                フォルダ名を取得してデータを整理しています...
              </p>
            </>
          ) : scan.phase === 'saving' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#5f6368]">データを保存中</span>
                <span className="text-sm font-medium text-[#34a853]">まもなく完了...</span>
              </div>
              <div className="h-2 bg-[#e8eaed] rounded-full overflow-hidden">
                <div className="h-full bg-[#34a853] rounded-full animate-pulse w-full opacity-80" />
              </div>
              <p className="text-xs text-[#5f6368] mt-2">
                スキャン結果をデータベースに保存しています...
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#5f6368]">処理中のファイル</span>
                <span className="text-sm font-medium text-[#1a73e8]">
                  {scan.processedFiles.toLocaleString()} / {scan.totalFiles.toLocaleString()}件
                </span>
              </div>
              <div className="h-2 bg-[#e8eaed] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1a73e8] rounded-full transition-all duration-500"
                  style={{
                    width: scan.totalFiles > 0
                      ? `${Math.min((scan.processedFiles / scan.totalFiles) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-[#5f6368] mt-2">
                共有設定を確認しています... ({Math.round((scan.processedFiles / scan.totalFiles) * 100)}% 完了)
              </p>
            </>
          )}
        </div>
      )}

      {/* Timeout action */}
      {scan.status === 'running' && isTimedOut && (
        <div className="mb-6">
          <button
            onClick={onReset}
            className="btn-google-secondary"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            新しいスキャンを開始
          </button>
        </div>
      )}

      {scan.status === 'completed' && (
        <>
          {/* Risk Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#fce8e6] rounded-xl p-4 text-center">
              <svg className="w-6 h-6 text-[#c5221f] mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p className="text-2xl font-medium text-[#c5221f]">
                {scan.riskySummary.critical}
              </p>
              <p className="text-xs text-[#5f6368]">緊急</p>
            </div>
            <div className="bg-[#fef7e0] rounded-xl p-4 text-center">
              <svg className="w-6 h-6 text-[#e37400] mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <p className="text-2xl font-medium text-[#e37400]">
                {scan.riskySummary.high}
              </p>
              <p className="text-xs text-[#5f6368]">高</p>
            </div>
            <div className="bg-[#fef7e0] rounded-xl p-4 text-center">
              <svg className="w-6 h-6 text-[#f9ab00] mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <p className="text-2xl font-medium text-[#f9ab00]">
                {scan.riskySummary.medium}
              </p>
              <p className="text-xs text-[#5f6368]">中</p>
            </div>
            <div className="bg-[#e6f4ea] rounded-xl p-4 text-center">
              <svg className="w-6 h-6 text-[#137333] mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <p className="text-2xl font-medium text-[#137333]">
                {scan.riskySummary.low}
              </p>
              <p className="text-xs text-[#5f6368]">低</p>
            </div>
          </div>

          {/* Summary Bar */}
          {total > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-[#5f6368]">リスク分布</p>
                <p className="text-sm text-[#5f6368]">{total} ファイル</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[#e8eaed] flex">
                {scan.riskySummary.critical > 0 && (
                  <div
                    className="bg-[#d93025]"
                    style={{
                      width: `${(scan.riskySummary.critical / total) * 100}%`,
                    }}
                  />
                )}
                {scan.riskySummary.high > 0 && (
                  <div
                    className="bg-[#f9ab00]"
                    style={{
                      width: `${(scan.riskySummary.high / total) * 100}%`,
                    }}
                  />
                )}
                {scan.riskySummary.medium > 0 && (
                  <div
                    className="bg-[#fbbc04]"
                    style={{
                      width: `${(scan.riskySummary.medium / total) * 100}%`,
                    }}
                  />
                )}
                {scan.riskySummary.low > 0 && (
                  <div
                    className="bg-[#34a853]"
                    style={{
                      width: `${(scan.riskySummary.low / total) * 100}%`,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Completion Time */}
          <div className="flex items-center gap-2 text-sm text-[#5f6368]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            完了時刻:{' '}
            {scan.completedAt
              ? new Date(scan.completedAt).toLocaleString('ja-JP')
              : '-'}
          </div>
        </>
      )}
    </div>
  );
}

export function ScanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get scanId from URL query params for browser back button support
  const currentScanId = searchParams.get('id');

  const setCurrentScanId = (scanId: string | null) => {
    if (scanId) {
      setSearchParams({ id: scanId }, { replace: false });
    } else {
      setSearchParams({}, { replace: false });
    }
  };

  // Get subscription info for plan limits
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: stripeApi.getSubscription,
  });

  // Start scan mutation
  const startScanMutation = useMutation({
    mutationFn: scanApi.start,
    onSuccess: (data) => {
      setCurrentScanId(data.scanId);
    },
  });

  // Get current scan status
  const { data: scanData } = useQuery({
    queryKey: ['scan', currentScanId],
    queryFn: () => scanApi.getById(currentScanId!),
    enabled: !!currentScanId,
    refetchInterval: (query) => {
      const scan = query.state.data?.scan;
      return scan?.status === 'running' ? 2000 : false;
    },
  });

  // Refetch scan history when scan completes
  useEffect(() => {
    if (scanData?.scan.status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ['scanHistory'] });
    }
  }, [scanData?.scan.status, queryClient]);

  const handleStartScan = () => {
    startScanMutation.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-normal text-[#202124]">スキャン</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            Google Drive の共有設定をスキャンし、リスクを検出します
          </p>
        </div>

        {/* Start Scan Button */}
        {!currentScanId && (
          <div className="bg-white rounded-2xl border border-[#dadce0] p-10 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-[#e8f0fe] flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#1a73e8]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-[#202124] mb-2">
                新規スキャンを開始
              </h2>
              <p className="text-sm text-[#5f6368] mb-4">
                Google Drive 内のファイルの共有設定をスキャンし、
                情報漏洩リスクを検出します
              </p>

              {/* Plan Limit Display */}
              {subscriptionData && (
                <div className="mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    subscriptionData.limits.canScan
                      ? 'bg-[#e6f4ea] text-[#137333]'
                      : 'bg-[#fce8e6] text-[#c5221f]'
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span className="text-sm font-medium">
                      {subscriptionData.planInfo.maxScansPerMonth === -1
                        ? 'スキャン回数: 無制限'
                        : `今月の残りスキャン: ${subscriptionData.limits.scansRemaining} / ${subscriptionData.planInfo.maxScansPerMonth}回`
                      }
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartScan}
                disabled={startScanMutation.isPending || (subscriptionData && !subscriptionData.limits.canScan)}
                className="btn-google-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startScanMutation.isPending ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    開始中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    スキャンを開始
                  </>
                )}
              </button>

              {/* Scan limit reached warning */}
              {subscriptionData && !subscriptionData.limits.canScan && (
                <div className="mt-4 p-4 bg-[#fef7e0] rounded-lg text-left">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[#e37400] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-[#202124]">今月のスキャン回数上限に達しました</p>
                      <p className="text-sm text-[#5f6368] mt-1">
                        プランをアップグレードするとより多くのスキャンが可能になります。
                      </p>
                      <button
                        onClick={() => navigate('/settings')}
                        className="mt-2 text-sm text-[#1a73e8] hover:underline"
                      >
                        プランを確認する →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {startScanMutation.isError && (
                <div className="mt-4 p-3 bg-[#fce8e6] rounded-lg">
                  <p className="text-sm text-[#c5221f]">
                    {startScanMutation.error.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Scan Progress */}
        {scanData?.scan && <ScanProgress scan={scanData.scan} onReset={() => setCurrentScanId(null)} />}

        {/* Action Buttons */}
        {scanData?.scan.status === 'completed' && (
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/scan/${currentScanId}/files`)}
              className="btn-google-primary"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
              ファイル詳細を見る
            </button>
            <button
              onClick={() => setCurrentScanId(null)}
              className="btn-google-secondary"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              新しいスキャンを開始
            </button>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-[#e8f0fe] rounded-2xl p-6">
          <div className="flex gap-4">
            <svg className="w-6 h-6 text-[#1a73e8] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-[#202124] mb-1">スキャンについて</h3>
              <p className="text-sm text-[#5f6368]">
                スキャンでは、Google Drive 内のすべてのファイルとフォルダの共有設定を確認し、
                外部公開されているファイルや、リンクを知っている全員がアクセスできるファイルを検出します。
                ファイルの内容は読み取りません。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
