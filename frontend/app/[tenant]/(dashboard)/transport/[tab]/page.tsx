import TransportPage from "@/components/pages/[tenant]/(dashboard)/transport/Page";

// Serves /<tenant>/transport/<tab> (routes | vehicles | allocations) so the
// active tab survives a refresh and back/forward. TransportPage validates the
// value and falls back to "routes".
export default function TransportTabPage({ params }: { params: { tab: string } }) {
  return <TransportPage initialTab={params.tab} />;
}
