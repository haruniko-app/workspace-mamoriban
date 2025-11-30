import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateRiskScore,
  getRiskLevel,
  calculateRiskSummary,
  getRiskLevelLabel,
  getIssueTypeLabel,
} from './risk.js';
import type { DriveFile } from './drive.js';

// テスト用のモックファイルを作成するヘルパー
function createMockFile(overrides: Partial<DriveFile> = {}): DriveFile {
  return {
    id: 'file-123',
    name: 'test-file.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/123',
    iconLink: null,
    createdTime: '2024-01-01T00:00:00.000Z',
    modifiedTime: '2024-06-01T00:00:00.000Z',
    size: '1024',
    owners: [{ email: 'owner@example.com', displayName: 'Owner' }],
    sharingUser: null,
    shared: false,
    permissions: [],
    ...overrides,
  };
}

describe('getRiskLevel', () => {
  it('returns critical for score >= 80', () => {
    expect(getRiskLevel(80)).toBe('critical');
    expect(getRiskLevel(100)).toBe('critical');
    expect(getRiskLevel(95)).toBe('critical');
  });

  it('returns high for score >= 60 and < 80', () => {
    expect(getRiskLevel(60)).toBe('high');
    expect(getRiskLevel(79)).toBe('high');
    expect(getRiskLevel(70)).toBe('high');
  });

  it('returns medium for score >= 40 and < 60', () => {
    expect(getRiskLevel(40)).toBe('medium');
    expect(getRiskLevel(59)).toBe('medium');
    expect(getRiskLevel(50)).toBe('medium');
  });

  it('returns low for score < 40', () => {
    expect(getRiskLevel(39)).toBe('low');
    expect(getRiskLevel(0)).toBe('low');
    expect(getRiskLevel(20)).toBe('low');
  });
});

describe('calculateRiskScore', () => {
  const organizationDomain = 'example.com';

  describe('public sharing (anyone)', () => {
    it('adds 40 points for public link sharing', () => {
      const file = createMockFile({
        permissions: [
          { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.issues.some((i) => i.type === 'public_sharing')).toBe(true);
      // 40 (public) + 15 (pdf) + external (20) + external_editor (15 if writer) = can be critical
      expect(['medium', 'high', 'critical']).toContain(result.level);
    });
  });

  describe('external sharing', () => {
    it('adds 20 points for external user sharing', () => {
      const file = createMockFile({
        mimeType: 'text/plain', // 機密ファイルタイプ以外
        permissions: [
          { id: '1', type: 'user', role: 'reader', emailAddress: 'external@other.com', domain: null, displayName: 'External User' },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'external_sharing')).toBe(true);
      const externalIssue = result.issues.find((i) => i.type === 'external_sharing');
      expect(externalIssue?.points).toBe(20);
    });

    it('does not add points for internal user sharing', () => {
      const file = createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'user', role: 'reader', emailAddress: 'colleague@example.com', domain: null, displayName: 'Colleague' },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'external_sharing')).toBe(false);
    });
  });

  describe('external editor', () => {
    it('adds 15 points for external user with write access', () => {
      const file = createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'user', role: 'writer', emailAddress: 'external@other.com', domain: null, displayName: 'External' },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'external_editor')).toBe(true);
      const editorIssue = result.issues.find((i) => i.type === 'external_editor');
      expect(editorIssue?.points).toBe(15);
    });

    it('does not add external_editor for external user with read-only access', () => {
      const file = createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'user', role: 'reader', emailAddress: 'external@other.com', domain: null, displayName: 'External' },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'external_editor')).toBe(false);
    });
  });

  describe('confidential file types', () => {
    it('adds 15 points for spreadsheet files', () => {
      const file = createMockFile({
        mimeType: 'application/vnd.google-apps.spreadsheet',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'confidential_type')).toBe(true);
      const typeIssue = result.issues.find((i) => i.type === 'confidential_type');
      expect(typeIssue?.points).toBe(15);
    });

    it('adds 15 points for PDF files', () => {
      const file = createMockFile({
        mimeType: 'application/pdf',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'confidential_type')).toBe(true);
    });

    it('adds 15 points for Excel files', () => {
      const file = createMockFile({
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'confidential_type')).toBe(true);
    });

    it('does not add points for non-confidential file types', () => {
      const file = createMockFile({
        mimeType: 'image/png',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'confidential_type')).toBe(false);
    });
  });

  describe('sensitive file names', () => {
    it('detects salary-related file names', () => {
      const file = createMockFile({
        name: '2024年度給与明細.xlsx',
        mimeType: 'text/plain',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'sensitive_content')).toBe(true);
    });

    it('detects contract-related file names', () => {
      const file = createMockFile({
        name: '取引先契約書_draft.docx',
        mimeType: 'text/plain',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'sensitive_content')).toBe(true);
    });

    it('detects password-related file names', () => {
      const file = createMockFile({
        name: 'パスワード一覧.txt',
        mimeType: 'text/plain',
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'sensitive_content')).toBe(true);
    });
  });

  describe('stale sharing', () => {
    it('adds 10 points for shared files not modified for over 1 year', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const file = createMockFile({
        mimeType: 'text/plain',
        shared: true,
        modifiedTime: oldDate.toISOString(),
        permissions: [
          { id: '1', type: 'user', role: 'reader', emailAddress: 'user@example.com', domain: null, displayName: null },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'stale_sharing')).toBe(true);
      const staleIssue = result.issues.find((i) => i.type === 'stale_sharing');
      expect(staleIssue?.points).toBe(10);
    });

    it('does not add points for recently modified shared files', () => {
      const file = createMockFile({
        mimeType: 'text/plain',
        shared: true,
        modifiedTime: new Date().toISOString(),
        permissions: [
          { id: '1', type: 'user', role: 'reader', emailAddress: 'user@example.com', domain: null, displayName: null },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'stale_sharing')).toBe(false);
    });

    it('does not add points for non-shared files', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const file = createMockFile({
        mimeType: 'text/plain',
        shared: false,
        modifiedTime: oldDate.toISOString(),
        permissions: [],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'stale_sharing')).toBe(false);
    });
  });

  describe('many shares', () => {
    it('adds 5 points when shared with more than 10 users', () => {
      const permissions = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        type: 'user' as const,
        role: 'reader' as const,
        emailAddress: `user${i}@example.com`,
        domain: null,
        displayName: `User ${i}`,
      }));

      const file = createMockFile({
        mimeType: 'text/plain',
        permissions,
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'many_shares')).toBe(true);
      const sharesIssue = result.issues.find((i) => i.type === 'many_shares');
      expect(sharesIssue?.points).toBe(5);
    });

    it('does not add points when shared with 10 or fewer users', () => {
      const permissions = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        type: 'user' as const,
        role: 'reader' as const,
        emailAddress: `user${i}@example.com`,
        domain: null,
        displayName: `User ${i}`,
      }));

      const file = createMockFile({
        mimeType: 'text/plain',
        permissions,
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.issues.some((i) => i.type === 'many_shares')).toBe(false);
    });
  });

  describe('score capping', () => {
    it('caps score at 100', () => {
      // Create a file with all possible risk factors
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const permissions = [
        { id: '1', type: 'anyone' as const, role: 'writer' as const, emailAddress: null, domain: null, displayName: null },
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `${i + 2}`,
          type: 'user' as const,
          role: 'writer' as const,
          emailAddress: `external${i}@other.com`,
          domain: null,
          displayName: `External ${i}`,
        })),
      ];

      const file = createMockFile({
        name: '給与マスタ_パスワード.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        shared: true,
        modifiedTime: oldDate.toISOString(),
        permissions,
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.score).toBe(100);
      expect(result.level).toBe('critical');
    });
  });

  describe('recommendations', () => {
    it('generates recommendations for each issue type', () => {
      const file = createMockFile({
        permissions: [
          { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
        ],
      });

      const result = calculateRiskScore(file, organizationDomain);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes('リンクを知っている全員'))).toBe(true);
    });
  });
});

