import HostelPage from "@/components/pages/[tenant]/(dashboard)/hostel/Page";

// Base /<tenant>/hostel route renders the default (Blocks) tab. Wrapped in a
// prop-less page component so HostelPage's optional initialTab prop doesn't
// clash with Next's PageProps validation. The /<tenant>/hostel/<tab> route
// (see [tab]/page.tsx) supplies the tab.
export default function Page() {
  return <HostelPage />;
}
