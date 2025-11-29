# Workspace守り番 開発計画書

**プロジェクト名**: Workspace守り番（GWS Shield）  
**リポジトリ**: https://github.com/haruniko-app/workspace-mamoriban  
**開発環境**: Claude Code  
**作成日**: 2025年11月

---

## 1. プロジェクト概要

### 1.1 製品ビジョン
Google Driveの共有設定を可視化し、情報漏洩リスクを「見える化」する月額200円〜のセキュリティツール

### 1.2 ターゲット市場
- 日本の中小企業（10-500人規模）
- セキュリティ投資未実施の62.6%の企業層
- ISMS/Pマーク取得・維持を目指す企業

### 1.3 差別化ポイント
| 要素 | 競合 | 当社 |
|------|------|------|
| 価格 | $3-25/月 | ¥200-500/月 |
| 日本語対応 | 限定的 | 完全対応 |
| ISMS/Pマーク | 未対応 | 専用レポート |
| 導入時間 | 数時間〜週 | 5分 |
| 最小契約 | 50-500人〜 | 1人〜 |

---

## 2. 技術アーキテクチャ

### 2.1 Phase 1: MVP（Apps Script単独）

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Workspace APIs                     │
├──────────────────┬──────────────────┬───────────────────────┤
│  Directory API   │    Drive API     │    Reports API        │
│  (ユーザー一覧)   │  (共有設定取得)   │   (監査ログ)          │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Apps Script                         │
├─────────────────────────────────────────────────────────────┤
│  ├── src/                                                    │
│  │   ├── main.gs           # エントリーポイント              │
│  │   ├── DriveScanner.gs   # Drive共有設定スキャン           │
│  │   ├── RiskCalculator.gs # リスクスコア計算                │
│  │   ├── ReportGenerator.gs# レポート生成                    │
│  │   ├── AlertSender.gs    # アラート送信                    │
│  │   └── Config.gs         # 設定管理                        │
│  └── tests/                                                  │
│      └── *.test.gs         # テストファイル                  │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                        出力先                                │
├──────────────────┬──────────────────┬───────────────────────┤
│   スプレッドシート  │      Gmail       │        PDF           │
│  (ダッシュボード)   │  (アラート送信)   │   (監査レポート)      │
└──────────────────┴──────────────────┴───────────────────────┘
```

### 2.2 Phase 2: スケール時（Cloud Run追加）

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Run                               │
├─────────────────────────────────────────────────────────────┤
│  ├── Webダッシュボード (React)                               │
│  ├── Stripe決済連携                                          │
│  ├── マルチテナント管理                                       │
│  └── API Gateway                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. リポジトリ構成

```
workspace-mamoriban/
├── .github/
│   ├── workflows/
│   │   ├── deploy-dev.yml      # 開発環境デプロイ
│   │   ├── deploy-prod.yml     # 本番環境デプロイ
│   │   └── test.yml            # テスト実行
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── apps-script/                 # Google Apps Scriptソース
│   ├── src/
│   │   ├── main.gs
│   │   ├── services/
│   │   │   ├── DriveService.gs
│   │   │   ├── DirectoryService.gs
│   │   │   └── ReportsService.gs
│   │   ├── core/
│   │   │   ├── RiskCalculator.gs
│   │   │   ├── ReportGenerator.gs
│   │   │   └── AlertManager.gs
│   │   ├── utils/
│   │   │   ├── Logger.gs
│   │   │   ├── Config.gs
│   │   │   └── Helpers.gs
│   │   └── ui/
│   │       ├── Dashboard.gs
│   │       └── Sidebar.html
│   ├── tests/
│   │   ├── DriveService.test.gs
│   │   └── RiskCalculator.test.gs
│   ├── appsscript.json
│   └── .clasp.json
│
├── web-dashboard/               # Phase 2: Webダッシュボード
│   ├── src/
│   ├── public/
│   └── package.json
│
├── cloud-functions/             # Phase 2: Cloud Functions
│   ├── src/
│   └── package.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── USER_GUIDE.md
│
├── scripts/
│   ├── setup.sh                # 開発環境セットアップ
│   ├── deploy.sh               # デプロイスクリプト
│   └── test.sh                 # テスト実行
│
├── .env.example
├── .gitignore
├── README.md
├── CLAUDE.md                   # Claude Code用プロジェクト説明
└── LICENSE
```

---

## 4. 開発フェーズ詳細

### Phase 1: MVP開発（3ヶ月）

#### Month 1: 基盤構築・技術検証

| 週 | タスク | 成果物 | 優先度 |
|----|--------|--------|--------|
| W1 | 開発環境構築 | リポジトリ、clasp設定、CI/CD | ★★★ |
| W2 | API接続検証 | Drive API、Directory API動作確認 | ★★★ |
| W3 | 共有設定取得実装 | DriveService基本機能 | ★★★ |
| W4 | バッチ処理実装 | 6分制限対応の分割実行 | ★★★ |

#### Month 2: コア機能開発

| 週 | タスク | 成果物 | 優先度 |
|----|--------|--------|--------|
| W5 | リスクスコア計算 | RiskCalculator実装 | ★★★ |
| W6 | ダッシュボード作成 | スプレッドシートUI | ★★★ |
| W7 | アラート機能 | メール通知実装 | ★★☆ |
| W8 | 週次レポート | 自動レポート生成 | ★★☆ |

#### Month 3: β版準備・公開

| 週 | タスク | 成果物 | 優先度 |
|----|--------|--------|--------|
| W9 | ISMS対応レポート | PDFエクスポート機能 | ★★☆ |
| W10 | UI/UX改善 | 日本語表示最適化 | ★★☆ |
| W11 | β版テスト | 10社限定テスト開始 | ★★★ |
| W12 | フィードバック反映 | バグ修正・改善 | ★★★ |

### Phase 2: 市場投入（3ヶ月）

| 月 | マイルストーン | 成果物 |
|----|--------------|--------|
| Month 4 | Marketplace公開 | 正式リリース、有料プラン開始 |
| Month 5 | マーケティング開始 | SEO記事10本、LP公開 |
| Month 6 | 有料顧客獲得 | 初課金顧客50社目標 |

### Phase 3: グロース（6ヶ月）

| 月 | マイルストーン | 成果物 |
|----|--------------|--------|
| Month 7-9 | 100社達成 | Pマークレポート追加、Webダッシュボード |
| Month 10-12 | 月商100万円 | Cloud Run移行、自動課金システム |

---

## 5. 機能仕様

### 5.1 MVP機能一覧

| # | 機能 | 説明 | 優先度 | 工数 |
|---|------|------|--------|------|
| F01 | 共有設定スキャン | 全Driveファイルの共有設定を取得 | ★★★ | 2週間 |
| F02 | リスクスコア表示 | 0-100点でリスクを数値化 | ★★★ | 1週間 |
| F03 | ダッシュボード | スプレッドシートで一覧表示 | ★★★ | 1週間 |
| F04 | 週次レポート | 自動でメール配信 | ★★☆ | 1週間 |
| F05 | 危険共有アラート | 「リンクを知っている全員」検知 | ★★★ | 1週間 |
| F06 | 外部共有一覧 | 外部ドメインへの共有を一覧化 | ★★☆ | 3日 |
| F07 | ISMS監査レポート | PDF形式でエクスポート | ★★☆ | 1週間 |
| F08 | 改善提案表示 | リスク軽減のアクション提示 | ★☆☆ | 3日 |

### 5.2 リスクスコア計算ロジック

```javascript
// リスクスコア計算（0-100点、高いほど危険）
function calculateRiskScore(file) {
  let score = 0;
  
  // 共有設定によるスコア
  if (file.sharingAccess === 'anyone') {
    score += 40;  // 「リンクを知っている全員」
  } else if (file.sharingAccess === 'anyoneWithLink') {
    score += 35;  // リンクを知っている人
  } else if (file.sharingAccess === 'domain') {
    score += 10;  // ドメイン内
  }
  
  // 外部共有によるスコア
  if (file.hasExternalSharing) {
    score += 20;
  }
  
  // ファイルタイプによるスコア
  if (isConfidentialType(file.mimeType)) {
    score += 15;  // 機密性の高いファイル形式
  }
  
  // 最終アクセスからの経過日数
  const daysSinceAccess = getDaysSince(file.lastAccessed);
  if (daysSinceAccess > 365) {
    score += 10;  // 1年以上アクセスなし
  } else if (daysSinceAccess > 180) {
    score += 5;   // 半年以上アクセスなし
  }
  
  // 編集権限の付与
  if (file.hasExternalEditor) {
    score += 15;  // 外部者に編集権限
  }
  
  return Math.min(score, 100);
}
```

### 5.3 アラート条件

| アラートレベル | 条件 | 通知タイミング |
|--------------|------|--------------|
| 🔴 Critical | リスクスコア 80以上 | 即時 |
| 🟠 High | リスクスコア 60-79 | 日次サマリー |
| 🟡 Medium | リスクスコア 40-59 | 週次レポート |
| 🟢 Low | リスクスコア 0-39 | 月次レポート |

---

## 6. 開発環境構築

### 6.1 必要ツール

```bash
# Node.js (clasp用)
node --version  # v18以上推奨

