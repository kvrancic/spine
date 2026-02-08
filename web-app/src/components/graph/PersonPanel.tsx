"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { fetchPersonPanel } from "@/lib/api";
import type { PersonPanel as PersonPanelData } from "@/lib/types";

function AlertIcon({ tier }: { tier: string }) {
  if (tier === "critical") return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (tier === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <CheckCircle className="w-4 h-4 text-green-500" />;
}

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider hover:text-[var(--foreground)] transition-colors"
      >
        {title}
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center text-sm py-0.5">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={`font-mono font-medium ${color || ""}`}>{value}</span>
    </div>
  );
}

function NormBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-0.5">
      <div className="flex justify-between items-center text-sm mb-0.5">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono font-medium">{value.toFixed(3)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-[var(--foreground)]"
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function PersonPanel({
  personId,
  onClose,
}: {
  personId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PersonPanelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPersonPanel(personId)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [personId]);

  if (loading) {
    return (
      <motion.div
        className="w-[380px] border-l border-[var(--card-border)] bg-white flex items-center justify-center"
        initial={{ x: 380 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--foreground)]" />
      </motion.div>
    );
  }

  if (!data) {
    return (
      <motion.div
        className="w-[380px] border-l border-[var(--card-border)] bg-white p-5"
        initial={{ x: 380 }}
        animate={{ x: 0 }}
      >
        <p className="text-sm text-[var(--muted)]">Failed to load data.</p>
        <button onClick={onClose} className="mt-2 text-sm underline">
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-[380px] border-l border-[var(--card-border)] bg-white flex flex-col h-full"
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--card-border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertIcon tier={data.alert_tier} />
            <div>
              <h3 className="font-semibold text-base leading-tight">{data.name}</h3>
              <p className="text-xs text-[var(--muted)]">{data.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {data.since && (
          <p className="text-xs text-[var(--muted)] mt-2">Since: {data.since}</p>
        )}
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4">
        <Section title="Role Snapshot" defaultOpen>
          <p className="text-sm text-gray-700 leading-relaxed">{data.role_snapshot}</p>
        </Section>

        <Section title="Current Workstreams" defaultOpen>
          <div className="space-y-2">
            {data.workstreams.map((ws) => (
              <div key={ws.label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span>{ws.label}</span>
                  <span className="font-mono">{ws.percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[var(--foreground)]"
                    style={{ width: `${ws.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Communication Health">
          <Row label="Emails / day" value={data.emails_per_day} />
          <Row label="Inbound" value={`${data.in_pct}%`} />
          <Row label="Outbound" value={`${data.out_pct}%`} />
          <Row label="Median response" value={`${data.median_response_time_hrs}h`} />
          <Row label="After-hours" value={data.after_hours_activity} />
        </Section>

        <Section title="Influence & Flow">
          <NormBar label="In-degree" value={data.in_degree_norm} />
          <NormBar label="Out-degree" value={data.out_degree_norm} />
          <Row label="Response latency" value={data.response_latency} />
        </Section>

        <Section title="Recent Changes (14d)">
          <Row
            label="Volume"
            value={`${data.volume_delta_pct > 0 ? "+" : ""}${data.volume_delta_pct}%`}
            color={data.volume_delta_pct > 10 ? "text-green-600" : data.volume_delta_pct < -10 ? "text-red-600" : ""}
          />
          {data.new_topic && <Row label="New topic" value={data.new_topic} />}
          <Row
            label="Diversity"
            value={`${data.diversity_delta_pct > 0 ? "+" : ""}${data.diversity_delta_pct}%`}
          />
        </Section>

        <Section title="Comparisons">
          <Row label="Peer rank" value={`#${data.peer_rank} of ${data.peer_total}`} />
          {data.likely_backups.length > 0 && (
            <div className="mt-1">
              <p className="text-xs text-[var(--muted)] mb-1">Likely backups:</p>
              <div className="space-y-0.5">
                {data.likely_backups.map((name) => (
                  <p key={name} className="text-sm">{name}</p>
                ))}
              </div>
            </div>
          )}
          {data.comparable_peers && data.comparable_peers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[var(--muted)] mb-2">Comparable peers:</p>
              <div className="space-y-2">
                {data.comparable_peers.map((peer) => (
                  <div key={peer.name} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-sm font-medium mb-1">{peer.name}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      <span className="text-[var(--muted)]">Betweenness</span>
                      <span className="font-mono text-right">{peer.betweenness.toFixed(5)}</span>
                      <span className="text-[var(--muted)]">PageRank</span>
                      <span className="font-mono text-right">{peer.pagerank.toFixed(5)}</span>
                      <span className="text-[var(--muted)]">Sent</span>
                      <span className="font-mono text-right">{peer.total_sent}</span>
                      <span className="text-[var(--muted)]">Received</span>
                      <span className="font-mono text-right">{peer.total_received}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </motion.div>
  );
}
