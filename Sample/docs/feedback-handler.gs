/**
 * Designer's Palette - Feedback Handler
 *
 * このスクリプトをGoogle Apps Scriptにデプロイして、
 * フィードバックをスプレッドシートに蓄積し、GitHub Issueを自動作成します。
 *
 * セットアップ:
 * 1. Google スプレッドシートを作成
 * 2. ツール → スクリプトエディタ でこのコードを貼り付け
 * 3. SPREADSHEET_ID と GITHUB_TOKEN を設定
 * 4. デプロイ → ウェブアプリとしてデプロイ（アクセス: 全員）
 */

// ===== 設定 =====
const CONFIG = {
  SPREADSHEET_ID: '19uSbstR0lbP4Hq50jzZADR3cQZr-Grh1nuTtGuwvn-Y', // スプレッドシートのID
  SHEET_NAME: 'Feedback',
  GITHUB_OWNER: 'haruniko-app',
  GITHUB_REPO: 'Designers-palette',
  GITHUB_TOKEN: 'YOUR_GITHUB_TOKEN' // GitHub Personal Access Token (repo権限) ← ここに新しいトークンを設定
};

/**
 * POSTリクエストを処理
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // スプレッドシートに保存
    saveFeedback(data);

    // GitHub Issueを作成
    createGitHubIssue(data);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Feedback received'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GETリクエスト（CORS対応）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Feedback API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * フィードバックをスプレッドシートに保存
 */
function saveFeedback(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // シートがなければ作成
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Issue Type', 'Features', 'Description',
      'Expected', 'Email', 'Browser', 'Source', 'GitHub Issue'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  // データを追加
  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.issueType || '',
    data.features || '',
    data.description || '',
    data.expected || '',
    data.email || '',
    data.browser || '',
    data.source || 'web',
    '' // GitHub Issue URL (後で更新)
  ]);

  return sheet.getLastRow();
}

/**
 * GitHub Issueを作成
 */
function createGitHubIssue(data) {
  if (CONFIG.GITHUB_TOKEN === 'YOUR_GITHUB_TOKEN') {
    console.log('GitHub Token not configured, skipping issue creation');
    return null;
  }

  const labels = ['user-feedback'];
  if (data.issueType === 'bug') labels.push('bug');
  if (data.issueType === 'feature') labels.push('enhancement');
  if (data.issueType === 'performance') labels.push('performance');
  if (data.issueType === 'ui') labels.push('ui/ux');

  const title = `[Feedback] ${data.issueType || 'General'}: ${(data.description || '').substring(0, 50)}...`;

  const body = `
## Issue Type
${data.issueType || 'Not specified'}

## Affected Features
${data.features || 'Not specified'}

## Description
${data.description || 'No description provided'}

## Expected Behavior
${data.expected || 'Not specified'}

## Environment
- **Browser:** ${data.browser || 'Not specified'}
- **Source:** ${data.source || 'web'}
- **Submitted:** ${data.timestamp || new Date().toISOString()}

## Contact
${data.email ? `Email: ${data.email}` : 'No contact provided'}

---
*This issue was automatically created from user feedback.*
  `.trim();

  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/issues`;

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      title: title,
      body: body,
      labels: labels
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  if (result.html_url) {
    // スプレッドシートにIssue URLを追記
    updateIssueUrl(result.html_url);
  }

  return result;
}

/**
 * スプレッドシートの最終行にIssue URLを追記
 */
function updateIssueUrl(issueUrl) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 9).setValue(issueUrl);
}

/**
 * フィードバックをMarkdownでエクスポート（手動実行用）
 */
function exportFeedbackToMarkdown() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  let md = '# User Feedback Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // ヘッダーをスキップ
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    md += `## #${i} - ${row[1]} (${row[0]})\n\n`;
    md += `**Features:** ${row[2] || 'N/A'}\n\n`;
    md += `**Description:**\n${row[3] || 'N/A'}\n\n`;
    md += `**Expected:**\n${row[4] || 'N/A'}\n\n`;
    md += `**Browser:** ${row[6] || 'N/A'}\n\n`;
    if (row[8]) md += `**GitHub Issue:** ${row[8]}\n\n`;
    md += '---\n\n';
  }

  console.log(md);
  return md;
}

/**
 * フィードバックをJSONでエクスポート（手動実行用）
 */
function exportFeedbackToJSON() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const feedbacks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const feedback = {};
    headers.forEach((h, idx) => {
      feedback[h.toLowerCase().replace(/\s+/g, '_')] = row[idx];
    });
    feedbacks.push(feedback);
  }

  const json = JSON.stringify(feedbacks, null, 2);
  console.log(json);
  return json;
}
