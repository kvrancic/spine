/**
 * Step 12 Tests: Frontend — Reports & Upload Pages
 *
 * Verifies:
 * - Reports page renders with generate button
 * - Landing page renders with upload area
 * - Fake processing animation elements exist
 * - Reports display after generation
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
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
      const { initial, animate, transition, exit, whileHover, whileTap, ...validProps } = props;
      return React.createElement("div", validProps, children);
    },
  },
  AnimatePresence: ({ children }: any) => {
    // AnimatePresence shows the first child
    const child = Array.isArray(children) ? children.find(Boolean) : children;
    return child;
  },
}));

// Mock API
vi.mock("@/lib/api", () => ({
  getHealthReport: vi.fn(() =>
    Promise.resolve({
      report: [
        { title: "Executive Summary", content: "This organization shows signs of..." },
        { title: "Critical Personnel", content: "Sally Beck is the most critical..." },
        { title: "Communication Structure", content: "17 communities detected..." },
      ],
    })
  ),
}));

describe("Step 12: Reports & Upload Pages", () => {
  describe("Reports Page", () => {
    it("renders the generate report button", async () => {
      const { default: ReportsPage } = await import(
        "@/app/(app)/reports/page"
      );
      render(React.createElement(ReportsPage));

      expect(screen.getByText("Generate Report")).toBeInTheDocument();
    });

    it("renders the report description", async () => {
      const { default: ReportsPage } = await import(
        "@/app/(app)/reports/page"
      );
      render(React.createElement(ReportsPage));

      expect(
        screen.getByText("Organizational Health Report")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/comprehensive diagnostic report/)
      ).toBeInTheDocument();
    });

    it("shows loading state when generating", async () => {
      const { default: ReportsPage } = await import(
        "@/app/(app)/reports/page"
      );
      render(React.createElement(ReportsPage));

      const button = screen.getByText("Generate Report");
      fireEvent.click(button);

      expect(screen.getByText("Generating report...")).toBeInTheDocument();
    });

    it("displays report sections after generation", async () => {
      const { default: ReportsPage } = await import(
        "@/app/(app)/reports/page"
      );
      render(React.createElement(ReportsPage));

      const button = screen.getByText("Generate Report");
      fireEvent.click(button);

      // Wait for the report to load
      await waitFor(() => {
        expect(screen.getByText("Executive Summary")).toBeInTheDocument();
      });

      expect(screen.getByText("Critical Personnel")).toBeInTheDocument();
      expect(screen.getByText("Communication Structure")).toBeInTheDocument();
      expect(
        screen.getByText("This organization shows signs of...")
      ).toBeInTheDocument();
    });

    it("shows print button after report is generated", async () => {
      const { default: ReportsPage } = await import(
        "@/app/(app)/reports/page"
      );
      render(React.createElement(ReportsPage));

      fireEvent.click(screen.getByText("Generate Report"));

      await waitFor(() => {
        expect(screen.getByText("Print / Save PDF")).toBeInTheDocument();
      });
    });
  });

  describe("Landing/Upload Page", () => {
    it("renders the main headline", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      expect(
        screen.getByText("Understand your organization")
      ).toBeInTheDocument();
      expect(
        screen.getByText("in minutes, not months")
      ).toBeInTheDocument();
    });

    it("renders upload description", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      expect(
        screen.getByText(/Upload your company/)
      ).toBeInTheDocument();
    });

    it("renders drop zone with instructions", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      expect(
        screen.getByText("Drop your email export here")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/\.mbox, \.pst, or maildir format/)
      ).toBeInTheDocument();
    });

    it("renders privacy notice", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      expect(
        screen.getByText(
          "Your data is processed locally and never leaves your infrastructure."
        )
      ).toBeInTheDocument();
    });

    it("renders OrgVitals branding", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      expect(screen.getByText("OrgVitals")).toBeInTheDocument();
    });

    it("starts processing animation on click", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      const dropZone = screen.getByText("Drop your email export here").closest("div");
      fireEvent.click(dropZone!);

      await waitFor(() => {
        expect(
          screen.getByText("Analyzing your organization...")
        ).toBeInTheDocument();
      });
    });

    it("shows processing steps after click", async () => {
      const { default: LandingPage } = await import("@/app/page");
      render(React.createElement(LandingPage));

      const dropZone = screen.getByText("Drop your email export here").closest("div");
      fireEvent.click(dropZone!);

      await waitFor(() => {
        expect(screen.getByText("Parsing emails...")).toBeInTheDocument();
        expect(
          screen.getByText("Building communication graph...")
        ).toBeInTheDocument();
        expect(
          screen.getByText("Computing centrality metrics...")
        ).toBeInTheDocument();
      });
    });
  });
});
