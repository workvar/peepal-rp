"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { trackCtaClick, trackNavClick } from "@/lib/analytics/events";

const NAV = [
  { href: "/modules",     label: "Modules"      },
  { href: "/about",       label: "About"        },
  { href: "/mission",     label: "Mission"      },
  { href: "/inspiration", label: "Inspiration"  },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "bg-[#fafaf9]/85 backdrop-blur-xl border-b border-[#e7e7e3]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <Link
          href="/"
          className="flex items-center"
          onClick={() =>
            trackNavClick({
              location: "marketing_nav",
              item_id: "logo_home",
              item_name: "Peepal logo",
              link_url: "/",
            })
          }
        >
          <Logo withText size={28} variant="gradient" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-[14px] font-medium text-[#3a3a37] transition-colors hover:text-[#0a0a09]"
              onClick={() =>
                trackNavClick({
                  location: "marketing_nav",
                  item_id: item.href.replace(/^\//, ""),
                  item_name: item.label,
                  link_url: item.href,
                })
              }
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            onClick={() =>
              trackNavClick({
                location: "marketing_nav",
                item_id: "sign_in",
                item_name: "Sign in",
                link_url: "/login",
              })
            }
          >
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link
            href="/login"
            onClick={() =>
              trackCtaClick({
                location: "marketing_nav",
                item_id: "get_started",
                item_name: "Get started",
                link_url: "/login",
              })
            }
          >
            <Button variant="default" size="sm">
              Get started <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
