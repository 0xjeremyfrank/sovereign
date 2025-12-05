'use client';

import { useState, useEffect } from 'react';
import { useBlockNumber } from 'wagmi';

import { autonomysChronos } from '../lib/wagmi-config';

type BlockCountdownProps = {
  label: string;
  targetBlock: bigint;
  status: 'pending' | 'active' | 'reached';
};

// Approximate block time in seconds for Autonomys network
const BLOCK_TIME_SECONDS = 6;

export const BlockCountdown = ({ label, targetBlock, status }: BlockCountdownProps) => {
  const { data: currentBlock } = useBlockNumber({
    chainId: autonomysChronos.id,
    watch: true,
  });

  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  useEffect(() => {
    if (!currentBlock || status === 'reached') {
      setEstimatedTime(null);
      return;
    }

    const blocksRemaining = targetBlock - currentBlock;
    if (blocksRemaining <= 0n) {
      setEstimatedTime(null);
      return;
    }

    const secondsRemaining = Number(blocksRemaining) * BLOCK_TIME_SECONDS;
    setEstimatedTime(formatDuration(secondsRemaining));

    // Update countdown every second
    const interval = setInterval(() => {
      setEstimatedTime((prev) => {
        if (!prev) return null;
        const currentSeconds = parseDuration(prev);
        if (currentSeconds <= 1) return null;
        return formatDuration(currentSeconds - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentBlock, targetBlock, status]);

  const blocksRemaining = currentBlock ? targetBlock - currentBlock : null;
  const isReached = blocksRemaining !== null && blocksRemaining <= 0n;

  return (
    <div
      className={`rounded-lg p-3 ${
        status === 'active'
          ? 'bg-amber-50 border border-amber-200'
          : status === 'reached'
            ? 'bg-green-50 border border-green-200'
            : 'bg-slate-50 border border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-medium ${
            status === 'active'
              ? 'text-amber-700'
              : status === 'reached'
                ? 'text-green-700'
                : 'text-slate-600'
          }`}
        >
          {label}
        </span>
        {status === 'reached' || isReached ? (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
            Reached
          </span>
        ) : status === 'active' ? (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium animate-pulse">
            Active
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        <p className="font-mono text-lg font-semibold">Block {targetBlock.toString()}</p>
        {blocksRemaining !== null && blocksRemaining > 0n && (
          <p className="text-sm text-slate-500">{blocksRemaining.toString()} blocks remaining</p>
        )}
        {estimatedTime && <p className="text-sm text-slate-500">~{estimatedTime}</p>}
      </div>
    </div>
  );
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const parseDuration = (duration: string): number => {
  let total = 0;

  const dayMatch = duration.match(/(\d+)d/);
  const hourMatch = duration.match(/(\d+)h/);
  const minuteMatch = duration.match(/(\d+)m/);
  const secondMatch = duration.match(/(\d+)s/);

  if (dayMatch?.[1]) total += parseInt(dayMatch[1], 10) * 86400;
  if (hourMatch?.[1]) total += parseInt(hourMatch[1], 10) * 3600;
  if (minuteMatch?.[1]) total += parseInt(minuteMatch[1], 10) * 60;
  if (secondMatch?.[1]) total += parseInt(secondMatch[1], 10);

  return total;
};
