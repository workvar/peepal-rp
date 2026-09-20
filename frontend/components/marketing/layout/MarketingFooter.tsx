import { Logo } from "@/components/ui/Logo";
import { MODULES } from "@/lib/marketing/modules";
import TrackedLink from "@/components/analytics/TrackedLink";

const COLS = [
  {
    id: "platform",
    title: "Platform",
    links: [
      { href: "/",            label: "Home"        },
      { href: "/modules",     label: "Modules"     },
      { href: "/about",       label: "About"       },
      { href: "/mission",     label: "Mission"     },
      { href: "/inspiration", label: "Inspiration" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { href: "/terms",   label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy"      },
    ],
  },
  {
    id: "auth",
    title: "Sign in",
    links: [{ href: "/login", label: "Log in to your workspace" }],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="relative mt-32 border-t border-[#e7e7e3] bg-[#fafaf9]">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Logo withText size={32} variant="gradient" />
            <p className="mt-4 text-sm leading-relaxed text-[#737370]">
              The operating system for modern institutes.
            </p>
          </div>

          <div className="md:col-span-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a09]">Modules</h4>
            <ul className="mt-4 space-y-2">
              {MODULES.slice(0, 6).map((m) => (
                <li key={m.slug}>
                  <TrackedLink
                    href={`/modules/${m.slug}`}
                    kind="footer"
                    location="footer_modules"
                    itemId={m.slug}
                    itemName={m.name}
                    className="text-sm text-[#737370] transition-colors hover:text-[#0a0a09]"
                  >
                    {m.name}
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </div>

          {COLS.map((col) => (
            <div key={col.id}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a09]">{col.title}</h4>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <TrackedLink
                      href={l.href}
                      kind="footer"
                      location={`footer_${col.id}`}
                      itemId={l.href.replace(/^\//, "") || "home"}
                      itemName={l.label}
                      className="text-sm text-[#737370] transition-colors hover:text-[#0a0a09]"
                    >
                      {l.label}
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 border-t border-[#e7e7e3] pt-6">
          <a
            href="https://www.foundrlist.com/product/jumpstart?utm_source=badge&utm_medium=embed"
            target="_blank"
            rel="noopener"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.foundrlist.com/api/badge/jumpstart"
              alt="Featured on FoundrList"
              width={150}
              height={48}
            />
          </a>

          <div className="flex w-full flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <p className="text-xs text-[#737370]">
              © {new Date().getFullYear()} Peepal — Run your institute on one operating system.
            </p>
            <p className="text-xs text-[#737370]">
              Crafted for education, operations and finance teams.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
