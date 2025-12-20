'use client';

import { useCommitStorage } from '../hooks/use-commit-storage';

interface SaltBackupButtonProps {
  contestId: bigint;
  onDownload?: () => void;
}

export const SaltBackupButton = ({ contestId, onDownload }: SaltBackupButtonProps) => {
  const { getCommitData } = useCommitStorage();

  const handleDownload = () => {
    const data = getCommitData(contestId);
    if (!data) {
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign-commit-${contestId}-${data.committedAt}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onDownload?.();
  };

  const data = getCommitData(contestId);
  if (!data) {
    return null;
  }

  return (
    <button
      onClick={handleDownload}
      className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors border border-slate-300"
    >
      Download Salt Backup
    </button>
  );
};
