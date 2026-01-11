'use client';

import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCrown } from './icons';
import { ConnectWallet } from './connect-wallet';

const classNames = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

interface NavLinkProps {
  href: string;
  children: ReactNode;
  isActive: boolean;
}

const NavLink = ({ href, children, isActive }: NavLinkProps) => (
  <Link
    href={href}
    className={classNames(
      'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50',
    )}
  >
    {children}
  </Link>
);

export const Nav = () => {
  const pathname = usePathname() ?? '/';

  const isHome = pathname === '/';
  const isContests = pathname === '/contests' || pathname.startsWith('/contests/');
  const isAdmin = pathname === '/admin';

  return (
    <nav className="flex items-center justify-between gap-4 mb-8">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <IconCrown className="w-7 h-7 text-amber-600 group-hover:text-amber-700 transition-colors" />
        <span className="text-xl font-bold tracking-tight text-slate-900">Sovereign</span>
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-1">
        <NavLink href="/" isActive={isHome}>
          Play
        </NavLink>
        <NavLink href="/contests" isActive={isContests}>
          Contests
        </NavLink>
        <NavLink href="/admin" isActive={isAdmin}>
          Admin
        </NavLink>
      </div>

      {/* Wallet */}
      <ConnectWallet />
    </nav>
  );
};
