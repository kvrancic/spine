"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/graph": "Graph Explorer",
  "/people": "People",
  "/chat": "Ask AI",
  "/reports": "Reports",
};

export default function Header() {
  const pathname = usePathname();
  const title = Object.entries(pageTitles).find(([path]) =>
    pathname?.startsWith(path)
  )?.[1] || "OrgVitals";

  return (
    <header className="h-14 border-b border-[var(--card-border)] bg-white flex items-center px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
