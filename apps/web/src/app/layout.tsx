import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Web3Provider } from '../providers/web3-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sovereign',
  description: 'A logic puzzle game',
  icons: {
    icon: '/favicon.svg',
  },
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
};

export default RootLayout;
