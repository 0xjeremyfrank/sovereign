'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export const ConnectWallet = () => {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === 'injected');

  return (
    <button
      onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      disabled={!injectedConnector || isPending}
      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
