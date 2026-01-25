export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_feed: {
        Row: {
          created_at: string | null
          id: string
          message: string
          message_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          message_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          banner_url: string | null
          created_at: string | null
          current_price: number
          description: string | null
          employees: number | null
          founded_year: number | null
          guaranteed_return_percent: number | null
          headquarters: string | null
          id: string
          image_url: string | null
          investment_durations: Json | null
          is_trending: boolean | null
          max_return_percent: number | null
          min_investment: number | null
          min_return_percent: number | null
          name: string
          price_change_percent: number | null
          risk_level: string
          sector: string
          ticker: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          current_price: number
          description?: string | null
          employees?: number | null
          founded_year?: number | null
          guaranteed_return_percent?: number | null
          headquarters?: string | null
          id?: string
          image_url?: string | null
          investment_durations?: Json | null
          is_trending?: boolean | null
          max_return_percent?: number | null
          min_investment?: number | null
          min_return_percent?: number | null
          name: string
          price_change_percent?: number | null
          risk_level: string
          sector: string
          ticker: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          current_price?: number
          description?: string | null
          employees?: number | null
          founded_year?: number | null
          guaranteed_return_percent?: number | null
          headquarters?: string | null
          id?: string
          image_url?: string | null
          investment_durations?: Json | null
          is_trending?: boolean | null
          max_return_percent?: number | null
          min_investment?: number | null
          min_return_percent?: number | null
          name?: string
          price_change_percent?: number | null
          risk_level?: string
          sector?: string
          ticker?: string
        }
        Relationships: []
      }
      company_activities: {
        Row: {
          activity_type: string | null
          company_id: string
          created_at: string | null
          id: string
          message: string
        }
        Insert: {
          activity_type?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          message: string
        }
        Update: {
          activity_type?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_candles: {
        Row: {
          close_price: number
          company_id: string
          created_at: string | null
          high_price: number
          id: string
          low_price: number
          open_price: number
          timestamp: string
          volume: number | null
        }
        Insert: {
          close_price: number
          company_id: string
          created_at?: string | null
          high_price: number
          id?: string
          low_price: number
          open_price: number
          timestamp?: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          company_id?: string
          created_at?: string | null
          high_price?: number
          id?: string
          low_price?: number
          open_price?: number
          timestamp?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_candles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_price_history: {
        Row: {
          change_percent: number | null
          company_id: string
          created_at: string | null
          id: string
          price: number
          timestamp: string
        }
        Insert: {
          change_percent?: number | null
          company_id: string
          created_at?: string | null
          id?: string
          price: number
          timestamp?: string
        }
        Update: {
          change_percent?: number | null
          company_id?: string
          created_at?: string | null
          id?: string
          price?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      forex_trades: {
        Row: {
          amount: number
          closed_at: string | null
          created_at: string | null
          entry_price: number
          exit_price: number | null
          expires_at: string
          id: string
          max_duration_minutes: number
          profit_loss: number | null
          status: string | null
          stop_loss: number
          take_profit: number
          user_id: string
        }
        Insert: {
          amount: number
          closed_at?: string | null
          created_at?: string | null
          entry_price: number
          exit_price?: number | null
          expires_at: string
          id?: string
          max_duration_minutes?: number
          profit_loss?: number | null
          status?: string | null
          stop_loss: number
          take_profit: number
          user_id: string
        }
        Update: {
          amount?: number
          closed_at?: string | null
          created_at?: string | null
          entry_price?: number
          exit_price?: number | null
          expires_at?: string
          id?: string
          max_duration_minutes?: number
          profit_loss?: number | null
          status?: string | null
          stop_loss?: number
          take_profit?: number
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          current_value: number
          final_profit_loss: number | null
          final_value: number | null
          guaranteed_return: number | null
          guaranteed_return_percent: number | null
          id: string
          is_matured: boolean | null
          matured_at: string | null
          maturity_date: string | null
          maturity_days: number
          profit_loss: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          current_value: number
          final_profit_loss?: number | null
          final_value?: number | null
          guaranteed_return?: number | null
          guaranteed_return_percent?: number | null
          id?: string
          is_matured?: boolean | null
          matured_at?: string | null
          maturity_date?: string | null
          maturity_days?: number
          profit_loss?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          current_value?: number
          final_profit_loss?: number | null
          final_value?: number | null
          guaranteed_return?: number | null
          guaranteed_return_percent?: number | null
          id?: string
          is_matured?: boolean | null
          matured_at?: string | null
          maturity_date?: string | null
          maturity_days?: number
          profit_loss?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_cache: {
        Row: {
          id: string
          rank_by_profit: number | null
          rank_by_volume: number | null
          total_investments: number | null
          total_profit: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          user_name: string
          win_rate: number | null
        }
        Insert: {
          id?: string
          rank_by_profit?: number | null
          rank_by_volume?: number | null
          total_investments?: number | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          user_name: string
          win_rate?: number | null
        }
        Update: {
          id?: string
          rank_by_profit?: number | null
          rank_by_volume?: number | null
          total_investments?: number | null
          total_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          user_name?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      market_candles: {
        Row: {
          close_price: number
          created_at: string | null
          high_price: number
          id: string
          low_price: number
          open_price: number
          timestamp: string
          volume: number | null
        }
        Insert: {
          close_price: number
          created_at?: string | null
          high_price: number
          id?: string
          low_price: number
          open_price: number
          timestamp?: string
          volume?: number | null
        }
        Update: {
          close_price?: number
          created_at?: string | null
          high_price?: number
          id?: string
          low_price?: number
          open_price?: number
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          impact: string | null
          message: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          impact?: string | null
          message: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          impact?: string | null
          message?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          promo_codes: Json | null
          updated_at: string | null
          wallet_view_preference: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          promo_codes?: Json | null
          updated_at?: string | null
          wallet_view_preference?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          promo_codes?: Json | null
          updated_at?: string | null
          wallet_view_preference?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          invested_amount: number | null
          total_loss: number | null
          total_profit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          invested_amount?: number | null
          total_loss?: number | null
          total_profit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          invested_amount?: number | null
          total_loss?: number | null
          total_profit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_candles: { Args: never; Returns: undefined }
      cleanup_old_company_candles: { Args: never; Returns: undefined }
      update_leaderboard_cache: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
