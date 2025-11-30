# Workspace守り番 開発タスク一覧

**最終更新**: 2025年11月29日
**アーキテクチャ**: GCP + Cloud Run（本番環境対応）

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| **Frontend** | React + Vite + Tailwind CSS |
| **Backend** | Node.js (Express + TypeScript) |
| **データベース** | Firestore |
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
| Firestore | `(default)` データベース |
| サービスアカウント | `github-actions@workspace-mamoriban.iam.gserviceaccount.com` |

---

## 進捗サマリー

| マイルストーン | 状態 | 進捗 |
|--------------|------|------|
| Milestone 1: 環境構築完了 | ✅ 完了 | 8/8 |
| Milestone 2: GCP環境構築 | ✅ 完了 | 10/10 |
| Milestone 3: バックエンドAPI開発 | ✅ 完了 | 5/5 |
| Milestone 4: フロントエンド開発 | ✅ 完了 | 5/5 |
| Milestone 4.5: ファイル詳細・改善アクション | ✅ 完了 | 4/4 |
| Milestone 5: 認証・決済連携 | ✅ 完了 | 4/4 |
| Milestone 6: テスト・デプロイ | ⏳ 未着手 | 0/7 |

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
  - [x] Firestore API
  - [x] Drive API
  - [x] Admin SDK (Directory API)
- [x] Artifact Registry作成
  - [x] リージョン: asia-northeast1
- [x] Firestoreデータベース作成
  - [x] リージョン: asia-northeast1
  - [x] セキュリティルール設定
- [x] サービスアカウント設定
  - [x] `github-actions` サービスアカウント作成
  - [x] IAMロール付与 (run.admin, artifactregistry.writer, iam.serviceAccountUser)
- [x] GitHub Secrets設定
  - [x] GCP_PROJECT_ID
  - [x] GCP_SA_KEY
- [x] OAuth同意画面設定
  - [x] 同意画面作成
  - [x] スコープ設定 (drive.readonly, admin.directory.user.readonly, openid, email, profile)
  - [x] テストユーザー追加 (info@haruniko.co.jp)
- [x] OAuthクライアントID作成
  - [x] クライアントID: `1030272132348-kl3unitfrf2tq579e2o3anevug5a4jsu.apps.googleusercontent.com`

---

## Milestone 3: バックエンドAPI開発 (Week 2-3) ✅

- [x] プロジェクト初期化
  - [x] Node.js + Express セットアップ
  - [x] TypeScript設定
  - [x] Docker設定
- [x] データモデル・Firestore連携
  - [x] Organization モデル（契約単位）
  - [x] User モデル（ユーザー管理）
  - [x] Scan モデル（スキャン履歴）
  - [x] Firestoreサービス（CRUD操作）
  - [x] 料金プラン定義（free/basic/pro/enterprise）
- [x] 認証API実装
  - [x] OAuth認証エンドポイント (`/api/auth/login`, `/api/auth/callback`)
  - [x] トークン管理 (`/api/auth/refresh`)
  - [x] セッション管理
  - [x] 認証ミドルウェア (requireAuth, requireAdmin, requireOwner, requirePlan)
- [x] Drive API連携
  - [x] ファイル一覧取得 (`listFiles`, `listSharedFiles`)
  - [x] 共有設定取得 (`getFileDetails`)
  - [x] 外部共有検出 (`hasExternalSharing`, `hasExternalEditor`)
  - [x] 全ファイルスキャン (`scanAllFiles`)
- [x] リスクスコア計算
  - [x] スコア計算ロジック（0-100点）
  - [x] リスクレベル判定 (critical/high/medium/low)
  - [x] 改善提案生成
  - [x] スキャンAPI (`/api/scan/start`, `/api/scan/:scanId`)

---

## Milestone 4: フロントエンド開発 (Week 3-4) ✅

- [x] プロジェクト初期化
  - [x] React + Vite セットアップ
  - [x] Tailwind CSS設定
  - [x] Docker設定
