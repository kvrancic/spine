"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  Users,
  FileText,
  MessageSquare,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/people", label: "People", icon: Users },
  { href: "/chat", label: "Ask AI", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-[var(--card-border)] bg-white flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-[var(--card-border)]">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-[var(--accent)]" />
          <span className="font-semibold text-lg tracking-tight">OrgVitals</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-gray-100 hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--card-border)] text-xs text-[var(--muted)]">
        <p>OrgVitals v0.1</p>
        <p className="mt-1">Enron Dataset Demo</p>
      </div>
    </aside>
  );
}
