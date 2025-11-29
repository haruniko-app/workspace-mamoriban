import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Calendar, Target, Rocket, Users, Shield } from 'lucide-react';

const phaseData = [
  {
    id: 'phase1',
    name: 'Phase 1: MVP開発',
    duration: '3ヶ月',
    status: 'current',
    icon: <Rocket className="w-5 h-5" />,
    color: 'blue',
    milestones: [
      {
        id: 'm1',
        name: 'Month 1: 基盤構築・技術検証',
        tasks: [
          { name: 'GitHubリポジトリ作成', status: 'pending', week: 1 },
          { name: 'clasp設定・CI/CD構築', status: 'pending', week: 1 },
          { name: 'Drive API接続検証', status: 'pending', week: 2 },
          { name: 'Directory API接続検証', status: 'pending', week: 2 },
          { name: '共有設定取得実装', status: 'pending', week: 3 },
          { name: '6分制限対応バッチ処理', status: 'pending', week: 4 },
        ]
      },
      {
        id: 'm2',
        name: 'Month 2: コア機能開発',
        tasks: [
          { name: 'リスクスコア計算ロジック', status: 'pending', week: 5 },
          { name: 'スプレッドシートダッシュボード', status: 'pending', week: 6 },
          { name: 'メールアラート機能', status: 'pending', week: 7 },
          { name: '週次レポート自動生成', status: 'pending', week: 8 },
        ]
      },
      {
        id: 'm3',
        name: 'Month 3: β版準備・公開',
        tasks: [
          { name: 'ISMS対応PDFレポート', status: 'pending', week: 9 },
          { name: 'UI/UX改善・日本語最適化', status: 'pending', week: 10 },
          { name: '10社限定βテスト開始', status: 'pending', week: 11 },
          { name: 'フィードバック反映・バグ修正', status: 'pending', week: 12 },
        ]
      }
    ]
  },
  {
    id: 'phase2',
    name: 'Phase 2: 市場投入',
    duration: '3ヶ月',
    status: 'upcoming',
    icon: <Target className="w-5 h-5" />,
    color: 'green',
    milestones: [
      {
        id: 'm4',
        name: 'Month 4: Marketplace公開',
        tasks: [
          { name: 'Google Marketplace申請', status: 'pending' },
          { name: '正式リリース', status: 'pending' },
          { name: '有料プラン開始', status: 'pending' },
        ]
      },
      {
        id: 'm5',
        name: 'Month 5: マーケティング開始',
        tasks: [
          { name: 'SEO記事10本公開', status: 'pending' },
          { name: 'ランディングページ公開', status: 'pending' },
          { name: 'Qiita/Zenn技術記事', status: 'pending' },
        ]
      },
      {
        id: 'm6',
        name: 'Month 6: 有料顧客獲得',
        tasks: [
          { name: '有料顧客50社達成', status: 'pending' },
          { name: 'サポートプロセス確立', status: 'pending' },
          { name: 'FAQ・ドキュメント充実', status: 'pending' },
        ]
      }
    ]
  },
  {
    id: 'phase3',
    name: 'Phase 3: グロース',
    duration: '6ヶ月',
    status: 'upcoming',
    icon: <Users className="w-5 h-5" />,
    color: 'purple',
    milestones: [
      {
        id: 'm7',
        name: 'Month 7-9: 100社達成',
        tasks: [
          { name: 'Pマークレポート機能追加', status: 'pending' },
          { name: 'Webダッシュボード開発', status: 'pending' },
          { name: '事例記事公開', status: 'pending' },
        ]
      },
      {
        id: 'm8',
        name: 'Month 10-12: 月商100万円',
        tasks: [
          { name: 'Cloud Run移行', status: 'pending' },
          { name: 'Stripe決済自動化', status: 'pending' },
          { name: '300社達成', status: 'pending' },
        ]
      }
    ]
  }
];

