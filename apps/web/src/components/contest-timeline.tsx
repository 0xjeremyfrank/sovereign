'use client';

type ContestTimelineProps = {
  state: number;
  releaseBlock: bigint;
  randomnessCapturedAt: bigint;
  commitWindowEndsAt: bigint;
  revealWindowEndsAt: bigint;
};

const STAGES = [
  { id: 0, label: 'Scheduled', description: 'Awaiting release block' },
  { id: 1, label: 'Randomness', description: 'Capturing block randomness' },
  { id: 2, label: 'Commit', description: 'Submit your solution hash' },
  { id: 3, label: 'Reveal', description: 'Reveal your solution' },
  { id: 4, label: 'Closed', description: 'Contest complete' },
];

const getStageStatus = (
  stageId: number,
  currentState: number,
): 'complete' | 'current' | 'pending' => {
  if (stageId < currentState) return 'complete';
  if (stageId === currentState) return 'current';
  return 'pending';
};

export const ContestTimeline = ({
  state,
  releaseBlock,
  randomnessCapturedAt,
  commitWindowEndsAt,
  revealWindowEndsAt,
}: ContestTimelineProps) => {
  return (
    <div className="rounded-xl bg-white/80 backdrop-blur shadow-lg ring-1 ring-black/5 p-6">
      <h2 className="text-lg font-semibold mb-6">Contest Timeline</h2>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        <div
          className="absolute left-4 top-0 w-0.5 bg-amber-500 transition-all duration-500"
          style={{
            height: `${Math.min(100, ((state + 1) / STAGES.length) * 100)}%`,
          }}
        />

        {/* Stages */}
        <div className="space-y-6">
          {STAGES.map((stage) => {
            const status = getStageStatus(stage.id, state);
            const blockInfo = getBlockInfo(stage.id, {
              releaseBlock,
              randomnessCapturedAt,
              commitWindowEndsAt,
              revealWindowEndsAt,
            });

            return (
              <div key={stage.id} className="relative flex items-start gap-4 pl-10">
                {/* Dot */}
                <div
                  className={`absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    status === 'complete'
                      ? 'bg-amber-500 border-amber-500'
                      : status === 'current'
                        ? 'bg-white border-amber-500 ring-4 ring-amber-100'
                        : 'bg-white border-slate-300'
                  }`}
                >
                  {status === 'complete' && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {status === 'current' && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-medium ${
                        status === 'pending' ? 'text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {stage.label}
                    </h3>
                    {status === 'current' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      status === 'pending' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {stage.description}
                  </p>
                  {blockInfo && (
                    <p className="text-xs text-slate-400 mt-1 font-mono">{blockInfo}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const getBlockInfo = (
  stageId: number,
  blocks: {
    releaseBlock: bigint;
    randomnessCapturedAt: bigint;
    commitWindowEndsAt: bigint;
    revealWindowEndsAt: bigint;
  },
): string | null => {
  switch (stageId) {
    case 0:
      return `Release: Block ${blocks.releaseBlock.toString()}`;
    case 1:
      return blocks.randomnessCapturedAt > 0n
        ? `Captured: Block ${blocks.randomnessCapturedAt.toString()}`
        : null;
    case 2:
      return blocks.commitWindowEndsAt > 0n
        ? `Ends: Block ${blocks.commitWindowEndsAt.toString()}`
        : null;
    case 3:
      return blocks.revealWindowEndsAt > 0n
        ? `Ends: Block ${blocks.revealWindowEndsAt.toString()}`
        : null;
    default:
      return null;
  }
};
