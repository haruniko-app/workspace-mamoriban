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

## 進捗サマリー

| マイルストーン | 状態 | 進捗 |
|--------------|------|------|
| Milestone 1: 環境構築完了 | 🔄 進行中 | 3/8 |
| Milestone 2: GCP環境構築 | ⏳ 未着手 | 0/6 |
| Milestone 3: バックエンドAPI開発 | ⏳ 未着手 | 0/5 |
| Milestone 4: フロントエンド開発 | ⏳ 未着手 | 0/5 |
| Milestone 5: 認証・決済連携 | ⏳ 未着手 | 0/4 |
| Milestone 6: テスト・デプロイ | ⏳ 未着手 | 0/5 |

---

## Milestone 1: 環境構築完了 (Week 1)

### 完了済み
- [x] GitHubリポジトリ作成 (https://github.com/haruniko-app/workspace-mamoriban)
- [x] 初期コミット・プッシュ
- [x] GCP + Cloud Run アーキテクチャ設計

### 未完了
- [ ] gcloud CLI インストール
- [ ] プロジェクト構造作成
  - [ ] `backend/` ディレクトリ（Node.js API）
  - [ ] `frontend/` ディレクトリ（React）
  - [ ] `docs/` ディレクトリ
  - [ ] `.github/workflows/` ディレクトリ
- [ ] package.json修正
  - [ ] ファイル名を `package.json` に修正（現在 `package (1).json`）
- [ ] .gitignore作成
- [ ] .env.example作成

---

## Milestone 2: GCP環境構築 (Week 1-2)

- [ ] Google Cloud プロジェクト作成
  - [ ] プロジェクトID決定
  - [ ] 課金アカウント設定
- [ ] APIs有効化
  - [ ] Cloud Run API
  - [ ] Cloud Build API
  - [ ] Secret Manager API
  - [ ] Drive API
  - [ ] Admin SDK (Directory API)
- [ ] OAuth同意画面設定
  - [ ] 同意画面作成
  - [ ] スコープ設定
  - [ ] テストユーザー追加
- [ ] サービスアカウント設定
  - [ ] サービスアカウント作成
  - [ ] Domain-Wide Delegation設定
  - [ ] キーファイル生成
- [ ] Secret Manager設定
  - [ ] OAuth認証情報登録
  - [ ] サービスアカウントキー登録
- [ ] Cloud Run初期設定
  - [ ] リージョン選択（asia-northeast1推奨）
  - [ ] サービス作成

---

## Milestone 3: バックエンドAPI開発 (Week 2-3)

- [ ] プロジェクト初期化
  - [ ] Node.js + Express セットアップ
  - [ ] TypeScript設定
  - [ ] Docker設定
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

- [ ] プロジェクト初期化
  - [ ] React + Vite セットアップ
  - [ ] Tailwind CSS設定
  - [ ] Docker設定
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
  - [ ] GitHub Actions設定
  - [ ] Cloud Build設定
  - [ ] 自動デプロイ
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
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │   Cloud Run     │     │   Cloud Run     │                │
│  │   (Frontend)    │────►│   (Backend)     │                │
│  │   React + Vite  │     │   Node.js       │                │
│  └─────────────────┘     └────────┬────────┘                │
│                                   │                          │
│                                   ▼                          │
│                          ┌─────────────────┐                │
│                          │  Secret Manager │                │
│                          │  (認証情報)      │                │
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