# clasp (Google Apps Script CLI)
npm install -g @google/clasp

# TypeScript (オプション)
npm install -g typescript
```

### 6.2 初期セットアップスクリプト

```bash
#!/bin/bash
# scripts/setup.sh

echo "=== Workspace守り番 開発環境セットアップ ==="

# 1. リポジトリクローン
git clone https://github.com/haruniko-app/workspace-mamoriban.git
cd workspace-mamoriban

# 2. Node.js依存関係インストール
npm install

# 3. clasp認証
echo "Google認証を行います..."
clasp login

# 4. Apps Scriptプロジェクト作成
cd apps-script
clasp create --type standalone --title "Workspace守り番"

# 5. 設定ファイル確認
echo "セットアップ完了！"
echo ".clasp.json が生成されました"
echo "次のコマンドでデプロイできます: npm run deploy"
```

### 6.3 package.json

```json
{
  "name": "workspace-mamoriban",
  "version": "0.1.0",
  "description": "Google Workspace向けセキュリティ可視化ツール",
  "scripts": {
    "setup": "bash scripts/setup.sh",
    "push": "cd apps-script && clasp push",
    "pull": "cd apps-script && clasp pull",
    "deploy": "cd apps-script && clasp push && clasp deploy",
    "open": "cd apps-script && clasp open",
    "logs": "cd apps-script && clasp logs",
    "test": "bash scripts/test.sh",
    "lint": "eslint apps-script/src/**/*.gs"
  },
  "devDependencies": {
    "@google/clasp": "^2.4.2",
    "@types/google-apps-script": "^1.0.70",
    "eslint": "^8.0.0"
  }
}
```

### 6.4 CLAUDE.md（Claude Code用）

```markdown
# Workspace守り番 - Claude Code プロジェクトガイド

