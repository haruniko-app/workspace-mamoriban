# 🛡️ Workspace守り番

> Google Workspace向けセキュリティ可視化SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-brightgreen)](https://developers.google.com/apps-script)

## 📋 概要

**Workspace守り番**は、Google Driveの共有設定を可視化し、情報漏洩リスクを「見える化」するツールです。

### 主な機能

- 🔍 **共有設定スキャン** - 全Driveファイルの共有設定を自動検出
- 📊 **リスクスコア表示** - 0-100点でリスクを数値化
- 📧 **アラート通知** - 高リスク設定を検出時に即座に通知
- 📄 **ISMS/Pマーク対応** - 監査用レポートをPDFで出力

### こんな課題を解決します

- 「リンクを知っている全員が閲覧可能」設定の放置
- 退職者への共有が残ったまま
- 外部共有の全体像が把握できない
- ISMS監査のための証跡収集が大変

## 🚀 クイックスタート

### 前提条件

- Node.js 18以上
- Google Workspaceアカウント
- clasp (Google Apps Script CLI)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/haruniko-app/workspace-mamoriban.git
cd workspace-mamoriban

# セットアップ実行
npm run setup

# Google認証
clasp login

# Apps Scriptプロジェクト作成
cd apps-script
clasp create --type standalone --title "Workspace守り番"

# コードをプッシュ
npm run push

# ブラウザでApps Scriptを開く
npm run open
```

## 📁 プロジェクト構成

```
workspace-mamoriban/
├── apps-script/           # Google Apps Scriptソース
│   ├── src/
│   │   ├── main.gs       # メインエントリーポイント
│   │   ├── services/     # API連携サービス
│   │   ├── core/         # コアロジック
│   │   ├── utils/        # ユーティリティ
│   │   └── ui/           # UI関連
│   └── tests/            # テスト
├── docs/                  # ドキュメント
├── scripts/               # スクリプト
└── .github/workflows/     # CI/CD
```

## 🔧 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run setup` | 開発環境セットアップ |
| `npm run push` | コードをApps Scriptにプッシュ |
| `npm run deploy` | 本番デプロイ |
| `npm run open` | Apps Scriptエディタを開く |
| `npm run logs` | ログを表示 |
| `npm run test` | テスト実行 |

## 📊 リスクスコア計算

| 条件 | スコア |
|------|--------|
| 「リンクを知っている全員」が閲覧可能 | +40点 |
| 「リンクを知っている人」が閲覧可能 | +35点 |
| 外部ユーザーに編集権限 | +20点 |
| 外部ユーザーに閲覧権限 | +10点 |
| 機密性の高いファイル形式 | +15点 |
| 1年以上更新なし | +10点 |

### リスクレベル

- 🔴 **Critical (80-100)**: 即座に対応が必要
- 🟠 **High (60-79)**: 早急に確認が必要
- 🟡 **Medium (40-59)**: 定期的な確認を推奨
- 🟢 **Low (0-39)**: 問題なし

## 🔐 セキュリティ

- ファイル内容は取得しません（メタデータのみ）
- 取得データはサーバーに保存しません
- OAuth 2.0による安全な認証
- 最小権限の原則に基づく設計

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください。

## 🤝 コントリビューション

バグ報告、機能リクエスト、プルリクエストを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

- [GitHub Issues](https://github.com/haruniko-app/workspace-mamoriban/issues) - バグ報告・機能リクエスト

---

**Workspace守り番** - Google Workspaceをもっと安全に 🛡️
