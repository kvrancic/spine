"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, Shield, Trash2 } from "lucide-react";
import { fetchRisks } from "@/lib/api";
import type { RisksData } from "@/lib/types";

export default function RisksPage() {
  const router = useRouter();
  const [data, setData] = useState<RisksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRisks()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePersonClick = (id: string) => {
    router.push(`/graph?focus=${encodeURIComponent(id)}`);
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
        Failed to load risks data.
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-5xl mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="text-lg font-semibold">Risks</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-Risk Nodes */}
        <div className="bg-white rounded-xl border border-[var(--card-border)]">
          <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm">High-Risk Nodes</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.high_risk_nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handlePersonClick(node.id)}
                className="w-full px-5 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{node.name}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      node.risk_label === "Critical"
                        ? "bg-red-50 text-red-700"
                        : node.risk_label === "High"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {node.risk_label}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{node.key_vulnerability}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Impact: {node.impact_pct}% | Score: {node.risk_score.toFixed(3)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Structural Risks */}
        <div className="bg-white rounded-xl border border-[var(--card-border)]">
          <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--muted)]" />
            <h3 className="font-semibold text-sm">Structural Risks</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.structural_risks.map((risk) => (
              <div key={risk.label} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{risk.label}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      risk.severity === "Critical"
                        ? "bg-red-50 text-red-700"
                        : risk.severity === "High"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Communication Waste */}
        <div className="bg-white rounded-xl border border-[var(--card-border)]">
          <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[var(--muted)]" />
            <h3 className="font-semibold text-sm">Communication Waste</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.communication_waste.map((w) => (
              <button
                key={w.id}
                onClick={() => handlePersonClick(w.id)}
                className="w-full px-5 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="text-xs font-mono">{w.waste_score.toFixed(1)}</span>
                </div>
                <div className="flex gap-3 text-xs text-[var(--muted)]">
                  <span>Broadcast: {(w.broadcast_ratio * 100).toFixed(0)}%</span>
                  <span>Orphan: {(w.orphan_ratio * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
