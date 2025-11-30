# Workspace守り番 開発タスク一覧

**最終更新**: 2025年11月30日
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
| Milestone 5.5: リスク評価改善 | ✅ 完了 | 3/3 |
| Milestone 5.6: 権限管理機能 | 🔄 進行中 | 14/21 |
| Milestone 5.7: アクセス制御・管理者機能 | ✅ 完了 | 3/3 |
| Milestone 5.8: ISMS/Pマーク対応レポート | ✅ 完了 | 4/4 |
| Milestone 6: テスト・デプロイ | ⏳ 未着手 | 0/7 |
| Milestone 7: 一括操作UI | ✅ 完了 | 4/4 |
| Milestone 8: 通知・アラート機能 | ✅ 完了 | 4/4 |

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

## Milestone 5.5: リスク評価改善 ✅

リスク評価の精度と実用性を向上させる改善を実施。

- [x] リスク評価フレームワーク策定
  - [x] ドキュメント作成 (`docs/RISK_EVALUATION_FRAMEWORK.md`)
  - [x] ISMS/プライバシーマーク観点でのリスク分類（漏洩リスク/受領リスク）
  - [x] オーナー種別による係数設定（自社100%/外部編集30%/外部閲覧10%）
  - [x] スコアリングルールの見直し（公開リンク50点、外部編集25点）
- [x] バックエンド実装
  - [x] `isInternalOwner`判定関数追加
  - [x] 外部オーナーファイルのリスク係数適用
  - [x] `ScannedFile`に`isInternalOwner`フラグ追加
  - [x] ファイル取得APIに`ownerType`フィルター追加
- [x] フロントエンド実装
  - [x] 所有者フィルター（すべて/自社/外部）追加
  - [x] ファイル行に「外部」バッジ表示
  - [x] フィルター適用状態の表示

---

## Milestone 5.6: 権限管理機能

ユーザーがリスクファイルに対して効率的に対処できるよう、権限管理機能を実装。

**設計書**: `docs/PERMISSION_MANAGEMENT_DESIGN.md`

### Phase 1: フォルダ単位表示（工数: 中）

- [x] バックエンド: 親フォルダ情報取得 ✅ 実装済み
  - [x] スキャン時に`parents`フィールドを取得
  - [x] 親フォルダ名をバッチで取得（API呼び出し最適化）
  - [x] `ScannedFile`に`parentFolderId`/`parentFolderName`追加
- [x] バックエンド: フォルダ集計API ✅ 実装済み
  - [x] `GET /api/scan/:scanId/folders` エンドポイント追加
  - [x] `GET /api/scan/:scanId/folders/:folderId/files` エンドポイント追加
  - [x] フォルダ別リスクサマリー集計
- [x] バックエンド: フォルダ階層・権限API ✅ 実装済み
  - [x] `GET /api/scan/:scanId/files/:fileId/folder-path` （フォルダ階層取得）
  - [x] `DELETE /api/scan/:scanId/folders/:folderId/permissions` （フォルダ権限一括削除）
- [x] フロントエンド: フォルダパス表示 ✅ 実装済み
  - [x] パンくずリスト形式でフォルダ階層表示
  - [x] フォルダクリックで権限一覧表示
  - [x] Google Driveへのリンク
- [ ] フロントエンド: フォルダビュー ⏳ 未実装
  - [ ] 表示モード切替（ファイル表示/フォルダ表示）
  - [ ] フォルダ別ファイルグルーピング表示
  - [ ] フォルダ展開/折りたたみ

### Phase 2: 権限変更API（工数: 大）

- [ ] OAuthスコープ変更 ⏳ 未実装
  - [ ] `drive.readonly` → `drive` スコープに変更
  - [ ] Google Cloud Console で同意画面更新
  - [ ] 再認証フロー実装
- [x] バックエンド: ファイル権限変更API ✅ 実装済み
  - [x] `DELETE /api/scan/:scanId/files/:fileId/permissions/:permissionId` （権限削除）
  - [x] `PUT /api/scan/:scanId/files/:fileId/permissions/:permissionId` （権限更新）
  - [x] `GET /api/scan/:scanId/files/:fileId/permissions` （最新権限取得）
- [x] バックエンド: フォルダ権限一括削除API ✅ 実装済み
  - [x] `DELETE /api/scan/:scanId/folders/:folderId/permissions` （フォルダ内一括削除）
