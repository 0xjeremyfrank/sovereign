'use client';

import React, { useState, useEffect } from 'react';
import { useConnection, useConnect, useDisconnect, useSwitchChain, useConnectors } from 'wagmi';

import { SUPPORTED_CHAIN } from '../lib/chain-config';

export const ConnectWallet = () => {
  const [mounted, setMounted] = useState(false);
  const { address, status, chain, chainId } = useConnection();
  const isConnected = status === 'connected';
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();

  const isCorrectNetwork = chainId === SUPPORTED_CHAIN.id;
  const isPending = connect.status === 'pending';
  const isSwitching = switchChain.status === 'pending';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="min-h-[44px] px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Connect Wallet
      </button>
    );
  }

  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <span className="text-sm text-red-600 font-medium">Wrong Network</span>
        <button
          onClick={() => switchChain.mutate({ chainId: SUPPORTED_CHAIN.id })}
          disabled={isSwitching}
          className="min-h-[44px] px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isSwitching ? 'Switching...' : `Switch to ${SUPPORTED_CHAIN.name}`}
        </button>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="text-sm text-slate-600 hidden sm:inline">
            {chain?.name ?? `Chain ${chainId}`}
          </span>
          <span className="text-sm text-slate-600">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect.mutate()}
          className="min-h-[44px] px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
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
      className="min-h-[44px] px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
