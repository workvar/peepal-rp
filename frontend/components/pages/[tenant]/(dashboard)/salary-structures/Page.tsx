'use client';

// The old combined Salary Structures route has been split into two separate
// pages: /salary-templates (manage templates) and /salary-assignments
// (assign templates to employees). This file now just redirects anyone
// landing on the old URL (bookmarks, browser history) to the Templates page.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function SalaryStructuresRedirectPage() {
  const router = useRouter();
  const { tenantSlug } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const slug =
      tenantSlug ??
      (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : '') ??
      '';
    const target = slug ? `/${slug}/salary/templates` : '/salary/templates';
    router.replace(target);
  }, [router, tenantSlug]);

  return (
    <div className="p-8 text-center text-muted-foreground">
      Redirecting to Salary Templates…
    </div>
  );
}