- [ ] バックエンド: フォルダ自体の権限変更API ⏳ 未実装
  - [ ] `DELETE /api/scan/:scanId/folders/:folderId/folder-permissions/:permissionId` （フォルダ権限削除）
  - [ ] `PUT /api/scan/:scanId/folders/:folderId/folder-permissions/:permissionId` （フォルダ権限更新）
- [x] バックエンド: 監査ログ ✅ 実装済み
  - [x] `ActionLog`データモデル追加
  - [x] 権限変更操作の記録
  - [x] `/api/audit-logs/actions` エンドポイント

### Phase 3: 権限変更UI（工数: 中）

- [x] フロントエンド: 単一ファイル権限変更 ✅ 実装済み
  - [x] ファイル詳細モーダルに権限変更ボタン追加
  - [x] 「アクセス削除」ボタン（ゴミ箱アイコン）
  - [x] 「閲覧者に変更」ボタン（矢印アイコン）
  - [x] 確認ダイアログ表示
  - [x] 操作結果トースト表示
  - [x] 外部オーナーファイルは変更不可の警告表示
- [ ] フロントエンド: フォルダ権限変更 ⏳ **未実装（重要）**
  - [ ] フォルダ権限表示に「削除」ボタン追加
  - [ ] フォルダ権限表示に「閲覧者に変更」ボタン追加
  - [ ] フォルダ権限変更の確認ダイアログ
  - [ ] フォルダ権限変更APIとの連携
  - [ ] 操作結果トースト表示
- [ ] フロントエンド: 一括操作 ⏳ 未実装
  - [ ] ファイル複数選択UI
  - [ ] 一括アクション選択ダイアログ
  - [ ] ドライラン（プレビュー）機能
  - [ ] 実行結果サマリー表示

### 技術的考慮事項

| 項目 | 対応方針 |
|------|---------|
| OAuthスコープ拡大 | 限定スコープ`drive.file`で先行リリースも検討 |
| API レート制限 | バッチ処理、指数バックオフ、キュー制御 |
| 誤操作防止 | 確認UI、ドライラン、監査ログ |
| 外部オーナーファイル | 変更不可であることをUI上で明示 |

---

## Milestone 5.7: アクセス制御・管理者機能 ✅

スキャン結果のセキュリティ強化と管理者向け機能の実装。

**設計書**: `docs/DEVELOPMENT_ROADMAP.md`

### 実装内容

- [x] スキャン結果のアクセス制御
  - [x] `Scan`モデルに`userEmail`, `userName`, `visibility`フィールド追加
  - [x] ロール別アクセス制御（member: 自分のみ / admin,owner: 全件）
  - [x] `ScanService.getAccessibleScans()`, `canAccessScan()`, `canEditScan()`追加
  - [x] 管理者用API: `/api/scan/admin/users`, `/api/scan/admin/users/:userId/scans`, `/api/scan/admin/all`
- [x] 管理者統合ダッシュボード
  - [x] `AdminDashboardPage.tsx`作成
  - [x] 組織全体のリスクサマリー表示
  - [x] ユーザー別スキャン状況一覧
  - [x] ユーザー詳細展開（スキャン履歴）
  - [x] 管理者専用ナビゲーション追加
- [x] フロントエンドAPI対応
  - [x] `scanApi.admin`メソッド追加
  - [x] `UserScanSummary`型定義

---

## Milestone 5.8: ISMS/Pマーク対応レポート ✅

監査対応用のレポート機能を実装。

**設計書**: `docs/ISMS_PMARK_REQUIREMENTS.md`

### 実装内容

- [x] バックエンド: レポートAPI
  - [x] `GET /api/reports/scan-history` - スキャン実施履歴レポート（A.8.15, 9.2対応）
  - [x] `GET /api/reports/risk-assessment/:scanId` - リスクアセスメントレポート（A.5.9, A.5.10, 6.1.2対応）
  - [x] `GET /api/reports/remediation-history` - 是正対応履歴レポート（A.5.18対応）
  - [x] `GET /api/reports/external-sharing/:scanId` - 外部共有一覧レポート（A.5.15, A.5.23対応）
  - [x] `GET /api/reports/current-risks` - 現在のリスク状況レポート（9.1, 9.3対応）
