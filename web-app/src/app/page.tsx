"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Upload,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
  Database,
  FolderOpen,
} from "lucide-react";

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

const ENRON_KEYWORDS = ["enron", "maildir", "skilling", "lay", "fastow"];

function looksLikeEnron(files: FileList | File[]): boolean {
  for (const file of Array.from(files)) {
    const name = file.name.toLowerCase();
    if (ENRON_KEYWORDS.some((kw) => name.includes(kw))) return true;
  }
  return false;
}

function getErrorMessage(files: FileList | File[]): {
  title: string;
  detail: string;
} {
  const fileArr = Array.from(files);
  const totalSize = fileArr.reduce((sum, f) => sum + f.size, 0);
  const names = fileArr.map((f) => f.name.toLowerCase());

  const hasValidExt = names.some(
    (n) =>
      n.endsWith(".mbox") ||
      n.endsWith(".pst") ||
      n.endsWith(".eml") ||
      n.endsWith(".zip") ||
      n.endsWith(".tar.gz") ||
      n.endsWith(".gz")
  );

  if (!hasValidExt) {
    return {
      title: "Unsupported format",
      detail:
        "Expected .mbox, .pst, .eml, or compressed maildir archive. The uploaded file type is not recognized as a supported email corpus.",
    };
  }

  if (totalSize < 5 * 1024 * 1024) {
    return {
      title: "Corpus too small",
      detail:
        "Spine requires a minimum of ~10,000 messages to generate meaningful organizational insights. The uploaded dataset appears too small to analyze.",
    };
  }

  return {
    title: "Unable to parse corpus",
    detail:
      "The email archive could not be parsed. Please ensure it is a valid email corpus export in .mbox, .pst, or maildir format.",
  };
}

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const startProcessing = () => {
    setProcessing(true);
    setError(null);
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

  const handleFiles = (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    setUploadedFileName(
      fileArr.length === 1
        ? fileArr[0].name
        : `${fileArr.length} files selected`
    );

    if (looksLikeEnron(fileArr)) {
      startProcessing();
    } else {
      setError(getErrorMessage(fileArr));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ShaderAnimation />

      {/* Wordmark */}
      <motion.div
        className="absolute top-16 left-0 right-0 flex justify-center z-10 pointer-events-none"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <h1
          className="text-[56pt] font-bold tracking-tight"
          style={{
            color: "white",
            mixBlendMode: "difference",
            textShadow:
              "0 0 60px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.1)",
          }}
        >
          Spine
        </h1>
      </motion.div>

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
              className="max-w-xl w-full"
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mbox,.pst,.eml,.zip,.tar.gz,.gz"
                multiple
                onChange={handleFileInput}
              />

              {/* File picker area */}
              <div
                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver
                    ? "border-[var(--foreground)] bg-white/95"
                    : error
                      ? "border-red-300 hover:border-red-400"
                      : "border-gray-300 hover:border-gray-500"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <AnimatePresence mode="wait">
                  {!error ? (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-5 h-5 text-[var(--muted)]" />
                      </div>
                      <h2 className="text-lg font-semibold mb-1">
                        Import email corpus
                      </h2>
                      <p className="text-sm text-[var(--muted)] mb-3">
                        Drag and drop or click to browse
                      </p>
                      <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          .mbox
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          .pst
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3.5 h-3.5" />
                          maildir
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-4">
                        Processed locally — never leaves your infrastructure
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-4"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <h2 className="text-lg font-semibold text-red-600 mb-1">
                        {error.title}
                      </h2>
                      <p className="text-sm text-[var(--muted)] mb-4 max-w-sm mx-auto">
                        {error.detail}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {uploadedFileName && (
                          <span className="text-gray-400">
                            {uploadedFileName}
                          </span>
                        )}
                      </p>
                      <button
                        className="mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-2 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Try a different file
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                  or
                </span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              {/* Proceed with Enron button */}
              <motion.button
                onClick={startProcessing}
                className="w-full bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-200 hover:border-gray-400 transition-all hover:bg-white/95 group cursor-pointer"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <Database className="w-4.5 h-4.5 text-[var(--foreground)]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">
                        Explore with Enron data
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        Enron corpus — 121,543 emails, 4,555 employees
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                    →
                  </span>
                </div>
              </motion.button>

              {/* After error: extra nudge */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs text-white/60 mt-3"
                  >
                    Having trouble? Try the sample dataset above to explore
                    Spine&apos;s capabilities.
                  </motion.p>
                )}
              </AnimatePresence>
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
