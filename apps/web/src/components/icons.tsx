import React from 'react';
import { classNames } from '@/lib/utils';

export const IconCrown = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={classNames('w-4 h-4', className)}>
      <path d="M3 7l4 3 5-6 5 6 4-3-2 10H5L3 7z" fill="currentColor" />
    </svg>
  );
};

export const IconUndo = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 24 24" className={classNames('w-4 h-4', className)}>
      <path
        d="M12 5V1L7 6l5 5V7c3.86 0 7 3.14 7 7a7 7 0 01-7 7 7 7 0 01-6.93-6h2.02A5 5 0 0012 19a5 5 0 000-10z"
        fill="currentColor"
      />
    </svg>
  );
};

export const IconChevronDown = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
};

export const IconCheck = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
};

export const IconX = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
};

export const IconTrophy = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
};

export const IconPlus = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={classNames('w-4 h-4', className)}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
};
