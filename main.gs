/**
 * Workspace守り番 - メインエントリーポイント
 * Google Drive共有設定を可視化し、情報漏洩リスクを検出するツール
 * 
 * @author Workspace守り番
 * @version 0.1.0
 */

// ========================================
// 定数定義
// ========================================

const CONFIG = {
  // 実行時間制限（5.5分 = 330秒）余裕を持たせる
  MAX_EXECUTION_TIME_MS: 330000,
  
  // アラート閾値
  CRITICAL_THRESHOLD: 80,
  HIGH_THRESHOLD: 60,
  MEDIUM_THRESHOLD: 40,
  
  // スキャン設定
  DEFAULT_SCAN_INTERVAL_HOURS: 24,
  BATCH_SIZE: 100,
  
  // レポート設定
  REPORT_SHEET_NAME: 'リスクレポート',
  DASHBOARD_SHEET_NAME: 'ダッシュボード',
  
  // バージョン
  VERSION: '0.1.0'
};

// ========================================
// メニュー・UI
// ========================================

/**
 * スプレッドシートを開いた時に実行
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🛡️ Workspace守り番')
    .addItem('🔍 今すぐスキャン実行', 'runManualScan')
    .addItem('📊 ダッシュボード更新', 'updateDashboard')
    .addSeparator()
    .addItem('📧 週次レポート送信', 'sendWeeklyReport')
    .addItem('📄 ISMS監査レポート出力', 'generateISMSReport')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ 設定')
      .addItem('スキャン設定', 'showSettingsDialog')
      .addItem('アラート設定', 'showAlertSettingsDialog')
      .addItem('スケジュール設定', 'showScheduleDialog'))
    .addSeparator()
    .addItem('ℹ️ バージョン情報', 'showAbout')
    .addToUi();
}

/**
 * アドオンインストール時に実行
 */
function onInstall(e) {
  onOpen();
  showWelcomeDialog();
}

// ========================================
// スキャン機能
// ========================================

/**
 * 手動スキャンを実行
 */
function runManualScan() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    ui.alert('スキャン開始', 'スキャンを開始します。完了までしばらくお待ちください。', ui.ButtonSet.OK);
    
    const startTime = Date.now();
    const results = scanDriveFiles();
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    // 結果をスプレッドシートに書き込み
    writeResultsToSheet(results);
    
    // ダッシュボード更新
    updateDashboard();
    
    // 高リスクファイルがあればアラート
    const criticalFiles = results.filter(f => f.riskScore >= CONFIG.CRITICAL_THRESHOLD);
    if (criticalFiles.length > 0) {
      sendCriticalAlert(criticalFiles);
    }
    
    ui.alert(
      'スキャン完了',
      `スキャンが完了しました。\n\n` +
      `• スキャン対象: ${results.length} ファイル\n` +
      `• 高リスク: ${criticalFiles.length} ファイル\n` +
      `• 処理時間: ${duration} 秒`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    Logger.log('スキャンエラー: ' + error.message);
    ui.alert('エラー', 'スキャン中にエラーが発生しました: ' + error.message, ui.ButtonSet.OK);
  }
}

/**
 * Driveファイルをスキャン
 * @returns {Array} スキャン結果の配列
 */
function scanDriveFiles() {
  const startTime = Date.now();
  const results = [];
  
  // 前回の続きがあれば取得
  const continuationToken = PropertiesService.getScriptProperties().getProperty('SCAN_CONTINUATION_TOKEN');
  
  let files;
  if (continuationToken) {
    files = DriveApp.continueFileIterator(continuationToken);
    PropertiesService.getScriptProperties().deleteProperty('SCAN_CONTINUATION_TOKEN');
  } else {
    files = DriveApp.getFiles();
  }
  
  while (files.hasNext()) {
    // 実行時間チェック
    if (Date.now() - startTime > CONFIG.MAX_EXECUTION_TIME_MS) {
      // 続きを保存してトリガーを設定
      PropertiesService.getScriptProperties().setProperty('SCAN_CONTINUATION_TOKEN', files.getContinuationToken());
      scheduleContinueScan();
      Logger.log(`時間制限により中断。${results.length}件処理済み。続きをスケジュール。`);
      break;
    }
    
    const file = files.next();
    
    try {
      const fileData = analyzeFile(file);
      if (fileData) {
        results.push(fileData);
      }
    } catch (error) {
      Logger.log(`ファイル分析エラー (${file.getName()}): ${error.message}`);
    }
  }
  
  return results;
}

