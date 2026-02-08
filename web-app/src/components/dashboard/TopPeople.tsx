"use client";

import Link from "next/link";

interface TopPeopleProps {
  title: string;
  people: Array<{
    id: string;
    name: string;
    score: number;
    label: string;
  }>;
  scoreColor?: (score: number) => string;
}

export default function TopPeople({ title, people, scoreColor }: TopPeopleProps) {
  const getColor = scoreColor || (() => "text-[var(--foreground)]");

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-5">
      <h3 className="text-sm font-medium text-[var(--muted)] mb-3">{title}</h3>
      <div className="space-y-2.5">
        {people.map((person, i) => (
          <Link
            key={person.id}
            href={`/people/${encodeURIComponent(person.id)}`}
            className="flex items-center justify-between py-1.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--muted)] w-5">{i + 1}</span>
              <span className="text-sm font-medium">{person.name}</span>
            </div>
            <span className={`text-sm font-mono ${getColor(person.score)}`}>
              {person.score.toFixed(2)} <span className="text-xs text-[var(--muted)]">{person.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
