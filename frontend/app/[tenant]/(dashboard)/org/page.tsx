import { redirect } from "next/navigation";

// Visiting /<tenant>/org lands on the first tab (Profile). The OrgTabs
// bar in org/layout.tsx then lets the user jump to the other sections.
export default function OrgIndex({ params }: { params: { tenant: string } }) {
  redirect(`/${params.tenant}/org/profile`);
}
