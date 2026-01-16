'use client';

import { useState } from 'react';
import { parseEther } from 'viem';
import {
  useConnection,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBlockNumber,
  usePublicClient,
} from 'wagmi';

import { firstBloodContestAbi } from '@sovereign/onchain';
import { CURRENCY } from '../../lib/chain-config';
import { Nav } from '../../components/nav';
import { useContests } from '../../hooks/use-contests';
import { useContractAddress } from '../../hooks/use-contract-address';

const extractErrorReason = (error: Error): string => {
  const message = error.message || '';

  // Try to extract custom error name and args
  const customErrorMatch = message.match(/error\s+(\w+)\s*\(([^)]*)\)/i);
  if (customErrorMatch && customErrorMatch[1]) {
    const errorName = customErrorMatch[1];
    const args = customErrorMatch[2] ?? '';
    return `${errorName}(${args})`;
  }

  // Try to extract revert reason
  const revertMatch = message.match(/reverted with.*?reason:\s*(.+?)(?:\n|$)/i);
  if (revertMatch && revertMatch[1]) {
    return revertMatch[1].trim();
  }

  // Try to extract from shortMessage or cause
  const shortMatch = message.match(
    /The contract function.*?reverted.*?(?:reason:|with):\s*(.+?)(?:\n|$)/i,
  );
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1].trim() || 'Unknown reason';
  }

  // Look for common patterns
  if (message.includes('ReleaseBlockNotReached')) {
    const blockMatch = message.match(/releaseBlock[:\s]+(\d+).*?currentBlock[:\s]+(\d+)/i);
    if (blockMatch && blockMatch[1] && blockMatch[2]) {
      return `ReleaseBlockNotReached: release=${blockMatch[1]}, current=${blockMatch[2]}`;
    }
    return 'ReleaseBlockNotReached: The release block has not been reached yet';
  }

  if (message.includes('BlockhashUnavailable')) {
    return 'BlockhashUnavailable: Too many blocks have passed since release block (max 256)';
  }

  if (message.includes('NotScheduled')) {
    return 'NotScheduled: Contest does not exist or is not in Scheduled state';
  }

  // Fallback: return first meaningful line
  const firstLine = message.split('\n')[0] ?? message;
  return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;
};

const AdminPage = () => {
  const { status, chainId } = useConnection();
  const isConnected = status === 'connected';
  const contractAddress = useContractAddress();
  const { contests } = useContests();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Nav />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-slate-600 mt-1">Manage contests</p>
        </div>

        {!isConnected ? (
          <div className="text-center py-20 text-slate-600">
            Connect wallet to access admin functions
          </div>
        ) : !contractAddress ? (
          <div className="text-center py-20 text-red-600">
            Contract not configured for chain {chainId}
          </div>
        ) : (
          <div className="space-y-6">
            <RequestRandomnessCard contractAddress={contractAddress} contests={contests} />
            <CloseContestCard contractAddress={contractAddress} contests={contests} />
            <ScheduleContestCard contractAddress={contractAddress} />
          </div>
        )}
      </div>
    </div>
  );
};

type Contest = {
  contestId: bigint;
  params: { releaseBlock: bigint; topN: number; prizePoolWei: bigint };
  state: { state: number; winnerCount: number };
};

