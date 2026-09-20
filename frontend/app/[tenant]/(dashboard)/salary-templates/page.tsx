'use client';

// Legacy URL — the Salary UI now lives under /salary/templates and
// /salary/assignment with a tabbed layout. Redirect anyone still landing
// on this URL to the new Templates tab.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function SalaryTemplatesRedirectPage() {
  const router = useRouter();
  const { tenantSlug } = useAppSelector((s) => s.auth);
  useEffect(() => {
    const slug =
      tenantSlug ??
      (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : '') ??
      '';
    router.replace(slug ? `/${slug}/salary/templates` : '/salary/templates');
  }, [router, tenantSlug]);
  return (
    <div className="p-8 text-center text-muted-foreground">Redirecting to Salary Templates…</div>
  );
}
