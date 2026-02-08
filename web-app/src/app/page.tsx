"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Activity, CheckCircle, Loader2 } from "lucide-react";

const PROCESSING_STEPS = [
  { label: "Parsing emails...", duration: 1200 },
  { label: "Building communication graph...", duration: 1500 },
  { label: "Computing centrality metrics...", duration: 1000 },
  { label: "Detecting communities...", duration: 800 },
  { label: "Analyzing sentiment...", duration: 1200 },
  { label: "Computing health score...", duration: 600 },
  { label: "Preparing dashboard...", duration: 500 },
];

export default function LandingPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const startProcessing = () => {
    setProcessing(true);
    let step = 0;

    const runStep = () => {
      if (step >= PROCESSING_STEPS.length) {
        setTimeout(() => router.push("/dashboard"), 500);
        return;
      }
      setCurrentStep(step);
      step++;
      setTimeout(runStep, PROCESSING_STEPS[step - 1].duration);
    };

    runStep();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-4">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-[var(--accent)]" />
          <span className="font-semibold text-lg tracking-tight">OrgVitals</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-2xl w-full text-center">
          <AnimatePresence mode="wait">
            {!processing ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-4xl font-bold tracking-tight mb-3">
                  Understand your organization
                  <br />
                  <span className="text-[var(--accent)]">in minutes, not months</span>
                </h1>
                <p className="text-lg text-[var(--muted)] mb-10">
                  Upload your company&apos;s email data for instant graph-based diagnostics,
                  critical people identification, and AI-powered organizational intelligence.
                </p>

                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 transition-colors cursor-pointer ${
                    dragOver
                      ? "border-[var(--accent)] bg-[var(--accent-light)]"
                      : "border-gray-300 hover:border-[var(--accent)] hover:bg-gray-50"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); startProcessing(); }}
                  onClick={startProcessing}
                >
                  <Upload className="w-10 h-10 text-[var(--muted)] mx-auto mb-4" />
                  <p className="text-lg font-medium mb-1">
                    Drop your email export here
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    .mbox, .pst, or maildir format — or click to browse
                  </p>
                </div>

                <p className="text-xs text-[var(--muted)] mt-6">
                  Your data is processed locally and never leaves your infrastructure.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-3 mb-8">
                  <Loader2 className="w-6 h-6 text-[var(--accent)] animate-spin" />
                  <h2 className="text-2xl font-bold">Analyzing your organization...</h2>
                </div>

                <div className="space-y-3 text-left max-w-md mx-auto">
                  {PROCESSING_STEPS.map((step, i) => (
                    <motion.div
                      key={step.label}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: i <= currentStep ? 1 : 0.3,
                        x: 0,
                      }}
                      transition={{ delay: i * 0.1, duration: 0.2 }}
                    >
                      {i < currentStep ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : i === currentStep ? (
                        <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${i <= currentStep ? "text-[var(--foreground)]" : "text-gray-400"}`}>
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