- [x] フロントエンド: レポートUI
  - [x] `ReportsPage.tsx`作成
  - [x] レポート選択カード（ISMS/Pマーク参照付き）
  - [x] 期間・スキャン選択パラメータ
  - [x] サマリー表示
  - [x] JSON/CSVダウンロード
  - [x] 審査対応チェックリスト
- [x] ナビゲーション
  - [x] `/reports`ルート追加
  - [x] 管理者専用メニューに追加

### 対応する監査要件

| レポート | ISMS (ISO 27001:2022) | Pマーク (JIS Q 15001:2023) |
|----------|----------------------|---------------------------|
| スキャン実施履歴 | A.8.15 ログ取得 | 9.2 内部監査 |
| リスクアセスメント | A.5.9, A.5.10 | 6.1.2 リスクアセスメント |
| 是正対応履歴 | A.5.18 アクセス権 | 9.2 内部監査（是正措置） |
| 外部共有一覧 | A.5.15, A.5.23 | - |
| 現在のリスク状況 | 9.1 監視・測定 | 9.3 マネジメントレビュー |

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

### 手動テストで発見された問題（2025-11-30）

#### 修正タスク一覧

**高優先度（リリース前に修正必須）**
- [x] **[H-1]** ヘッダーアイコンを右端に配置する（Google Drive風） ✅ 2025-11-30
  - ファイル: `frontend/src/components/Layout.tsx`
  - 修正内容: `ml-auto`を追加してアイコンを右端に配置
- [x] **[D-1]** Invalid Date表示を修正する ✅ 2025-11-30
  - ファイル: `backend/src/services/firestore.ts`、`frontend/src/pages/DashboardPage.tsx`
  - 修正内容: Firestore TimestampをISO文字列に変換、フロントエンドでの日付パースを堅牢化
- [x] **[L-3]** OAuthキャンセル時のエラーメッセージをユーザーフレンドリーにする ✅ 2025-11-30
  - ファイル: `frontend/src/pages/LoginPage.tsx`
  - 修正内容: `access_denied`に対して「ログインがキャンセルされました。」を表示
- [x] **[D-4]** スキャンタイムアウト処理を追加する ✅ 2025-11-30
  - ファイル: `frontend/src/pages/ScanPage.tsx`
  - 修正内容: 10分経過でタイムアウト警告表示、経過時間表示、再スキャンボタン追加
- [x] **[L-4]** OAuth再同意を回避する（prompt=consent→prompt=select_account） ✅ 2025-11-30
  - ファイル: `backend/src/services/auth.ts`
  - 修正内容: `prompt: 'consent'`を`prompt: 'select_account'`に変更（forceConsent時のみconsent）
- [x] **[D-5]** スキャン履歴アイテムをクリック可能にする ✅ 2025-11-30
  - ファイル: `frontend/src/pages/DashboardPage.tsx`
  - 修正内容: ScanHistoryItemにonClickを追加、クリックでファイル一覧に遷移
- [x] **[S-3]** 戻るボタンでスキャン結果がリセットされないようにする ✅ 2025-11-30
  - ファイル: `frontend/src/pages/ScanPage.tsx`
  - 修正内容: useSearchParamsでscanIdをURLクエリパラメータ（`?id=`）に保持
- [x] **[S-4]** プラン制限（残りスキャン回数）をUIに表示する ✅ 2025-11-30
  - ファイル: `frontend/src/pages/ScanPage.tsx`
  - 修正内容: 「今月の残りスキャン: X/Y回」表示、上限到達時の警告・アップグレード案内追加
- [x] **[F-1]** リスクレベル別フィルターを修正する ✅ 2025-11-30
  - ファイル: `frontend/src/pages/FilesPage.tsx`
  - 修正内容: URLパラメータ（`/scan/:scanId/files`）とクエリパラメータ（`?scanId=`）両方をサポート
- [x] **[F-2]** リスク表示の不整合を修正する（低リスクに危険表示） ✅ 2025-11-30
  - ファイル: `frontend/src/pages/FilesPage.tsx`
  - 修正内容: リスク要因の表示色をファイルのriskLevelに基づいて動的に設定