/**
 * 個別ファイルを分析
 * @param {File} file - Google Driveファイル
 * @returns {Object} 分析結果
 */
function analyzeFile(file) {
  const sharingAccess = file.getSharingAccess();
  const sharingPermission = file.getSharingPermission();
  const editors = file.getEditors();
  const viewers = file.getViewers();
  
  // 外部共有チェック
  const domain = Session.getEffectiveUser().getEmail().split('@')[1];
  const externalEditors = editors.filter(e => !e.getEmail().endsWith('@' + domain));
  const externalViewers = viewers.filter(v => !v.getEmail().endsWith('@' + domain));
  
  const fileData = {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    mimeType: file.getMimeType(),
    size: file.getSize(),
    created: file.getDateCreated(),
    lastUpdated: file.getLastUpdated(),
    owner: file.getOwner() ? file.getOwner().getEmail() : '不明',
    sharingAccess: sharingAccess.toString(),
    sharingPermission: sharingPermission.toString(),
    editorCount: editors.length,
    viewerCount: viewers.length,
    externalEditorCount: externalEditors.length,
    externalViewerCount: externalViewers.length,
    externalEmails: [...externalEditors, ...externalViewers].map(u => u.getEmail()),
    issues: [],
    riskScore: 0
  };
  
  // リスクスコア計算
  fileData.riskScore = calculateRiskScore(fileData);
  fileData.issues = identifyIssues(fileData);
  fileData.recommendation = generateRecommendation(fileData);
  
  return fileData;
}

// ========================================
// リスク計算
// ========================================

/**
 * リスクスコアを計算（0-100）
 * @param {Object} fileData - ファイルデータ
 * @returns {number} リスクスコア
 */
function calculateRiskScore(fileData) {
  let score = 0;
  
  // 共有設定によるスコア
  switch (fileData.sharingAccess) {
    case 'ANYONE':
      score += 40;  // 「リンクを知っている全員」
      break;
    case 'ANYONE_WITH_LINK':
      score += 35;  // リンクを知っている人
      break;
    case 'DOMAIN':
      score += 10;  // ドメイン内
      break;
    case 'DOMAIN_WITH_LINK':
      score += 15;  // ドメイン内（リンク）
      break;
    case 'PRIVATE':
      score += 0;   // プライベート
      break;
  }
  
  // 外部共有によるスコア
  if (fileData.externalEditorCount > 0) {
    score += 20;  // 外部者に編集権限
  } else if (fileData.externalViewerCount > 0) {
    score += 10;  // 外部者に閲覧権限
  }
  
  // 機密ファイルタイプによるスコア
  if (isConfidentialType(fileData.mimeType)) {
    score += 15;
  }
  
  // 最終更新からの経過日数
  const daysSinceUpdate = getDaysSince(fileData.lastUpdated);
  if (daysSinceUpdate > 365) {
    score += 10;  // 1年以上更新なし
  } else if (daysSinceUpdate > 180) {
    score += 5;   // 半年以上更新なし
  }
  
  // 共有者が多い場合
  if (fileData.editorCount + fileData.viewerCount > 20) {
    score += 5;
  }
  
  return Math.min(score, 100);
}

/**
 * 問題点を特定
 * @param {Object} fileData - ファイルデータ
 * @returns {Array} 問題点の配列
 */
function identifyIssues(fileData) {
  const issues = [];
  
  if (fileData.sharingAccess === 'ANYONE' || fileData.sharingAccess === 'ANYONE_WITH_LINK') {
    issues.push('インターネット上の誰でもアクセス可能');
  }
  
  if (fileData.externalEditorCount > 0) {
    issues.push(`外部ユーザー${fileData.externalEditorCount}名に編集権限`);
  }
  
  if (fileData.externalViewerCount > 0) {
    issues.push(`外部ユーザー${fileData.externalViewerCount}名に閲覧権限`);
  }
  
  const daysSinceUpdate = getDaysSince(fileData.lastUpdated);
  if (daysSinceUpdate > 365) {
    issues.push('1年以上更新されていない');
  }
  
  return issues;
}

/**
 * 改善提案を生成
 * @param {Object} fileData - ファイルデータ
 * @returns {string} 改善提案
 */