- [x] 認証画面
  - [x] ログインページ (`LoginPage.tsx`)
  - [x] OAuth認証フロー (`AuthContext.tsx`)
  - [x] ログアウト処理
  - [x] 認証保護ルート (`ProtectedRoute.tsx`)
- [x] ダッシュボード
  - [x] リスクサマリー表示 (`DashboardPage.tsx`)
  - [x] スキャン履歴一覧
  - [x] リスクカード（緊急/高/中/低）
- [x] スキャン画面
  - [x] スキャン開始ボタン (`ScanPage.tsx`)
  - [x] スキャン進捗表示
  - [x] リスク分布バー
- [x] 設定画面
  - [x] アカウント情報表示 (`SettingsPage.tsx`)
  - [x] 組織情報表示
  - [x] プラン・お支払い情報
  - [x] 通知設定

---

## Milestone 4.5: ファイル詳細・改善アクション ✅

- [x] バックエンド: スキャン結果の個別ファイル保存
  - [x] ScannedFile データモデル追加 (`backend/src/types/models.ts`)
  - [x] Firestore サブコレクション (`scans/{scanId}/files`)
  - [x] バッチ保存（500件ずつ）
- [x] バックエンド: ファイル一覧API
  - [x] `GET /api/scan/:scanId/files` （ページネーション、フィルタリング対応）
  - [x] `GET /api/scan/:scanId/files/:fileId` （個別ファイル詳細）
- [x] フロントエンド: ファイル一覧ページ (`FilesPage.tsx`)
  - [x] リスクレベル別フィルタリング
  - [x] ファイル一覧テーブル（アイコン、名前、所有者、リスクバッジ、スコア）
  - [x] ページネーション
- [x] フロントエンド: ファイル詳細モーダル
  - [x] リスクスコア可視化
  - [x] リスク要因（検出された問題）表示
  - [x] 改善提案表示
  - [x] 権限一覧表示
  - [x] 「共有設定を開く」ボタン（Google Drive連携）

---

## Milestone 5: 認証・決済連携 (Week 4-5)

- [x] Google Workspace連携強化
  - [x] 組織情報取得（Admin SDK Directory API）
  - [x] ユーザー一覧取得（アプリ登録ユーザー + Workspaceユーザー）
  - [x] 組織管理ページ（フロントエンド）
  - [x] メンバー役割変更・削除機能
  - [x] 監査ログ取得（Google Reports API）
    - [x] Drive操作ログ取得
    - [x] ログイン履歴取得
    - [x] 管理者操作ログ取得
    - [x] 外部共有検出
    - [x] 不審なログイン検出
    - [x] 監査ログページ（フロントエンド）
- [x] Stripe決済連携
  - [x] Stripeサービス実装（stripe.ts）
  - [x] 料金プラン設定（free/basic/pro/enterprise）
  - [x] Checkoutセッション作成
  - [x] カスタマーポータル連携
  - [x] サブスクリプション管理API
- [x] プラン制御
  - [x] プラン制限チェック（ユーザー数、スキャン回数）
  - [x] 設定ページにプラン情報・アップグレードボタン追加
  - [x] 使用量トラッキング表示
- [x] Webhook処理
  - [x] checkout.session.completed（プラン更新）
  - [x] customer.subscription.updated/deleted（状態管理）
  - [x] invoice.payment_failed（支払い失敗通知）

---

## Milestone 6: テスト・本番デプロイ (Week 5-6)

### APIテスト（自動実行: 2025-11-30）✅

| テスト項目 | 結果 | 詳細 |
|-----------|------|------|
| ヘルスチェック (`/health`) | ✅ Pass | `{"status":"ok"}` |
| APIルート (`/api`) | ✅ Pass | `{"message":"Workspace守り番 API","version":"0.1.0"}` |
| ログインURL (`/api/auth/login`) | ✅ Pass | Google OAuthにリダイレクト |
| 認証なしエンドポイント保護 | ✅ Pass | `/api/auth/me`, `/api/scan/start`, `/api/organization`, `/api/stripe/subscription` 全て401 |
| Stripeプラン一覧 (`/api/stripe/plans`) | ✅ Pass | 4プラン（free/basic/pro/enterprise）正常表示 |
| フロントエンドビルド | ✅ Pass | TypeScriptエラーなし、Viteビルド成功 |
| バックエンドTypeScript | ✅ Pass | `tsc --noEmit` エラーなし |
| フロントエンド全ページアクセス | ✅ Pass | `/`, `/login`, `/dashboard`, `/scan`, `/settings` 全て200 OK |
| Stripe決済フロー | ✅ Pass | Checkoutセッション作成、Webhook受信、プラン更新確認済み |

