// メモリ処理用の型定義

export interface MarketData {
  trends: MarketTrend[];
  technologies: TechnologyTrend[];
  regulations: RegulationChange[];
  opportunities: MarketOpportunity[];
  capability_affinity?: AffinityScore;
}

export interface MarketTrend {
  category: string;
  trend_name: string;
  description: string;
  market_size: number;
  growth_rate: number;
  relevance_score: number;
}

export interface TechnologyTrend {
  technology_name: string;
  description: string;
  maturity_level: string;
  adoption_rate: number;
  impact_potential: number;
}

export interface RegulationChange {
  regulation_name: string;
  description: string;
  impact_area: string;
  implementation_date: string;
  impact_level: 'high' | 'medium' | 'low';
}

export interface MarketOpportunity {
  opportunity_name: string;
  description: string;
  target_market: string;
  estimated_market_size: number;
  competitive_landscape: string;
}

export interface AffinityScore {
  urban_development_score: number;
  retail_facility_score: number;
  residential_score: number;
  international_score: number;
  overall_score: number;
  rationale: string;
}

export interface BusinessIdea {
  id: string;
  session_id: string;
  title: string;
  description: string;
  target_market: string;
  market_size: number; // 1000億円以上の市場規模
  revenue_model: string;
  initial_investment: number;
  projected_profit: number; // 営業利益10億円目標
  timeline: string;
  mitsubishi_assets: string[];
  capability_utilization: Record<string, number>;
  is_selected: boolean;
  created_at: string;
  // 簡易収益性評価用
  tam?: number;
  sam?: number;
  som?: number;
  estimated_profit_margin?: number;
}

export interface SessionContext {
  sessionId: string;
  userInput: string | null;
  marketData?: MarketData;
  businessIdeas?: BusinessIdea[];
  selectedIdea?: BusinessIdea;
  analysisResults?: AnalysisResults;
}

export interface AnalysisResults {
  market_analysis: MarketAnalysisResult;
  competitive_landscape: CompetitiveLandscapeResult;
  technology_assessment: TechnologyAssessmentResult;
  business_model_validation: BusinessModelValidation;
}

export interface MarketAnalysisResult {
  total_market_size: number;
  growth_projections: Record<string, number>;
  key_segments: string[];
  market_drivers: string[];
}

export interface CompetitiveLandscapeResult {
  major_players: string[];
  market_share_distribution: Record<string, number>;
  competitive_advantages: string[];
  barriers_to_entry: string[];
}

export interface TechnologyAssessmentResult {
  required_technologies: string[];
  technology_readiness: Record<string, string>;
  implementation_timeline: string;
  technical_risks: string[];
}

export interface BusinessModelValidation {
  revenue_streams: string[];
  cost_structure: Record<string, number>;
  profitability_timeline: string;
  break_even_analysis: Record<string, any>;
}

export interface MitsubishiAssets {
  marunouchi: AssetDetails;
  minatomirai: AssetDetails;
  outlets: AssetDetails[];
  residential: AssetDetails[];
}

export interface AssetDetails {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: Record<string, number>;
  location: string;
}

export interface NetworkConnections {
  tenant_companies: Company[];
  mitsubishi_group: Company[];
  partners: Company[];
}

export interface Company {
  id: string;
  name: string;
  type: 'tenant' | 'mitsubishi_group' | 'partner';
  industry: string;
  description: string;
  contact_info: Record<string, any>;
}