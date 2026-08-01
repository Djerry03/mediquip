'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function AnimatedMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(false);
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <main className={`main-content page-enter ${entered ? 'page-enter-active' : ''}`}>
      {children}
    </main>
  );
}