## プロジェクト概要
Google Workspace向けのセキュリティ可視化SaaS。
Google Driveの共有設定をスキャンし、情報漏洩リスクを可視化する。

## 技術スタック
- Google Apps Script
- Google Workspace APIs (Drive, Directory, Reports)
- clasp (CLI)

## 開発コマンド
```bash
npm run push    # コードをApps Scriptにプッシュ
npm run deploy  # 本番デプロイ
npm run logs    # ログ確認
npm run test    # テスト実行
```

## コーディング規約
- 関数名: camelCase
- クラス名: PascalCase
- 定数: UPPER_SNAKE_CASE
- コメント: 日本語可（ユーザー向けメッセージは必ず日本語）

## 重要な制約
- Apps Script実行時間制限: 6分
- Drive APIクォータ: 1日あたり1億リクエスト
- トリガー制限: スクリプトあたり20個

## ファイル構成
- `apps-script/src/main.gs` - エントリーポイント
- `apps-script/src/services/` - API連携サービス
- `apps-script/src/core/` - コアロジック
- `apps-script/src/utils/` - ユーティリティ

## テスト
Apps Scriptのテストは `apps-script/tests/` に配置。
実行: `npm run test`
```

---

## 7. GitHub Actions ワークフロー

### 7.1 テスト実行 (.github/workflows/test.yml)

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint check
        run: npm run lint
      
      - name: Run tests
        run: npm run test
```

### 7.2 開発環境デプロイ (.github/workflows/deploy-dev.yml)

```yaml
name: Deploy to Development

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup clasp
        run: |
          echo '${{ secrets.CLASP_CREDENTIALS }}' > ~/.clasprc.json
          cd apps-script
          echo '${{ secrets.CLASP_CONFIG_DEV }}' > .clasp.json
      
      - name: Push to Apps Script
        run: npm run push
      
      - name: Deploy
        run: cd apps-script && clasp deploy -d "Dev deployment $(date +%Y%m%d-%H%M%S)"
```

