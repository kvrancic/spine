"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { getPerson } from "@/lib/api";
import type { PersonDetail } from "@/lib/types";

export default function PersonPage() {
  const params = useParams();
  const id = decodeURIComponent(params.id as string);
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerson(id).then(data => {
      setPerson(data);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load person:", err);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (!person) {
    return <div className="text-center py-12 text-[var(--muted)]">Person not found.</div>;
  }

  const dms = person.dead_man_switch as any;
  const waste = person.waste as any;

  return (
    <div className="max-w-5xl">
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to People
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{person.name}</h2>
            <p className="text-[var(--muted)] text-sm mt-1">{person.email}</p>
            {person.community_id !== null && (
              <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                Community {person.community_id}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricBox label="PageRank" value={person.metrics.pagerank.toFixed(5)} icon={TrendingUp} />
        <MetricBox label="Betweenness" value={person.metrics.betweenness_centrality.toFixed(5)} icon={Users} />
        <MetricBox label="Eigenvector" value={person.metrics.eigenvector_centrality.toFixed(5)} icon={TrendingUp} />
        <MetricBox label="Degree" value={person.metrics.degree_centrality.toFixed(5)} icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Sentiment */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Sentiment</h3>
          <div className="space-y-3">
            <SentimentBar label="Avg Sent" value={person.sentiment.avg_sent} />
            <SentimentBar label="Avg Received" value={person.sentiment.avg_received} />
          </div>
        </div>

        {/* Dead-Man-Switch */}
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-3">Critical Node Analysis</h3>
          {dms?.dms_score !== undefined ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>DMS Score</span>
                <span className="font-mono font-medium">{dms.dms_score.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Impact if removed</span>
                <span className={`font-mono font-medium ${dms.impact_pct > 5 ? "text-red-600" : "text-green-600"}`}>
                  {dms.impact_pct}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Redundancy</span>
                <span className="font-mono font-medium">{dms.redundancy?.toFixed(4)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No DMS data available</p>
          )}
        </div>
      </div>

      {/* Waste */}
      {waste?.waste_score !== undefined && (
        <div className="bg-white rounded-xl border border-[var(--card-border)] p-5 mb-6">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-3">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Communication Waste (Score: {waste.waste_score.toFixed(1)})
            </span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WasteStat label="Overproduction" value={waste.overproduction?.toFixed(2)} />
            <WasteStat label="Broadcast Ratio" value={(waste.broadcast_ratio * 100)?.toFixed(1) + "%"} />
            <WasteStat label="Reply-All Ratio" value={(waste.reply_all_ratio * 100)?.toFixed(1) + "%"} />
            <WasteStat label="Orphan Ratio" value={(waste.orphan_ratio * 100)?.toFixed(1) + "%"} />
          </div>
        </div>
      )}

      {/* Connections */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
        <h3 className="text-sm font-medium text-[var(--muted)] mb-3">
          Top Connections ({person.connections.length})
        </h3>
        <div className="space-y-1">
          {person.connections.slice(0, 20).map((conn, i) => (
            <Link
              key={`${conn.id}-${conn.direction}-${i}`}
              href={`/people/${encodeURIComponent(conn.id)}`}
              className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  conn.direction === "outgoing" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                }`}>
                  {conn.direction === "outgoing" ? "→" : "←"}
                </span>
                <span className="text-sm font-medium">{conn.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                <span>{conn.email_count} emails</span>
                <span className={conn.sentiment < -0.1 ? "text-red-500" : conn.sentiment > 0.1 ? "text-green-500" : ""}>
                  {conn.sentiment.toFixed(3)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[var(--muted)]" />
        <span className="text-xs text-[var(--muted)]">{label}</span>
      </div>
      <p className="text-lg font-mono font-bold">{value}</p>
    </div>
  );
}

function SentimentBar({ label, value }: { label: string; value: number }) {
  const pct = ((value + 1) / 2) * 100; // -1..1 → 0..100
  const color = value > 0.1 ? "bg-green-500" : value < -0.1 ? "bg-red-500" : "bg-gray-400";
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(4)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(5, pct)}%` }} />
      </div>
    </div>
  );
}

function WasteStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-sm font-mono font-medium mt-1">{value}</p>
    </div>
  );
}
