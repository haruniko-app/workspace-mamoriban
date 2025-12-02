/**
 * 既存スキャンのフォルダサマリーを再計算するスクリプト
 * Usage: npx tsx scripts/recalculate-folder-summaries.ts <scanId>
 */
import { Firestore } from '@google-cloud/firestore';

interface ScannedFile {
  id: string;
  parentFolderId: string | null;
  parentFolderName: string | null;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface FolderSummary {
  id: string;
  name: string;
  fileCount: number;
  riskySummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  highestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  totalRiskScore: number;
}

async function recalculateFolderSummaries(scanId: string): Promise<number> {
  const firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'workspace-mamoriban',
  });

  const scansRef = firestore.collection('scans');
  const filesRef = scansRef.doc(scanId).collection('files');
  const summariesRef = scansRef.doc(scanId).collection('folderSummaries');

  console.log(`Fetching files for scan ${scanId}...`);

  // 全ファイルを取得
  const snapshot = await filesRef.get();
  const files = snapshot.docs.map((doc) => doc.data() as ScannedFile);

  console.log(`Found ${files.length} files`);

  // フォルダごとにグループ化
  const folderMap = new Map<string, {
    id: string;
    name: string;
    files: ScannedFile[];
  }>();

  for (const file of files) {
    const folderId = file.parentFolderId || 'root';
    const folderName = file.parentFolderName || 'マイドライブ';

    if (!folderMap.has(folderId)) {
      folderMap.set(folderId, {
        id: folderId,
        name: folderName,
        files: [],
      });
    }
    folderMap.get(folderId)!.files.push(file);
  }

  console.log(`Found ${folderMap.size} folders`);

  // バッチ書き込み（500件ずつ）
  const BATCH_SIZE = 500;
  const folderEntries = Array.from(folderMap.entries());

  for (let i = 0; i < folderEntries.length; i += BATCH_SIZE) {
    const batch = firestore.batch();
    const chunk = folderEntries.slice(i, i + BATCH_SIZE);

    for (const [folderId, folder] of chunk) {
      const riskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
      let totalRiskScore = 0;

      for (const file of folder.files) {
        riskySummary[file.riskLevel]++;
        totalRiskScore += file.riskScore;
      }

      // 最高リスクレベルを決定
      let highestRiskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (riskySummary.critical > 0) highestRiskLevel = 'critical';
      else if (riskySummary.high > 0) highestRiskLevel = 'high';
      else if (riskySummary.medium > 0) highestRiskLevel = 'medium';

      const summary: FolderSummary = {
        id: folderId,
        name: folder.name,
        fileCount: folder.files.length,
        riskySummary,
        highestRiskLevel,
        totalRiskScore,
      };

      batch.set(summariesRef.doc(folderId), summary);
    }

    await batch.commit();
    console.log(`Saved ${Math.min(i + BATCH_SIZE, folderEntries.length)} / ${folderEntries.length} folder summaries`);
  }

  return folderMap.size;
}

// メイン処理
const scanId = process.argv[2];

if (!scanId) {
  console.error('Usage: npx tsx scripts/recalculate-folder-summaries.ts <scanId>');
  process.exit(1);
}

console.log(`Recalculating folder summaries for scan: ${scanId}`);

recalculateFolderSummaries(scanId)
  .then((count) => {
    console.log(`\nDone! Calculated ${count} folder summaries.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