const RequestRandomnessCard = ({
  contractAddress,
  contests,
}: {
  contractAddress: `0x${string}`;
  contests: Contest[];
}) => {
  const [contestId, setContestId] = useState('');
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const scheduledContests = contests.filter((c) => c.state.state === 0);

  const handleCapture = () => {
    if (!contestId) return;
    writeContract({
      address: contractAddress,
      abi: firstBloodContestAbi,
      functionName: 'requestRandomness',
      args: [BigInt(contestId)],
    });
  };

  return (
    <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
      <h2 className="text-lg font-semibold mb-4">Request Randomness</h2>
      <p className="text-sm text-slate-600 mb-4">
        Call after release block to request VRF randomness and open commits. The contest will
        transition to CommitOpen once the VRF callback is fulfilled.
      </p>

      {scheduledContests.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg text-sm">
          <p className="font-medium text-amber-800">Scheduled contests:</p>
          {scheduledContests.map((c) => (
            <p key={c.contestId.toString()} className="text-amber-700">
              Contest #{c.contestId.toString()} (release block: {c.params.releaseBlock.toString()})
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="number"
          placeholder="Contest ID"
          value={contestId}
          onChange={(e) => setContestId(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <button
          onClick={handleCapture}
          disabled={!contestId || isPending || isConfirming}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Request'}
        </button>
      </div>

      {isSuccess && (
        <p className="mt-3 text-sm text-green-600">Randomness requested! Waiting for VRF fulfillment...</p>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg">
          <p className="text-sm font-medium text-red-700">Transaction Failed</p>
          <p className="text-sm text-red-600 mt-1 font-mono break-all">
            {extractErrorReason(error)}
          </p>
        </div>
      )}
    </div>
  );
};

const CloseContestCard = ({
  contractAddress,
  contests,
}: {
  contractAddress: `0x${string}`;
  contests: Contest[];
}) => {
  const [contestId, setContestId] = useState('');
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const openContests = contests.filter((c) => c.state.state === 2 || c.state.state === 3);

  const handleClose = () => {
    if (!contestId) return;
    writeContract({
      address: contractAddress,
      abi: firstBloodContestAbi,
      functionName: 'closeContest',
      args: [BigInt(contestId)],
    });
  };

  return (
    <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
      <h2 className="text-lg font-semibold mb-4">Close Contest</h2>
      <p className="text-sm text-slate-600 mb-4">
        Close a contest after reveal window ends or all winners filled.
      </p>

      {openContests.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="font-medium text-blue-800">Open contests:</p>
          {openContests.map((c) => (
            <p key={c.contestId.toString()} className="text-blue-700">
              Contest #{c.contestId.toString()} ({c.state.winnerCount}/{c.params.topN} winners)
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="number"
          placeholder="Contest ID"
          value={contestId}
          onChange={(e) => setContestId(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <button
          onClick={handleClose}
          disabled={!contestId || isPending || isConfirming}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Close'}
        </button>
      </div>

      {isSuccess && <p className="mt-3 text-sm text-green-600">Contest closed!</p>}
      {error && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg">
          <p className="text-sm font-medium text-red-700">Transaction Failed</p>
          <p className="text-sm text-red-600 mt-1 font-mono break-all">
            {extractErrorReason(error)}
          </p>
        </div>
      )}
    </div>
  );
};

const ScheduleContestCard = ({ contractAddress }: { contractAddress: `0x${string}` }) => {
  const { data: currentBlock } = useBlockNumber({ watch: true });
  const publicClient = usePublicClient();
  const [formData, setFormData] = useState({
    generatorCodeCid: 'QmTest123',
    engineVersion: '1.0.0',
    size: '6',
    releaseBlockOffset: '10',
    commitWindow: '20',
    commitBuffer: '5',
    revealWindow: '20',
    topN: '1',
    entryDepositWei: '0',
    prizePoolEth: '0.001',
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const releaseBlockAbsolute = currentBlock
    ? currentBlock + BigInt(formData.releaseBlockOffset || '0')
    : null;

  const handleSchedule = async () => {
    if (!publicClient) return;

    // Fetch the latest block number at submission time to avoid stale values
    const latestBlock = await publicClient.getBlockNumber();
    const releaseBlock = latestBlock + BigInt(formData.releaseBlockOffset || '0');

    const prizePoolWei = parseEther(formData.prizePoolEth);
    const entryDepositWei = BigInt(formData.entryDepositWei);

    writeContract({
      address: contractAddress,
      abi: firstBloodContestAbi,
      functionName: 'scheduleContest',
      args: [
        {
          generatorCodeCid: formData.generatorCodeCid,
          engineVersion: formData.engineVersion,
          size: Number(formData.size),
          releaseBlock,
          commitWindow: BigInt(formData.commitWindow),
          commitBuffer: BigInt(formData.commitBuffer),
          revealWindow: BigInt(formData.revealWindow),
          topN: Number(formData.topN),
          entryDepositWei,
          prizePoolWei,
          sponsor: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
      ],
      value: prizePoolWei,
    });
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
      <h2 className="text-lg font-semibold mb-4">Schedule Contest</h2>
      <p className="text-sm text-slate-600 mb-4">Create a new contest with prize pool escrow.</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="generatorCid" className="block text-sm font-medium text-slate-700 mb-1">
            Generator CID
          </label>
          <input
            id="generatorCid"
            type="text"
            value={formData.generatorCodeCid}
            onChange={(e) => updateField('generatorCodeCid', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="engineVersion" className="block text-sm font-medium text-slate-700 mb-1">
            Engine Version
          </label>
          <input
            id="engineVersion"
            type="text"
            value={formData.engineVersion}
            onChange={(e) => updateField('engineVersion', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="boardSize" className="block text-sm font-medium text-slate-700 mb-1">
            Board Size
          </label>
          <input
            id="boardSize"
            type="number"
            value={formData.size}
            onChange={(e) => updateField('size', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="releaseBlock" className="block text-sm font-medium text-slate-700 mb-1">
            Release Block Offset
          </label>
          <input
            id="releaseBlock"
            type="number"
            value={formData.releaseBlockOffset}
            onChange={(e) => updateField('releaseBlockOffset', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="Blocks from now"
          />
          {currentBlock && (
            <p className="text-xs text-slate-500 mt-1">
              Current: {currentBlock.toString()} → Release: {releaseBlockAbsolute?.toString()}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="commitWindow" className="block text-sm font-medium text-slate-700 mb-1">
            Commit Window (blocks)
          </label>
          <input
            id="commitWindow"
            type="number"
            value={formData.commitWindow}
            onChange={(e) => updateField('commitWindow', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="commitBuffer" className="block text-sm font-medium text-slate-700 mb-1">
            Commit Buffer (blocks)
          </label>
          <input
            id="commitBuffer"
            type="number"
            value={formData.commitBuffer}
            onChange={(e) => updateField('commitBuffer', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="revealWindow" className="block text-sm font-medium text-slate-700 mb-1">
            Reveal Window (blocks)
          </label>
          <input
            id="revealWindow"
            type="number"
            value={formData.revealWindow}
            onChange={(e) => updateField('revealWindow', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="topN" className="block text-sm font-medium text-slate-700 mb-1">
            Top N Winners
          </label>
          <input
            id="topN"
            type="number"
            value={formData.topN}
            onChange={(e) => updateField('topN', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="entryDeposit" className="block text-sm font-medium text-slate-700 mb-1">
            Entry Deposit (wei)
          </label>
          <input
            id="entryDeposit"
            type="number"
            value={formData.entryDepositWei}
            onChange={(e) => updateField('entryDepositWei', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label htmlFor="prizePool" className="block text-sm font-medium text-slate-700 mb-1">
            Prize Pool ({CURRENCY.symbol})
          </label>
          <input
            id="prizePool"
            type="text"
            value={formData.prizePoolEth}
            onChange={(e) => updateField('prizePoolEth', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Total cost: <span className="font-semibold">{formData.prizePoolEth} {CURRENCY.symbol}</span> (prize
          escrow)
        </p>
        <button
          onClick={handleSchedule}
          disabled={isPending || isConfirming || !publicClient}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Schedule Contest'}
        </button>
      </div>

      {isSuccess && <p className="mt-3 text-sm text-green-600">Contest scheduled!</p>}
      {error && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg">
          <p className="text-sm font-medium text-red-700">Transaction Failed</p>
          <p className="text-sm text-red-600 mt-1 font-mono break-all">
            {extractErrorReason(error)}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
