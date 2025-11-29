# Workspace守り番 - Claude Code プロジェクトガイド

## プロジェクト概要

**Workspace守り番**は、Google Workspace向けのセキュリティ可視化SaaSです。
Google Driveの共有設定をスキャンし、情報漏洩リスクを「見える化」します。

### ターゲット市場
- 日本の中小企業（10-500人規模）
- セキュリティ投資未実施の企業（62.6%）
- ISMS/Pマーク取得・維持を目指す企業

### 差別化ポイント
- **価格**: 月額¥200-500（競合の1/3〜1/10）
- **日本語完全対応**: UI・サポート・レポートすべて日本語
- **ISMS/Pマーク対応**: 競合全社が未対応の独自機能
- **5分導入**: MXレコード変更不要、3クリックで開始

---

## 技術スタック

### Phase 1: MVP（現在）
- **バックエンド**: Google Apps Script
- **API**: Google Workspace APIs (Drive, Directory, Reports)
- **CLI**: clasp
- **出力**: Google スプレッドシート、Gmail、PDF

### Phase 2: スケール時
- **フロントエンド**: React + Tailwind CSS
- **バックエンド**: Cloud Run
- **決済**: Stripe
- **データベース**: なし（APIで都度取得、顧客データ非保存）

---

## プロジェクト構造

```
workspace-mamoriban/
├── apps-script/                 # Google Apps Scriptソース
│   ├── src/
│   │   ├── main.gs             # エントリーポイント
│   │   ├── services/           # API連携サービス
│   │   │   ├── DriveService.gs
│   │   │   ├── DirectoryService.gs
│   │   │   └── ReportsService.gs
│   │   ├── core/               # コアロジック
│   │   │   ├── RiskCalculator.gs
│   │   │   ├── ReportGenerator.gs
│   │   │   └── AlertManager.gs
│   │   ├── utils/              # ユーティリティ
│   │   │   ├── Logger.gs
│   │   │   ├── Config.gs
│   │   │   └── Helpers.gs
│   │   └── ui/                 # UI関連
│   │       ├── Dashboard.gs
│   │       └── Sidebar.html
│   ├── tests/
│   ├── appsscript.json
│   └── .clasp.json
├── docs/
├── scripts/
├── .github/workflows/
├── package.json
├── CLAUDE.md                   # このファイル
└── README.md
```

---

## 開発コマンド

```bash
# 依存関係インストール
npm install

# Apps Scriptにコードをプッシュ
npm run push

# 本番デプロイ
npm run deploy

# Apps Scriptエディタを開く
npm run open

# ログ確認
npm run logs

# テスト実行
npm run test

# Lint
npm run lint
```

---

## 重要な制約

### Apps Script制限
| 制限 | 値 | 対策 |
|------|-----|------|
| 実行時間 | 6分 | 分割実行、継続トリガー |
| トリガー数 | 20個/スクリプト | トリガー管理を最適化 |
| メール送信 | 100通/日 | バッチ送信、優先度付け |
| URLフェッチ | 20,000回/日 | キャッシュ活用 |

### Drive APIクォータ
- 1日あたり: 10億クエリ（通常は問題なし）
- 1ユーザーあたり: 1,000クエリ/100秒

### セキュリティ設計
- **顧客データ非保存**: APIで都度取得、表示後に破棄
- **認証**: Google OAuth（Domain-Wide Delegation）
- **権限**: 最小権限の原則

---

## コーディング規約

### 命名規則
```javascript
// 関数名: camelCase
function calculateRiskScore() {}

// クラス名: PascalCase
class DriveService {}

// 定数: UPPER_SNAKE_CASE
const MAX_EXECUTION_TIME = 330000; // 5.5分（余裕を持たせる）

// プロパティ: camelCase
const config = {
  scanIntervalHours: 24,
  alertThreshold: 80
};
```

### コメント
```javascript
/**
 * ファイルのリスクスコアを計算する
 * @param {Object} file - Driveファイルオブジェクト
 * @returns {number} リスクスコア（0-100）
 */
function calculateRiskScore(file) {
  // 共有設定によるスコア加算
  let score = 0;
  // ...
}
```

### 日本語
- ユーザー向けメッセージは**必ず日本語**
- ログ出力は英語可（デバッグ用）
- コメントは日本語可

---

## 主要機能の実装ガイド

