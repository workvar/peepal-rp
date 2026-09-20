import OrgTabs from "@/components/pages/[tenant]/(dashboard)/org/OrgTabs";

// Shared layout for every /org/* page. Renders a horizontal tab bar so
// Profile / Departments / Academic Years / Roles / Holidays are all one
// click apart. Sub-routes (the existing page components) render below.
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <OrgTabs />
      {children}
    </div>
  );
}
