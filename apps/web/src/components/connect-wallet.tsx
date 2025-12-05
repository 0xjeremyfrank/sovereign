'use client';

import { useState, useEffect } from 'react';
import { useConnection, useConnect, useDisconnect, useSwitchChain, useConnectors } from 'wagmi';

const SUPPORTED_CHAIN_ID = 8700; // Autonomys Chronos
const SUPPORTED_CHAIN_NAME = 'Autonomys Chronos';

export const ConnectWallet = () => {
  const [mounted, setMounted] = useState(false);
  const { address, status, chain, chainId } = useConnection();
  const isConnected = status === 'connected';
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();

  const isCorrectNetwork = chainId === SUPPORTED_CHAIN_ID;
  const isPending = connect.status === 'pending';
  const isSwitching = switchChain.status === 'pending';

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

  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-red-600 font-medium">Wrong Network</span>
        <button
          onClick={() => switchChain.mutate({ chainId: SUPPORTED_CHAIN_ID })}
          disabled={isSwitching}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isSwitching ? 'Switching...' : `Switch to ${SUPPORTED_CHAIN_NAME}`}
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm text-slate-600">{chain?.name ?? `Chain ${chainId}`}</span>
        </div>
        <span className="text-sm text-slate-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect.mutate()}
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
      onClick={() => injectedConnector && connect.mutate({ connector: injectedConnector })}
      disabled={!injectedConnector || isPending}
      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
