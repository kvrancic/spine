import type {
  GraphData,
  MetricsOverview,
  CentralityResponse,
  CommunitiesResponse,
  DMSEntry,
  WasteEntry,
  PersonSummary,
  PersonDetail,
  ReportSection,
  GraphNode,
  GraphEdge,
  PersonPanel,
  TrendsData,
  RisksData,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getGraph(): Promise<GraphData> {
  return fetchJson<GraphData>("/api/graph");
}

export async function getGraphNode(id: string): Promise<{ node: GraphNode; connections: GraphEdge[] }> {
  return fetchJson(`/api/graph/node/${encodeURIComponent(id)}`);
}

export async function getMetricsOverview(): Promise<MetricsOverview> {
  return fetchJson<MetricsOverview>("/api/metrics/overview");
}

export async function getCentrality(type: string = "pagerank"): Promise<CentralityResponse> {
  return fetchJson<CentralityResponse>(`/api/metrics/centrality?type=${type}`);
}

export async function getCommunities(): Promise<CommunitiesResponse> {
  return fetchJson<CommunitiesResponse>("/api/metrics/communities");
}

export async function getDeadManSwitch(): Promise<{ rankings: DMSEntry[] }> {
  return fetchJson("/api/metrics/dead-man-switch");
}

export async function getWaste(): Promise<{ people: WasteEntry[] }> {
  return fetchJson("/api/metrics/waste");
}

export async function getPeople(): Promise<{ people: PersonSummary[] }> {
  return fetchJson("/api/people");
}

export async function getPerson(id: string): Promise<PersonDetail> {
  return fetchJson<PersonDetail>(`/api/people/${encodeURIComponent(id)}`);
}

export async function getHealthReport(): Promise<{ report: ReportSection[] }> {
  return fetchJson("/api/reports/health");
}

export async function fetchPersonPanel(id: string): Promise<PersonPanel> {
  return fetchJson<PersonPanel>(`/api/people/${encodeURIComponent(id)}/panel`);
}

export async function fetchTrends(): Promise<TrendsData> {
  return fetchJson<TrendsData>("/api/trends");
}

export async function fetchRisks(): Promise<RisksData> {
  return fetchJson<RisksData>("/api/risks");
}

export async function* streamChat(
  message: string,
  history: Array<{ role: string; content: string }> = []
): AsyncGenerator<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) yield parsed.content;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
