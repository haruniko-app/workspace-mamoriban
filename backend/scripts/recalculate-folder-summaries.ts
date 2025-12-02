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
  isInternalOwner: boolean;
}

interface RiskySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface FolderSummary {
  id: string;
  name: string;
  parentFolderId: string | null;
  fileCount: number;
  riskySummary: RiskySummary;
  highestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  totalRiskScore: number;
  // 組織内オーナー用
  internalFileCount: number;
  internalRiskySummary: RiskySummary;
  internalTotalRiskScore: number;
  internalHighestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  // 組織外オーナー用
  externalFileCount: number;
  externalRiskySummary: RiskySummary;
  externalTotalRiskScore: number;
  externalHighestRiskLevel: 'critical' | 'high' | 'medium' | 'low';
}

function getHighestRiskLevel(summary: RiskySummary): 'critical' | 'high' | 'medium' | 'low' {
  if (summary.critical > 0) return 'critical';
  if (summary.high > 0) return 'high';
  if (summary.medium > 0) return 'medium';
  return 'low';
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
      // 全体の統計
      const riskySummary: RiskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
      let totalRiskScore = 0;

      // 組織内オーナーの統計
      const internalRiskySummary: RiskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
      let internalTotalRiskScore = 0;
      let internalFileCount = 0;

      // 組織外オーナーの統計
      const externalRiskySummary: RiskySummary = { critical: 0, high: 0, medium: 0, low: 0 };
      let externalTotalRiskScore = 0;
      let externalFileCount = 0;

      for (const file of folder.files) {
        // 全体
        riskySummary[file.riskLevel]++;
        totalRiskScore += file.riskScore;

        // 組織内/外別
        if (file.isInternalOwner) {
          internalRiskySummary[file.riskLevel]++;
          internalTotalRiskScore += file.riskScore;
          internalFileCount++;
        } else {
          externalRiskySummary[file.riskLevel]++;
          externalTotalRiskScore += file.riskScore;
          externalFileCount++;
        }
      }

      const summary: FolderSummary = {
        id: folderId,
        name: folder.name,
        parentFolderId: null, // 既存データからは親フォルダIDを取得できない
        fileCount: folder.files.length,
        riskySummary,
        highestRiskLevel: getHighestRiskLevel(riskySummary),
        totalRiskScore,
        // 組織内オーナー用
        internalFileCount,
        internalRiskySummary,
        internalTotalRiskScore,
        internalHighestRiskLevel: getHighestRiskLevel(internalRiskySummary),
        // 組織外オーナー用
        externalFileCount,
        externalRiskySummary,
        externalTotalRiskScore,
        externalHighestRiskLevel: getHighestRiskLevel(externalRiskySummary),
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
