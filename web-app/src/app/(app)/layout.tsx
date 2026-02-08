"use client";

import { useState } from "react";
import TopNav from "@/components/layout/TopNav";
import ChatDrawer from "@/components/layout/ChatDrawer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <TopNav onChatToggle={() => setChatOpen((prev) => !prev)} />
      <main className="pt-14 bg-[var(--background)]">
        {children}
      </main>
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