function generateRecommendation(fileData) {
  if (fileData.riskScore >= CONFIG.CRITICAL_THRESHOLD) {
    return '共有設定を「制限付き」に変更することを強く推奨します';
  } else if (fileData.riskScore >= CONFIG.HIGH_THRESHOLD) {
    return '共有範囲を見直し、必要最小限に制限してください';
  } else if (fileData.riskScore >= CONFIG.MEDIUM_THRESHOLD) {
    return '定期的に共有者リストを確認してください';
  }
  return '現在の設定で問題ありません';
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 機密性の高いファイルタイプか判定
 * @param {string} mimeType - MIMEタイプ
 * @returns {boolean} 機密性が高いかどうか
 */
function isConfidentialType(mimeType) {
  const confidentialTypes = [
    'application/vnd.google-apps.spreadsheet',  // スプレッドシート
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed'
  ];
  return confidentialTypes.includes(mimeType);
}

/**
 * 日付からの経過日数を計算
 * @param {Date} date - 日付
 * @returns {number} 経過日数
 */
function getDaysSince(date) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 継続スキャンをスケジュール
 */
function scheduleContinueScan() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'continueScan') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 1分後に継続
  ScriptApp.newTrigger('continueScan')
    .timeBased()
    .after(60000)
    .create();
}

/**
 * スキャンを継続
 */
function continueScan() {
  const results = scanDriveFiles();
  if (results.length > 0) {
    appendResultsToSheet(results);
  }
}

// ========================================
// スプレッドシート出力
// ========================================

/**
 * 結果をスプレッドシートに書き込み
 * @param {Array} results - スキャン結果
 */
function writeResultsToSheet(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.REPORT_SHEET_NAME);
  }
  
  // ヘッダー
  const headers = [
    'リスクスコア', 'ファイル名', 'オーナー', '共有設定', 
    '外部編集者', '外部閲覧者', '問題点', '推奨対応', 'URL', '最終更新'
  ];
  
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#4285f4');
  sheet.getRange(1, 1, 1, headers.length).setFontColor('white');
  
  // データ行
  const data = results.map(r => [
    r.riskScore,
    r.name,
    r.owner,
    r.sharingAccess,
    r.externalEditorCount,
    r.externalViewerCount,
    r.issues.join(', '),
    r.recommendation,
    r.url,
    Utilities.formatDate(r.lastUpdated, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')
  ]);
  
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, headers.length).setValues(data);
    
    // リスクスコアで条件付き書式
    const range = sheet.getRange(2, 1, data.length, 1);
    const rules = sheet.getConditionalFormatRules();
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(CONFIG.CRITICAL_THRESHOLD)
      .setBackground('#f4cccc')
      .setRanges([range])
      .build());
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(CONFIG.HIGH_THRESHOLD, CONFIG.CRITICAL_THRESHOLD - 1)
      .setBackground('#fce5cd')
      .setRanges([range])
      .build());
    
    sheet.setConditionalFormatRules(rules);
  }
  
  // 列幅調整
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 結果を追記
 * @param {Array} results - スキャン結果
 */
function appendResultsToSheet(results) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
  
  if (!sheet) {
    writeResultsToSheet(results);
    return;
  }
  
  const lastRow = sheet.getLastRow();
  const data = results.map(r => [
    r.riskScore,
    r.name,
    r.owner,
    r.sharingAccess,
    r.externalEditorCount,
    r.externalViewerCount,
    r.issues.join(', '),
    r.recommendation,
    r.url,
    Utilities.formatDate(r.lastUpdated, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')
  ]);
  
  if (data.length > 0) {
    sheet.getRange(lastRow + 1, 1, data.length, 10).setValues(data);
  }
}

// ========================================
// ダッシュボード
// ========================================

