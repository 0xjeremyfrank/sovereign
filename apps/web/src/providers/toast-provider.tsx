'use client';

import { Toaster } from 'sonner';
import type { ReactNode } from 'react';

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          },
          classNames: {
            success: 'border-green-200',
            error: 'border-red-200',
            loading: 'border-amber-200',
          },
        }}
        richColors
        closeButton
      />
    </>
  );
};
