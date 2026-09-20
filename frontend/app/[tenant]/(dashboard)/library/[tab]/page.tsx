import LibraryPage from "@/components/pages/[tenant]/(dashboard)/library/Page";

// Serves /<tenant>/library/<tab> (books | issued | overdue | visualizer) so the
// active tab survives a refresh and back/forward. LibraryPage validates the
// value and falls back to "books".
export default function LibraryTabPage({ params }: { params: { tab: string } }) {
  return <LibraryPage initialTab={params.tab} />;
}
