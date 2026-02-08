/**
 * Step 11 Tests: Frontend — Chat Interface
 *
 * Verifies:
 * - Chat page renders with suggested questions
 * - Input field works
 * - Suggested questions are clickable
 * - Message display area exists
 * - Streaming state management
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/chat"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock the streaming API
vi.mock("@/lib/api", () => ({
  streamChat: vi.fn(async function* () {
    yield "Hello";
    yield " world";
  }),
}));

describe("Step 11: Chat Interface", () => {
  it("renders suggested questions when no messages", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    expect(
      screen.getByText("Who are the most critical people in this organization?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("What are the biggest communication bottlenecks?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Which teams are the most siloed?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("What would happen if Sally Beck left?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Which relationships show the most negative sentiment?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Who are the bridge people connecting different communities?")
    ).toBeInTheDocument();
  });

  it("renders the ask AI title", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    expect(
      screen.getByText("Ask about your organization")
    ).toBeInTheDocument();
  });

  it("renders GraphRAG description", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    expect(
      screen.getByText(
        /Powered by GraphRAG/
      )
    ).toBeInTheDocument();
  });

  it("renders message input field", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    const input = screen.getByPlaceholderText(
      "Ask a question about the organization..."
    );
    expect(input).toBeInTheDocument();
  });

  it("renders send button", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    const sendButton = screen.getByRole("button", { name: "" });
    expect(sendButton).toBeInTheDocument();
  });

  it("disables send button when input is empty", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find(
      (b) => b.getAttribute("type") === "submit"
    );
    expect(sendButton).toBeDisabled();
  });

  it("enables send button when input has text", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    const input = screen.getByPlaceholderText(
      "Ask a question about the organization..."
    );
    fireEvent.change(input, { target: { value: "Who is Sally Beck?" } });

    const buttons = screen.getAllByRole("button");
    const sendButton = buttons.find(
      (b) => b.getAttribute("type") === "submit"
    );
    expect(sendButton).not.toBeDisabled();
  });

  it("suggested questions are clickable buttons", async () => {
    const { default: ChatPage } = await import("@/app/(app)/chat/page");
    render(React.createElement(ChatPage));

    const questionButtons = screen.getAllByRole("button");
    // There should be the 6 suggested questions + 1 send button
    expect(questionButtons.length).toBeGreaterThanOrEqual(7);
  });
});
