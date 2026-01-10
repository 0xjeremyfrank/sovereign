'use client';

import { useContests } from '../../hooks/use-contests';
import { ContestCard } from '../../components/contest-card';
import { Nav } from '../../components/nav';

export const dynamic = 'force-dynamic';

const ContestsPage = () => {
  const { contests, isLoading } = useContests();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-slate-100 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Nav />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Contests</h1>
          <p className="text-slate-600 mt-2">View all First Blood contests</p>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-600">Loading contests...</div>
        ) : contests.length === 0 ? (
          <div className="text-center py-20 text-slate-600">No contests found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contests.map((contest) => (
              <ContestCard key={contest.contestId.toString()} contest={contest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestsPage;
