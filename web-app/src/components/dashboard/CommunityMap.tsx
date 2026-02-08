"use client";

import type { Community } from "@/lib/types";

interface CommunityMapProps {
  communities: Community[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#d946ef", "#a3e635",
  "#fb923c", "#2dd4bf", "#818cf8",
];

export default function CommunityMap({ communities }: CommunityMapProps) {
  const sorted = [...communities].sort((a, b) => b.size - a.size);
  const maxSize = sorted[0]?.size || 1;

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Communities</h3>
      <div className="space-y-2">
        {sorted.slice(0, 10).map((community) => {
          const pct = (community.size / maxSize) * 100;
          const color = COLORS[community.id % COLORS.length];
          return (
            <div key={community.id} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[var(--muted)]">Community {community.id}</span>
                  <span className="font-medium">{community.size} people</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
