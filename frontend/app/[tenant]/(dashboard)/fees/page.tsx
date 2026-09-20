'use client';

// Legacy /fees entry — redirects to the default sub-tab. Staff/admin land on
// the Overview analytics dashboard; students land on Payments (their fees).

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function FeesIndexRedirect() {
  const router = useRouter();
  const params = useParams();
  const tenant = (params?.tenant as string) || '';
  const role = useAppSelector(s => s.auth.user?.role);

  useEffect(() => {
    const isStaff = role === 'admin' || role === 'super_admin' || role === 'staff';
    const sub = isStaff ? 'overview' : 'payments';
    const target = tenant ? `/${tenant}/fees/${sub}` : `/fees/${sub}`;
    router.replace(target);
  }, [router, tenant, role]);

  return null;
}
