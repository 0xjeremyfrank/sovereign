// Auto-generated from contracts/out/FirstBloodContest.sol
// Update via scripts if ABI changes
import type { Abi } from 'viem';

export const firstBloodContestAbi = [
  {
    type: 'function',
    name: 'captureRandomness',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'closeContest',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'commitSolution',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'commitHash',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'commits',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'commitHash',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'committedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'depositPaid',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'contestStates',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'state',
        type: 'uint8',
        internalType: 'enum FirstBloodContest.ContestState',
      },
      {
        name: 'globalSeed',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'puzzleHash',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'randomnessCapturedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'commitWindowEndsAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'revealWindowEndsAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'winnerCount',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'remainingPrizeWei',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'forfeitedDepositsWei',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'contests',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'generatorCodeCid',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'engineVersion',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'size',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'releaseBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'commitWindow',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'commitBuffer',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'revealWindow',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'topN',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'entryDepositWei',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'prizePoolWei',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'sponsor',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCommitment',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct FirstBloodContest.Commitment',
        components: [
          {
            name: 'commitHash',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'committedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'depositPaid',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getContest',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct FirstBloodContest.ContestParams',
        components: [
          {
            name: 'generatorCodeCid',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'engineVersion',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'size',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'releaseBlock',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'commitWindow',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'commitBuffer',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revealWindow',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'topN',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'entryDepositWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'prizePoolWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'sponsor',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
      {
        name: '',
        type: 'tuple',
        internalType: 'struct FirstBloodContest.ContestStateData',
        components: [
          {
            name: 'state',
            type: 'uint8',
            internalType: 'enum FirstBloodContest.ContestState',
          },
          {
            name: 'globalSeed',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'puzzleHash',
            type: 'bytes32',
            internalType: 'bytes32',
          },
          {
            name: 'randomnessCapturedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'commitWindowEndsAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revealWindowEndsAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'winnerCount',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'remainingPrizeWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'forfeitedDepositsWei',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWinners',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct FirstBloodContest.Winner[]',
        components: [
          {
            name: 'solver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'rewardWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revealedAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'rank',
            type: 'uint8',
            internalType: 'uint8',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasRevealed',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nextContestId',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'revealSolution',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'encodedSolution',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'salt',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'scheduleContest',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        internalType: 'struct FirstBloodContest.ContestParams',
        components: [
          {
            name: 'generatorCodeCid',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'engineVersion',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'size',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'releaseBlock',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'commitWindow',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'commitBuffer',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revealWindow',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'topN',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'entryDepositWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'prizePoolWei',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'sponsor',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    outputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'winners',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'rewardWei',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'revealedAt',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'rank',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdrawRemainingPrize',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ContestClosed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'totalWinners',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8',
      },
      {
        name: 'prizeRemaining',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'forfeitedDeposits',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ContestScheduled',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'generatorCodeCid',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'engineVersion',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'releaseBlock',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'commitWindow',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'revealWindow',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'topN',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8',
      },
      {
        name: 'entryDepositWei',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PrizeWithdrawn',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PuzzlePublished',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'puzzleHash',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
      },
      {
        name: 'regionMapCid',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RandomnessCaptured',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'globalSeedSource',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SolutionCommitted',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'commitHash',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SolutionRevealed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'rank',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8',
      },
      {
        name: 'rewardWei',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'isValid',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AlreadyClosed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'AlreadyCommitted',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'AlreadyRevealed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'BlockhashUnavailable',
    inputs: [
      {
        name: 'blockNumber',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'CommitBufferActive',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'bufferEndsAt',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'CommitMismatch',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'CommitWindowClosed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'windowEndsAt',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'CommitsNotOpen',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'state',
        type: 'uint8',
        internalType: 'enum FirstBloodContest.ContestState',
      },
    ],
  },
  {
    type: 'error',
    name: 'ContestNotClosed',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'state',
        type: 'uint8',
        internalType: 'enum FirstBloodContest.ContestState',
      },
    ],
  },
  {
    type: 'error',
    name: 'ContestNotReadyToClose',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'winnerCount',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'topN',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'currentBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'revealWindowEndsAt',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'DepositRefundFailed',
    inputs: [
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'IncorrectDeposit',
    inputs: [
      {
        name: 'required',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSize',
    inputs: [
      {
        name: 'size',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
  },
  {
    type: 'error',
    name: 'NoCommitmentFound',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'solver',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'NoRemainingPrize',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'NotScheduled',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'NotSponsor',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'caller',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'PrizeFundingMismatch',
    inputs: [
      {
        name: 'required',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'PrizePoolRequired',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReleaseBlockMustBeFuture',
    inputs: [
      {
        name: 'releaseBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'ReleaseBlockNotReached',
    inputs: [
      {
        name: 'releaseBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'RevealsNotOpen',
    inputs: [
      {
        name: 'contestId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'state',
        type: 'uint8',
        internalType: 'enum FirstBloodContest.ContestState',
      },
    ],
  },
  {
    type: 'error',
    name: 'RewardTransferFailed',
    inputs: [
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'TopNMustBeGreaterThanZero',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WithdrawalFailed',
    inputs: [
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
] as const satisfies Abi;

export type FirstBloodContestAbi = typeof firstBloodContestAbi;
