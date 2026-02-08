"use client";

import { useEffect, useState } from "react";
import { Users, GitBranch, Network, Route, TrendingDown, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

import HealthScore from "@/components/dashboard/HealthScore";
import MetricCard from "@/components/dashboard/MetricCard";
import TopPeople from "@/components/dashboard/TopPeople";
import CommunityMap from "@/components/dashboard/CommunityMap";
import { getMetricsOverview, getDeadManSwitch, getWaste, getCommunities } from "@/lib/api";
import type { MetricsOverview, DMSEntry, WasteEntry, Community } from "@/lib/types";

export default function DashboardPage() {
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [dms, setDms] = useState<DMSEntry[]>([]);
  const [waste, setWaste] = useState<WasteEntry[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMetricsOverview(),
      getDeadManSwitch(),
      getWaste(),
      getCommunities(),
    ]).then(([o, d, w, c]) => {
      setOverview(o);
      setDms(d.rankings);
      setWaste(w.people);
      setCommunities(c.communities);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load dashboard data:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <p>Failed to load dashboard data.</p>
        <p className="text-sm mt-1">Make sure the API server is running on port 8000.</p>
      </div>
    );
  }

  const { health, sentiment } = overview;
  const stats = health.stats;

  return (
    <motion.div
      className="space-y-6 max-w-7xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top row: Health + Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1">
          <HealthScore score={health.health_score} grade={health.grade} />
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="People"
            value={stats.node_count.toLocaleString()}
            icon={Users}
          />
          <MetricCard
            label="Relationships"
            value={stats.edge_count.toLocaleString()}
            icon={GitBranch}
          />
          <MetricCard
            label="Communities"
            value={stats.communities_count}
            subtitle={`Modularity: ${stats.modularity.toFixed(2)}`}
            icon={Network}
          />
          <MetricCard
            label="Avg Path Length"
            value={stats.avg_path_length?.toFixed(2) || "N/A"}
            icon={Route}
          />
        </div>
      </div>

      {/* Sub-scores row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Connectivity"
          value={`${health.sub_scores.connectivity.toFixed(0)}%`}
          icon={Network}
          color="text-green-500"
        />
        <MetricCard
          label="Bottleneck Risk"
          value={`${health.sub_scores.bottleneck_risk.toFixed(0)}%`}
          icon={AlertTriangle}
          color="text-red-500"
        />
        <MetricCard
          label="Silo Score"
          value={`${health.sub_scores.silo_score.toFixed(0)}%`}
          icon={Network}
          color="text-orange-500"
        />
        <MetricCard
          label="Efficiency"
          value={`${health.sub_scores.efficiency.toFixed(0)}%`}
          icon={TrendingDown}
          color="text-blue-500"
        />
      </div>

      {/* Bottom row: Top People + Communities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopPeople
          title="Most Critical People (Dead-Man-Switch)"
          people={dms.slice(0, 5).map(d => ({
            id: d.id,
            name: d.name,
            score: d.dms_score,
            label: `impact: ${d.impact_pct}%`,
          }))}
          scoreColor={(score) =>
            score > 0.3 ? "text-red-600" : score > 0.15 ? "text-orange-500" : "text-green-600"
          }
        />
        <TopPeople
          title="Biggest Communication Waste"
          people={waste.slice(0, 5).map(w => ({
            id: w.id,
            name: w.name,
            score: w.waste_score,
            label: "waste",
          }))}
          scoreColor={(score) =>
            score > 50 ? "text-red-600" : score > 25 ? "text-orange-500" : "text-green-600"
          }
        />
        <CommunityMap communities={communities} />
      </div>
    </motion.div>
  );
}
