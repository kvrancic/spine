"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Markdown from "react-markdown";
import { getHealthReport } from "@/lib/api";
import type { ReportSection } from "@/lib/types";

export default function ReportsPage() {
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const data = await getHealthReport();
      setSections(data.report);
      setGenerated(true);
    } catch (err) {
      console.error("Failed to generate report:", err);
    }
    setLoading(false);
  };

  if (!generated) {
    return (
      <div className="max-w-3xl mx-auto text-center pt-16">
        <FileText className="w-12 h-12 text-[var(--muted)] mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Organizational Health Report</h2>
        <p className="text-sm text-[var(--muted)] mb-8 max-w-md mx-auto">
          Generate a comprehensive diagnostic report with executive summary,
          critical personnel analysis, bottleneck identification, and actionable recommendations.
        </p>

        <button
          onClick={generateReport}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[var(--accent)] text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating report...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>

        {loading && (
          <p className="text-xs text-[var(--muted)] mt-4">
            This may take 15-30 seconds as the AI analyzes organizational data...
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Organizational Health Report</h2>
        <button
          onClick={() => window.print()}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[var(--card-border)] overflow-hidden">
        {sections.map((section, i) => (
          <motion.div
            key={i}
            className="p-6 border-b border-gray-50 last:border-b-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <h3 className="text-lg font-semibold mb-3">{section.title}</h3>
            <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
              <Markdown>{section.content}</Markdown>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