const kpis = [
  { label: 'βテスト企業', target: '10社', phase: 1, icon: <Shield className="w-4 h-4" /> },
  { label: '有料顧客', target: '50社', phase: 2, icon: <Users className="w-4 h-4" /> },
  { label: 'MRR', target: '50万円', phase: 2, icon: <Target className="w-4 h-4" /> },
  { label: '有料顧客', target: '300社', phase: 3, icon: <Users className="w-4 h-4" /> },
  { label: 'MRR', target: '100万円', phase: 3, icon: <Rocket className="w-4 h-4" /> },
];

export default function DevelopmentRoadmap() {
  const [expandedPhases, setExpandedPhases] = useState(['phase1']);
  const [expandedMilestones, setExpandedMilestones] = useState(['m1']);

  const togglePhase = (phaseId) => {
    setExpandedPhases(prev => 
      prev.includes(phaseId) 
        ? prev.filter(id => id !== phaseId)
        : [...prev, phaseId]
    );
  };

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => 
      prev.includes(milestoneId) 
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-gray-300" />;
    }
  };

  const getPhaseColor = (color, status) => {
    if (status === 'current') {
      return {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500'
      }[color];
    }
    return 'bg-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm mb-4">
            <Shield className="w-4 h-4" />
            Workspace守り番
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            開発ロードマップ
          </h1>
          <p className="text-gray-600">
            Google Workspace向けセキュリティ可視化SaaS
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                {kpi.icon}
                <span>Phase {kpi.phase}</span>
              </div>
              <div className="font-semibold text-gray-800">{kpi.target}</div>
              <div className="text-xs text-gray-500">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {phaseData.map((phase, phaseIndex) => (
            <div key={phase.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getPhaseColor(phase.color, phase.status)} flex items-center justify-center text-white`}>
                    {phase.icon}
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-gray-800">{phase.name}</h2>
                    <p className="text-sm text-gray-500">{phase.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {phase.status === 'current' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      進行中
                    </span>
                  )}
                  {expandedPhases.includes(phase.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Phase Content */}
              {expandedPhases.includes(phase.id) && (
                <div className="px-4 pb-4">
                  <div className="ml-5 border-l-2 border-gray-200 pl-6 space-y-4">
                    {phase.milestones.map((milestone) => (
                      <div key={milestone.id}>
                        {/* Milestone Header */}
                        <button
                          onClick={() => toggleMilestone(milestone.id)}
                          className="flex items-center gap-2 text-left w-full hover:text-blue-600 transition-colors"
                        >
                          <div className="w-3 h-3 rounded-full bg-gray-300 -ml-7.5 relative">
                            <div className="absolute w-3 h-3 rounded-full bg-gray-300 -left-0.5"></div>
                          </div>
                          {expandedMilestones.includes(milestone.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-700">{milestone.name}</span>
                        </button>

                        {/* Tasks */}
                        {expandedMilestones.includes(milestone.id) && (
                          <div className="ml-6 mt-2 space-y-2">
                            {milestone.tasks.map((task, taskIndex) => (
                              <div 
                                key={taskIndex}
                                className="flex items-center gap-2 text-sm text-gray-600 py-1"
                              >
                                {getStatusIcon(task.status)}
                                <span>{task.name}</span>
                                {task.week && (
                                  <span className="text-xs text-gray-400 ml-auto">
                                    Week {task.week}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            技術スタック
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">📜</div>
              <div className="text-sm font-medium">Apps Script</div>
              <div className="text-xs text-gray-500">バックエンド</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">📁</div>
              <div className="text-sm font-medium">Drive API</div>
              <div className="text-xs text-gray-500">共有設定取得</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium">Sheets</div>
              <div className="text-xs text-gray-500">ダッシュボード</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-1">🔧</div>
              <div className="text-sm font-medium">clasp</div>
              <div className="text-xs text-gray-500">CLI/デプロイ</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>GitHub: <a href="https://github.com/haruniko-app/workspace-mamoriban" className="text-blue-600 hover:underline">haruniko-app/workspace-mamoriban</a></p>
          <p className="mt-1">Claude Codeで開発</p>
        </div>
      </div>
    </div>
  );
}
