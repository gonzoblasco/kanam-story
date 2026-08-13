'use client';

import { useEffect } from 'react';

export default function ClientShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);
  return <>{children}</>;
}