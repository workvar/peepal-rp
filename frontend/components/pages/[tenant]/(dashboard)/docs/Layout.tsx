"use client";

import SideNav from "./_shared/SideNav";

/** Two-column docs shell: persistent left rail + main content area. */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <SideNav />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
