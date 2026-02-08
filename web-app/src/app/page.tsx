"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Upload, CheckCircle, Loader2 } from "lucide-react";

const ShaderAnimation = dynamic(
  () => import("@/components/ui/shader-animation"),
  { ssr: false }
);

const PROCESSING_STEPS = [
  { label: "Parsing emails...", duration: 1200 },
  { label: "Building communication graph...", duration: 1500 },
  { label: "Computing centrality metrics...", duration: 1000 },
  { label: "Detecting communities...", duration: 800 },
  { label: "Analyzing sentiment...", duration: 1200 },
  { label: "Computing health score...", duration: 600 },
  { label: "Preparing graph view...", duration: 500 },
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
        setTimeout(() => router.push("/graph"), 500);
        return;
      }
      setCurrentStep(step);
      step++;
      setTimeout(runStep, PROCESSING_STEPS[step - 1].duration);
    };

    runStep();
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Shader background */}
      <ShaderAnimation />

      {/* Wordmark */}
      <div className="absolute top-8 left-0 right-0 flex justify-center z-10">
        <h1 className="text-white text-4xl font-bold tracking-tight">Spine</h1>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {!processing ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg w-full"
            >
              <div
                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-10 border transition-colors ${
                  dragOver
                    ? "border-[var(--foreground)]"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  startProcessing();
                }}
                onClick={startProcessing}
              >
                <div className="text-center cursor-pointer">
                  <Upload className="w-8 h-8 text-[var(--muted)] mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    Upload your email data
                  </h2>
                  <p className="text-sm text-[var(--muted)] mb-1">
                    .mbox, .pst, or maildir format
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Processed locally — never leaves your infrastructure
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-md w-full"
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Loader2 className="w-5 h-5 text-[var(--foreground)] animate-spin" />
                  <h2 className="text-lg font-semibold">Analyzing...</h2>
                </div>

                <div className="space-y-2.5">
                  {PROCESSING_STEPS.map((step, i) => (
                    <motion.div
                      key={step.label}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{
                        opacity: i <= currentStep ? 1 : 0.3,
                        x: 0,
                      }}
                      transition={{ delay: i * 0.08, duration: 0.2 }}
                    >
                      {i < currentStep ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : i === currentStep ? (
                        <Loader2 className="w-4 h-4 text-[var(--foreground)] animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          i <= currentStep
                            ? "text-[var(--foreground)]"
                            : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
