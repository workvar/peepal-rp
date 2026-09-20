import TransportPage from "@/components/pages/[tenant]/(dashboard)/transport/Page";

// Base /<tenant>/transport route renders the default (Routes) tab. Wrapped in a
// prop-less page component so TransportPage's optional initialTab prop doesn't
// clash with Next's PageProps validation. The /<tenant>/transport/<tab> route
// (see [tab]/page.tsx) supplies a specific tab.
export default function Page() {
  return <TransportPage />;
}
