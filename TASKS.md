# Workspace守り番 開発タスク一覧

**最終更新**: 2025年11月29日
**アーキテクチャ**: GCP + Cloud Run（本番環境対応）

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend** | Node.js (Express) |
| **認証** | Google OAuth 2.0 + Service Account |
| **ホスティング** | Cloud Run |
| **シークレット管理** | Secret Manager |
| **決済** | Stripe |
| **CI/CD** | GitHub Actions + Cloud Build |

---

## GCP環境情報

| 項目 | 値 |
|------|-----|
| プロジェクトID | `workspace-mamoriban` |
| リージョン | `asia-northeast1` |
| Artifact Registry | `asia-northeast1-docker.pkg.dev/workspace-mamoriban/workspace-mamoriban` |
| サービスアカウント | `github-actions@workspace-mamoriban.iam.gserviceaccount.com` |

---

## 進捗サマリー

| マイルストーン | 状態 | 進捗 |
|--------------|------|------|
| Milestone 1: 環境構築完了 | ✅ 完了 | 8/8 |
| Milestone 2: GCP環境構築 | ✅ 完了 | 6/6 |
| Milestone 3: バックエンドAPI開発 | 🔄 進行中 | 1/5 |
| Milestone 4: フロントエンド開発 | 🔄 進行中 | 1/5 |
| Milestone 5: 認証・決済連携 | ⏳ 未着手 | 0/4 |
| Milestone 6: テスト・デプロイ | ⏳ 未着手 | 0/5 |

---

## Milestone 1: 環境構築完了 (Week 1) ✅

- [x] GitHubリポジトリ作成 (https://github.com/haruniko-app/workspace-mamoriban)
- [x] 初期コミット・プッシュ
- [x] GCP + Cloud Run アーキテクチャ設計
- [x] gcloud CLI インストール (v548.0.0)
- [x] プロジェクト構造作成
  - [x] `backend/` ディレクトリ（Node.js API）
  - [x] `frontend/` ディレクトリ（React）
  - [x] `.github/workflows/` ディレクトリ
- [x] package.json (npm workspaces対応)
- [x] .gitignore作成
- [x] .env.example作成

---

## Milestone 2: GCP環境構築 (Week 1-2) ✅

- [x] Google Cloud プロジェクト作成
  - [x] プロジェクトID: `workspace-mamoriban`
  - [x] 課金アカウント設定
- [x] APIs有効化
  - [x] Cloud Run API
  - [x] Cloud Build API
  - [x] Artifact Registry API
  - [x] Secret Manager API
  - [x] Drive API
  - [x] Admin SDK (Directory API)
- [x] Artifact Registry作成
  - [x] リージョン: asia-northeast1
- [x] サービスアカウント設定
  - [x] `github-actions` サービスアカウント作成
  - [x] IAMロール付与 (run.admin, artifactregistry.writer, iam.serviceAccountUser)
- [x] GitHub Secrets設定
  - [x] GCP_PROJECT_ID
  - [x] GCP_SA_KEY
- [ ] OAuth同意画面設定（次のステップ）
  - [ ] 同意画面作成
  - [ ] スコープ設定
  - [ ] テストユーザー追加

---

## Milestone 3: バックエンドAPI開発 (Week 2-3)

- [x] プロジェクト初期化
  - [x] Node.js + Express セットアップ
  - [x] TypeScript設定
  - [x] Docker設定
- [ ] 認証API実装
  - [ ] OAuth認証エンドポイント
  - [ ] トークン管理
  - [ ] セッション管理
- [ ] Drive API連携
  - [ ] ファイル一覧取得
  - [ ] 共有設定取得
  - [ ] 外部共有検出
- [ ] リスクスコア計算
  - [ ] スコア計算ロジック（0-100点）
  - [ ] リスクレベル判定
  - [ ] 改善提案生成
- [ ] レポート生成
  - [ ] ダッシュボードデータAPI
  - [ ] PDF生成API
  - [ ] メール送信API

---

## Milestone 4: フロントエンド開発 (Week 3-4)

- [x] プロジェクト初期化
  - [x] React + Vite セットアップ
  - [x] Tailwind CSS設定
  - [x] Docker設定
- [ ] 認証画面
  - [ ] ログインページ
  - [ ] OAuth認証フロー
  - [ ] ログアウト処理
- [ ] ダッシュボード
  - [ ] リスクサマリー表示
  - [ ] ファイル一覧テーブル
  - [ ] グラフ・チャート
- [ ] 詳細画面
  - [ ] ファイル詳細表示
  - [ ] リスク詳細・改善提案
  - [ ] 共有設定変更リンク
- [ ] 設定画面
  - [ ] アラート設定
  - [ ] レポート配信設定
  - [ ] アカウント設定

---

## Milestone 5: 認証・決済連携 (Week 4-5)

- [ ] Google Workspace連携強化
  - [ ] 組織情報取得
  - [ ] ユーザー一覧取得
  - [ ] 監査ログ取得（オプション）
- [ ] Stripe決済連携
  - [ ] Stripeアカウント設定
  - [ ] 料金プラン作成
  - [ ] サブスクリプション管理
- [ ] プラン制御
  - [ ] 無料プラン制限
  - [ ] 有料プラン機能解放
  - [ ] 使用量トラッキング
- [ ] Webhook処理
  - [ ] Stripe Webhook
  - [ ] 決済ステータス管理

---

## Milestone 6: テスト・本番デプロイ (Week 5-6)

- [ ] テスト
  - [ ] ユニットテスト
  - [ ] 統合テスト
  - [ ] E2Eテスト
- [ ] CI/CD構築
  - [x] GitHub Actions設定 (ci.yml, deploy.yml)
  - [ ] 初回デプロイテスト
  - [ ] 自動デプロイ動作確認
- [ ] 本番環境準備
  - [ ] ドメイン設定
  - [ ] SSL証明書
  - [ ] 本番用シークレット設定
- [ ] β版公開
  - [ ] テスター募集
  - [ ] フィードバック収集
- [ ] 正式リリース
  - [ ] マーケティングページ作成
  - [ ] ドキュメント整備
  - [ ] サポート体制構築

---

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                      Google Cloud                            │
│                   (workspace-mamoriban)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │   Cloud Run     │     │   Cloud Run     │                │
│  │   (Frontend)    │────►│   (Backend)     │                │
│  │   React + Vite  │     │   Node.js       │                │
│  └─────────────────┘     └────────┬────────┘                │
│                                   │                          │
│  ┌─────────────────┐              │                          │
│  │ Artifact        │              ▼                          │
│  │ Registry        │     ┌─────────────────┐                │
│  │ (Docker images) │     │  Secret Manager │                │
│  └─────────────────┘     │  (認証情報)      │                │
│                          └─────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Workspace APIs                           │
│  (Drive API, Directory API, Reports API)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Cloud Run 無料枠

| リソース | 無料枠/月 |
|---------|----------|
| CPU | 180,000 vCPU秒 |
| メモリ | 360,000 GiB秒 |
| リクエスト | 200万回 |
| 送信データ | 1 GiB |

**小規模SaaS（〜100社）なら無料枠内で運用可能**

---

## 参照ドキュメント
- [開発計画書](./Workspace_Mamoriban_Development_Plan.md)
- [CLAUDE.md](./CLAUDE.md)
- [README.md](./README.md)
- [GCP Console](https://console.cloud.google.com/home/dashboard?project=workspace-mamoriban)
