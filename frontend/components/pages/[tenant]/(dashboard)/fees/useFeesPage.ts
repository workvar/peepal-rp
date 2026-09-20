'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApolloClient, useQuery } from "@apollo/client"
import {
  FEE_OVERVIEW,
  LIST_COURSES,
  LIST_FEE_ADDONS,
  LIST_FEE_ALLOCATIONS,
  LIST_FEE_CATEGORIES,
  LIST_FEE_PAYMENTS,
  LIST_FEE_STRUCTURES,
  LIST_STUDENT_FEES,
  MY_FEE_PAYMENTS,
  MY_STUDENT_FEES,
} from "@/queries/pages/fees/fees"
import { useAppSelector } from "@/store/hooks"
import type { FeesTab } from "@/types/pages/fees/page"
import type {
  GqlCourse, GqlFeeAddOn, GqlFeeAllocation, GqlFeeCategory, GqlFeeOverview,
  GqlFeePayment, GqlFeeStructure, GqlStudentFee,
} from './types'

// Data, role flags, and tab routing for the fees module. Forms and mutations
// live inside the individual modal components. `lazyLoad` (default true)
// controls whether the long tables reveal rows incrementally on scroll.
export function useFeesPage(initialTab: FeesTab, lazyLoad = true) {
  const router = useRouter()
  const { user, tenantSlug } = useAppSelector(s => s.auth)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isStaff = isAdmin || user?.role === 'staff'
  const isStudent = user?.role === 'student'

  const slug =
    tenantSlug ??
    (typeof window !== 'undefined' ? localStorage.getItem('tenantSlug') : '') ??
    ''

  const { data: catData, loading: catLoading } = useQuery(LIST_FEE_CATEGORIES, { skip: !isStaff })
  const { data: structData, loading: structLoading } = useQuery(LIST_FEE_STRUCTURES, { skip: !isStaff })
  const { data: allocData, loading: allocLoading } = useQuery(LIST_FEE_ALLOCATIONS, { skip: !isStaff })
  const { data: addOnData, loading: addOnLoading } = useQuery(LIST_FEE_ADDONS, { skip: !isStaff })
  const { data: feesData, loading: feesLoading } = useQuery(LIST_STUDENT_FEES, { skip: !isStaff })
  const { data: payData, loading: payLoading } = useQuery(LIST_FEE_PAYMENTS, { skip: !isStaff })
  const { data: overviewData } = useQuery(FEE_OVERVIEW, { skip: !isStaff })
  const { data: courseData } = useQuery(LIST_COURSES, { skip: !isStaff })
  const { data: myFeesData, loading: myFeesLoading } = useQuery(MY_STUDENT_FEES, { skip: !isStudent })
  const { data: myPayData, loading: myPayLoading } = useQuery(MY_FEE_PAYMENTS, { skip: !isStudent })

  const categories: GqlFeeCategory[] = catData?.feeCategories ?? []
  const structures: GqlFeeStructure[] = structData?.feeStructures ?? []
  const allocations: GqlFeeAllocation[] = allocData?.feeAllocations ?? []
  const addOns: GqlFeeAddOn[] = addOnData?.feeAddOns ?? []
  const studentFees: GqlStudentFee[] = feesData?.studentFees ?? []
  const payments: GqlFeePayment[] = isStaff ? (payData?.feePayments ?? []) : (myPayData?.myFeePayments ?? [])
  const myFees: GqlStudentFee[] = myFeesData?.myStudentFees ?? []
  const overview: GqlFeeOverview | null = overviewData?.feeOverview ?? null
  const courses: GqlCourse[] = courseData?.courses ?? []
  const loading = catLoading || structLoading || allocLoading || addOnLoading ||
    feesLoading || payLoading || myFeesLoading || myPayLoading

  // Active tab is seeded from the route; clicking a tab updates state and URL.
  const [tab, setTab] = useState<FeesTab>(initialTab)
  useEffect(() => { setTab(initialTab) }, [initialTab])

  function switchTab(next: FeesTab) {
    if (next === tab) return
    setTab(next)
    router.push(slug ? `/${slug}/fees/${next}` : `/fees/${next}`)
  }

  const [search, setSearch] = useState('')

  // The page header's "+ New …" button opens the active tab's create modal.
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => { setCreateOpen(false); setSearch('') }, [tab])

  // Re-pull every active fee query; used after a bulk upload finishes.
  const client = useApolloClient()
  const refetchAll = () => client.refetchQueries({ include: 'active' })

  return {
    isAdmin, isStaff, isStudent, tab, switchTab, search, setSearch,
    createOpen, setCreateOpen, lazyLoad,
    categories, structures, allocations, addOns, studentFees, payments, myFees,
    overview, courses, loading, refetchAll,
  }
}

export type FeesPageState = ReturnType<typeof useFeesPage>

// Queries every fee mutation should refresh.
export const FEE_REFETCH = [
  { query: LIST_FEE_CATEGORIES },
  { query: LIST_FEE_STRUCTURES },
  { query: LIST_FEE_ALLOCATIONS },
  { query: LIST_FEE_ADDONS },
  { query: LIST_STUDENT_FEES },
  { query: LIST_FEE_PAYMENTS },
  { query: FEE_OVERVIEW },
]