### 修正した問題（2025-11-30）
- [x] Stripe初期化の遅延読み込み対応（環境変数読み込みタイミング問題）
- [x] PLAN_CONFIGのPrice ID動的取得対応
- [x] FRONTEND_URLを5174→5173に修正
- [x] CSS `@import`の順序警告を修正

### 自動テスト結果（実行: 2025-11-30）✅

**総計: 84テスト合格 / 84テスト**

#### リスク計算ロジック (`risk.test.ts`) - 30テスト ✅

| テストカテゴリ | テスト数 | 結果 | 内容 |
|--------------|---------|------|------|
| `getRiskLevel` | 4 | ✅ | スコアからリスクレベル判定（critical/high/medium/low） |
| 公開共有検出 | 1 | ✅ | `type: anyone` で +40点 |
| 外部共有検出 | 2 | ✅ | 外部ドメインユーザーで +20点 |
| 外部編集権限検出 | 2 | ✅ | 外部ユーザーに編集権限で +15点 |
| 機密ファイルタイプ | 4 | ✅ | PDF/Excel/スプレッドシートで +15点 |
| 機密ファイル名検出 | 3 | ✅ | 給与/契約書/パスワードを含むファイル名を検出 |
| 古い共有検出 | 3 | ✅ | 1年以上未更新の共有ファイルで +10点 |
| 多数共有検出 | 2 | ✅ | 10人以上共有で +5点 |
| スコア上限 | 1 | ✅ | スコアは100点でキャップ |
| 改善提案生成 | 1 | ✅ | 各問題に対応する改善提案を生成 |
| `calculateRiskSummary` | 3 | ✅ | 複数ファイルのサマリー計算 |
| ラベル関数 | 4 | ✅ | 日本語ラベル変換 |

#### Stripeプラン管理 (`stripe.test.ts`) - 19テスト ✅

| テストカテゴリ | テスト数 | 結果 | 内容 |
|--------------|---------|------|------|
| `PLAN_CONFIG` | 5 | ✅ | 各プランの設定値（価格、ユーザー数、スキャン回数） |
| `checkPlanLimits` (free) | 4 | ✅ | 無料プラン: 5ユーザー、2スキャン/月 |
| `checkPlanLimits` (basic) | 2 | ✅ | ベーシック: 20ユーザー、10スキャン/月 |
| `checkPlanLimits` (pro) | 2 | ✅ | プロ: 100ユーザー、無制限スキャン |
| `checkPlanLimits` (enterprise) | 2 | ✅ | エンタープライズ: 無制限 |
| `getPlanInfo` | 4 | ✅ | 各プランの情報取得（名前、機能一覧） |

#### Drive共有判定 (`drive.test.ts`) - 17テスト ✅

| テストカテゴリ | テスト数 | 結果 | 内容 |
|--------------|---------|------|------|
| `isPubliclyShared` | 3 | ✅ | 「リンクを知っている全員」共有判定 |
| `hasExternalSharing` | 7 | ✅ | 外部共有判定（anyone/domain/user/group） |
| `hasExternalEditor` | 7 | ✅ | 外部編集者判定（writer/organizer/fileOrganizer） |

#### API統合テスト (`api.test.ts`) - 18テスト ✅

