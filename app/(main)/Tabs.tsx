"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Tabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  if (tabs.length === 0) return null;

  return (
    <nav className="tabs">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? "tab active" : "tab"}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
