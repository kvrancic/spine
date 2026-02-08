"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";
import { streamChat } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const SUGGESTED_QUESTIONS = [
  "Who are the most critical people in this organization?",
  "What are the biggest communication bottlenecks?",
  "Which teams are the most siloed?",
  "What would happen if Sally Beck left?",
  "Which relationships show the most negative sentiment?",
  "Who are the bridge people connecting different communities?",
];

export default function ChatDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      for await (const token of streamChat(text, history)) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, there was an error. Make sure the API server is running.",
          };
        }
        return updated;
      });
    }

    setStreaming(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className="fixed top-0 right-0 bottom-0 w-[420px] bg-white border-l border-[var(--card-border)] z-[70] flex flex-col"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="h-14 border-b border-[var(--card-border)] flex items-center justify-between px-4">
              <span className="font-semibold text-sm">Ask AI</span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="pt-8">
                  <div className="text-center mb-6">
                    <Sparkles className="w-6 h-6 text-[var(--muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--muted)]">
                      Ask about your organization
                    </p>
                  </div>
                  <div className="space-y-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left text-xs p-2.5 rounded-lg border border-[var(--card-border)] hover:bg-gray-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-[var(--foreground)] text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                          {msg.content ? (
                            msg.role === "assistant" ? (
                              <Markdown>{msg.content}</Markdown>
                            ) : (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            )
                          ) : streaming && i === messages.length - 1 ? (
                            <span className="inline-block w-2 h-4 bg-[var(--foreground)] animate-pulse" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[var(--card-border)] p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--foreground)] transition-colors"
                  disabled={streaming}
                />
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  className="bg-[var(--foreground)] text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
