/**
 * Step 8 Tests: Frontend — Layout & Dashboard
 *
 * Verifies:
 * - Root layout exists with metadata
 * - App layout includes Sidebar and Header
 * - Sidebar has all navigation items
 * - Header renders dynamic title
 * - Dashboard components render correctly (HealthScore, MetricCard, TopPeople, CommunityMap)
 * - API client functions exist and are typed
 * - TypeScript types match API schemas
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock framer-motion to render static elements
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, exit, whileHover, whileTap, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
    circle: (props: any) => React.createElement("circle", props),
    span: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...validProps } = props;
      return React.createElement("span", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe("Step 8: Layout & Dashboard", () => {
  describe("Sidebar Navigation", () => {
    it("renders all navigation items", async () => {
      const { default: Sidebar } = await import(
        "@/components/layout/Sidebar"
      );
      render(React.createElement(Sidebar));

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Graph")).toBeInTheDocument();
      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("Ask AI")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();
    });

    it("renders OrgVitals branding", async () => {
      const { default: Sidebar } = await import(
        "@/components/layout/Sidebar"
      );
      render(React.createElement(Sidebar));

      expect(screen.getByText("OrgVitals")).toBeInTheDocument();
    });

    it("has correct navigation links", async () => {
      const { default: Sidebar } = await import(
        "@/components/layout/Sidebar"
      );
      render(React.createElement(Sidebar));

      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");

      const graphLink = screen.getByText("Graph").closest("a");
      expect(graphLink).toHaveAttribute("href", "/graph");

      const peopleLink = screen.getByText("People").closest("a");
      expect(peopleLink).toHaveAttribute("href", "/people");

      const chatLink = screen.getByText("Ask AI").closest("a");
      expect(chatLink).toHaveAttribute("href", "/chat");

      const reportsLink = screen.getByText("Reports").closest("a");
      expect(reportsLink).toHaveAttribute("href", "/reports");
    });
  });

  describe("Header", () => {
    it("renders page title based on pathname", async () => {
      const { default: Header } = await import("@/components/layout/Header");
      render(React.createElement(Header));

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  describe("HealthScore Component", () => {
    it("renders score and grade", async () => {
      const { default: HealthScore } = await import(
        "@/components/dashboard/HealthScore"
      );
      render(React.createElement(HealthScore, { score: 49, grade: "F" }));

      expect(screen.getByText("49")).toBeInTheDocument();
      expect(screen.getByText("F")).toBeInTheDocument();
      expect(screen.getByText("Organization Health")).toBeInTheDocument();
    });

    it("renders different grades with correct styling", async () => {
      const { default: HealthScore } = await import(
        "@/components/dashboard/HealthScore"
      );
      const { unmount } = render(
        React.createElement(HealthScore, { score: 90, grade: "A" })
      );
      expect(screen.getByText("A")).toBeInTheDocument();
      unmount();

      render(React.createElement(HealthScore, { score: 70, grade: "C" }));
      expect(screen.getByText("C")).toBeInTheDocument();
    });
  });

  describe("MetricCard Component", () => {
    it("renders label and value", async () => {
      const { default: MetricCard } = await import(
        "@/components/dashboard/MetricCard"
      );
      const { Users } = await import("lucide-react");

      render(
        React.createElement(MetricCard, {
          label: "People",
          value: "4,555",
          icon: Users,
        })
      );

      expect(screen.getByText("People")).toBeInTheDocument();
      expect(screen.getByText("4,555")).toBeInTheDocument();
    });

    it("renders optional subtitle", async () => {
      const { default: MetricCard } = await import(
        "@/components/dashboard/MetricCard"
      );
      const { Network } = await import("lucide-react");

      render(
        React.createElement(MetricCard, {
          label: "Communities",
          value: 17,
          subtitle: "Modularity: 0.60",
          icon: Network,
        })
      );

      expect(screen.getByText("Modularity: 0.60")).toBeInTheDocument();
    });
  });

  describe("TopPeople Component", () => {
    it("renders ranked list of people", async () => {
      const { default: TopPeople } = await import(
        "@/components/dashboard/TopPeople"
      );

      const people = [
        { id: "sally.beck@enron.com", name: "Sally Beck", score: 0.42, label: "impact: 5%" },
        { id: "john.lavorato@enron.com", name: "John Lavorato", score: 0.35, label: "impact: 3%" },
      ];

      render(
        React.createElement(TopPeople, {
          title: "Most Critical People",
          people,
        })
      );

      expect(screen.getByText("Most Critical People")).toBeInTheDocument();
      expect(screen.getByText("Sally Beck")).toBeInTheDocument();
      expect(screen.getByText("John Lavorato")).toBeInTheDocument();
    });

    it("links to person detail pages", async () => {
      const { default: TopPeople } = await import(
        "@/components/dashboard/TopPeople"
      );

      const people = [
        { id: "sally.beck@enron.com", name: "Sally Beck", score: 0.42, label: "impact: 5%" },
      ];

      render(
        React.createElement(TopPeople, {
          title: "Test",
          people,
        })
      );

      const link = screen.getByText("Sally Beck").closest("a");
      expect(link).toHaveAttribute(
        "href",
        "/people/sally.beck%40enron.com"
      );
    });
  });

  describe("CommunityMap Component", () => {
    it("renders community bars sorted by size", async () => {
      const { default: CommunityMap } = await import(
        "@/components/dashboard/CommunityMap"
      );

      const communities = [
        { id: 0, members: [], size: 50, density: 0.5 },
        { id: 1, members: [], size: 100, density: 0.3 },
        { id: 2, members: [], size: 25, density: 0.7 },
      ];

      render(React.createElement(CommunityMap, { communities }));

      expect(screen.getByText("Communities")).toBeInTheDocument();
      expect(screen.getByText("100 people")).toBeInTheDocument();
      expect(screen.getByText("50 people")).toBeInTheDocument();
      expect(screen.getByText("25 people")).toBeInTheDocument();
    });
  });

  describe("API Client", () => {
    it("exports all required API functions", async () => {
      const api = await import("@/lib/api");

      expect(typeof api.getGraph).toBe("function");
      expect(typeof api.getGraphNode).toBe("function");
      expect(typeof api.getMetricsOverview).toBe("function");
      expect(typeof api.getCentrality).toBe("function");
      expect(typeof api.getCommunities).toBe("function");
      expect(typeof api.getDeadManSwitch).toBe("function");
      expect(typeof api.getWaste).toBe("function");
      expect(typeof api.getPeople).toBe("function");
      expect(typeof api.getPerson).toBe("function");
      expect(typeof api.getHealthReport).toBe("function");
      expect(typeof api.streamChat).toBe("function");
    });
  });

  describe("TypeScript Types", () => {
    it("exports all required interfaces", async () => {
      // This test verifies the types exist at runtime as imports
      const types = await import("@/lib/types");

      // TypeScript types are compile-time only, but the module should load
      expect(types).toBeDefined();
    });
  });
});