**中優先度（UX改善）**
- [x] **[D-2]** リスクサマリーカードのホバー効果を削除する ✅ 2025-11-30
  - ファイル: `frontend/src/pages/DashboardPage.tsx`
  - 修正内容: RiskCardから`hover:shadow-md cursor-pointer`を削除
- [x] **[H-2]** 不要なヘッダーアイコン（✓/?/:::）を削除または機能実装する ✅ 2025-11-30
  - ファイル: `frontend/src/components/Layout.tsx`
  - 修正内容: 機能のないアイコン（チェック、ヘルプ、メニュー）を削除、設定・ユーザーアバターのみ残す
- [x] **[L-1][L-2]** フッターリンク・ログインカード内リンクを実ページに繋げる ✅ 2025-11-30
  - ファイル: `frontend/src/pages/LoginPage.tsx`
  - 修正内容: 利用規約・プライバシーポリシーページ作成、フッターとログインカード内にリンク追加
- [x] **[S-2]** スキャン中のプログレスバーを追加する ✅ 既存実装確認
  - ファイル: `frontend/src/pages/ScanPage.tsx`、`backend/src/routes/scan.ts`
  - 修正内容: 既に実装済み（phase/processedFiles/totalFilesを使用）
- [x] **[F-3]** ファイル詳細のプログレスバーとスコアを一致させる ✅ 2025-11-30
  - ファイル: `frontend/src/pages/FilesPage.tsx`
  - 修正内容: プログレスバーの色をriskLevelに基づいて動的設定、スコア表示を追加

**低優先度（将来対応）**
- [x] **[S-1]** スキャン履歴のページネーションを追加する ✅ 2025-11-30
  - ファイル: `frontend/src/pages/DashboardPage.tsx`
  - 修正内容: offset/limitによるページネーション実装、前へ/次へボタン追加

---

#### 修正後の再確認チェックリスト

修正完了後、以下の項目を再テストして確認する。

**高優先度タスクの再確認**
| タスクID | 再確認項目 | 修正 | 再確認 |
|----------|-----------|:----:|:------:|
| H-1 | ヘッダーアイコンが右端に配置されている | [x] | [ ] |
| D-1 | スキャン履歴に正しい日時が表示される | [x] | [ ] |
| L-3 | OAuthキャンセル時に「ログインがキャンセルされました」と表示される | [x] | [ ] |
| D-4 | スキャンが一定時間後にタイムアウトエラーを表示する | [x] | [ ] |
| L-4 | 2回目以降のログインで同意画面が表示されない | [x] | [ ] |
| D-5 | スキャン履歴クリックでファイル一覧に遷移する | [x] | [ ] |
| S-3 | 戻るボタンを押してもスキャン結果が維持される | [x] | [ ] |
| S-4 | 「今月の残りスキャン: X/Y回」が表示される | [x] | [ ] |
| F-1 | リスクレベル別フィルターが正しく動作する | [x] | [ ] |
| F-2 | リスクレベルに応じた適切なリスク表示になる | [x] | [ ] |

**中優先度タスクの再確認**
| タスクID | 再確認項目 | 修正 | 再確認 |
|----------|-----------|:----:|:------:|
| D-2 | リスクサマリーカードにホバー効果がない | [x] | [ ] |
| H-2 | 機能のないヘッダーアイコンが削除されている | [x] | [ ] |
| L-1/L-2 | フッター・カード内リンクが正しく動作する | [x] | [ ] |
| S-2 | スキャン中に「X/Y件処理中」が表示される | [x] | [ ] |
| F-3 | プログレスバーがスコアと一致する | [x] | [ ] |

**低優先度タスクの再確認**
| タスクID | 再確認項目 | 修正 | 再確認 |
|----------|-----------|:----:|:------:|
| S-1 | 5件以上でページネーションが表示される | [x] | [ ] |

---

#### 確認済み正常動作
- [x] ログアウトボタンでログアウト可能、ログイン画面に戻る
- [x] キャッシュクリア後リロードでログイン画面が表示される（セッション管理OK）
- [x] スキャン完了後リスクサマリーが表示される
- [x] ファイル詳細モーダルが開く
- [x] ファイル名・オーナーが表示される
- [x] リスク要因・改善提案が表示される
- [x] 共有設定（権限一覧）が表示される
- [x] 「共有設定を開く」ボタンでGoogle Driveが開く
- [x] 「閉じる」ボタンでモーダルが閉じる
- [x] モーダル外クリックでモーダルが閉じる