describe('calculateRiskSummary', () => {
  const organizationDomain = 'example.com';

  it('correctly summarizes risk levels across multiple files', () => {
    const files: DriveFile[] = [
      createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
        ],
      }), // medium (40 points)
      createMockFile({
        mimeType: 'text/plain',
        permissions: [],
      }), // low (0 points)
      createMockFile({
        name: '給与一覧.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        permissions: [
          { id: '1', type: 'anyone', role: 'writer', emailAddress: null, domain: null, displayName: null },
        ],
      }), // critical
    ];

    const summary = calculateRiskSummary(files, organizationDomain);

    expect(summary.totalFiles).toBe(3);
    expect(summary.riskySummary.low).toBe(1);
    expect(summary.riskySummary.critical + summary.riskySummary.high + summary.riskySummary.medium).toBe(2);
  });

  it('calculates average score correctly', () => {
    const files: DriveFile[] = [
      createMockFile({ name: 'plain.txt', mimeType: 'text/plain', permissions: [] }), // 0 points
      createMockFile({ name: 'image.png', mimeType: 'image/png', permissions: [] }), // 0 points
    ];

    const summary = calculateRiskSummary(files, organizationDomain);

    // Both files are plain with no permissions, so average should be 0
    expect(summary.averageScore).toBe(0);
  });

  it('returns zero averageScore for empty file list', () => {
    const summary = calculateRiskSummary([], organizationDomain);

    expect(summary.totalFiles).toBe(0);
    expect(summary.averageScore).toBe(0);
  });

  it('identifies top issues correctly', () => {
    const files: DriveFile[] = [
      createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
        ],
      }),
      createMockFile({
        mimeType: 'text/plain',
        permissions: [
          { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
        ],
      }),
      createMockFile({
        mimeType: 'application/pdf',
        permissions: [],
      }),
    ];

    const summary = calculateRiskSummary(files, organizationDomain);

    expect(summary.topIssues.length).toBeGreaterThan(0);
    const publicSharingIssue = summary.topIssues.find((i) => i.type === 'public_sharing');
    expect(publicSharingIssue?.count).toBe(2);
  });
});

describe('label functions', () => {
  describe('getRiskLevelLabel', () => {
    it('returns correct Japanese labels', () => {
      expect(getRiskLevelLabel('critical')).toBe('緊急');
      expect(getRiskLevelLabel('high')).toBe('高');
      expect(getRiskLevelLabel('medium')).toBe('中');
      expect(getRiskLevelLabel('low')).toBe('低');
    });
  });

  describe('getIssueTypeLabel', () => {
    it('returns correct Japanese labels for known types', () => {
      expect(getIssueTypeLabel('public_sharing')).toBe('公開共有');
      expect(getIssueTypeLabel('external_sharing')).toBe('外部共有');
      expect(getIssueTypeLabel('external_editor')).toBe('外部編集権限');
      expect(getIssueTypeLabel('confidential_type')).toBe('機密ファイル形式');
      expect(getIssueTypeLabel('stale_sharing')).toBe('古い共有');
      expect(getIssueTypeLabel('many_shares')).toBe('多数共有');
    });

    it('returns the type itself for unknown types', () => {
      expect(getIssueTypeLabel('unknown_type')).toBe('unknown_type');
    });
  });
});
