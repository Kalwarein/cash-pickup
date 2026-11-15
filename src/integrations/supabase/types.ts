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
      card_admin_audit: {
        Row: {
          action: string
          after_state: Json
          admin_user_id: string
          before_state: Json
          card_id: string | null
          created_at: string
          id: number
          reason: string
        }
        Insert: {
          action: string
          after_state: Json
          admin_user_id: string
          before_state: Json
          card_id?: string | null
          created_at?: string
          id?: number
          reason: string
        }
        Update: {
          action?: string
          after_state?: Json
          admin_user_id?: string
          before_state?: Json
          card_id?: string | null
          created_at?: string
          id?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_admin_audit_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      card_catalog: {
        Row: {
          buy_impact_pct: number
          buyer_limit: number | null
          category: "meme" | "company" | "fintech_collectible" | "community"
          code: string
          created_at: string
          current_price: number
          description: string
          id: string
          is_limited: boolean
          last_tick_at: string | null
          lifetime_buyer_count: number
          market_paused: boolean
          price_ceiling: number
          price_change_percent: number
          price_floor: number
          previous_price: number
          sell_impact_pct: number
          status: "active" | "sold_out" | "retired"
          title: string
          updated_at: string
          volatility_pct: number
        }
        Insert: {
          buy_impact_pct?: number
          buyer_limit?: number | null
          category: "meme" | "company" | "fintech_collectible" | "community"
          code: string
          created_at?: string
          current_price: number
          description?: string
          id?: string
          is_limited?: boolean
          last_tick_at?: string | null
          lifetime_buyer_count?: number
          market_paused?: boolean
          price_ceiling?: number
          price_change_percent?: number
          price_floor?: number
          previous_price: number
          sell_impact_pct?: number
          status?: "active" | "sold_out" | "retired"
          title: string
          updated_at?: string
          volatility_pct?: number
        }
        Update: {
          buy_impact_pct?: number
          buyer_limit?: number | null
          category?: "meme" | "company" | "fintech_collectible" | "community"
          code?: string
          created_at?: string
          current_price?: number
          description?: string
          id?: string
          is_limited?: boolean
          last_tick_at?: string | null
          lifetime_buyer_count?: number
          market_paused?: boolean
          price_ceiling?: number
          price_change_percent?: number
          price_floor?: number
          previous_price?: number
          sell_impact_pct?: number
          status?: "active" | "sold_out" | "retired"
          title?: string
          updated_at?: string
          volatility_pct?: number
        }
        Relationships: []
      }
      card_holdings: {
        Row: {
          card_id: string
          id: string
          purchase_price: number
          purchased_at: string
          serial_code: string
          sold_at: string | null
          sold_price: number | null
          status: "owned" | "sold"
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          purchase_price: number
          purchased_at?: string
          serial_code?: string
          sold_at?: string | null
          sold_price?: number | null
          status?: "owned" | "sold"
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          purchase_price?: number
          purchased_at?: string
          serial_code?: string
          sold_at?: string | null
          sold_price?: number | null
          status?: "owned" | "sold"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_holdings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      card_price_history: {
        Row: {
          card_id: string
          change_percent: number
          id: number
          price: number
          recorded_at: string
          source: "seed" | "market_tick" | "buy_pressure" | "sell_pressure" | "admin_adjustment"
        }
        Insert: {
          card_id: string
          change_percent?: number
          id?: number
          price: number
          recorded_at?: string
          source: "seed" | "market_tick" | "buy_pressure" | "sell_pressure" | "admin_adjustment"
        }
        Update: {
          card_id?: string
          change_percent?: number
          id?: number
          price?: number
          recorded_at?: string
          source?: "seed" | "market_tick" | "buy_pressure" | "sell_pressure" | "admin_adjustment"
        }
        Relationships: [
          {
            foreignKeyName: "card_price_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      card_trades: {
        Row: {
          card_id: string
          created_at: string
          holding_id: string
          id: string
          idempotency_key: string
          price_after: number
          profit_loss: number | null
          side: "buy" | "sell"
          unit_price: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          holding_id: string
          id?: string
          idempotency_key: string
          price_after: number
          profit_loss?: number | null
          side: "buy" | "sell"
          unit_price: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          holding_id?: string
          id?: string
          idempotency_key?: string
          price_after?: number
          profit_loss?: number | null
          side?: "buy" | "sell"
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_trades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_trades_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "card_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      card_wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string
          entry_type: "welcome_bonus" | "card_buy" | "card_sell"
          id: string
          idempotency_key: string
          trade_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description: string
          entry_type: "welcome_bonus" | "card_buy" | "card_sell"
          id?: string
          idempotency_key: string
          trade_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string
          entry_type?: "welcome_bonus" | "card_buy" | "card_sell"
          id?: string
          idempotency_key?: string
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_wallet_ledger_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "card_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      card_wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          country: string | null
          cpr_30day_avg: number | null
          cpr_7day_avg: number | null
          cpr_best: number | null
          cpr_last_generated_date: string | null
          cpr_today: number | null
          cpr_trend: string | null
          cpr_volatility: number | null
          cpr_worst: number | null
          cpr_yesterday: number | null
          created_at: string | null
          current_price: number
          description: string | null
          employees: number | null
          founded_year: number | null
          headquarters: string | null
          id: string
          image_url: string | null
          investment_durations: Json | null
          is_silent_performer: boolean | null
          is_trending: boolean | null
          logo_url: string | null
          market_cap: number | null
          max_return_percent: number | null
          min_investment: number | null
          min_return_percent: number | null
          name: string
          price_change_percent: number | null
          risk_level: string
          sector: string
          ticker: string
          weekly_target_cap: number | null
          weekly_target_set_at: string | null
        }
        Insert: {
          banner_url?: string | null
          country?: string | null
          cpr_30day_avg?: number | null
          cpr_7day_avg?: number | null
          cpr_best?: number | null
          cpr_last_generated_date?: string | null
          cpr_today?: number | null
          cpr_trend?: string | null
          cpr_volatility?: number | null
          cpr_worst?: number | null
          cpr_yesterday?: number | null
          created_at?: string | null
          current_price: number
          description?: string | null
          employees?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          image_url?: string | null
          investment_durations?: Json | null
          is_silent_performer?: boolean | null
          is_trending?: boolean | null
          logo_url?: string | null
          market_cap?: number | null
          max_return_percent?: number | null
          min_investment?: number | null
          min_return_percent?: number | null
          name: string
          price_change_percent?: number | null
          risk_level: string
          sector: string
          ticker: string
          weekly_target_cap?: number | null
          weekly_target_set_at?: string | null
        }
        Update: {
          banner_url?: string | null
          country?: string | null
          cpr_30day_avg?: number | null
          cpr_7day_avg?: number | null
          cpr_best?: number | null
          cpr_last_generated_date?: string | null
          cpr_today?: number | null
          cpr_trend?: string | null
          cpr_volatility?: number | null
          cpr_worst?: number | null
          cpr_yesterday?: number | null
          created_at?: string | null
          current_price?: number
          description?: string | null
          employees?: number | null
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          image_url?: string | null
          investment_durations?: Json | null
          is_silent_performer?: boolean | null
          is_trending?: boolean | null
          logo_url?: string | null
          market_cap?: number | null
          max_return_percent?: number | null
          min_investment?: number | null
          min_return_percent?: number | null
          name?: string
          price_change_percent?: number | null
          risk_level?: string
          sector?: string
          ticker?: string
          weekly_target_cap?: number | null
          weekly_target_set_at?: string | null
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
      company_candles_1m: {
        Row: {
          bucket_start: string
          close: number
          company_id: string
          created_at: string
          high: number
          low: number
          open: number
          volume: number
        }
        Insert: {
          bucket_start: string
          close: number
          company_id: string
          created_at?: string
          high: number
          low: number
          open: number
          volume?: number
        }
        Update: {
          bucket_start?: string
          close?: number
          company_id?: string
          created_at?: string
          high?: number
          low?: number
          open?: number
          volume?: number
        }
        Relationships: []
      }
      company_invest_events: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          event_type: string
          id: string
          profit: number
          user_id: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          profit?: number
          user_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          profit?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invest_events_company_id_fkey"
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
      company_weekly_stats: {
        Row: {
          claim_count: number
          company_id: string
          created_at: string
          id: string
          invest_count: number
          losses: number
          realized_loss: number
          realized_profit: number
          total_invested: number
          updated_at: string
          week_start: string
          wins: number
        }
        Insert: {
          claim_count?: number
          company_id: string
          created_at?: string
          id?: string
          invest_count?: number
          losses?: number
          realized_loss?: number
          realized_profit?: number
          total_invested?: number
          updated_at?: string
          week_start: string
          wins?: number
        }
        Update: {
          claim_count?: number
          company_id?: string
          created_at?: string
          id?: string
          invest_count?: number
          losses?: number
          realized_loss?: number
          realized_profit?: number
          total_invested?: number
          updated_at?: string
          week_start?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_weekly_stats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cpr_history: {
        Row: {
          company_id: string
          cpr_value: number
          created_at: string | null
          id: string
          recorded_date: string
        }
        Insert: {
          company_id: string
          cpr_value: number
          created_at?: string | null
          id?: string
          recorded_date?: string
        }
        Update: {
          company_id?: string
          cpr_value?: number
          created_at?: string | null
          id?: string
          recorded_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpr_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          amount: number
          claimed_at: string | null
          company_id: string
          created_at: string | null
          current_value: number
          final_profit_loss: number | null
          final_value: number | null
          id: string
          is_claimed: boolean | null
          is_matured: boolean | null
          matured_at: string | null
          maturity_cpr: number | null
          maturity_date: string | null
          maturity_days: number
          profit_loss: number | null
          promo_code_id: string | null
          promo_effect_applied: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string | null
          company_id: string
          created_at?: string | null
          current_value: number
          final_profit_loss?: number | null
          final_value?: number | null
          id?: string
          is_claimed?: boolean | null
          is_matured?: boolean | null
          matured_at?: string | null
          maturity_cpr?: number | null
          maturity_date?: string | null
          maturity_days?: number
          profit_loss?: number | null
          promo_code_id?: string | null
          promo_effect_applied?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string | null
          company_id?: string
          created_at?: string | null
          current_value?: number
          final_profit_loss?: number | null
          final_value?: number | null
          id?: string
          is_claimed?: boolean | null
          is_matured?: boolean | null
          matured_at?: string | null
          maturity_cpr?: number | null
          maturity_date?: string | null
          maturity_days?: number
          profit_loss?: number | null
          promo_code_id?: string | null
          promo_effect_applied?: string | null
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
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          monime_payment_code_id: string | null
          monime_payout_id: string | null
          phone_number: string | null
          provider: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          ussd_code: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          monime_payment_code_id?: string | null
          monime_payout_id?: string | null
          phone_number?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
          ussd_code?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          monime_payment_code_id?: string | null
          monime_payout_id?: string | null
          phone_number?: string | null
          provider?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          ussd_code?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          phone: string | null
          promo_codes: Json | null
          updated_at: string | null
          username: string | null
          wallet_view_preference: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          name: string
          phone?: string | null
          promo_codes?: Json | null
          updated_at?: string | null
          username?: string | null
          wallet_view_preference?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          phone?: string | null
          promo_codes?: Json | null
          updated_at?: string | null
          username?: string | null
          wallet_view_preference?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string
          duration_days: number
          effect_type: string
          effect_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          price: number
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          duration_days: number
          effect_type: string
          effect_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          price: number
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          duration_days?: number
          effect_type?: string
          effect_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      tap_profiles: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string
          leverage_level: number
          lifetime_taps: number
          lifetime_units: number
          today_date: string
          today_taps: number
          today_units: number
          total_units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string
          leverage_level?: number
          lifetime_taps?: number
          lifetime_units?: number
          today_date?: string
          today_taps?: number
          today_units?: number
          total_units?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string
          leverage_level?: number
          lifetime_taps?: number
          lifetime_units?: number
          today_date?: string
          today_taps?: number
          today_units?: number
          total_units?: number
          updated_at?: string
          user_id?: string
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
      user_onboarding: {
        Row: {
          age_range: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          display_name: string | null
          financial_knowledge: string | null
          id: string
          income_source: string | null
          investment_experience: string | null
          investment_goal: string | null
          investment_motivation: string | null
          investment_timeline: string | null
          monthly_budget: string | null
          notification_preference: string | null
          occupation: string | null
          preferred_sectors: string[] | null
          referral_source: string | null
          risk_tolerance: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          display_name?: string | null
          financial_knowledge?: string | null
          id?: string
          income_source?: string | null
          investment_experience?: string | null
          investment_goal?: string | null
          investment_motivation?: string | null
          investment_timeline?: string | null
          monthly_budget?: string | null
          notification_preference?: string | null
          occupation?: string | null
          preferred_sectors?: string[] | null
          referral_source?: string | null
          risk_tolerance?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          display_name?: string | null
          financial_knowledge?: string | null
          id?: string
          income_source?: string | null
          investment_experience?: string | null
          investment_goal?: string | null
          investment_motivation?: string | null
          investment_timeline?: string | null
          monthly_budget?: string | null
          notification_preference?: string | null
          occupation?: string | null
          preferred_sectors?: string[] | null
          referral_source?: string | null
          risk_tolerance?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_promo_codes: {
        Row: {
          activated_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          is_activated: boolean | null
          is_active: boolean | null
          promo_code_id: string
          purchased_at: string | null
          user_id: string
          uses_remaining: number | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          is_activated?: boolean | null
          is_active?: boolean | null
          promo_code_id: string
          purchased_at?: string | null
          user_id: string
          uses_remaining?: number | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          is_activated?: boolean | null
          is_active?: boolean | null
          promo_code_id?: string
          purchased_at?: string | null
          user_id?: string
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_promo_codes_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
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
      admin_adjust_card_price: {
        Args: { p_card_id: string; p_new_price: number; p_reason: string }
        Returns: Json
      }
      admin_update_card_controls: {
        Args: {
          p_buy_impact_pct: number
          p_card_id: string
          p_market_paused: boolean
          p_reason: string
          p_sell_impact_pct: number
          p_volatility_pct: number
        }
        Returns: Json
      }
      buy_card: {
        Args: { p_card_id: string; p_request_id: string }
        Returns: Json
      }
      claim_card_welcome_bonus: { Args: never; Returns: Json }
      cleanup_old_candles: { Args: never; Returns: undefined }
      cleanup_old_candles_1m: { Args: never; Returns: undefined }
      cleanup_old_company_candles: { Args: never; Returns: undefined }
      expire_stale_payment_codes: { Args: never; Returns: undefined }
      get_candles: {
        Args: { p_company_id: string; p_limit?: number; p_timeframe?: string }
        Returns: {
          bucket: string
          close: number
          high: number
          low: number
          open: number
          volume: number
        }[]
      }
      get_company_global_stats: {
        Args: { p_company_id: string }
        Returns: {
          active_investors: number
          losses: number
          realized_profit: number
          total_invested: number
          total_investors: number
          wins: number
        }[]
      }
      get_company_weekly_series: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          invest_count: number
          losses: number
          realized_loss: number
          realized_profit: number
          total_invested: number
          week_start: string
          wins: number
        }[]
      }
      get_tap_leaderboard: {
        Args: { p_limit?: number; p_metric?: string }
        Returns: {
          leverage_level: number
          lifetime_taps: number
          rank: number
          total_units: number
          user_id: string
          user_name: string
        }[]
      }
      is_card_market_admin: { Args: never; Returns: boolean }
      sell_card: {
        Args: { p_holding_id: string; p_request_id: string }
        Returns: Json
      }
      tick_card_market: { Args: never; Returns: number }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
