"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown } from "lucide-react";
import { getPeople } from "@/lib/api";
import type { PersonSummary } from "@/lib/types";

type SortKey = "name" | "pagerank" | "betweenness" | "eigenvector" | "dms_score" | "waste_score" | "total_sent" | "avg_sent_sentiment";

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pagerank");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    getPeople().then(data => {
      setPeople(data.people);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load people:", err);
      setLoading(false);
    });
  }, []);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = people
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string") return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  const columns: { key: SortKey; label: string; format?: (v: number) => string }[] = [
    { key: "name", label: "Name" },
    { key: "pagerank", label: "PageRank", format: (v) => v.toFixed(5) },
    { key: "betweenness", label: "Betweenness", format: (v) => v.toFixed(5) },
    { key: "dms_score", label: "DMS Score", format: (v) => v.toFixed(3) },
    { key: "waste_score", label: "Waste", format: (v) => v.toFixed(1) },
    { key: "total_sent", label: "Sent", format: (v) => v.toLocaleString() },
    { key: "avg_sent_sentiment", label: "Sentiment", format: (v) => v.toFixed(3) },
  ];

  return (
    <div className="max-w-7xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-[var(--card-border)] rounded-lg px-3 py-2 w-72">
          <Search className="w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm flex-1 outline-none bg-transparent"
          />
        </div>
        <span className="text-sm text-[var(--muted)]">{filtered.length} people</span>
      </div>

      <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                {columns.map(col => (
                  <th
                    key={col.key}
                    className="text-left text-xs font-medium text-[var(--muted)] px-4 py-3 cursor-pointer hover:text-[var(--foreground)] transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(person => (
                <tr
                  key={person.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={`/people/${encodeURIComponent(person.id)}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                      {person.name}
                    </Link>
                  </td>
                  {columns.slice(1).map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm font-mono text-[var(--foreground)]">
                      {col.format ? col.format(person[col.key] as number) : person[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
