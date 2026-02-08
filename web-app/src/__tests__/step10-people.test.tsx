/**
 * Step 10 Tests: Frontend — People Pages
 *
 * Verifies:
 * - People list page renders sortable table
 * - Search input works
 * - Column headers exist for all metrics
 * - People detail page renders all sections
 * - Metric boxes, sentiment bars, connections list
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/people"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ id: "sally.beck@enron.com" })),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
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

// Mock API
vi.mock("@/lib/api", () => ({
  getPeople: vi.fn(() =>
    Promise.resolve({
      people: [
        {
          id: "sally.beck@enron.com",
          name: "Sally Beck",
          email: "sally.beck@enron.com",
          community_id: 0,
          pagerank: 0.015,
          betweenness: 0.008,
          eigenvector: 0.025,
          total_sent: 1200,
          total_received: 800,
          avg_sent_sentiment: 0.12,
          dms_score: 0.415,
          waste_score: 35.2,
        },
        {
          id: "john.lavorato@enron.com",
          name: "John Lavorato",
          email: "john.lavorato@enron.com",
          community_id: 1,
          pagerank: 0.012,
          betweenness: 0.005,
          eigenvector: 0.020,
          total_sent: 800,
          total_received: 600,
          avg_sent_sentiment: 0.05,
          dms_score: 0.320,
          waste_score: 42.1,
        },
      ],
    })
  ),
  getPerson: vi.fn(() =>
    Promise.resolve({
      id: "sally.beck@enron.com",
      name: "Sally Beck",
      email: "sally.beck@enron.com",
      community_id: 0,
      metrics: {
        pagerank: 0.015,
        betweenness_centrality: 0.008,
        eigenvector_centrality: 0.025,
        degree_centrality: 0.1,
        in_degree_centrality: 0.05,
        out_degree_centrality: 0.05,
      },
      sentiment: {
        avg_sent: 0.12,
        avg_received: 0.08,
      },
      dead_man_switch: {
        dms_score: 0.415,
        impact_pct: 5.2,
        redundancy: 0.3,
      },
      waste: {
        waste_score: 35.2,
        overproduction: 2.5,
        broadcast_ratio: 0.15,
        reply_all_ratio: 0.08,
        orphan_ratio: 0.22,
      },
      connections: [
        {
          id: "john.lavorato@enron.com",
          name: "John Lavorato",
          direction: "outgoing",
          email_count: 150,
          weight: 0.8,
          sentiment: 0.12,
        },
        {
          id: "louise.kitchen@enron.com",
          name: "Louise Kitchen",
          direction: "incoming",
          email_count: 95,
          weight: 0.6,
          sentiment: 0.05,
        },
      ],
    })
  ),
}));

describe("Step 10: People Pages", () => {
  describe("People List Page", () => {
    it("renders search input", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      const searchInput = await screen.findByPlaceholderText(
        "Search by name or email..."
      );
      expect(searchInput).toBeInTheDocument();
    });

    it("renders people in the table", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      expect(await screen.findByText("Sally Beck")).toBeInTheDocument();
      expect(screen.getByText("John Lavorato")).toBeInTheDocument();
    });

    it("renders column headers", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      await screen.findByText("Sally Beck"); // wait for load
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("PageRank")).toBeInTheDocument();
      expect(screen.getByText("Betweenness")).toBeInTheDocument();
      expect(screen.getByText("DMS Score")).toBeInTheDocument();
      expect(screen.getByText("Waste")).toBeInTheDocument();
      expect(screen.getByText("Sent")).toBeInTheDocument();
      expect(screen.getByText("Sentiment")).toBeInTheDocument();
    });

    it("filters people by search query", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      await screen.findByText("Sally Beck");

      const searchInput = screen.getByPlaceholderText("Search by name or email...");
      fireEvent.change(searchInput, { target: { value: "sally" } });

      expect(screen.getByText("Sally Beck")).toBeInTheDocument();
      expect(screen.queryByText("John Lavorato")).not.toBeInTheDocument();
    });

    it("shows people count", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      expect(await screen.findByText("2 people")).toBeInTheDocument();
    });

    it("links to individual person pages", async () => {
      const { default: PeoplePage } = await import(
        "@/app/(app)/people/page"
      );
      render(React.createElement(PeoplePage));

      const sallyLink = await screen.findByText("Sally Beck");
      const anchor = sallyLink.closest("a");
      expect(anchor).toHaveAttribute(
        "href",
        "/people/sally.beck%40enron.com"
      );
    });
  });

  describe("Person Detail Page", () => {
    it("renders person name and email", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      expect(await screen.findByText("Sally Beck")).toBeInTheDocument();
      expect(screen.getByText("sally.beck@enron.com")).toBeInTheDocument();
    });

    it("renders community badge", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      expect(await screen.findByText("Community 0")).toBeInTheDocument();
    });

    it("renders centrality metrics", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      await screen.findByText("Sally Beck");
      expect(screen.getByText("PageRank")).toBeInTheDocument();
      expect(screen.getByText("Betweenness")).toBeInTheDocument();
      expect(screen.getByText("Eigenvector")).toBeInTheDocument();
      expect(screen.getByText("Degree")).toBeInTheDocument();
    });

    it("renders sentiment section", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      await screen.findByText("Sally Beck");
      expect(screen.getByText("Sentiment")).toBeInTheDocument();
      expect(screen.getByText("Avg Sent")).toBeInTheDocument();
      expect(screen.getByText("Avg Received")).toBeInTheDocument();
    });

    it("renders dead-man-switch analysis", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      await screen.findByText("Sally Beck");
      expect(screen.getByText("Critical Node Analysis")).toBeInTheDocument();
      expect(screen.getByText("DMS Score")).toBeInTheDocument();
      expect(screen.getByText("Impact if removed")).toBeInTheDocument();
    });

    it("renders waste section", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      await screen.findByText("Sally Beck");
      expect(screen.getByText("Overproduction")).toBeInTheDocument();
      expect(screen.getByText("Broadcast Ratio")).toBeInTheDocument();
    });

    it("renders connections list", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      await screen.findByText("Sally Beck");
      expect(screen.getByText("John Lavorato")).toBeInTheDocument();
      expect(screen.getByText("Louise Kitchen")).toBeInTheDocument();
      expect(screen.getByText("150 emails")).toBeInTheDocument();
      expect(screen.getByText("95 emails")).toBeInTheDocument();
    });

    it("has back to people link", async () => {
      const { default: PersonPage } = await import(
        "@/app/(app)/people/[id]/page"
      );
      render(React.createElement(PersonPage));

      const backLink = await screen.findByText("Back to People");
      expect(backLink.closest("a")).toHaveAttribute("href", "/people");
    });
  });
});
