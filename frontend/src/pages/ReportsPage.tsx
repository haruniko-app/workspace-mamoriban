import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import {
  reportsApi,
  scanApi,
  type ScanHistoryReport,
  type RiskAssessmentReport,
  type RemediationHistoryReport,
  type ExternalSharingReport,
  type CurrentRisksReport,
} from '../lib/api';

type ReportType =
  | 'scan_history'
  | 'risk_assessment'
  | 'remediation_history'
  | 'external_sharing'
  | 'current_risks';

const reportInfo: Record<
  ReportType,
  { name: string; description: string; ismsRef: string; pmRef: string; needsScan: boolean }
> = {
  scan_history: {
    name: 'スキャン実施履歴レポート',
    description: '定期的なセキュリティ点検の実施を証明するレポート',
    ismsRef: 'A.8.15 ログ取得, 9.2 内部監査',
    pmRef: '9.2 内部監査',
    needsScan: false,
  },
  risk_assessment: {
    name: 'リスクアセスメントレポート',
    description: 'リスクの特定・分析・評価結果を文書化したレポート',
    ismsRef: 'A.5.9 情報資産目録, A.5.10 利用許容範囲',
    pmRef: '6.1.2 リスクアセスメント',
    needsScan: true,
  },
  remediation_history: {
    name: '是正対応履歴レポート',
    description: 'リスクへの対応措置を記録したレポート',
    ismsRef: 'A.5.18 アクセス権',
    pmRef: '9.2 内部監査（是正措置）',
    needsScan: false,
  },
  external_sharing: {
    name: '外部共有一覧レポート',
    description: '組織外への情報共有状態を把握するレポート',
    ismsRef: 'A.5.15 アクセス制御, A.5.23 クラウドサービス',
    pmRef: '-',
    needsScan: true,
  },
  current_risks: {
    name: '現在のリスク状況レポート',
    description: '現時点でのリスク状況を要約したレポート',
    ismsRef: '9.1 監視・測定・分析・評価',
    pmRef: '9.3 マネジメントレビュー',
    needsScan: false,
  },
};

