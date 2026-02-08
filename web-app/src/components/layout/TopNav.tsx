"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Image from "next/image";

const navTabs = [
  { href: "/people", label: "People" },
  { href: "/trends", label: "Trends" },
  { href: "/risks", label: "Risks" },
  { href: "/reports", label: "Report" },
];

export default function TopNav({ onChatToggle }: { onChatToggle: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="h-14 border-b border-[var(--card-border)] bg-white flex items-center px-6 fixed top-0 left-0 right-0 z-50">
      {/* Logo */}
      <Link href="/graph" className="flex items-center mr-8">
        <Image src="/spine-s.svg" alt="Spine" width={28} height={28} />
      </Link>

      {/* Tabs */}
      <div className="flex items-center gap-1">
        {navTabs.map(({ href, label }) => {
          const isActive = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                isActive
                  ? "font-semibold text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chat toggle */}
      <button
        onClick={onChatToggle}
        className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-gray-100 transition-colors"
        aria-label="Open chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </nav>
  );
}
