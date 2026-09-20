import { useEffect, useState } from "react";
import {
  approvalProcessTypesAPI,
  approvalRequestsAPI,
  type ApprovalProcess,
  type ApprovalProcessType,
} from "@/api/services/approvals";

// Hook + helper for the dynamic process-type list. Both the flow builder and
// the my-approvals page use this so labels are always derived from the
// tenant's current process-type rows.
//
// `activeOnly` doubles as the "any role" switch: the my-approvals page (every
// role) reads the open /approval-requests/process-types route, while the admin
// flow builder keeps using the CRUD route under /org.
export function useProcessTypes(activeOnly = false) {
  const [types, setTypes] = useState<ApprovalProcessType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const req = activeOnly
      ? approvalRequestsAPI.processTypes(true)
      : approvalProcessTypesAPI.list(false);
    req
      .then((r) => setTypes(r.data?.data ?? []))
      // Labels are cosmetic — on failure we fall back to the raw code rather
      // than throwing an unhandled rejection into the page.
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, [activeOnly]);

  const labelFor = (code: ApprovalProcess) =>
    types.find((t) => t.code === code)?.label ?? code;

  return { types, loading, labelFor };
}