| テストカテゴリ | テスト数 | 結果 | 内容 |
|--------------|---------|------|------|
| Health Check | 1 | ✅ | `/health` エンドポイント |
| API Root | 1 | ✅ | `/api` エンドポイント |
| Stripe Plans API | 5 | ✅ | プラン一覧取得、各プラン詳細確認 |
| Stripe 認証保護 | 3 | ✅ | subscription/checkout/portal 401確認 |
| Auth Routes | 3 | ✅ | login/me/logout エンドポイント |
| Error Handling | 1 | ✅ | 404エラーハンドリング |
| Security Headers | 2 | ✅ | Helmet、CORS設定確認 |
| Plan Details | 2 | ✅ | プラン構造と順序確認 |

---

- [ ] 手動機能テスト（リリース前必須）
  - [ ] **認証フロー**
    - [ ] 未ログイン状態でログインページが表示される
    - [ ] 「Googleでログイン」ボタンでOAuth認証画面に遷移する
    - [ ] OAuth認証後、ウェルカムページにリダイレクトされる
    - [ ] 2回目以降のログインでダッシュボードに遷移する
    - [ ] ログアウトボタンでログアウトできる
    - [ ] ログアウト後、保護されたページにアクセスできない
    - [ ] セッション切れ時、自動でログインページにリダイレクトされる
  - [ ] **ダッシュボード**
    - [ ] リスクサマリーカード（緊急/高/中/低）が表示される
    - [ ] スキャン履歴が表示される
    - [ ] スキャン履歴がない場合、適切なメッセージが表示される
    - [ ] 各カードをクリックでスキャンページに遷移する
  - [ ] **スキャン機能**
    - [ ] スキャン開始ボタンが表示される
    - [ ] スキャン開始後、進捗が表示される
    - [ ] スキャン完了後、リスクサマリーが表示される
    - [ ] 「ファイル詳細を見る」ボタンでファイル一覧に遷移する
    - [ ] 「新しいスキャンを開始」ボタンでリセットされる
    - [ ] プラン制限（月間スキャン回数）が正しく動作する
  - [ ] **ファイル一覧ページ**
    - [ ] スキャン結果のファイル一覧が表示される
    - [ ] リスクレベル別フィルターが動作する
    - [ ] 0件のリスクレベルでフィルターすると「該当するファイルがありません」と表示される
    - [ ] ページネーションが動作する（20件以上の場合）
    - [ ] ファイルをクリックで詳細モーダルが開く
    - [ ] 戻るボタンでスキャンページに戻れる
  - [ ] **ファイル詳細モーダル**
    - [ ] ファイル名・オーナーが表示される
    - [ ] リスクスコアとプログレスバーが表示される
    - [ ] リスク要因（検出された問題）が表示される
    - [ ] 改善提案が表示される
    - [ ] 共有設定（権限一覧）が表示される
    - [ ] 「共有設定を開く」ボタンでGoogle Driveが開く
    - [ ] 「閉じる」ボタンでモーダルが閉じる
    - [ ] モーダル外クリックでモーダルが閉じる
  - [x] **設定ページ**
    - [x] アカウント情報（名前、メール）が表示される
    - [x] 組織情報が表示される
    - [x] プラン情報が表示される
    - [x] プランアップグレード（Stripe決済）が動作する ✅ 2025-11-30 テスト済み
  - [ ] **リスク検出精度**
    - [ ] 「リンクを知っている全員」共有ファイルが緊急リスクとして検出される
    - [ ] 外部共有ファイルが高リスクとして検出される
    - [ ] 機密ファイル名（給与、契約書など）がリスク加点される
    - [ ] 1年以上更新なしの共有ファイルがリスク加点される
  - [ ] **エラーハンドリング**
    - [ ] ネットワークエラー時、適切なエラーメッセージが表示される
    - [ ] 認証エラー時、ログインページにリダイレクトされる
    - [ ] 存在しないスキャンIDでアクセス時、エラーが表示される
  - [ ] **レスポンシブデザイン**
    - [ ] デスクトップ（1920x1080）で正常に表示される
    - [ ] タブレット（768x1024）で正常に表示される
    - [ ] モバイル（375x667）で正常に表示される