export function ReportsPage() {
  const { user } = useAuth();
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [generatedReport, setGeneratedReport] = useState<
    | ScanHistoryReport
    | RiskAssessmentReport
    | RemediationHistoryReport
    | ExternalSharingReport
    | CurrentRisksReport
    | null
  >(null);

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

  // 完了済みスキャン一覧を取得
  const { data: scansData } = useQuery({
    queryKey: ['admin', 'scans'],
    queryFn: () => scanApi.admin.getAll(100),
  });

  const completedScans =
    scansData?.scans.filter((s) => s.status === 'completed') || [];

  // レポート生成
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReportType) throw new Error('レポートタイプを選択してください');

      switch (selectedReportType) {
        case 'scan_history':
          return (await reportsApi.getScanHistory(dateRange)).report;
        case 'risk_assessment':
          if (!selectedScanId) throw new Error('スキャンを選択してください');
          return (await reportsApi.getRiskAssessment(selectedScanId)).report;
        case 'remediation_history':
          return (await reportsApi.getRemediationHistory(dateRange)).report;
        case 'external_sharing':
          if (!selectedScanId) throw new Error('スキャンを選択してください');
          return (await reportsApi.getExternalSharing(selectedScanId)).report;
        case 'current_risks':
          return (await reportsApi.getCurrentRisks()).report;
        default:
          throw new Error('不正なレポートタイプ');
      }
    },
    onSuccess: (report) => {
      setGeneratedReport(report);
    },
  });

  const downloadJson = () => {
    if (!generatedReport) return;
    const blob = new Blob([JSON.stringify(generatedReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedReport.reportType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    if (!generatedReport) return;

    let csvContent = '';

    if (generatedReport.reportType === 'scan_history') {
      const report = generatedReport as ScanHistoryReport;
      csvContent = 'ID,ユーザー名,メール,開始日時,完了日時,ステータス,ファイル数,Critical,High,Medium,Low\n';
      report.scans.forEach((scan) => {
        csvContent += `${scan.id},${scan.userName},${scan.userEmail},${scan.startedAt},${scan.completedAt || ''},${scan.status},${scan.totalFiles},${scan.riskySummary.critical},${scan.riskySummary.high},${scan.riskySummary.medium},${scan.riskySummary.low}\n`;
      });
    } else if (generatedReport.reportType === 'risk_assessment') {
      const report = generatedReport as RiskAssessmentReport;
      csvContent = 'リスクレベル,ID,ファイル名,所有者,リスクスコア,リスク要因,推奨対策,リンク\n';
      [...report.criticalFiles, ...report.highFiles].forEach((file) => {
        csvContent += `${file.riskLevel},${file.id},"${file.name}",${file.ownerEmail},${file.riskScore},"${file.riskFactors.join('; ')}","${file.recommendations.join('; ')}",${file.webViewLink || ''}\n`;
      });
    } else if (generatedReport.reportType === 'remediation_history') {
      const report = generatedReport as RemediationHistoryReport;
      csvContent = 'ID,実行者,操作種別,対象名,対象種別,対象ユーザー,成功,日時\n';
      report.actions.forEach((action) => {
        csvContent += `${action.id},${action.userEmail},${action.actionType},"${action.targetName}",${action.targetType},${action.details.targetEmail || ''},${action.success},${action.createdAt}\n`;
      });
    } else if (generatedReport.reportType === 'external_sharing') {
      const report = generatedReport as ExternalSharingReport;
      csvContent = 'ID,ファイル名,所有者,リスクレベル,共有タイプ,共有先,権限,リンク\n';
      report.files.forEach((file) => {
        file.externalPermissions.forEach((perm) => {
          csvContent += `${file.id},"${file.name}",${file.ownerEmail},${file.riskLevel},${perm.type},${perm.email || perm.domain || '全員'},${perm.role},${file.webViewLink || ''}\n`;
        });
      });
    } else if (generatedReport.reportType === 'current_risks') {
      const report = generatedReport as CurrentRisksReport;
      csvContent = 'ユーザーID,ユーザー名,メール,最終スキャン,ファイル数,Critical,High,Medium,Low\n';
      report.userBreakdown.forEach((u) => {
        csvContent += `${u.userId},${u.userName},${u.userEmail},${u.lastScanAt},${u.totalFiles},${u.riskySummary.critical},${u.riskySummary.high},${u.riskySummary.medium},${u.riskySummary.low}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedReport.reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ISMS/Pマーク対応レポート</h1>
          <p className="mt-1 text-sm text-gray-500">
            監査対応用のレポートを生成・ダウンロードできます
          </p>
        </div>

        {/* レポート選択 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium">レポートを選択</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.entries(reportInfo) as [ReportType, typeof reportInfo[ReportType]][]).map(
              ([type, info]) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedReportType(type);
                    setGeneratedReport(null);
                  }}
                  className={`text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedReportType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{info.name}</div>
                  <div className="mt-1 text-sm text-gray-500">{info.description}</div>
                  <div className="mt-2 text-xs">
                    <div className="text-blue-600">ISMS: {info.ismsRef}</div>
                    {info.pmRef !== '-' && (
                      <div className="text-green-600">Pマーク: {info.pmRef}</div>
                    )}
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        {/* パラメータ入力 */}
        {selectedReportType && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-medium">パラメータ設定</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* 期間選択（履歴系レポート） */}
              {(selectedReportType === 'scan_history' ||
                selectedReportType === 'remediation_history') && (
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-700">期間:</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <span className="text-gray-500">〜</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              {/* スキャン選択 */}
              {reportInfo[selectedReportType].needsScan && (
                <div className="flex items-center gap-4">
                  <label className="text-sm text-gray-700">対象スキャン:</label>
                  <select
                    value={selectedScanId}
                    onChange={(e) => setSelectedScanId(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md min-w-[300px]"
                  >
                    <option value="">選択してください</option>
                    {completedScans.map((scan) => (
                      <option key={scan.id} value={scan.id}>
                        {formatDate(scan.completedAt || scan.startedAt)} - {scan.userName} (
                        {scan.totalFiles}ファイル)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => generateReportMutation.mutate()}
                disabled={
                  generateReportMutation.isPending ||
                  (reportInfo[selectedReportType].needsScan && !selectedScanId)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {generateReportMutation.isPending ? '生成中...' : 'レポート生成'}
              </button>

              {generateReportMutation.isError && (
                <div className="text-red-600 text-sm">
                  エラー: {(generateReportMutation.error as Error).message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 生成されたレポート */}
        {generatedReport && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium">
                  {reportInfo[generatedReport.reportType as ReportType].name}
                </h2>
                <p className="text-sm text-gray-500">
                  生成日時: {formatDate(generatedReport.generatedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadJson}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  JSON
                </button>
                <button
                  onClick={downloadCsv}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* サマリー表示 */}
            <div className="p-4">
              <h3 className="font-medium mb-3">サマリー</h3>

              {generatedReport.reportType === 'scan_history' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">総スキャン数</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as ScanHistoryReport).summary.totalScans}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">完了</div>
                    <div className="text-xl font-bold text-green-600">
                      {(generatedReport as ScanHistoryReport).summary.completedScans}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">失敗</div>
                    <div className="text-xl font-bold text-red-600">
                      {(generatedReport as ScanHistoryReport).summary.failedScans}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">スキャン済みファイル</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as ScanHistoryReport).summary.totalFilesScanned.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">実施ユーザー数</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as ScanHistoryReport).summary.uniqueUsers}
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.reportType === 'risk_assessment' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">総ファイル数</div>
                      <div className="text-xl font-bold">
                        {(generatedReport as RiskAssessmentReport).summary.totalFiles.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <div className="text-sm text-red-600">Critical</div>
                      <div className="text-xl font-bold text-red-600">
                        {(generatedReport as RiskAssessmentReport).summary.riskySummary.critical}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <div className="text-sm text-orange-600">High</div>
                      <div className="text-xl font-bold text-orange-600">
                        {(generatedReport as RiskAssessmentReport).summary.riskySummary.high}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">外部共有数</div>
                      <div className="text-xl font-bold">
                        {(generatedReport as RiskAssessmentReport).summary.externalShareCount}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    公開共有: {(generatedReport as RiskAssessmentReport).summary.publicShareCount}件
                  </div>
                </div>
              )}

              {generatedReport.reportType === 'remediation_history' && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">総アクション数</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as RemediationHistoryReport).summary.totalActions}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-sm text-green-600">成功</div>
                    <div className="text-xl font-bold text-green-600">
                      {(generatedReport as RemediationHistoryReport).summary.successfulActions}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-sm text-red-600">失敗</div>
                    <div className="text-xl font-bold text-red-600">
                      {(generatedReport as RemediationHistoryReport).summary.failedActions}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">権限削除</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as RemediationHistoryReport).summary.permissionsDeleted}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">権限変更</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as RemediationHistoryReport).summary.permissionsUpdated}
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.reportType === 'external_sharing' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-500">外部共有ファイル</div>
                    <div className="text-xl font-bold">
                      {(generatedReport as ExternalSharingReport).summary.totalExternalShares}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-sm text-red-600">公開共有</div>
                    <div className="text-xl font-bold text-red-600">
                      {(generatedReport as ExternalSharingReport).summary.publicShares}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="text-sm text-orange-600">外部ユーザー共有</div>
                    <div className="text-xl font-bold text-orange-600">
                      {(generatedReport as ExternalSharingReport).summary.externalUserShares}
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="text-sm text-yellow-600">外部ドメイン共有</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {(generatedReport as ExternalSharingReport).summary.externalDomainShares}
                    </div>
                  </div>
                </div>
              )}

              {generatedReport.reportType === 'current_risks' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">総ユーザー数</div>
                      <div className="text-xl font-bold">
                        {(generatedReport as CurrentRisksReport).summary.totalUsers}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-sm text-green-600">スキャン済み</div>
                      <div className="text-xl font-bold text-green-600">
                        {(generatedReport as CurrentRisksReport).summary.usersWithScans}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <div className="text-sm text-yellow-600">未スキャン</div>
                      <div className="text-xl font-bold text-yellow-600">
                        {(generatedReport as CurrentRisksReport).summary.usersWithoutScans}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="text-sm text-gray-500">総ファイル数</div>
                      <div className="text-xl font-bold">
                        {(generatedReport as CurrentRisksReport).summary.totalFiles.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Critical</span>
                      <span className="font-bold">
                        {(generatedReport as CurrentRisksReport).summary.riskySummary.critical}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">High</span>
                      <span className="font-bold">
                        {(generatedReport as CurrentRisksReport).summary.riskySummary.high}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Medium</span>
                      <span className="font-bold">
                        {(generatedReport as CurrentRisksReport).summary.riskySummary.medium}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Low</span>
                      <span className="font-bold">
                        {(generatedReport as CurrentRisksReport).summary.riskySummary.low}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* データプレビュー */}
            <div className="px-4 pb-4">
              <details>
                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                  JSONプレビューを表示
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded overflow-auto text-xs max-h-96">
                  {JSON.stringify(generatedReport, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {/* 審査対応チェックリスト */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-medium">審査対応チェックリスト</h2>
          </div>
          <div className="p-4 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">ISMS審査前に準備</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- 過去6ヶ月分のスキャン実施履歴レポート</li>
                <li>- 直近のリスクアセスメントレポート</li>
                <li>- 過去6ヶ月分の是正対応履歴レポート</li>
                <li>- 現在の外部共有一覧レポート</li>
                <li>- 現在のリスク状況レポート</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-green-800 mb-2">Pマーク審査前に準備</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>- 過去1年分のスキャン実施履歴レポート</li>
                <li>- 直近のリスクアセスメントレポート</li>
                <li>- 過去1年分の是正対応履歴レポート</li>
                <li>- 現在の外部共有一覧レポート</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
