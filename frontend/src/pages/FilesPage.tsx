import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scanApi, type ScannedFile, type FolderSummary, type FolderPathItem, type BulkOperationResult } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

type BulkAction = 'remove-public' | 'demote-editors' | 'delete-external';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
type OwnerType = 'all' | 'internal' | 'external';
type ViewMode = 'files' | 'folders';

const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: '緊急', color: 'text-[#c5221f]', bgColor: 'bg-[#fce8e6]', borderColor: 'border-[#c5221f]' },
  high: { label: '高', color: 'text-[#e37400]', bgColor: 'bg-[#fef7e0]', borderColor: 'border-[#e37400]' },
  medium: { label: '中', color: 'text-[#f9ab00]', bgColor: 'bg-[#fef7e0]', borderColor: 'border-[#f9ab00]' },
  low: { label: '低', color: 'text-[#137333]', bgColor: 'bg-[#e6f4ea]', borderColor: 'border-[#137333]' },
};

function FileDetailModal({
  file,
  onClose,
  scanId,
  onPermissionChange,
}: {
  file: ScannedFile;
  onClose: () => void;
  scanId: string;
  onPermissionChange?: () => void;
}) {
  const config = RISK_LEVEL_CONFIG[file.riskLevel];
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'demote';
    permissionId: string;
    permissionLabel: string;
    folderId?: string;
  } | null>(null);
  const [operationResult, setOperationResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderPathItem | null>(null);

  // Fetch folder path
  const { data: folderPathData, isLoading: isFolderPathLoading } = useQuery({
    queryKey: ['folderPath', scanId, file.id],
    queryFn: () => scanApi.getFolderPath(scanId, file.id),
  });

  const folderPath = folderPathData?.folderPath || [];

  // Permission delete mutation
  const deleteMutation = useMutation({
    mutationFn: ({ permissionId }: { permissionId: string }) =>
      scanApi.deletePermission(scanId, file.id, permissionId),
    onSuccess: () => {
      setOperationResult({ type: 'success', message: '権限を削除しました' });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scanFolders'] });
      onPermissionChange?.();
      setTimeout(() => setOperationResult(null), 3000);
    },
    onError: (error) => {
      setOperationResult({ type: 'error', message: error instanceof Error ? error.message : '権限の削除に失敗しました' });
    },
  });

  // Permission demote mutation
  const demoteMutation = useMutation({
    mutationFn: ({ permissionId }: { permissionId: string }) =>
      scanApi.updatePermissionRole(scanId, file.id, permissionId, 'reader'),
    onSuccess: () => {
      setOperationResult({ type: 'success', message: '閲覧者に変更しました' });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scanFolders'] });
      onPermissionChange?.();
      setTimeout(() => setOperationResult(null), 3000);
    },
    onError: (error) => {
      setOperationResult({ type: 'error', message: error instanceof Error ? error.message : '権限の変更に失敗しました' });
    },
  });

  // Folder permission delete mutation
  const folderDeleteMutation = useMutation({
    mutationFn: ({ folderId, permissionId }: { folderId: string; permissionId: string }) =>
      scanApi.deleteFolderPermission(scanId, folderId, permissionId),
    onSuccess: () => {
      setOperationResult({ type: 'success', message: 'フォルダ権限を削除しました' });
      queryClient.invalidateQueries({ queryKey: ['folderPath'] });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scanFolders'] });
      setTimeout(() => setOperationResult(null), 3000);
    },
    onError: (error) => {
      setOperationResult({ type: 'error', message: error instanceof Error ? error.message : 'フォルダ権限の削除に失敗しました' });
    },
  });

  // Folder permission demote mutation
  const folderDemoteMutation = useMutation({
    mutationFn: ({ folderId, permissionId }: { folderId: string; permissionId: string }) =>
      scanApi.updateFolderPermissionRole(scanId, folderId, permissionId, 'reader'),
    onSuccess: () => {
      setOperationResult({ type: 'success', message: 'フォルダ権限を閲覧者に変更しました' });
      queryClient.invalidateQueries({ queryKey: ['folderPath'] });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scanFolders'] });
      setTimeout(() => setOperationResult(null), 3000);
    },
    onError: (error) => {
      setOperationResult({ type: 'error', message: error instanceof Error ? error.message : 'フォルダ権限の変更に失敗しました' });
    },
  });

  const handleConfirm = () => {
    if (!confirmDialog) return;
    if (confirmDialog.folderId) {
      // Folder permission operation
      if (confirmDialog.type === 'delete') {
        folderDeleteMutation.mutate({ folderId: confirmDialog.folderId, permissionId: confirmDialog.permissionId });
      } else {
        folderDemoteMutation.mutate({ folderId: confirmDialog.folderId, permissionId: confirmDialog.permissionId });
      }
    } else {
      // File permission operation
      if (confirmDialog.type === 'delete') {
        deleteMutation.mutate({ permissionId: confirmDialog.permissionId });
      } else {
        demoteMutation.mutate({ permissionId: confirmDialog.permissionId });
      }
    }
    setConfirmDialog(null);
  };

  const isLoading = deleteMutation.isPending || demoteMutation.isPending || folderDeleteMutation.isPending || folderDemoteMutation.isPending;

  // Google Drive共有設定URLを生成
  const getShareUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  };

  // Check if permission can be modified (not owner)
  const canModifyPermission = (perm: ScannedFile['permissions'][0]) => {
    return perm.role !== 'owner' && file.isInternalOwner;
  };

  // Check if permission can be demoted (only writers can be demoted)
  const canDemotePermission = (perm: ScannedFile['permissions'][0]) => {
    return ['writer', 'organizer', 'fileOrganizer'].includes(perm.role);
  };

  // Get permission label for confirmation dialog
  const getPermissionLabel = (perm: ScannedFile['permissions'][0]) => {
    if (perm.type === 'anyone') return 'リンクを知っている全員';
    if (perm.type === 'domain') return `${perm.domain} のすべてのユーザー`;
    return perm.displayName || perm.emailAddress || 'ユーザー';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-white rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#dadce0]">
          <div className="flex items-center gap-3">
            {file.iconLink ? (
              <img src={file.iconLink} alt="" className="w-8 h-8" />
            ) : (
              <div className="w-8 h-8 bg-[#f1f3f4] rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-lg font-medium text-[#202124] line-clamp-1">{file.name}</h2>
              <p className="text-sm text-[#5f6368]">{file.ownerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
          >
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Operation Result Toast */}
        {operationResult && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
            operationResult.type === 'success' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'
          }`}>
            {operationResult.type === 'success' ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
            <span className="text-sm">{operationResult.message}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Folder Path Breadcrumb - Google Drive Style */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            <svg className="w-4 h-4 text-[#5f6368] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
            {isFolderPathLoading ? (
              <span className="text-[#5f6368]">読み込み中...</span>
            ) : folderPath.length === 0 ? (
              <span className="text-[#5f6368]">マイドライブ</span>
            ) : (
              <>
                {/* Show ellipsis if path is deep (more than 3 levels) */}
                {folderPath.length > 3 && (
                  <>
                    <button
                      onClick={() => setSelectedFolder(folderPath[0])}
                      className="px-2 py-1 text-[#5f6368] hover:bg-[#f1f3f4] rounded transition-colors"
                      title={folderPath[0].name}
                    >
                      ...
                    </button>
                    <span className="text-[#5f6368]">&gt;</span>
                  </>
                )}
                {/* Show last 3 folders (or all if less than 3) */}
                {(folderPath.length > 3 ? folderPath.slice(-3) : folderPath).map((folder, index, arr) => (
                  <div key={folder.id} className="flex items-center gap-1">
                    {index > 0 && <span className="text-[#5f6368]">&gt;</span>}
                    <button
                      onClick={() => setSelectedFolder(folder)}
                      className={`px-2 py-1 rounded transition-colors max-w-[150px] truncate ${
                        selectedFolder?.id === folder.id
                          ? 'bg-[#e8f0fe] text-[#1a73e8]'
                          : 'text-[#5f6368] hover:bg-[#f1f3f4]'
                      }`}
                      title={folder.name}
                    >
                      {folder.name}
                    </button>
                    {/* Show dropdown on last folder */}
                    {index === arr.length - 1 && (
                      <a
                        href={`https://drive.google.com/drive/folders/${folder.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-[#5f6368] hover:bg-[#f1f3f4] rounded transition-colors"
                        title="Google Driveで開く"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Selected Folder Permissions */}
          {selectedFolder && (
            <div className="bg-[#f8f9fa] rounded-lg p-4 border border-[#dadce0]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                  <span className="font-medium text-[#202124]">{selectedFolder.name}</span>
                  <a
                    href={`https://drive.google.com/drive/folders/${selectedFolder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1a73e8] hover:underline text-sm"
                  >
                    開く
                  </a>
                </div>
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="p-1 text-[#5f6368] hover:bg-[#e8eaed] rounded-full transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-[#5f6368] mb-2">フォルダの共有設定</p>
              <div className="space-y-1">
                {selectedFolder.permissions.length === 0 ? (
                  <p className="text-sm text-[#5f6368]">権限情報がありません</p>
                ) : (
                  selectedFolder.permissions.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2 text-sm bg-white rounded px-2 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-[#dadce0] flex items-center justify-center flex-shrink-0">
                        {perm.type === 'anyone' ? (
                          <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                          </svg>
                        ) : perm.type === 'domain' ? (
                          <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1 truncate text-[#202124]">
                        {perm.type === 'anyone'
                          ? 'リンクを知っている全員'
                          : perm.type === 'domain'
                          ? `${perm.domain} のすべてのユーザー`
                          : perm.displayName || perm.emailAddress || 'ユーザー'}
                      </span>
                      <span className="text-[#5f6368] text-xs">
                        {perm.role === 'owner'
                          ? 'オーナー'
                          : perm.role === 'writer' || perm.role === 'organizer' || perm.role === 'fileOrganizer'
                          ? '編集者'
                          : perm.role === 'commenter'
                          ? 'コメント可'
                          : '閲覧者'}
                      </span>
                      {/* Folder Permission Action Buttons */}
                      {perm.role !== 'owner' && file.isInternalOwner && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {['writer', 'organizer', 'fileOrganizer'].includes(perm.role) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDialog({
                                  type: 'demote',
                                  permissionId: perm.id,
                                  permissionLabel: getPermissionLabel(perm),
                                  folderId: selectedFolder.id,
                                });
                              }}
                              disabled={isLoading}
                              className="p-1 text-[#5f6368] hover:bg-[#e8eaed] rounded transition-colors disabled:opacity-50"
                              title="閲覧者に変更"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h3l-4-4-4 4h3v6z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                type: 'delete',
                                permissionId: perm.id,
                                permissionLabel: getPermissionLabel(perm),
                                folderId: selectedFolder.id,
                              });
                            }}
                            disabled={isLoading}
                            className="p-1 text-[#c5221f] hover:bg-[#fce8e6] rounded transition-colors disabled:opacity-50"
                            title="アクセスを削除"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Risk Score */}
          <div className={`${config.bgColor} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${config.color}`}>リスクスコア</span>
              <span className={`text-2xl font-bold ${config.color}`}>{file.riskScore}点</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(file.riskScore, 3)}%`,
                  backgroundColor: file.riskLevel === 'critical' ? '#c5221f' :
                    file.riskLevel === 'high' ? '#e37400' :
                    file.riskLevel === 'medium' ? '#f9ab00' : '#137333'
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">{file.riskScore} / 100</p>
          </div>

          {/* Risk Factors */}
          {file.riskFactors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#202124] mb-3">検出されたリスク</h3>
              <div className="space-y-2">
                {file.riskFactors.map((factor, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 ${config.bgColor} rounded-lg`}>
                    <svg className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                    <span className={`text-sm ${config.color}`}>{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {file.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#202124] mb-3">改善提案</h3>
              <div className="space-y-2">
                {file.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[#e8f0fe] rounded-lg">
                    <svg className="w-5 h-5 text-[#1a73e8] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
                    </svg>
                    <span className="text-sm text-[#1a73e8]">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#202124]">共有設定</h3>
              {!file.isInternalOwner && (
                <span className="text-xs text-[#5f6368] bg-[#f1f3f4] px-2 py-1 rounded">
                  外部オーナーのファイルは編集できません
                </span>
              )}
            </div>
            <div className="space-y-2">
              {file.permissions.map((perm) => (
                <div key={perm.id} className="flex items-center gap-3 p-3 bg-[#f8f9fa] rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-[#dadce0] flex items-center justify-center flex-shrink-0">
                    {perm.type === 'anyone' ? (
                      <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                      </svg>
                    ) : perm.type === 'domain' ? (
                      <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#202124] truncate">
                      {perm.type === 'anyone'
                        ? 'リンクを知っている全員'
                        : perm.type === 'domain'
                        ? `${perm.domain} のすべてのユーザー`
                        : perm.displayName || perm.emailAddress || 'ユーザー'}
                    </p>
                    <p className="text-xs text-[#5f6368]">
                      {perm.role === 'owner'
                        ? 'オーナー'
                        : perm.role === 'writer' || perm.role === 'organizer' || perm.role === 'fileOrganizer'
                        ? '編集者'
                        : perm.role === 'commenter'
                        ? 'コメント可'
                        : '閲覧者'}
                    </p>
                  </div>
                  {/* Permission Action Buttons */}
                  {canModifyPermission(perm) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canDemotePermission(perm) && (
                        <button
                          onClick={() => setConfirmDialog({
                            type: 'demote',
                            permissionId: perm.id,
                            permissionLabel: getPermissionLabel(perm),
                          })}
                          disabled={isLoading}
                          className="p-1.5 text-[#5f6368] hover:bg-[#e8eaed] rounded transition-colors disabled:opacity-50"
                          title="閲覧者に変更"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h3l-4-4-4 4h3v6z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDialog({
                          type: 'delete',
                          permissionId: perm.id,
                          permissionLabel: getPermissionLabel(perm),
                        })}
                        disabled={isLoading}
                        className="p-1.5 text-[#c5221f] hover:bg-[#fce8e6] rounded transition-colors disabled:opacity-50"
                        title="アクセスを削除"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#dadce0] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-[#5f6368] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] transition-colors"
          >
            閉じる
          </button>
          <a
            href={getShareUrl(file.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1a73e8] rounded-md hover:bg-[#1557b0] transition-colors text-center inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
            </svg>
            共有設定を開く
          </a>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setConfirmDialog(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-xl shadow-xl z-[60] p-6">
            <h3 className="text-lg font-medium text-[#202124] mb-2">
              {confirmDialog.folderId
                ? (confirmDialog.type === 'delete' ? 'フォルダのアクセス権を削除しますか？' : 'フォルダ権限を閲覧者に変更しますか？')
                : (confirmDialog.type === 'delete' ? 'アクセス権を削除しますか？' : '閲覧者に変更しますか？')}
            </h3>
            <p className="text-sm text-[#5f6368] mb-6">
              {confirmDialog.folderId
                ? (confirmDialog.type === 'delete'
                  ? `フォルダの「${confirmDialog.permissionLabel}」のアクセス権を削除します。フォルダ内の全ファイルに影響します。この操作は取り消せません。`
                  : `フォルダの「${confirmDialog.permissionLabel}」を閲覧者に変更します。フォルダ内の全ファイルに影響します。`)
                : (confirmDialog.type === 'delete'
                  ? `「${confirmDialog.permissionLabel}」のアクセス権を削除します。この操作は取り消せません。`
                  : `「${confirmDialog.permissionLabel}」を閲覧者に変更します。`)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-[#5f6368] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
                  confirmDialog.type === 'delete'
                    ? 'bg-[#c5221f] hover:bg-[#a31a15]'
                    : 'bg-[#1a73e8] hover:bg-[#1557b0]'
                }`}
              >
                {isLoading ? '処理中...' : confirmDialog.type === 'delete' ? '削除する' : '変更する'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function FileRow({
  file,
  onClick,
  isSelectionMode,
  isSelected,
  onToggleSelect,
  canSelect,
}: {
  file: ScannedFile;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  canSelect?: boolean;
}) {
  const config = RISK_LEVEL_CONFIG[file.riskLevel];

  return (
    <div
      onClick={isSelectionMode ? (canSelect ? onToggleSelect : undefined) : onClick}
      className={`flex items-center gap-4 p-4 border-b border-[#e8eaed] last:border-b-0 transition-colors ${
        isSelectionMode
          ? canSelect
            ? 'cursor-pointer hover:bg-[#f8f9fa]'
            : 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[#f8f9fa]'
      } ${isSelected ? 'bg-[#e8f0fe]' : ''}`}
    >
      {/* Checkbox (shown in selection mode) */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!canSelect}
            onChange={(e) => {
              e.stopPropagation();
              if (canSelect) onToggleSelect?.();
            }}
            className="w-4 h-4 text-[#1a73e8] border-[#5f6368] rounded focus:ring-[#1a73e8] disabled:opacity-50"
          />
        </div>
      )}

      {/* Icon */}
      {file.iconLink ? (
        <img src={file.iconLink} alt="" className="w-6 h-6 flex-shrink-0" />
      ) : (
        <div className="w-6 h-6 bg-[#f1f3f4] rounded flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
        </div>
      )}

      {/* Name & Owner */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#202124] truncate">{file.name}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-[#5f6368] truncate">{file.ownerName}</p>
          {!file.isInternalOwner && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-[#f1f3f4] text-[#5f6368] rounded">
              外部
            </span>
          )}
        </div>
      </div>

      {/* Risk Badge */}
      <div className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
        {config.label}
      </div>

      {/* Risk Score */}
      <div className="w-12 text-right">
        <span className={`text-sm font-medium ${config.color}`}>{file.riskScore}</span>
      </div>

      {/* Factors count */}
      <div className="w-16 text-right text-sm text-[#5f6368]">
        {file.riskFactors.length}件
      </div>

      {/* Arrow (hidden in selection mode) */}
      {!isSelectionMode && (
        <svg className="w-5 h-5 text-[#5f6368] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      )}
    </div>
  );
}

function FolderCard({
  folder,
  isExpanded,
  onToggle,
  onFileClick,
  scanId,
}: {
  folder: FolderSummary;
  isExpanded: boolean;
  onToggle: () => void;
  onFileClick: (file: ScannedFile) => void;
  scanId: string;
}) {
  const config = RISK_LEVEL_CONFIG[folder.highestRiskLevel];

  // Fetch files for expanded folder
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['folderFiles', scanId, folder.id],
    queryFn: () => scanApi.getFolderFiles(scanId, folder.id, { limit: 50, sortBy: 'riskScore', sortOrder: 'desc' }),
    enabled: isExpanded,
  });

  const files = filesData?.files || [];

  return (
    <div className={`border border-[#dadce0] rounded-xl overflow-hidden ${isExpanded ? 'ring-2 ring-[#1a73e8]' : ''}`}>
      {/* Folder Header */}
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-4 bg-white hover:bg-[#f8f9fa] cursor-pointer"
      >
        {/* Folder Icon */}
        <div className="w-10 h-10 bg-[#f1f3f4] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>
        </div>

        {/* Folder Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#202124] truncate">{folder.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#5f6368]">{folder.fileCount}件のファイル</span>
            <span className="text-xs text-[#5f6368]">•</span>
            <div className="flex items-center gap-1 text-xs">
              {folder.riskySummary.critical > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#fce8e6] text-[#c5221f]">
                  緊急 {folder.riskySummary.critical}
                </span>
              )}
              {folder.riskySummary.high > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#fef7e0] text-[#e37400]">
                  高 {folder.riskySummary.high}
                </span>
              )}
              {folder.riskySummary.medium > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#fef7e0] text-[#f9ab00]">
                  中 {folder.riskySummary.medium}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Risk Badge */}
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </div>

        {/* Expand Icon */}
        <svg
          className={`w-5 h-5 text-[#5f6368] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </div>

      {/* Expanded Files */}
      {isExpanded && (
        <div className="border-t border-[#dadce0] bg-[#f8f9fa]">
          {isLoading ? (
            <div className="p-4 text-center">
              <svg className="w-6 h-6 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : files.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#5f6368]">
              ファイルがありません
            </div>
          ) : (
            <div className="divide-y divide-[#e8eaed]">
              {files.map((file) => (
                <FileRow key={file.id} file={file} onClick={() => onFileClick(file)} />
              ))}
            </div>
          )}

          {/* Drive Link */}
          {folder.id !== 'root' && (
            <div className="p-3 border-t border-[#e8eaed]">
              <a
                href={`https://drive.google.com/drive/folders/${folder.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#1a73e8] hover:underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
                Google Driveで開く
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FilesPage() {
  const { scanId: paramScanId } = useParams<{ scanId: string }>();
  const [searchParams] = useSearchParams();
  const queryScanId = searchParams.get('scanId');
  // URLパラメータとクエリパラメータの両方をサポート
  const scanId = paramScanId || queryScanId;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const [selectedFile, setSelectedFile] = useState<ScannedFile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('files');
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | 'all'>('all');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<OwnerType>('all');
  const [offset, setOffset] = useState(0);
  const [folderOffset, setFolderOffset] = useState(0);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const limit = 20;

  // 一括操作用の状態
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    action: BulkAction;
    title: string;
    description: string;
  } | null>(null);
  const [bulkOperationResult, setBulkOperationResult] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: BulkOperationResult['results'];
  } | null>(null);

  // Get scan info
  const { data: scanData } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => scanApi.getById(scanId!),
    enabled: !!scanId,
  });

  // Get files
  const { data: filesData, isLoading, isError } = useQuery({
    queryKey: ['scanFiles', scanId, riskLevelFilter, ownerTypeFilter, offset],
    queryFn: () =>
      scanApi.getFiles(scanId!, {
        limit,
        offset,
        riskLevel: riskLevelFilter === 'all' ? undefined : riskLevelFilter,
        ownerType: ownerTypeFilter === 'all' ? undefined : ownerTypeFilter,
      }),
    enabled: !!scanId && viewMode === 'files',
  });

  // Get folders
  const { data: foldersData, isLoading: isFoldersLoading, isError: isFoldersError } = useQuery({
    queryKey: ['scanFolders', scanId, riskLevelFilter, folderOffset],
    queryFn: () =>
      scanApi.getFolders(scanId!, {
        limit,
        offset: folderOffset,
        minRiskLevel: riskLevelFilter === 'all' ? undefined : riskLevelFilter,
      }),
    enabled: !!scanId && viewMode === 'folders',
  });

  const scan = scanData?.scan;
  const files = filesData?.files || [];
  const pagination = filesData?.pagination;
  const folders = foldersData?.folders || [];
  const folderPagination = foldersData?.pagination;

  // 選択可能なファイル（自社所有のみ）
  const selectableFiles = files.filter(f => f.isInternalOwner);
  const allSelectableSelected = selectableFiles.length > 0 && selectableFiles.every(f => selectedFileIds.has(f.id));

  // 一括操作のミューテーション
  const removePublicMutation = useMutation({
    mutationFn: () => scanApi.bulk.removePublicAccess(scanId!, Array.from(selectedFileIds)),
    onSuccess: (data) => {
      setBulkOperationResult({
        type: 'success',
        message: data.message,
        details: data.results,
      });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
      setSelectedFileIds(new Set());
      setIsSelectionMode(false);
    },
    onError: (error) => {
      setBulkOperationResult({
        type: 'error',
        message: error instanceof Error ? error.message : '操作に失敗しました',
      });
    },
  });

  const demoteEditorsMutation = useMutation({
    mutationFn: () => scanApi.bulk.demoteToReader(scanId!, Array.from(selectedFileIds)),
    onSuccess: (data) => {
      setBulkOperationResult({
        type: 'success',
        message: data.message,
        details: data.results,
      });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
      setSelectedFileIds(new Set());
      setIsSelectionMode(false);
    },
    onError: (error) => {
      setBulkOperationResult({
        type: 'error',
        message: error instanceof Error ? error.message : '操作に失敗しました',
      });
    },
  });

  const deleteExternalMutation = useMutation({
    mutationFn: () => scanApi.bulk.deletePermissions(scanId!, Array.from(selectedFileIds), { type: 'user' }),
    onSuccess: (data) => {
      setBulkOperationResult({
        type: 'success',
        message: data.message,
        details: data.results,
      });
      queryClient.invalidateQueries({ queryKey: ['scanFiles'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
      setSelectedFileIds(new Set());
      setIsSelectionMode(false);
    },
    onError: (error) => {
      setBulkOperationResult({
        type: 'error',
        message: error instanceof Error ? error.message : '操作に失敗しました',
      });
    },
  });

  const isBulkOperating = removePublicMutation.isPending || demoteEditorsMutation.isPending || deleteExternalMutation.isPending;

  // 選択ヘルパー関数
  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(selectableFiles.map(f => f.id)));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFileIds(new Set());
  };

  const handleBulkAction = (action: BulkAction) => {
    const actions = {
      'remove-public': {
        title: '公開アクセスを削除',
        description: `選択した${selectedFileIds.size}件のファイルの「リンクを知っている全員」アクセスを削除します。この操作は取り消せません。`,
      },
      'demote-editors': {
        title: '編集者を閲覧者に変更',
        description: `選択した${selectedFileIds.size}件のファイルの編集者権限をすべて閲覧者に変更します。`,
      },
      'delete-external': {
        title: '外部ユーザーのアクセスを削除',
        description: `選択した${selectedFileIds.size}件のファイルから外部ユーザーのアクセス権限を削除します。`,
      },
    };
    setBulkActionDialog({ action, ...actions[action] });
  };

  const executeBulkAction = () => {
    if (!bulkActionDialog) return;
    switch (bulkActionDialog.action) {
      case 'remove-public':
        removePublicMutation.mutate();
        break;
      case 'demote-editors':
        demoteEditorsMutation.mutate();
        break;
      case 'delete-external':
        deleteExternalMutation.mutate();
        break;
    }
    setBulkActionDialog(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-[#f1f3f4] transition-colors"
          >
            <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-normal text-[#202124]">スキャン結果</h1>
            {scan && (
              <p className="text-sm text-[#5f6368] mt-1">
                {scan.createdAt ? new Date(scan.createdAt).toLocaleString('ja-JP') : ''} • {scan.totalFiles.toLocaleString()}件のファイル
              </p>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {scan && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
              const config = RISK_LEVEL_CONFIG[level];
              const count = scan.riskySummary[level];
              const isActive = riskLevelFilter === level;
              return (
                <button
                  key={level}
                  onClick={() => {
                    setRiskLevelFilter(isActive ? 'all' : level);
                    setOffset(0);
                  }}
                  className={`p-4 rounded-xl text-center transition-all ${
                    isActive
                      ? `${config.bgColor} ring-2 ${config.borderColor.replace('border', 'ring')}`
                      : 'bg-white border border-[#dadce0] hover:border-[#5f6368]'
                  }`}
                >
                  <p className={`text-2xl font-medium ${config.color}`}>{count}</p>
                  <p className="text-xs text-[#5f6368]">{config.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* View Mode Toggle & Owner Type Filter */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#f1f3f4] rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('files');
                setOffset(0);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'files'
                  ? 'bg-white text-[#202124] shadow-sm'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              ファイル
            </button>
            <button
              onClick={() => {
                setViewMode('folders');
                setFolderOffset(0);
                setExpandedFolderId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'folders'
                  ? 'bg-white text-[#202124] shadow-sm'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
              フォルダ
            </button>
          </div>

          {/* Owner Type Filter (only for files view) */}
          {viewMode === 'files' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#5f6368]">所有者:</span>
              <div className="flex gap-1">
                {(['all', 'internal', 'external'] as OwnerType[]).map((type) => {
                  const label = type === 'all' ? 'すべて' : type === 'internal' ? '自社' : '外部';
                  const isActive = ownerTypeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setOwnerTypeFilter(type);
                        setOffset(0);
                      }}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        isActive
                          ? 'bg-[#1a73e8] text-white'
                          : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter info */}
        {(riskLevelFilter !== 'all' || ownerTypeFilter !== 'all') && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[#5f6368]">フィルター:</span>
            {riskLevelFilter !== 'all' && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${RISK_LEVEL_CONFIG[riskLevelFilter].bgColor} ${RISK_LEVEL_CONFIG[riskLevelFilter].color}`}>
                {RISK_LEVEL_CONFIG[riskLevelFilter].label}
              </span>
            )}
            {ownerTypeFilter !== 'all' && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-[#e8f0fe] text-[#1a73e8]">
                {ownerTypeFilter === 'internal' ? '自社所有' : '外部所有'}
              </span>
            )}
            <button
              onClick={() => {
                setRiskLevelFilter('all');
                setOwnerTypeFilter('all');
                setOffset(0);
              }}
              className="text-sm text-[#1a73e8] hover:underline"
            >
              クリア
            </button>
          </div>
        )}

        {/* Bulk Operation Result Toast */}
        {bulkOperationResult && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            bulkOperationResult.type === 'success' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'
          }`}>
            {bulkOperationResult.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
            <div className="flex-1">
              <span className="text-sm font-medium">{bulkOperationResult.message}</span>
              {bulkOperationResult.details && bulkOperationResult.details.failed > 0 && (
                <p className="text-xs mt-1">
                  成功: {bulkOperationResult.details.success}件 / 失敗: {bulkOperationResult.details.failed}件
                </p>
              )}
            </div>
            <button
              onClick={() => setBulkOperationResult(null)}
              className="p-1 rounded-full hover:bg-black/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        )}

        {/* Bulk Action Bar */}
        {viewMode === 'files' && isAdmin && (
          <div className="flex items-center justify-between bg-white rounded-lg border border-[#dadce0] px-4 py-3">
            {isSelectionMode ? (
              <>
                <div className="flex items-center gap-4">
                  <button
                    onClick={exitSelectionMode}
                    className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition-colors"
                    title="選択モードを終了"
                  >
                    <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                  <span className="text-sm font-medium text-[#202124]">
                    {selectedFileIds.size}件選択中
                  </span>
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-[#1a73e8] hover:underline"
                  >
                    {allSelectableSelected ? 'すべて解除' : 'すべて選択'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('remove-public')}
                    disabled={selectedFileIds.size === 0 || isBulkOperating}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#c5221f] bg-[#fce8e6] rounded-lg hover:bg-[#f8d7da] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                    公開削除
                  </button>
                  <button
                    onClick={() => handleBulkAction('demote-editors')}
                    disabled={selectedFileIds.size === 0 || isBulkOperating}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#e37400] bg-[#fef7e0] rounded-lg hover:bg-[#fef0c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4c4.41 0 8 3.59 8 8s-3.59 8-8 8-8-3.59-8-8 3.59-8 8-8m0-2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-6h3l-4-4-4 4h3v6z" />
                    </svg>
                    閲覧者に変更
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete-external')}
                    disabled={selectedFileIds.size === 0 || isBulkOperating}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#c5221f] rounded-lg hover:bg-[#a31a15] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    外部削除
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#1a73e8] border border-[#1a73e8] rounded-lg hover:bg-[#e8f0fe] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  一括操作
                </button>
                <span className="text-sm text-[#5f6368]">
                  ファイルを選択して権限を一括変更できます
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'files' ? (
          <>
            {/* File List */}
            <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
              {/* Table header */}
              <div className="flex items-center gap-4 px-4 py-3 bg-[#f8f9fa] border-b border-[#e8eaed] text-xs text-[#5f6368] font-medium">
                {isSelectionMode && (
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={allSelectableSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-[#1a73e8] border-[#5f6368] rounded focus:ring-[#1a73e8]"
                    />
                  </div>
                )}
                <div className="w-6" />
                <div className="flex-1">ファイル名</div>
                <div className="w-14 text-center">リスク</div>
                <div className="w-12 text-right">スコア</div>
                <div className="w-16 text-right">問題数</div>
                {!isSelectionMode && <div className="w-5" />}
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <svg className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="mt-2 text-sm text-[#5f6368]">読み込み中...</p>
                </div>
              ) : isError ? (
                <div className="p-8 text-center">
                  <svg className="w-8 h-8 text-[#d93025] mx-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <p className="mt-2 text-sm text-[#d93025]">データの取得に失敗しました</p>
                </div>
              ) : files.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-8 h-8 text-[#5f6368] mx-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                  </svg>
                  <p className="mt-2 text-sm text-[#5f6368]">該当するファイルがありません</p>
                </div>
              ) : (
                <div>
                  {files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      onClick={() => setSelectedFile(file)}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedFileIds.has(file.id)}
                      onToggleSelect={() => toggleFileSelection(file.id)}
                      canSelect={file.isInternalOwner}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Files Pagination */}
            {pagination && pagination.total > limit && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#5f6368]">
                  {offset + 1} - {Math.min(offset + files.length, pagination.total)} / {pagination.total}件
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={!pagination.hasMore}
                    className="px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Folder View */}
            {isFoldersLoading ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#dadce0]">
                <svg className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-2 text-sm text-[#5f6368]">読み込み中...</p>
              </div>
            ) : isFoldersError ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#dadce0]">
                <svg className="w-8 h-8 text-[#d93025] mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <p className="mt-2 text-sm text-[#d93025]">データの取得に失敗しました</p>
              </div>
            ) : folders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-[#dadce0]">
                <svg className="w-8 h-8 text-[#5f6368] mx-auto" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <p className="mt-2 text-sm text-[#5f6368]">該当するフォルダがありません</p>
              </div>
            ) : (
              <div className="space-y-4">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    isExpanded={expandedFolderId === folder.id}
                    onToggle={() => setExpandedFolderId(
                      expandedFolderId === folder.id ? null : folder.id
                    )}
                    onFileClick={setSelectedFile}
                    scanId={scanId!}
                  />
                ))}
              </div>
            )}

            {/* Folders Pagination */}
            {folderPagination && folderPagination.total > limit && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#5f6368]">
                  {folderOffset + 1} - {Math.min(folderOffset + folders.length, folderPagination.total)} / {folderPagination.total}フォルダ
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFolderOffset(Math.max(0, folderOffset - limit))}
                    disabled={folderOffset === 0}
                    className="px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setFolderOffset(folderOffset + limit)}
                    disabled={!folderPagination.hasMore}
                    className="px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* File Detail Modal */}
      {selectedFile && scanId && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          scanId={scanId}
          onPermissionChange={() => setSelectedFile(null)}
        />
      )}

      {/* Bulk Action Confirmation Dialog */}
      {bulkActionDialog && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setBulkActionDialog(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] bg-white rounded-xl shadow-xl z-50 p-6">
            <h3 className="text-lg font-medium text-[#202124] mb-2">
              {bulkActionDialog.title}
            </h3>
            <p className="text-sm text-[#5f6368] mb-6">
              {bulkActionDialog.description}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkActionDialog(null)}
                className="px-4 py-2 text-sm font-medium text-[#5f6368] border border-[#dadce0] rounded-md hover:bg-[#f8f9fa] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={executeBulkAction}
                disabled={isBulkOperating}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 ${
                  bulkActionDialog.action === 'remove-public' || bulkActionDialog.action === 'delete-external'
                    ? 'bg-[#c5221f] hover:bg-[#a31a15]'
                    : 'bg-[#e37400] hover:bg-[#c56200]'
                }`}
              >
                {isBulkOperating ? '処理中...' : '実行する'}
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