- [x] 自動テスト
  - [x] ユニットテスト（リスク計算ロジック）✅ 2025-11-30 30テスト合格
  - [x] ユニットテスト（Stripeプラン管理）✅ 2025-11-30 19テスト合格
  - [x] ユニットテスト（Drive共有判定）✅ 2025-11-30 17テスト合格
  - [x] 統合テスト（API）✅ 2025-11-30 18テスト合格
  - [ ] E2Eテスト（Playwright/Cypress）
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
- [ ] Google商標チェック（リリース前必須）
  - [ ] 各ページで最初の出現箇所に™を付けているか
  - [ ] 商標を名詞でなく形容詞として使用しているか
  - [ ] 商標を動詞・所有格・複数形にしていないか
  - [ ] フッターに帰属表示があるか
  - [ ] Googleと無関係であることを明示しているか
  - [ ] Googleのロゴを無断使用していないか
  - [ ] 商標をブランド名に組み込んでいないか
  - [ ] 参照: [docs/GOOGLE_TRADEMARK_GUIDELINES.md](./docs/GOOGLE_TRADEMARK_GUIDELINES.md)

---

## データモデル

```
Firestore
├── organizations/          # 契約単位（会社）
│   ├── id, name, domain
│   ├── adminEmail
│   ├── stripeCustomerId
│   ├── stripeSubscriptionId
│   ├── plan (free/basic/pro/enterprise)
│   ├── planExpiresAt
│   ├── totalScans, totalFilesScanned
│   └── lastScanAt, createdAt, updatedAt
│
├── users/                  # ユーザー
│   ├── id (Google UID), email, displayName
│   ├── organizationId
│   ├── role (owner/admin/member)
│   ├── refreshToken
│   └── lastLoginAt, createdAt, updatedAt
│
└── scans/                  # スキャン履歴
    ├── id, organizationId, userId
    ├── status (running/completed/failed)
    ├── totalFiles
    ├── riskySummary {critical, high, medium, low}
    ├── startedAt, completedAt, errorMessage
    │
    └── files/              # スキャンされたファイル（サブコレクション）
        ├── id (Google Drive file ID)
        ├── name, mimeType, webViewLink, iconLink
        ├── ownerEmail, ownerName
        ├── shared, permissions[]
        ├── riskScore (0-100), riskLevel
        ├── riskFactors[], recommendations[]
        └── createdAt
```

---

## 料金プラン

| プラン | 月額 | ユーザー数 | スキャン回数 | 主な機能 |
|--------|------|-----------|-------------|----------|
| **無料** | ¥0 | 5人 | 2回/月 | 基本スキャン、リスクスコア |
| **ベーシック** | ¥200 | 20人 | 10回/月 | + 週次レポート、メールアラート |
| **プロ** | ¥500 | 100人 | 無制限 | + ISMS/Pマークレポート、API連携 |
| **エンタープライズ** | 要相談 | 無制限 | 無制限 | + カスタムレポート、専任サポート |

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
│  │ (Docker images) │     │   Firestore     │                │
│  └─────────────────┘     │ (ユーザー/契約)  │                │
│                          └─────────────────┘                │
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
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                        Stripe                                │
│              (決済・サブスクリプション管理)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 無料枠

### Cloud Run
| リソース | 無料枠/月 |
|---------|----------|
| CPU | 180,000 vCPU秒 |
| メモリ | 360,000 GiB秒 |
| リクエスト | 200万回 |
| 送信データ | 1 GiB |

### Firestore
| リソース | 無料枠/日 |
|---------|----------|
| 読み取り | 50,000回 |
| 書き込み | 20,000回 |
| 削除 | 20,000回 |
| ストレージ | 1 GiB |

**小規模SaaS（〜100社）なら無料枠内で運用可能**

---

## 参照ドキュメント
- [開発計画書](./Workspace_Mamoriban_Development_Plan.md)
- [CLAUDE.md](./CLAUDE.md)
- [README.md](./README.md)
- [GCP Console](https://console.cloud.google.com/home/dashboard?project=workspace-mamoriban)
- [Firestore Console](https://console.cloud.google.com/firestore/databases?project=workspace-mamoriban)