### 自動テスト結果（実行: 2025-11-30）✅

**総計: 96テスト合格 / 96テスト**
- ユニットテスト: 66テスト
- API統合テスト: 18テスト
- E2Eテスト: 12テスト

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

#### E2Eテスト (`pages.spec.ts`) - 12テスト ✅

| テストカテゴリ | テスト数 | 結果 | 内容 |
|--------------|---------|------|------|
| Public Pages | 2 | ✅ | ホームページ、ログインページ表示確認 |
| Protected Routes | 4 | ✅ | 認証なしでリダイレクト確認（dashboard/scan/settings/files） |
| Navigation Elements | 2 | ✅ | ブランディング、ログインボタン |
| UI Components | 3 | ✅ | ビューポート、レスポンシブ（モバイル/タブレット） |
| Error Handling | 1 | ✅ | 404ページ |

---

- [ ] 手動機能テスト（リリース前必須）✅ 2025-11-30 テスト実施
  - [x] **認証フロー** ✅ 完了（一部問題あり → タスク化済み）
    - [x] 未ログイン状態でログインページが表示される ✅ OK
    - [x] 「Googleでログイン」ボタンでOAuth認証画面に遷移する ✅ OK
    - [x] OAuth認証後、ウェルカムページにリダイレクトされる ✅ OK
    - [x] 2回目以降のログインでダッシュボードに遷移する ⚠️ NG → **[L-4]** OAuth同意が毎回表示される
    - [x] ログアウトボタンでログアウトできる ✅ OK
    - [x] ログアウト後、保護されたページにアクセスできない ✅ OK
    - [x] セッション切れ時、自動でログインページにリダイレクトされる ✅ OK
  - [x] **ダッシュボード** ✅ 完了（問題あり → タスク化済み）
    - [x] リスクサマリーカード（緊急/高/中/低）が表示される ✅ OK
    - [x] スキャン履歴が表示される ⚠️ NG → **[D-1]** Invalid Date表示
    - [x] スキャン履歴がない場合、適切なメッセージが表示される ✅ OK
    - [x] 各カードをクリックでスキャンページに遷移する ⚠️ NG → **[D-2]** ホバー効果のみで機能なし
  - [x] **スキャン機能** ✅ 完了（問題あり → タスク化済み）
    - [x] スキャン開始ボタンが表示される ✅ OK
    - [x] スキャン開始後、進捗が表示される ⚠️ NG → **[S-2]** プログレスバーなし
    - [x] スキャン完了後、リスクサマリーが表示される ✅ OK
    - [x] 「ファイル詳細を見る」ボタンでファイル一覧に遷移する ✅ OK
    - [x] 「新しいスキャンを開始」ボタンでリセットされる ✅ OK
    - [x] プラン制限（月間スキャン回数）が正しく動作する ⚠️ NG → **[S-4]** UI表示なし
  - [x] **ファイル一覧ページ** ✅ 完了（問題あり → タスク化済み）
    - [x] スキャン結果のファイル一覧が表示される ✅ OK
    - [x] リスクレベル別フィルターが動作する ⚠️ NG → **[F-1]** フィルター不動作
    - [ ] 0件のリスクレベルでフィルターすると「該当するファイルがありません」と表示される （未テスト：フィルター不動作のため）
    - [ ] ページネーションが動作する（20件以上の場合）（未テスト）
    - [x] ファイルをクリックで詳細モーダルが開く ✅ OK
    - [x] 戻るボタンでスキャンページに戻れる ⚠️ NG → **[S-3]** 戻るとリセットされる
  - [x] **ファイル詳細モーダル** ✅ 完了（一部問題あり → タスク化済み）
    - [x] ファイル名・オーナーが表示される ✅ OK
    - [x] リスクスコアとプログレスバーが表示される ⚠️ NG → **[F-3]** スコアと不一致
    - [x] リスク要因（検出された問題）が表示される ⚠️ NG → **[F-2]** 低リスクに危険表示
    - [x] 改善提案が表示される ✅ OK
    - [x] 共有設定（権限一覧）が表示される ✅ OK
    - [x] 「共有設定を開く」ボタンでGoogle Driveが開く ✅ OK
    - [x] 「閉じる」ボタンでモーダルが閉じる ✅ OK
    - [x] モーダル外クリックでモーダルが閉じる ✅ OK
  - [x] **設定ページ** ✅ 完了
    - [x] アカウント情報（名前、メール）が表示される ✅ OK
    - [x] 組織情報が表示される ✅ OK
    - [x] プラン情報が表示される ✅ OK
    - [x] プランアップグレード（Stripe決済）が動作する ✅ 2025-11-30 テスト済み
  - [ ] **組織管理ページ** (`/organization`) ⏳ 未テスト
    - [ ] ページタイトル「組織管理」が表示される
    - [ ] 組織名が表示される
    - [ ] ドメイン名が表示される
    - [ ] 契約プラン情報が表示される
    - [ ] 作成日時が表示される
    - [ ] メンバー一覧が表示される
    - [ ] メンバーの名前・メール・役割が表示される
    - [ ] メンバーの役割変更ボタンが動作する
    - [ ] メンバー削除ボタンが動作する（確認ダイアログあり）
    - [ ] オーナー自身は削除できない
    - [ ] 役割の選択肢（owner/admin/member）が表示される
    - [ ] Workspaceユーザー一覧タブが表示される（プランによる）
    - [ ] 「メンバーを招待」ボタンが動作する
  - [ ] **監査ログページ** (`/audit-logs`) ⏳ 未テスト
    - [ ] ページタイトル「監査ログ」が表示される
    - [ ] 日付範囲フィルターが表示される
    - [ ] イベントタイプフィルターが表示される
    - [ ] タブ切り替え（Driveアクティビティ/ログイン履歴/セキュリティイベント）が動作する
    - [ ] **Driveアクティビティタブ**
      - [ ] ファイル操作ログが表示される
      - [ ] 日時・ユーザー・操作内容・対象ファイルが表示される
      - [ ] 外部共有イベントがハイライト表示される
    - [ ] **ログイン履歴タブ**
      - [ ] ログイン・ログアウトイベントが表示される
      - [ ] 日時・ユーザー・IPアドレス・デバイス情報が表示される
      - [ ] 不審なログイン（海外IP等）がハイライト表示される
    - [ ] **セキュリティイベントタブ**
      - [ ] 管理者操作ログが表示される
      - [ ] 権限変更・設定変更が記録される
    - [ ] ページネーションが動作する
    - [ ] 「エクスポート」ボタンが動作する（CSV/PDF）
  - [ ] **リスク検出精度** ⏳ 未テスト
    - [ ] 「リンクを知っている全員」共有ファイルが緊急リスクとして検出される
    - [ ] 外部共有ファイルが高リスクとして検出される
    - [ ] 機密ファイル名（給与、契約書など）がリスク加点される
    - [ ] 1年以上更新なしの共有ファイルがリスク加点される
  - [ ] **エラーハンドリング** ⏳ 一部テスト
    - [x] ネットワークエラー時、適切なエラーメッセージが表示される （未テスト）
    - [x] 認証エラー時、ログインページにリダイレクトされる ⚠️ NG → **[L-3]** エラーメッセージが不親切
    - [ ] 存在しないスキャンIDでアクセス時、エラーが表示される （未テスト）
  - [ ] **レスポンシブデザイン** ⏳ 未テスト
    - [ ] デスクトップ（1920x1080）で正常に表示される
    - [ ] タブレット（768x1024）で正常に表示される
    - [ ] モバイル（375x667）で正常に表示される
  - [x] **UI/UXデザイン** ✅ 完了（問題あり → タスク化済み）
    - [x] ヘッダーアイコン配置 ⚠️ NG → **[H-1]** 右端配置でない
    - [x] ヘッダー機能アイコン ⚠️ NG → **[H-2]** 機能なし
    - [x] フッターリンク ⚠️ NG → **[L-1][L-2]** リンク切れ
    - [x] スキャン履歴クリック ⚠️ NG → **[D-5]** 機能なし
