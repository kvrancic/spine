"use client";

import { motion } from "framer-motion";

interface HealthScoreProps {
  score: number;
  grade: string;
}

export default function HealthScore({ score, grade }: HealthScoreProps) {
  const circumference = 2 * Math.PI * 60;
  const progress = (score / 100) * circumference;

  const gradeColor =
    grade === "A" ? "text-green-500" :
    grade === "B" ? "text-blue-500" :
    grade === "C" ? "text-yellow-500" :
    grade === "D" ? "text-orange-500" :
    "text-red-500";

  const strokeColor =
    grade === "A" ? "#22c55e" :
    grade === "B" ? "#3b82f6" :
    grade === "C" ? "#eab308" :
    grade === "D" ? "#f97316" :
    "#ef4444";

  return (
    <div className="bg-white rounded-xl border border-[var(--card-border)] p-6 flex flex-col items-center">
      <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Organization Health</h3>
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <motion.circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className={`text-lg font-semibold ${gradeColor}`}>
            {grade}
          </span>
        </div>
      </div>
      <p className="text-xs text-[var(--muted)] mt-3">Score out of 100</p>
    </div>
  );
}
