'use client';

// Legacy URL — the Salary UI now lives under /salary/templates and
// /salary/assignment with a tabbed layout. Redirect anyone still landing
// on this URL to the new Assignments tab.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function SalaryAssignmentsRedirectPage() {
  const router = useRouter();
  const { tenantSlug } = useAppSelector((s) => s.auth);
  useEffect(() => {
    const slug =
      tenantSlug ??
      (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : '') ??
      '';
    router.replace(slug ? `/${slug}/salary/assignment` : '/salary/assignment');
  }, [router, tenantSlug]);
  return (
    <div className="p-8 text-center text-muted-foreground">Redirecting to Salary Assignments…</div>
  );
}