- [x] 自動テスト
  - [x] ユニットテスト（リスク計算ロジック）✅ 2025-11-30 30テスト合格
  - [x] ユニットテスト（Stripeプラン管理）✅ 2025-11-30 19テスト合格
  - [x] ユニットテスト（Drive共有判定）✅ 2025-11-30 17テスト合格
  - [x] 統合テスト（API）✅ 2025-11-30 18テスト合格
  - [x] E2Eテスト（Playwright）✅ 2025-11-30 12テスト合格
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
- [リスク評価フレームワーク](./docs/RISK_EVALUATION_FRAMEWORK.md)
- [権限管理機能設計書](./docs/PERMISSION_MANAGEMENT_DESIGN.md)
- [GCP Console](https://console.cloud.google.com/home/dashboard?project=workspace-mamoriban)
- [Firestore Console](https://console.cloud.google.com/firestore/databases?project=workspace-mamoriban)

---

## Milestone 7: 一括操作UI ✅

複数ファイルの権限を効率的に管理するための一括操作機能。

**優先度**: 中
**完了日**: 2025年11月30日

### 7-1: ファイル選択UI ✅

- [x] FilesPage.tsxにチェックボックス追加
  - [x] 各ファイル行にチェックボックス配置
  - [x] ヘッダーに全選択/全解除チェックボックス
  - [x] 選択状態の管理（useState）
- [x] 選択状態の表示
  - [x] 「X件選択中」バッジ表示
  - [x] 選択中ファイルのハイライト表示（背景色変更）
- [x] フィルタとの連携
  - [x] 「すべて選択」「すべて解除」ボタン

### 7-2: 一括操作メニュー ✅

- [x] 選択中メニューバー
  - [x] 「公開削除」ボタン（anyone権限を一括削除）
  - [x] 「閲覧者に変更」ボタン（編集者→閲覧者に一括変更）
  - [x] 「外部削除」ボタン（外部ユーザーのアクセスを一括削除）
  - [x] 選択解除ボタン（Xアイコン）
- [x] 操作モード切替
  - [x] 「一括操作」ボタンで選択モードに切替
  - [x] 管理者（admin/owner）のみ表示

### 7-3: 確認・実行フロー ✅

- [x] 確認ダイアログ
  - [x] 影響を受けるファイル数の表示
  - [x] 操作内容の説明
  - [x] 「実行する」「キャンセル」ボタン
- [x] 実行結果サマリー
  - [x] 成功件数/失敗件数の表示
  - [x] トースト通知で結果表示
  - [x] 閉じるボタン

### 7-4: バックエンドAPI ✅

- [x] `POST /api/scan/:scanId/bulk/permissions/delete` - 権限を一括削除
- [x] `POST /api/scan/:scanId/bulk/permissions/demote` - 編集者を閲覧者に一括変更
- [x] `POST /api/scan/:scanId/bulk/remove-public-access` - anyone権限を一括削除
- [x] レスポンス形式: `{ success, message, results: { total, success, failed, details[] } }`
- [x] 監査ログへの記録
  - [x] `permission_bulk_delete` / `permission_bulk_update` アクションタイプ
  - [x] 影響を受けたファイル数の記録

---

## Milestone 8: 通知・アラート機能 ✅

リスクを早期発見し、関係者に通知する機能。

**完了日**: 2025年11月30日

### 8-1: 通知設定モデルとFirestoreサービス ✅

- [x] データモデル定義（`NotificationSettings`, `NotificationLog`）
  - [x] メール通知設定（enabled, recipients, triggers, thresholds）
  - [x] Slack通知設定（将来拡張用に型定義）
  - [x] 通知履歴（type, channel, recipients, success）
- [x] Firestoreサービス
  - [x] `NotificationSettingsService` - 設定の取得・更新・受信者管理
  - [x] `NotificationLogService` - 通知履歴の作成・取得

### 8-2: 通知設定APIエンドポイント ✅

- [x] `GET /api/notifications/settings` - 通知設定取得
- [x] `PUT /api/notifications/settings` - 通知設定更新
- [x] `POST /api/notifications/settings/recipients` - 受信者追加
- [x] `DELETE /api/notifications/settings/recipients/:email` - 受信者削除
- [x] `GET /api/notifications/logs` - 通知履歴取得
- [x] `POST /api/notifications/test` - テスト通知送信

### 8-3: 通知設定UIページ ✅

- [x] 通知設定タブ
  - [x] メール通知ON/OFF切り替え（トグルスイッチ）
  - [x] 通知受信者の追加・削除
  - [x] 通知トリガー設定（スキャン完了、Criticalリスク、Highリスク、週次レポート）
- [x] 通知履歴タブ
  - [x] 通知履歴一覧表示
  - [x] タイプ別バッジ表示
  - [x] 成功/失敗表示
- [x] テスト通知機能
  - [x] テスト通知送信ボタン
  - [x] 結果表示
- [x] ナビゲーション追加（管理者メニューに「通知設定」リンク）

### 8-4: フロントエンドAPI ✅

- [x] `notificationsApi` オブジェクト
  - [x] getSettings, updateSettings, addRecipient, removeRecipient
  - [x] getLogs, sendTestNotification
- [x] 型定義（NotificationSettings, NotificationLog）

---

## 将来の機能拡張 ⏳

### Domain-Wide Delegation統合スキャン

管理者がサービスアカウントを使用して全ユーザーのファイルを一括スキャン。

**工数見積もり**: 大

- [ ] サービスアカウント設定
  - [ ] GCPでサービスアカウント作成手順ドキュメント
  - [ ] 必要なスコープの定義
  - [ ] JSONキーのアップロードUI
- [ ] Google Workspace管理コンソール設定ガイド
  - [ ] Domain-Wide Delegation有効化手順
  - [ ] スコープ承認手順
  - [ ] 設定確認テスト機能
- [ ] 統合スキャン機能
  - [ ] 全ユーザーリストの取得（Admin SDK）
  - [ ] ユーザーごとのimpersonationでスキャン
  - [ ] 進捗表示（X/Y ユーザー完了）
  - [ ] エラーハンドリング（アクセス拒否ユーザーのスキップ）
- [ ] 結果の統合表示
  - [ ] 全ユーザーのファイルを統合表示
  - [ ] ユーザー別フィルター
  - [ ] 組織全体のリスクサマリー

### PDFレポート出力

監査提出用のPDF形式レポート生成。

**工数見積もり**: 中

- [ ] PDFライブラリ導入
  - [ ] puppeteer または pdfkit の選定
  - [ ] バックエンドへのインストール
  - [ ] Cloud Runでの動作確認
- [ ] レポートテンプレート作成
  - [ ] スキャン履歴レポートテンプレート（HTML）
  - [ ] リスクアセスメントレポートテンプレート（HTML）
  - [ ] 是正対応履歴レポートテンプレート（HTML）
  - [ ] 外部共有一覧レポートテンプレート（HTML）
  - [ ] 現在のリスク状況レポートテンプレート（HTML）
- [ ] PDF生成機能
  - [ ] HTML→PDF変換
  - [ ] 署名・日付の挿入
  - [ ] ページ番号の追加
  - [ ] ヘッダー/フッターの設定
- [ ] フロントエンド対応
  - [ ] 「PDF」ダウンロードボタン追加
  - [ ] 生成中のローディング表示
- [ ] レポート一括ダウンロード
  - [ ] 複数レポートのZIP圧縮
  - [ ] ダウンロードリンクの生成

### Excel (XLSX) レポート出力

詳細分析用のExcel形式レポート。

**工数見積もり**: 中

- [ ] xlsxライブラリ導入
  - [ ] exceljs または xlsx-js のインストール
  - [ ] TypeScript型定義の設定
- [ ] シート設計
  - [ ] サマリーシート（統計情報）
  - [ ] 詳細シート（ファイル一覧）
  - [ ] リスク別シート（Critical/High/Medium/Low）
- [ ] Excel機能の活用
  - [ ] 自動フィルター設定
  - [ ] 条件付き書式（リスクレベル別色分け）
  - [ ] グラフの自動生成（円グラフ、棒グラフ）
  - [ ] ハイパーリンク（Google Driveへ）
- [ ] フロントエンド対応
  - [ ] 「Excel」ダウンロードボタン追加
  - [ ] フォーマット選択（CSV/Excel）

### その他の将来機能

- [ ] 定期スキャンスケジューラー
  - [ ] 日次/週次/月次の自動スキャン設定
  - [ ] Cloud Scheduler連携
- [ ] ファイル内容スキャン（将来）
  - [ ] 機密情報（マイナンバー、クレカ番号）の検出
  - [ ] DLP機能との連携
- [ ] 多言語対応
  - [ ] 英語UI
  - [ ] 英語レポート
