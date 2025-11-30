# ISMS/Pマーク要求事項とWorkspace守り番の対応

## 概要

本ドキュメントは、ISMS（ISO/IEC 27001:2022）およびPマーク（JIS Q 15001:2023）の要求事項を調査し、Workspace守り番のレポート機能がどのように対応するかを定義します。

---

## 参考資料（調査元）

### ISMS関連
- [ISO27001とは？ISMSとの違いや要求事項の詳細について解説](https://assured.jp/column/knowledge-iso27001)
- [【2024年最新】ISMS（ISO27001）新規格の変更点や対応内容を解説](https://www.optima-solutions.co.jp/support_article/isms-new-standard/)
- [ISO/IEC 27001（情報セキュリティ）概要 - 日本品質保証機構](https://www.jqa.jp/service_list/management/service/iso27001/)
- [ISO/IEC27001:2022 規格改訂情報 - アームスタンダード](https://www.armstandard.com/iso27001-revision/detail/)
- [ISO27001附属書Aとは？役割や内容をわかりやすく解説](https://activation-service.jp/iso/column/7980)
- [ISO/IEC 27001:2022 Annex Aの新規管理策について](https://anchor-u.com/iso-iec-270012022-annex-a/)

### Pマーク関連
- [JIS Q 15001:2017 個人情報保護マネジメントシステム－要求事項](https://kikakurui.com/q/Q15001-2017-01.html)
- [JIS Q 15001とは？取得の3つのメリットや他規格との違いを解説](https://ninsho-partner.com/pmark/column/jisq15001_privacymark/)
- [審査基準と構築・運用指針 - JIPDEC](https://privacymark.jp/guideline/outline.html)
- [構築・運用指針2023版の全貌 規格移行のポイントは？](https://jtrustc.co.jp/knowledge/jis-q-15001-2023_240228/)

---

## ISMS（ISO/IEC 27001:2022）要求事項

### 1. 附属書A 管理策の概要

ISO/IEC 27001:2022では、附属書Aの管理策が以下の4カテゴリに再編されました：

| カテゴリ | 管理策数 | 主な内容 |
|----------|----------|----------|
| 組織的管理策 | 37項目 | 情報セキュリティ方針、資産管理、アクセス制御 |
| 人的管理策 | 8項目 | 雇用前・中・後のセキュリティ |
| 物理的管理策 | 14項目 | 物理的セキュリティ境界、機器のセキュリティ |
| 技術的管理策 | 34項目 | ユーザー認証、暗号化、ログ取得 |

### 2. Workspace守り番に関連する管理策

#### A.5 組織的管理策

| 管理策ID | 管理策名 | 要求内容 | Workspace守り番の対応 |
|----------|----------|----------|----------------------|
| A.5.9 | 情報及びその他の関連資産の目録 | 情報資産を特定し、目録を作成・維持する | **スキャン結果レポート**：ファイル一覧、所有者、共有状態を出力 |
| A.5.10 | 情報及びその他の関連資産の利用の許容範囲 | 資産の許容される利用を特定し文書化する | **リスク評価レポート**：共有設定の妥当性を評価 |
| A.5.15 | アクセス制御 | 情報へのアクセスを制御するルールを確立する | **外部共有レポート**：誰がアクセス権を持っているかを一覧化 |
| A.5.18 | アクセス権 | 適切なアクセス権を付与・変更・削除する | **是正対応履歴レポート**：アクセス権変更のログを出力 |

#### A.8 技術的管理策

| 管理策ID | 管理策名 | 要求内容 | Workspace守り番の対応 |
|----------|----------|----------|----------------------|
| A.8.15 | ログ取得 | イベントログを作成し保持する | **監査ログ**：全ての操作をログとして記録 |
| A.8.16 | 監視活動 | 異常な行動を検知するためネットワーク等を監視する | **リスクアラート**：Critical/Highリスクを検知・通知 |
| A.8.17 | クロック同期 | 情報処理システムのクロックを同期する | タイムスタンプはUTC/JST準拠 |

#### 新規管理策（2022年版で追加）

| 管理策ID | 管理策名 | 要求内容 | Workspace守り番の対応 |
|----------|----------|----------|----------------------|
| A.5.7 | 脅威インテリジェンス | 脅威情報を収集・分析する | **リスク評価アルゴリズム**：最新の脅威パターンに基づくスコアリング |
| A.5.23 | クラウドサービスの利用のための情報セキュリティ | クラウドサービスの利用を管理する | **Google Drive監視**：クラウド上の情報共有状態を可視化 |

### 3. 内部監査に必要な証跡

ISO 27001では、内部監査において以下の証跡が求められます：

1. **定期的な点検の実施記録**
   - スキャン実施日時
   - スキャン実施者
   - スキャン対象範囲

2. **リスクアセスメント結果**
   - 検出されたリスクの一覧
   - リスクレベルの分類
   - 推奨される対策

3. **是正措置の記録**
   - 是正実施日時
   - 是正実施者
   - 変更前後の状態

---

## Pマーク（JIS Q 15001:2023）要求事項

### 1. 主要な要求事項

| 条項 | 要求事項 | 内容 | Workspace守り番の対応 |
|------|----------|------|----------------------|
| 6.1.2 | リスクアセスメント | 個人情報のリスクを特定・分析・評価する | **リスク評価レポート**：ファイル単位のリスク分析 |
| 6.1.3 | リスク対応 | リスク対応の選択肢を決定し計画を策定する | **推奨対策の提示**：リスクに応じた対策を自動提案 |
| 9.1 | 監視・測定・分析・評価 | パフォーマンスを評価する | **統計ダッシュボード**：リスク状況の可視化 |
| 9.2 | 内部監査 | 定期的に内部監査を実施する | **監査用レポート一式**：審査提出可能な形式 |
| 9.3 | マネジメントレビュー | トップマネジメントによるレビューを実施する | **サマリーレポート**：経営層向け要約 |

### 2. 監査で必要な記録

JIS Q 15001では、以下の記録の作成・保持が義務付けられています：

1. **個人情報保護方針の周知記録**
2. **リスクアセスメントの記録**
3. **教育実施記録**
4. **監査実施記録**
5. **是正処置の記録**
6. **苦情対応記録**

Workspace守り番は、上記のうち2, 4, 5に対応するレポートを提供します。

---

## Workspace守り番 レポート設計

### レポート一覧

| レポート名 | 対応する要求事項 | 出力形式 | 用途 |
|------------|------------------|----------|------|
| スキャン実施履歴レポート | A.8.15, 9.2 | JSON/CSV | 定期点検の証跡 |
| リスクアセスメントレポート | A.5.9, A.5.10, 6.1.2 | JSON/CSV | リスク評価結果 |
| 是正対応履歴レポート | A.5.18, 9.2 | JSON/CSV | 是正措置の証跡 |
| 外部共有一覧レポート | A.5.15, A.5.23 | JSON/CSV | 情報資産のアクセス状況 |
| 現在のリスク状況レポート | 9.1, 9.3 | JSON/CSV | 現状把握、経営報告 |

### レポート詳細設計

#### 1. スキャン実施履歴レポート（scan_history）

**目的**: 定期的なセキュリティ点検の実施を証明する

**ISMS対応**:
- A.8.15 ログ取得
- 9.2 内部監査

**出力項目**:
```json
{
  "reportType": "scan_history",
  "generatedAt": "2025-11-30T15:00:00Z",
  "organization": {
    "name": "株式会社サンプル",
    "domain": "sample.co.jp"
  },
  "period": {
    "startDate": "2025-09-01T00:00:00Z",
    "endDate": "2025-11-30T23:59:59Z"
  },
  "summary": {
    "totalScans": 24,
    "completedScans": 23,
    "failedScans": 1,
    "totalFilesScanned": 45678,
    "uniqueUsers": 12
  },
  "scans": [
    {
      "id": "scan_001",
      "userName": "田中太郎",
      "userEmail": "tanaka@sample.co.jp",
      "startedAt": "2025-11-30T10:00:00Z",
      "completedAt": "2025-11-30T10:15:00Z",
      "status": "completed",
      "totalFiles": 1234,
      "riskySummary": {
        "critical": 2,
        "high": 5,
        "medium": 15,
        "low": 100
      }
    }
  ]
}
```

#### 2. リスクアセスメントレポート（risk_assessment）

**目的**: リスクの特定・分析・評価結果を文書化する

**ISMS対応**:
- A.5.9 情報及びその他の関連資産の目録
- A.5.10 情報及びその他の関連資産の利用の許容範囲
- 6.1.2 リスクアセスメント

**出力項目**:
```json
{
  "reportType": "risk_assessment",
  "generatedAt": "2025-11-30T15:00:00Z",
  "organization": {...},
  "scanInfo": {
    "scanId": "scan_001",
    "scannedAt": "2025-11-30T10:15:00Z",
    "scannedBy": "田中太郎"
  },
  "summary": {
    "totalFiles": 1234,
    "riskySummary": {
      "critical": 2,
      "high": 5,
      "medium": 15,
      "low": 100
    },
    "externalShareCount": 25,
    "publicShareCount": 3
  },
  "criticalFiles": [...],
  "highFiles": [...]
}
```

#### 3. 是正対応履歴レポート（remediation_history）

**目的**: リスクへの対応措置を記録する

**ISMS対応**:
- A.5.18 アクセス権
- 9.2 内部監査（是正措置）

**出力項目**:
```json
{
  "reportType": "remediation_history",
  "generatedAt": "2025-11-30T15:00:00Z",
  "organization": {...},
  "period": {
    "startDate": "2025-09-01T00:00:00Z",
    "endDate": "2025-11-30T23:59:59Z"
  },
  "summary": {
    "totalActions": 45,
    "successfulActions": 43,
    "failedActions": 2,
    "permissionsDeleted": 30,
    "permissionsUpdated": 15
  },
  "actions": [
    {
      "id": "action_001",
      "userEmail": "admin@sample.co.jp",
      "actionType": "permission_delete",
      "targetName": "重要資料.xlsx",
      "targetType": "file",
      "details": {
        "targetEmail": "external@example.com",
        "oldRole": "writer"
      },
      "success": true,
      "createdAt": "2025-11-30T11:00:00Z"
    }
  ]
}
```

#### 4. 外部共有一覧レポート（external_sharing）

**目的**: 組織外への情報共有状態を把握する

**ISMS対応**:
- A.5.15 アクセス制御
- A.5.23 クラウドサービスの利用のための情報セキュリティ

**出力項目**:
```json
{
  "reportType": "external_sharing",
  "generatedAt": "2025-11-30T15:00:00Z",
  "organization": {...},
  "scanInfo": {...},
  "summary": {
    "totalExternalShares": 25,
    "publicShares": 3,
    "externalUserShares": 18,
    "externalDomainShares": 4
  },
  "files": [
    {
      "id": "file_001",
      "name": "提案書.pdf",
      "ownerEmail": "sales@sample.co.jp",
      "riskLevel": "high",
      "externalPermissions": [
        {
          "type": "anyone",
          "email": null,
          "domain": null,
          "role": "reader"
        }
      ],
      "webViewLink": "https://drive.google.com/..."
    }
  ]
}
```

#### 5. 現在のリスク状況レポート（current_risks）

**目的**: 現時点でのリスク状況を要約する

**ISMS対応**:
- 9.1 監視・測定・分析・評価
- 9.3 マネジメントレビュー

**出力項目**:
```json
{
  "reportType": "current_risks",
  "generatedAt": "2025-11-30T15:00:00Z",
  "organization": {...},
  "summary": {
    "totalUsers": 50,
    "usersWithScans": 45,
    "usersWithoutScans": 5,
    "totalFiles": 123456,
    "riskySummary": {
      "critical": 10,
      "high": 45,
      "medium": 200,
      "low": 5000
    },
    "remediationRate": 85
  },
  "userBreakdown": [...]
}
```

---

## 審査対応チェックリスト

### ISMS審査前に準備すべきレポート

- [ ] 過去6ヶ月分のスキャン実施履歴レポート
- [ ] 直近のリスクアセスメントレポート
- [ ] 過去6ヶ月分の是正対応履歴レポート
- [ ] 現在の外部共有一覧レポート
- [ ] 現在のリスク状況レポート

### Pマーク審査前に準備すべきレポート

- [ ] 過去1年分のスキャン実施履歴レポート
- [ ] 直近のリスクアセスメントレポート（個人情報を含むファイルに注目）
- [ ] 過去1年分の是正対応履歴レポート
- [ ] 現在の外部共有一覧レポート

---

## 移行期限の注意事項

### ISO/IEC 27001:2022
- **移行期限**: 2025年10月31日
- 2013年版から2022年版への移行が必要
- 附属書Aの新規管理策（11項目）への対応が必要

### JIS Q 15001:2023
- 2023年9月に改正
- 構築・運用指針も同時に更新
- 新規取得・更新時は2023年版に準拠

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-11-30 | 1.0 | 初版作成 |
