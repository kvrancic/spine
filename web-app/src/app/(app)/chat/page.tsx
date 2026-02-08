"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
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

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      for await (const token of streamChat(text, history)) {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, there was an error processing your request. Make sure the API server is running and the OpenAI API key is configured.",
          };
        }
        return updated;
      });
    }

    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto pt-12">
            <div className="text-center mb-8">
              <Sparkles className="w-8 h-8 text-[var(--accent)] mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-2">Ask about your organization</h2>
              <p className="text-sm text-[var(--muted)]">
                Powered by GraphRAG — combining graph analytics with GPT for data-backed answers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-sm p-3 rounded-lg border border-[var(--card-border)] hover:bg-gray-50 hover:border-[var(--accent)] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white border border-[var(--card-border)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap prose prose-sm max-w-none">
                    {msg.content || (streaming && i === messages.length - 1 ? (
                      <span className="inline-block w-2 h-4 bg-[var(--accent)] animate-pulse" />
                    ) : null)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--card-border)] p-4 bg-white">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="max-w-3xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the organization..."
            className="flex-1 border border-[var(--card-border)] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] transition-colors"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="bg-[var(--accent)] text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
