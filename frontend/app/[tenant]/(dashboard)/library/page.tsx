import LibraryPage from "@/components/pages/[tenant]/(dashboard)/library/Page";

// Base /<tenant>/library route renders the default (Books) tab. Wrapped in a
// prop-less page component so LibraryPage's optional initialTab prop doesn't
// clash with Next's PageProps validation. The /<tenant>/library/<tab> route
// (see [tab]/page.tsx) supplies a specific tab.
export default function Page() {
  return <LibraryPage />;
}
