"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { getPeople } from "@/lib/api";
import type { PersonSummary } from "@/lib/types";

type SortKey = "name" | "betweenness" | "pagerank" | "dms_score" | "total_sent" | "total_received" | "eigenvector";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "betweenness", label: "Betweenness" },
  { value: "pagerank", label: "PageRank" },
  { value: "eigenvector", label: "Eigenvector" },
  { value: "dms_score", label: "High Risk Score" },
  { value: "total_sent", label: "Emails Sent" },
  { value: "total_received", label: "Emails Received" },
];

function AlertIcon({ dmsScore, allScores }: { dmsScore: number; allScores: number[] }) {
  if (allScores.length === 0) return null;
  const sorted = [...allScores].sort((a, b) => b - a);
  const top10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const top30 = sorted[Math.floor(sorted.length * 0.3)] ?? 0;

  if (dmsScore >= top10) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  if (dmsScore >= top30) return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
}

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("betweenness");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    getPeople()
      .then((data) => {
        setPeople(data.people);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load people:", err);
        setLoading(false);
      });
  }, []);

  const allDmsScores = people.map((p) => p.dms_score);

  const filtered = people
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });

  const displayed = filtered.slice(0, page * pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--foreground)]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-[var(--card-border)] rounded-lg px-3 py-2 w-72">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="text-sm flex-1 outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[var(--muted)]" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm border border-[var(--card-border)] rounded-lg px-3 py-2 bg-white outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-sm text-[var(--muted)]">{filtered.length} people</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left text-xs font-medium text-[var(--muted)] px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-4 py-3">Email</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-4 py-3">Since</th>
                <th className="text-center text-xs font-medium text-[var(--muted)] px-4 py-3">Alert</th>
                <th className="text-left text-xs font-medium text-[var(--muted)] px-4 py-3">Betweenness</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/graph?focus=${encodeURIComponent(person.id)}`)
                  }
                >
                  <td className="px-4 py-3 text-sm font-medium">{person.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--muted)]">{person.email}</td>
                  <td className="px-4 py-3 text-sm text-[var(--muted)]">--</td>
                  <td className="px-4 py-3 text-center">
                    <AlertIcon dmsScore={person.dms_score} allScores={allDmsScores} />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{person.betweenness.toFixed(5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load more */}
      {displayed.length < filtered.length && (
        <div className="text-center mt-4">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="text-sm font-medium text-[var(--foreground)] border border-[var(--card-border)] rounded-lg px-6 py-2 hover:bg-gray-50 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