### 1. 共有設定スキャン
```javascript
// DriveService.gs
function scanAllFiles() {
  const files = DriveApp.getFiles();
  const results = [];
  
  while (files.hasNext()) {
    const file = files.next();
    const sharing = file.getSharingAccess();
    const permission = file.getSharingPermission();
    
    results.push({
      id: file.getId(),
      name: file.getName(),
      sharingAccess: sharing.toString(),
      sharingPermission: permission.toString(),
      // ...
    });
    
    // 実行時間チェック（5.5分で停止）
    if (isTimeExceeded()) {
      saveProgress(results);
      scheduleNextRun();
      return;
    }
  }
  
  return results;
}
```

### 2. リスクスコア計算
```javascript
// RiskCalculator.gs
function calculateRiskScore(file) {
  let score = 0;
  
  // 「リンクを知っている全員」: +40点
  if (file.sharingAccess === 'ANYONE') {
    score += 40;
  }
  
  // 外部共有: +20点
  if (hasExternalSharing(file)) {
    score += 20;
  }
  
  // 外部編集権限: +15点
  if (hasExternalEditor(file)) {
    score += 15;
  }
  
  // 機密ファイルタイプ: +15点
  if (isConfidentialType(file.mimeType)) {
    score += 15;
  }
  
  // 1年以上アクセスなし: +10点
  if (getDaysSinceAccess(file) > 365) {
    score += 10;
  }
  
  return Math.min(score, 100);
}
```

### 3. アラート送信
```javascript
// AlertManager.gs
function sendCriticalAlert(files) {
  const recipient = getAdminEmail();
  const subject = '【緊急】高リスク共有設定が検出されました - Workspace守り番';
  
  const body = `
以下のファイルで高リスクな共有設定が検出されました。

${files.map(f => `
• ${f.name}
  リスクスコア: ${f.riskScore}点
  問題: ${f.issues.join(', ')}
  対応: ${f.recommendation}
`).join('\n')}

詳細はダッシュボードをご確認ください。
  `;
  
  GmailApp.sendEmail(recipient, subject, body);
}
```

---

## テスト方法

### ユニットテスト
```javascript
// tests/RiskCalculator.test.gs
function testRiskScoreAnyoneAccess() {
  const file = {
    sharingAccess: 'ANYONE',
    sharingPermission: 'VIEW'
  };
  
  const score = calculateRiskScore(file);
  
  assertEquals(score >= 40, true, 'ANYONE共有は40点以上');
}

function testRiskScorePrivate() {
  const file = {
    sharingAccess: 'PRIVATE',
    sharingPermission: 'NONE'
  };
  
  const score = calculateRiskScore(file);
  
  assertEquals(score, 0, 'PRIVATE共有は0点');
}
```

### テスト実行
```bash
npm run test
# または
cd apps-script && clasp run testAll
```

---

## デプロイ手順

### 開発環境
```bash
# 1. コードをプッシュ
npm run push

# 2. デプロイ
cd apps-script
clasp deploy -d "Dev $(date +%Y%m%d-%H%M%S)"
```

### 本番環境
```bash
# 1. mainブランチにマージ
git checkout main
git merge develop

# 2. リリースタグ作成
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# 3. GitHub Actionsが自動デプロイ
```

---

## トラブルシューティング

### よくあるエラー

#### 「認証エラー」
```bash
# clasp再認証
clasp login --creds creds.json
```

#### 「実行時間超過」
```javascript
// 5.5分で自動停止し、継続トリガーを設定
if (Date.now() - startTime > 330000) {
  saveProgress();
  createContinueTrigger();
  return;
}
```

#### 「APIクォータ超過」
```javascript
// 指数バックオフでリトライ
function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return fn();
    } catch (e) {
      if (e.message.includes('quota')) {
        Utilities.sleep(Math.pow(2, i) * 1000);
      } else {
        throw e;
      }
    }
  }
}
```

---

## セキュリティ考慮事項

### データ取り扱い
- ✅ ファイルメタデータのみ取得（内容は取得しない）
- ✅ 取得データは表示後に破棄
- ✅ 顧客データをサーバーに保存しない
- ✅ レポートは顧客のGoogle Driveに保存

### 認証・認可
- ✅ OAuth 2.0使用
- ✅ 最小権限の原則
- ✅ Domain-Wide Delegation（B2B向け）

### 免責事項
- 「可視化ツール」であり「防御ツール」ではない
- セキュリティインシデントの責任は負わない
- 利用規約で明確化

---

## 連絡先

- **リポジトリ**: https://github.com/haruniko-app/workspace-mamoriban
- **Issue**: https://github.com/haruniko-app/workspace-mamoriban/issues

---

**最終更新**: 2025年11月29日
