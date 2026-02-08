"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fetchTrends } from "@/lib/api";
import type { TrendsData, TrendItem } from "@/lib/types";

function TrendCard({
  title,
  items,
  onItemClick,
}: {
  title: string;
  items: TrendItem[];
  onItemClick: (personId: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)]">
      <div className="px-5 py-4 border-b border-[var(--card-border)]">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <button
            key={item.person_id + item.metric}
            onClick={() => onItemClick(item.person_id)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <div>
              <p className="text-sm font-medium">{item.person_name}</p>
              <p className="text-xs text-[var(--muted)]">{item.metric}</p>
            </div>
            <div className="text-right">
              <span
                className={`text-sm font-mono font-medium ${
                  item.delta_pct > 0 ? "text-green-600" : item.delta_pct < 0 ? "text-red-600" : "text-[var(--muted)]"
                }`}
              >
                {item.delta_pct > 0 ? "▲" : item.delta_pct < 0 ? "▼" : "–"}{" "}
                {Math.abs(item.delta_pct)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const router = useRouter();
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrends()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleClick = (personId: string) => {
    router.push(`/graph?focus=${encodeURIComponent(personId)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        Failed to load trends data.
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends</h2>
        <span className="text-xs text-[var(--muted)]">
          Last 30 days vs Prior 30 days (heuristic)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TrendCard
          title="Structural Shifts"
          items={data.structural_shifts}
          onItemClick={handleClick}
        />
        <TrendCard
          title="Communication Shifts"
          items={data.communication_shifts}
          onItemClick={handleClick}
        />
        <TrendCard
          title="Workstream Shifts"
          items={data.workstream_shifts}
          onItemClick={handleClick}
        />
      </div>
    </motion.div>
  );
}
