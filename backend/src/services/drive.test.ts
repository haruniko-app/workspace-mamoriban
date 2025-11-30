import { describe, it, expect } from 'vitest';
import { isPubliclyShared, hasExternalSharing, hasExternalEditor } from './drive.js';
import type { DriveFile, DrivePermission } from './drive.js';

function createMockFile(permissions: DrivePermission[]): DriveFile {
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
    shared: permissions.length > 0,
    permissions,
  };
}

describe('isPubliclyShared', () => {
  it('returns true when anyone permission exists', () => {
    const file = createMockFile([
      { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
    ]);
    expect(isPubliclyShared(file)).toBe(true);
  });

  it('returns false when no anyone permission exists', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'reader', emailAddress: 'user@example.com', domain: null, displayName: null },
    ]);
    expect(isPubliclyShared(file)).toBe(false);
  });

  it('returns false for empty permissions', () => {
    const file = createMockFile([]);
    expect(isPubliclyShared(file)).toBe(false);
  });
});

describe('hasExternalSharing', () => {
  const orgDomain = 'example.com';

  it('returns true for anyone permission', () => {
    const file = createMockFile([
      { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(true);
  });

  it('returns true for external domain sharing', () => {
    const file = createMockFile([
      { id: '1', type: 'domain', role: 'reader', emailAddress: null, domain: 'other.com', displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(true);
  });

  it('returns false for same domain sharing', () => {
    const file = createMockFile([
      { id: '1', type: 'domain', role: 'reader', emailAddress: null, domain: 'example.com', displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(false);
  });

  it('returns true for external user', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'reader', emailAddress: 'user@other.com', domain: null, displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(true);
  });

  it('returns false for internal user', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'reader', emailAddress: 'user@example.com', domain: null, displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(false);
  });

  it('returns true for external group', () => {
    const file = createMockFile([
      { id: '1', type: 'group', role: 'reader', emailAddress: 'group@other.com', domain: null, displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(true);
  });

  it('returns false for internal group', () => {
    const file = createMockFile([
      { id: '1', type: 'group', role: 'reader', emailAddress: 'group@example.com', domain: null, displayName: null },
    ]);
    expect(hasExternalSharing(file, orgDomain)).toBe(false);
  });
});

describe('hasExternalEditor', () => {
  const orgDomain = 'example.com';

  it('returns true for anyone with writer role', () => {
    const file = createMockFile([
      { id: '1', type: 'anyone', role: 'writer', emailAddress: null, domain: null, displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(true);
  });

  it('returns false for anyone with reader role', () => {
    const file = createMockFile([
      { id: '1', type: 'anyone', role: 'reader', emailAddress: null, domain: null, displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(false);
  });

  it('returns true for external user with writer role', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'writer', emailAddress: 'user@other.com', domain: null, displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(true);
  });

  it('returns false for external user with reader role', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'reader', emailAddress: 'user@other.com', domain: null, displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(false);
  });

  it('returns false for internal user with writer role', () => {
    const file = createMockFile([
      { id: '1', type: 'user', role: 'writer', emailAddress: 'user@example.com', domain: null, displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(false);
  });

  it('returns true for external domain with organizer role', () => {
    const file = createMockFile([
      { id: '1', type: 'domain', role: 'organizer', emailAddress: null, domain: 'other.com', displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(true);
  });

  it('returns true for external domain with fileOrganizer role', () => {
    const file = createMockFile([
      { id: '1', type: 'domain', role: 'fileOrganizer', emailAddress: null, domain: 'other.com', displayName: null },
    ]);
    expect(hasExternalEditor(file, orgDomain)).toBe(true);
  });
});
