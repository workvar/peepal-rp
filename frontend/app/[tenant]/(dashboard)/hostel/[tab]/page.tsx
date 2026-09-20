import HostelPage from "@/components/pages/[tenant]/(dashboard)/hostel/Page";

// Serves /<tenant>/hostel/<tab> (blocks | rooms | classes | allocations | overview).
// The base /<tenant>/hostel route still renders the same component with the
// default tab. HostelPage validates the value and falls back to "blocks".
export default function HostelTabPage({ params }: { params: { tab: string } }) {
  return <HostelPage initialTab={params.tab} />;
}
