export interface GraphNode {
  id: string;
  name: string;
  email: string;
  total_sent: number;
  total_received: number;
  department: string | null;
  community_id: number | null;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  degree_centrality: number;
  in_degree_centrality: number;
  out_degree_centrality: number;
  avg_sent_sentiment: number;
  avg_received_sentiment: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  email_count: number;
  weight: number;
  sentiment: number;
  sentiment_asymmetry: number;
  first_email: string | null;
  last_email: string | null;
  norm_frequency: number;
  norm_recency: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface HealthSubScores {
  connectivity: number;
  bottleneck_risk: number;
  silo_score: number;
  efficiency: number;
}

export interface HealthStats {
  node_count: number;
  edge_count: number;
  density: number;
  avg_path_length: number | null;
  clustering_coefficient: number | null;
  communities_count: number;
  modularity: number;
  gcc_ratio: number;
}

export interface HealthData {
  health_score: number;
  grade: string;
  sub_scores: HealthSubScores;
  stats: HealthStats;
}

export interface MetricsOverview {
  health: HealthData;
  sentiment: {
    avg_sentiment: number;
    total_edges_with_sentiment: number;
    distribution: Record<string, number>;
    top_negative: Array<{ source: string; target: string; sentiment: number; source_name: string; target_name: string }>;
    top_positive: Array<{ source: string; target: string; sentiment: number; source_name: string; target_name: string }>;
  };
}

export interface CentralityEntry {
  id: string;
  name: string;
  score: number;
}

export interface CentralityResponse {
  type: string;
  rankings: CentralityEntry[];
}

export interface Community {
  id: number;
  members: string[];
  size: number;
  density: number;
}

export interface CommunitiesResponse {
  communities: Community[];
  bridge_nodes: string[];
  modularity: number;
}

export interface DMSEntry {
  id: string;
  name: string;
  dms_score: number;
  betweenness: number;
  eigenvector: number;
  redundancy: number;
  impact_pct: number;
}

export interface WasteEntry {
  id: string;
  name: string;
  waste_score: number;
  overproduction: number;
  broadcast_ratio: number;
  reply_all_ratio: number;
  orphan_ratio: number;
}

export interface PersonSummary {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  pagerank: number;
  betweenness: number;
  eigenvector: number;
  total_sent: number;
  total_received: number;
  avg_sent_sentiment: number;
  dms_score: number;
  waste_score: number;
}

export interface ConnectionDetail {
  id: string;
  name: string;
  direction: string;
  email_count: number;
  weight: number;
  sentiment: number;
}

export interface PersonDetail {
  id: string;
  name: string;
  email: string;
  community_id: number | null;
  metrics: {
    pagerank: number;
    betweenness_centrality: number;
    eigenvector_centrality: number;
    degree_centrality: number;
    in_degree_centrality: number;
    out_degree_centrality: number;
  };
  sentiment: {
    avg_sent: number;
    avg_received: number;
  };
  dead_man_switch: Record<string, unknown>;
  waste: Record<string, unknown>;
  connections: ConnectionDetail[];
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