### 7.3 本番環境デプロイ (.github/workflows/deploy-prod.yml)

```yaml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup clasp
        run: |
          echo '${{ secrets.CLASP_CREDENTIALS }}' > ~/.clasprc.json
          cd apps-script
          echo '${{ secrets.CLASP_CONFIG_PROD }}' > .clasp.json
      
      - name: Push to Apps Script
        run: npm run push
      
      - name: Deploy with version tag
        run: |
          cd apps-script
          clasp deploy -d "Release ${{ github.event.release.tag_name }}"
```

---

## 8. 開発マイルストーン

### Milestone 1: 環境構築完了（Week 1）
- [ ] GitHubリポジトリ作成
- [ ] clasp設定完了
- [ ] CI/CD パイプライン構築
- [ ] 開発用Google Workspaceアカウント準備

### Milestone 2: API接続確認（Week 2）
- [ ] Drive API接続テスト
- [ ] Directory API接続テスト
- [ ] Reports API接続テスト
- [ ] OAuth認証フロー確認

### Milestone 3: 共有設定スキャン実装（Week 3-4）
- [ ] 全ファイルの共有設定取得
- [ ] 6分制限対応の分割処理
- [ ] エラーハンドリング
- [ ] ログ出力

### Milestone 4: リスクスコア・ダッシュボード（Week 5-6）
- [ ] リスクスコア計算ロジック
- [ ] スプレッドシートダッシュボード
- [ ] グラフ・チャート表示
- [ ] フィルター機能

### Milestone 5: アラート・レポート（Week 7-8）
- [ ] 危険共有アラート（メール）
- [ ] 週次レポート自動送信
- [ ] ISMS監査用PDFレポート

### Milestone 6: β版公開（Week 9-12）
- [ ] β版テスター募集
- [ ] 10社限定テスト
- [ ] フィードバック収集
- [ ] バグ修正・改善

---

## 9. KPI・成功指標

### Phase 1 完了時（3ヶ月後）
| 指標 | 目標値 |
|------|--------|
| β版テスト企業数 | 10社 |
| スキャン対象ファイル数 | 10万ファイル以上 |
| 重大バグ | 0件 |
| NPS（β版ユーザー） | 30以上 |

### Phase 2 完了時（6ヶ月後）
| 指標 | 目標値 |
|------|--------|
| 有料顧客数 | 50社 |
| MRR | 50万円 |
| 解約率 | 5%以下 |
| サポート対応時間 | 24時間以内 |

### Phase 3 完了時（12ヶ月後）
| 指標 | 目標値 |
|------|--------|
| 有料顧客数 | 300社 |
| MRR | 100万円 |
| LTV | 10,000円以上 |
| CAC | 3,000円以下 |

---

## 10. リスク管理

| リスク | 確率 | 影響 | 対策 |
|--------|------|------|------|
| Apps Script 6分制限 | 高 | 中 | 分割実行、継続トリガー |
| Drive APIクォータ超過 | 中 | 高 | キャッシュ活用、バッチ処理 |
| Google API仕様変更 | 低 | 高 | 変更通知監視、早期対応 |
| Marketplace審査リジェクト | 低 | 高 | ガイドライン遵守 |
| セキュリティ脆弱性 | 低 | 致命的 | 顧客データ非保存設計 |

---

## 11. 次のアクション

### 今すぐ実行（Week 1）

1. **GitHubリポジトリ作成**
   ```bash
   # https://github.com/haruniko-app/workspace-mamoriban を作成
   git clone https://github.com/haruniko-app/workspace-mamoriban.git
   cd workspace-mamoriban
   ```

2. **プロジェクト構造作成**
   ```bash
   mkdir -p apps-script/src/{services,core,utils,ui}
   mkdir -p apps-script/tests
   mkdir -p docs scripts .github/workflows
   ```

3. **clasp初期設定**
   ```bash
   npm install -g @google/clasp
   clasp login
   cd apps-script
   clasp create --type standalone --title "Workspace守り番-dev"
   ```

4. **初期コミット**
   ```bash
   git add .
   git commit -m "Initial project structure"
   git push origin main
   ```

---

**作成者**: Claude Code  
**最終更新**: 2025年11月29日
