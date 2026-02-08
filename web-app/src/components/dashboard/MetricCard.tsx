"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
}

export default function MetricCard({ label, value, subtitle, icon: Icon, color = "text-[var(--accent)]" }: MetricCardProps) {
  return (
    <motion.div
      className="bg-white rounded-xl border border-[var(--card-border)] p-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}
