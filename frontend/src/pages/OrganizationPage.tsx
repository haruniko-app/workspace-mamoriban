import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi, type OrganizationMember } from '../lib/api';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-[#fef7e0] text-[#e37400]',
  admin: 'bg-[#e8f0fe] text-[#1a73e8]',
  member: 'bg-[#f1f3f4] text-[#5f6368]',
};

function MemberRow({
  member,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
}: {
  member: OrganizationMember;
  currentUserId: string;
  currentUserRole: string;
  onRoleChange: (userId: string, role: 'admin' | 'member') => void;
  onRemove: (userId: string) => void;
}) {
  const isCurrentUser = member.id === currentUserId;
  const canManage =
    (currentUserRole === 'owner' || currentUserRole === 'admin') &&
    !isCurrentUser &&
    member.role !== 'owner';

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[#e8eaed] last:border-b-0">
      {/* Avatar */}
      {member.photoUrl ? (
        <img
          src={member.photoUrl}
          alt=""
          className="w-10 h-10 rounded-full"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#e8eaed] flex items-center justify-center">
          <span className="text-sm font-medium text-[#5f6368]">
            {member.displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[#202124] truncate">
            {member.displayName}
          </p>
          {isCurrentUser && (
            <span className="text-xs text-[#5f6368]">(あなた)</span>
          )}
        </div>
        <p className="text-xs text-[#5f6368] truncate">{member.email}</p>
      </div>

      {/* Role Badge */}
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${ROLE_BADGE_STYLES[member.role]}`}
      >
        {ROLE_LABELS[member.role]}
      </span>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            onChange={(e) =>
              onRoleChange(member.id, e.target.value as 'admin' | 'member')
            }
            className="text-sm border border-[#dadce0] rounded px-2 py-1"
          >
            <option value="admin">管理者</option>
            <option value="member">メンバー</option>
          </select>
          <button
            onClick={() => onRemove(member.id)}
            className="p-1.5 rounded hover:bg-[#fce8e6] text-[#5f6368] hover:text-[#c5221f] transition-colors"
            title="メンバーを削除"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function OrganizationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // Get organization info
  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: organizationApi.get,
  });

  // Get members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['organizationMembers'],
    queryFn: organizationApi.getMembers,
  });

  // Update organization name
  const updateNameMutation = useMutation({
    mutationFn: (name: string) => organizationApi.update(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      setEditingName(false);
    },
  });

  // Update member role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
      organizationApi.updateMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    },
  });

  // Remove member
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    },
  });

  const organization = orgData?.organization;
  const members = membersData?.members || [];

  const handleStartEdit = () => {
    setNewName(organization?.name || '');
    setEditingName(true);
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateNameMutation.mutate(newName.trim());
    }
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'member') => {
    if (confirm('このユーザーの役割を変更しますか？')) {
      updateRoleMutation.mutate({ userId, role });
    }
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('このメンバーを組織から削除しますか？')) {
      removeMemberMutation.mutate(userId);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-normal text-[#202124]">組織管理</h1>
          <p className="text-sm text-[#5f6368] mt-1">
            組織情報とメンバーを管理します
          </p>
        </div>

        {/* Organization Info */}
        <div className="bg-white rounded-xl border border-[#dadce0] p-6">
          <h2 className="text-lg font-medium text-[#202124] mb-4">組織情報</h2>

          <div className="space-y-4">
            {/* Organization Name */}
            <div>
              <label className="text-sm text-[#5f6368]">組織名</label>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#dadce0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={updateNameMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] rounded-lg hover:bg-[#1557b0] disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-4 py-2 text-sm font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-base text-[#202124]">
                    {organization?.name || '-'}
                  </p>
                  {(user?.role === 'owner' || user?.role === 'admin') && (
                    <button
                      onClick={handleStartEdit}
                      className="p-1 rounded hover:bg-[#f1f3f4] text-[#5f6368]"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Domain */}
            <div>
              <label className="text-sm text-[#5f6368]">ドメイン</label>
              <p className="text-base text-[#202124] mt-1">
                {organization?.domain || '-'}
              </p>
            </div>

            {/* Plan */}
            <div>
              <label className="text-sm text-[#5f6368]">プラン</label>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    organization?.plan === 'free'
                      ? 'bg-[#f1f3f4] text-[#5f6368]'
                      : organization?.plan === 'basic'
                      ? 'bg-[#e8f0fe] text-[#1a73e8]'
                      : organization?.plan === 'pro'
                      ? 'bg-[#fef7e0] text-[#e37400]'
                      : 'bg-[#e6f4ea] text-[#137333]'
                  }`}
                >
                  {organization?.plan === 'free'
                    ? '無料'
                    : organization?.plan === 'basic'
                    ? 'ベーシック'
                    : organization?.plan === 'pro'
                    ? 'プロ'
                    : 'エンタープライズ'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e8eaed]">
              <div>
                <label className="text-sm text-[#5f6368]">総スキャン回数</label>
                <p className="text-lg font-medium text-[#202124] mt-1">
                  {organization?.totalScans?.toLocaleString() || 0}
                </p>
              </div>
              <div>
                <label className="text-sm text-[#5f6368]">
                  スキャン済みファイル数
                </label>
                <p className="text-lg font-medium text-[#202124] mt-1">
                  {organization?.totalFilesScanned?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[#e8eaed]">
            <div>
              <h2 className="text-lg font-medium text-[#202124]">メンバー</h2>
              <p className="text-sm text-[#5f6368]">
                このアプリに登録済みのユーザー
              </p>
            </div>
            <span className="text-sm text-[#5f6368]">
              {members.length}人
            </span>
          </div>

          {membersLoading ? (
            <div className="p-8 text-center">
              <svg
                className="w-8 h-8 text-[#1a73e8] animate-spin mx-auto"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5f6368]">
              メンバーがいません
            </div>
          ) : (
            <div>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  currentUserId={user?.id || ''}
                  currentUserRole={user?.role || 'member'}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-[#e8f0fe] rounded-xl p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-[#1a73e8] flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <div>
              <p className="text-sm text-[#202124]">
                メンバーは同じドメイン（{organization?.domain}
                ）のGoogleアカウントでログインすると自動的に追加されます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