/**
 * ダッシュボードを更新
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
  
  if (!reportSheet) {
    SpreadsheetApp.getUi().alert('エラー', 'まずスキャンを実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  let dashSheet = ss.getSheetByName(CONFIG.DASHBOARD_SHEET_NAME);
  if (!dashSheet) {
    dashSheet = ss.insertSheet(CONFIG.DASHBOARD_SHEET_NAME, 0);
  }
  
  dashSheet.clear();
  
  // データ取得
  const data = reportSheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // 統計計算
  const totalFiles = rows.length;
  const criticalCount = rows.filter(r => r[0] >= CONFIG.CRITICAL_THRESHOLD).length;
  const highCount = rows.filter(r => r[0] >= CONFIG.HIGH_THRESHOLD && r[0] < CONFIG.CRITICAL_THRESHOLD).length;
  const mediumCount = rows.filter(r => r[0] >= CONFIG.MEDIUM_THRESHOLD && r[0] < CONFIG.HIGH_THRESHOLD).length;
  const lowCount = rows.filter(r => r[0] < CONFIG.MEDIUM_THRESHOLD).length;
  const avgScore = totalFiles > 0 ? Math.round(rows.reduce((sum, r) => sum + r[0], 0) / totalFiles) : 0;
  
  // ダッシュボード描画
  dashSheet.getRange('A1').setValue('🛡️ Workspace守り番 ダッシュボード');
  dashSheet.getRange('A1').setFontSize(18).setFontWeight('bold');
  
  dashSheet.getRange('A3').setValue('最終スキャン: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'));
  
  // サマリーカード
  const summaryData = [
    ['📁 総ファイル数', totalFiles],
    ['🔴 高リスク (80+)', criticalCount],
    ['🟠 要注意 (60-79)', highCount],
    ['🟡 中リスク (40-59)', mediumCount],
    ['🟢 低リスク (0-39)', lowCount],
    ['📊 平均リスクスコア', avgScore]
  ];
  
  dashSheet.getRange('A5:B10').setValues(summaryData);
  dashSheet.getRange('A5:A10').setFontWeight('bold');
  dashSheet.getRange('B5:B10').setHorizontalAlignment('right');
  
  // グラフ用データ
  dashSheet.getRange('D5').setValue('リスク分布');
  dashSheet.getRange('D5').setFontWeight('bold');
  dashSheet.getRange('D6:E9').setValues([
    ['高リスク', criticalCount],
    ['要注意', highCount],
    ['中リスク', mediumCount],
    ['低リスク', lowCount]
  ]);
  
  // 円グラフ作成
  const chartBuilder = dashSheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(dashSheet.getRange('D6:E9'))
    .setPosition(5, 7, 0, 0)
    .setOption('title', 'リスク分布')
    .setOption('colors', ['#cc0000', '#ff9900', '#ffcc00', '#109618']);
  
  dashSheet.insertChart(chartBuilder.build());
  
  // 列幅調整
  dashSheet.setColumnWidth(1, 200);
  dashSheet.setColumnWidth(2, 100);
}

// ========================================
// アラート・レポート
// ========================================

/**
 * 高リスクアラートを送信
 * @param {Array} files - 高リスクファイルの配列
 */
function sendCriticalAlert(files) {
  const recipient = Session.getActiveUser().getEmail();
  const subject = '【緊急】高リスク共有設定が検出されました - Workspace守り番';
  
  let body = `
このメールはWorkspace守り番からの自動通知です。

以下の${files.length}件のファイルで高リスクな共有設定が検出されました。
早急にご確認ください。

${'='.repeat(50)}

`;

  files.forEach((f, i) => {
    body += `
【${i + 1}】${f.name}
  リスクスコア: ${f.riskScore}点
  問題点: ${f.issues.join(', ')}
  推奨対応: ${f.recommendation}
  URL: ${f.url}

`;
  });

  body += `
${'='.repeat(50)}

詳細はダッシュボードをご確認ください。

--
Workspace守り番 v${CONFIG.VERSION}
`;

  GmailApp.sendEmail(recipient, subject, body);
  Logger.log(`アラートメール送信: ${recipient}`);
}

/**
 * 週次レポートを送信
 */
function sendWeeklyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
  
  if (!reportSheet) {
    SpreadsheetApp.getUi().alert('エラー', 'まずスキャンを実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const recipient = Session.getActiveUser().getEmail();
  const subject = '【週次レポート】Google Drive共有設定サマリー - Workspace守り番';
  
  // データ取得
  const data = reportSheet.getDataRange().getValues();
  const rows = data.slice(1);
  
  const totalFiles = rows.length;
  const criticalCount = rows.filter(r => r[0] >= CONFIG.CRITICAL_THRESHOLD).length;
  const highCount = rows.filter(r => r[0] >= CONFIG.HIGH_THRESHOLD && r[0] < CONFIG.CRITICAL_THRESHOLD).length;
  const avgScore = totalFiles > 0 ? Math.round(rows.reduce((sum, r) => sum + r[0], 0) / totalFiles) : 0;
  
  const body = `
このメールはWorkspace守り番からの週次レポートです。

【サマリー】
• 総スキャンファイル数: ${totalFiles}件
• 高リスクファイル数: ${criticalCount}件
• 要注意ファイル数: ${highCount}件
• 平均リスクスコア: ${avgScore}点

【前週からの変化】
（この機能は今後追加予定です）

詳細はダッシュボードをご確認ください。
${ss.getUrl()}

--
Workspace守り番 v${CONFIG.VERSION}
`;

  GmailApp.sendEmail(recipient, subject, body);
  SpreadsheetApp.getUi().alert('送信完了', '週次レポートを送信しました。', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * ISMS監査レポートを生成
 */
function generateISMSReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reportSheet = ss.getSheetByName(CONFIG.REPORT_SHEET_NAME);
  
  if (!reportSheet) {
    SpreadsheetApp.getUi().alert('エラー', 'まずスキャンを実行してください。', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  // PDFとして出力
  const folder = DriveApp.getRootFolder();
  const fileName = `ISMS監査レポート_${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmm')}.pdf`;
  
  const url = ss.getUrl().replace(/edit.*$/, '') + 
    'export?format=pdf' +
    '&gid=' + reportSheet.getSheetId() +
    '&portrait=false' +
    '&size=A4';
  
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  
  const pdf = folder.createFile(response.getBlob().setName(fileName));
  
  SpreadsheetApp.getUi().alert(
    'レポート生成完了',
    `ISMS監査レポートを生成しました。\n\nファイル: ${fileName}\n場所: マイドライブ`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ========================================
// ダイアログ
// ========================================

/**
 * ウェルカムダイアログを表示
 */
function showWelcomeDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px;">
      <h2 style="color: #1a73e8;">🛡️ Workspace守り番へようこそ！</h2>
      <p>Google Driveの共有設定を可視化し、情報漏洩リスクを検出するツールです。</p>
      
      <h3>🚀 はじめかた</h3>
      <ol>
        <li>メニュー「Workspace守り番」→「今すぐスキャン実行」</li>
        <li>スキャン完了後、「ダッシュボード」シートで結果を確認</li>
        <li>高リスクファイルは自動でメール通知されます</li>
      </ol>
      
      <h3>📊 機能</h3>
      <ul>
        <li>共有設定の全体可視化</li>
        <li>リスクスコアによる優先順位付け</li>
        <li>週次レポート自動送信</li>
        <li>ISMS/Pマーク監査対応レポート</li>
      </ul>
      
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        バージョン ${CONFIG.VERSION}
      </p>
    </div>
  `)
  .setWidth(400)
  .setHeight(400);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Workspace守り番');
}

/**
 * バージョン情報を表示
 */
function showAbout() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px; text-align: center;">
      <h2 style="color: #1a73e8;">🛡️ Workspace守り番</h2>
      <p>バージョン ${CONFIG.VERSION}</p>
      <p style="color: #666;">Google Workspace向けセキュリティ可視化ツール</p>
      <hr>
      <p style="font-size: 12px; color: #666;">
        © 2025 Workspace守り番<br>
        <a href="https://github.com/haruniko-app/workspace-mamoriban" target="_blank">GitHub</a>
      </p>
    </div>
  `)
  .setWidth(300)
  .setHeight(200);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'バージョン情報');
}

/**
 * 設定ダイアログを表示
 */
function showSettingsDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px;">
      <h3>⚙️ スキャン設定</h3>
      <p style="color: #666;">（この機能は今後追加予定です）</p>
      <ul>
        <li>スキャン対象フォルダの指定</li>
        <li>除外パターンの設定</li>
        <li>ファイルタイプフィルター</li>
      </ul>
    </div>
  `)
  .setWidth(400)
  .setHeight(250);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'スキャン設定');
}

/**
 * アラート設定ダイアログを表示
 */
function showAlertSettingsDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px;">
      <h3>📧 アラート設定</h3>
      <p style="color: #666;">（この機能は今後追加予定です）</p>
      <ul>
        <li>アラート閾値の変更</li>
        <li>通知先メールアドレスの追加</li>
        <li>Slack連携</li>
      </ul>
    </div>
  `)
  .setWidth(400)
  .setHeight(250);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'アラート設定');
}

/**
 * スケジュール設定ダイアログを表示
 */
function showScheduleDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="font-family: 'Google Sans', sans-serif; padding: 20px;">
      <h3>⏰ スケジュール設定</h3>
      <p style="color: #666;">（この機能は今後追加予定です）</p>
      <ul>
        <li>自動スキャンの間隔設定</li>
        <li>週次レポートの曜日・時刻</li>
        <li>月次レポートの日付</li>
      </ul>
    </div>
  `)
  .setWidth(400)
  .setHeight(250);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'スケジュール設定');
}
