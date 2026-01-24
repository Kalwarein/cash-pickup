
-- =============================================
-- MARKET CANDLES TABLE (Global Forex-style market)
-- =============================================
CREATE TABLE public.market_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  open_price DECIMAL(15, 4) NOT NULL,
  high_price DECIMAL(15, 4) NOT NULL,
  low_price DECIMAL(15, 4) NOT NULL,
  close_price DECIMAL(15, 4) NOT NULL,
  volume DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient time-series queries
CREATE INDEX idx_market_candles_timestamp ON public.market_candles(timestamp DESC);

-- Enable RLS
ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;

-- Anyone can view market candles (read-only for users)
CREATE POLICY "Anyone can view market candles"
  ON public.market_candles FOR SELECT
  USING (true);

-- =============================================
-- COMPANY PRICE HISTORY TABLE (Individual company charts)
-- =============================================
CREATE TABLE public.company_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  price DECIMAL(15, 4) NOT NULL,
  change_percent DECIMAL(8, 4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient company-specific queries
CREATE INDEX idx_company_price_history_company ON public.company_price_history(company_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.company_price_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view company price history
CREATE POLICY "Anyone can view company price history"
  ON public.company_price_history FOR SELECT
  USING (true);

-- =============================================
-- FOREX TRADES TABLE (Short-term trading)
-- =============================================
CREATE TABLE public.forex_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_price DECIMAL(15, 4) NOT NULL,
  exit_price DECIMAL(15, 4),
  amount DECIMAL(15, 2) NOT NULL,
  take_profit DECIMAL(15, 4) NOT NULL,
  stop_loss DECIMAL(15, 4) NOT NULL,
  max_duration_minutes INTEGER NOT NULL DEFAULT 60,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed_tp', 'closed_sl', 'closed_expired', 'closed_manual')),
  profit_loss DECIMAL(15, 2) DEFAULT 0,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user trades
CREATE INDEX idx_forex_trades_user ON public.forex_trades(user_id, status);
CREATE INDEX idx_forex_trades_open ON public.forex_trades(status) WHERE status = 'open';

-- Enable RLS
ALTER TABLE public.forex_trades ENABLE ROW LEVEL SECURITY;

-- Users can view their own trades
CREATE POLICY "Users can view own forex trades"
  ON public.forex_trades FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own trades
CREATE POLICY "Users can insert own forex trades"
  ON public.forex_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own trades
CREATE POLICY "Users can update own forex trades"
  ON public.forex_trades FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- LEADERBOARD VIEW (Top performers)
-- =============================================
CREATE TABLE public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  total_investments INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  rank_by_profit INTEGER,
  rank_by_volume INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard_cache FOR SELECT
  USING (true);

-- =============================================
-- Add company details columns
-- =============================================
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS headquarters TEXT,
ADD COLUMN IF NOT EXISTS employees INTEGER;

-- =============================================
-- Add promo_codes to profiles for future use
-- =============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS promo_codes JSONB DEFAULT '[]'::jsonb;

-- =============================================
-- Add view preference to profiles (wallet/profile toggle persistence)
-- =============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_view_preference TEXT DEFAULT 'wallet' CHECK (wallet_view_preference IN ('wallet', 'profile'));

-- =============================================
-- Update investments for long-term only (30, 60, 90 days)
-- =============================================
-- Update min maturity to 30 days
ALTER TABLE public.investments 
ADD CONSTRAINT min_maturity_days CHECK (maturity_days >= 6);

-- Add final_value column for when investment matures
ALTER TABLE public.investments
ADD COLUMN IF NOT EXISTS final_value DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS final_profit_loss DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS matured_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- Enable realtime for market candles
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_candles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forex_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_cache;

-- =============================================
-- Function to update leaderboard cache
-- =============================================
CREATE OR REPLACE FUNCTION public.update_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear and rebuild leaderboard
  DELETE FROM public.leaderboard_cache;
  
  INSERT INTO public.leaderboard_cache (user_id, user_name, total_profit, total_investments, total_trades, win_rate)
  SELECT 
    p.id as user_id,
    p.name as user_name,
    COALESCE(w.total_profit, 0) - COALESCE(w.total_loss, 0) as total_profit,
    (SELECT COUNT(*) FROM investments WHERE user_id = p.id) as total_investments,
    (SELECT COUNT(*) FROM forex_trades WHERE user_id = p.id) as total_trades,
    CASE 
      WHEN (SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true) = 0 THEN 0
      ELSE (
        (SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true AND final_profit_loss > 0)::decimal /
        NULLIF((SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true), 0) * 100
      )
    END as win_rate
  FROM profiles p
  LEFT JOIN wallets w ON w.user_id = p.id;
  
  -- Update profit rank
  UPDATE public.leaderboard_cache lc
  SET rank_by_profit = subq.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_profit DESC) as rank
    FROM public.leaderboard_cache
  ) subq
  WHERE lc.id = subq.id;
  
  -- Update volume rank
  UPDATE public.leaderboard_cache lc
  SET rank_by_volume = subq.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_investments + total_trades DESC) as rank
    FROM public.leaderboard_cache
  ) subq
  WHERE lc.id = subq.id;
END;
$$;
