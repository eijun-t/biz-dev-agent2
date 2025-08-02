export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      business_ideas: {
        Row: {
          capability_utilization: Json
          created_at: string
          description: string
          id: string
          initial_investment: number | null
          is_selected: boolean
          market_size: number | null
          mitsubishi_assets: Json
          projected_profit: number | null
          revenue_model: string | null
          session_id: string | null
          target_market: string | null
          timeline: string | null
          title: string
        }
        Insert: {
          capability_utilization?: Json
          created_at?: string
          description: string
          id?: string
          initial_investment?: number | null
          is_selected?: boolean
          market_size?: number | null
          mitsubishi_assets?: Json
          projected_profit?: number | null
          revenue_model?: string | null
          session_id?: string | null
          target_market?: string | null
          timeline?: string | null
          title: string
        }
        Update: {
          capability_utilization?: Json
          created_at?: string
          description?: string
          id?: string
          initial_investment?: number | null
          is_selected?: boolean
          market_size?: number | null
          mitsubishi_assets?: Json
          projected_profit?: number | null
          revenue_model?: string | null
          session_id?: string | null
          target_market?: string | null
          timeline?: string | null
          title?: string
        }
      }
      capabilities: {
        Row: {
          capability_name: string
          category: string
          created_at: string
          description: string | null
          id: string
          specific_skills: Json
          strength_level: number | null
          sub_category: string
        }
        Insert: {
          capability_name: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          specific_skills?: Json
          strength_level?: number | null
          sub_category: string
        }
        Update: {
          capability_name?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          specific_skills?: Json
          strength_level?: number | null
          sub_category?: string
        }
      }
      evaluation_results: {
        Row: {
          competitive_advantage_score: number | null
          created_at: string
          feasibility_score: number | null
          id: string
          idea_id: string | null
          market_potential_score: number | null
          originality_score: number | null
          risk_balance_score: number | null
          selection_rationale: string | null
          session_id: string | null
          synergy_score: number | null
          total_score: number | null
        }
        Insert: {
          competitive_advantage_score?: number | null
          created_at?: string
          feasibility_score?: number | null
          id?: string
          idea_id?: string | null
          market_potential_score?: number | null
          originality_score?: number | null
          risk_balance_score?: number | null
          selection_rationale?: string | null
          session_id?: string | null
          synergy_score?: number | null
          total_score?: number | null
        }
        Update: {
          competitive_advantage_score?: number | null
          created_at?: string
          feasibility_score?: number | null
          id?: string
          idea_id?: string | null
          market_potential_score?: number | null
          originality_score?: number | null
          risk_balance_score?: number | null
          selection_rationale?: string | null
          session_id?: string | null
          synergy_score?: number | null
          total_score?: number | null
        }
      }
      final_reports: {
        Row: {
          created_at: string
          id: string
          report_content: Json
          selected_idea_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          report_content: Json
          selected_idea_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          report_content?: Json
          selected_idea_id?: string | null
          session_id?: string | null
        }
      }
      mitsubishi_assets: {
        Row: {
          asset_type: string
          created_at: string
          description: string | null
          id: string
          key_features: Json
          location: string | null
          name: string
          scale: string | null
          synergy_potential: number | null
          updated_at: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          description?: string | null
          id?: string
          key_features?: Json
          location?: string | null
          name: string
          scale?: string | null
          synergy_potential?: number | null
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          description?: string | null
          id?: string
          key_features?: Json
          location?: string | null
          name?: string
          scale?: string | null
          synergy_potential?: number | null
          updated_at?: string
        }
      }
      network_companies: {
        Row: {
          business_potential: Json
          company_type: string
          contact_info: Json
          created_at: string
          description: string | null
          id: string
          industry: string | null
          name: string
          relationship_depth: string | null
          updated_at: string
        }
        Insert: {
          business_potential?: Json
          company_type: string
          contact_info?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          name: string
          relationship_depth?: string | null
          updated_at?: string
        }
        Update: {
          business_potential?: Json
          company_type?: string
          contact_info?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          name?: string
          relationship_depth?: string | null
          updated_at?: string
        }
      }
      progress_tracking: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          message: string | null
          progress_percentage: number
          session_id: string | null
          status: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          message?: string | null
          progress_percentage?: number
          session_id?: string | null
          status?: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          message?: string | null
          progress_percentage?: number
          session_id?: string | null
          status?: string
        }
      }
      research_data: {
        Row: {
          category: string
          content: Json
          created_at: string
          data_type: string
          id: string
          reliability_score: number | null
          session_id: string | null
          source_url: string | null
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: Json
          created_at?: string
          data_type: string
          id?: string
          reliability_score?: number | null
          session_id?: string | null
          source_url?: string | null
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          data_type?: string
          id?: string
          reliability_score?: number | null
          session_id?: string | null
          source_url?: string | null
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string | null
          user_input: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          user_input?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          user_input?: string | null
        }
      }
      user_profiles: {
        Row: {
          created_at: string
          department: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}