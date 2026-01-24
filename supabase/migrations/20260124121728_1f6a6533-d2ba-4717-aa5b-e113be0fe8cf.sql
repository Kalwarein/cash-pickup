-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 10000.00,
  invested_amount DECIMAL(15, 2) DEFAULT 0.00,
  total_profit DECIMAL(15, 2) DEFAULT 0.00,
  total_loss DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  sector TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  current_price DECIMAL(15, 2) NOT NULL,
  price_change_percent DECIMAL(5, 2) DEFAULT 0.00,
  min_return_percent DECIMAL(5, 2) DEFAULT -20.00,
  max_return_percent DECIMAL(5, 2) DEFAULT 30.00,
  is_trending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create investments table
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  current_value DECIMAL(15, 2) NOT NULL,
  profit_loss DECIMAL(15, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'investment', 'profit', 'loss', 'withdrawal')),
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create market_events table for market status
CREATE TABLE public.market_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  impact TEXT CHECK (impact IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_feed table for simulated market chat
CREATE TABLE public.chat_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'info' CHECK (message_type IN ('info', 'alert', 'trade', 'news')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_feed ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Investments policies
CREATE POLICY "Users can view own investments" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON public.investments FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Companies - readable by all authenticated users
CREATE POLICY "Anyone can view companies" ON public.companies FOR SELECT USING (true);

-- Market events - readable by all authenticated users
CREATE POLICY "Anyone can view market events" ON public.market_events FOR SELECT USING (true);
CREATE POLICY "System can insert market events" ON public.market_events FOR INSERT WITH CHECK (true);

-- Chat feed - readable by all authenticated users
CREATE POLICY "Anyone can view chat feed" ON public.chat_feed FOR SELECT USING (true);
CREATE POLICY "System can insert chat messages" ON public.chat_feed FOR INSERT WITH CHECK (true);

-- Insert sample companies
INSERT INTO public.companies (name, ticker, sector, risk_level, current_price, price_change_percent, min_return_percent, max_return_percent, is_trending) VALUES
('Tesla Inc', 'TSLA', 'Technology', 'High', 245.50, 2.35, -25.00, 40.00, true),
('Market360 Global', 'M360', 'Finance', 'Medium', 78.25, 1.12, -15.00, 25.00, true),
('Facebook Meta', 'META', 'Technology', 'Medium', 485.00, -0.85, -20.00, 35.00, true),
('Sierra Gold Mining', 'SGM', 'Mining', 'High', 34.75, 4.20, -30.00, 50.00, false),
('AfriTech Solutions', 'ATS', 'Technology', 'Medium', 125.00, 1.50, -18.00, 28.00, false),
('Diamond Trust Bank', 'DTB', 'Finance', 'Low', 89.50, 0.45, -8.00, 15.00, false),
('Green Energy SL', 'GESL', 'Energy', 'High', 56.25, -1.25, -25.00, 45.00, true),
('Atlantic Fisheries', 'ATF', 'Agriculture', 'Low', 42.00, 0.75, -10.00, 18.00, false),
('Freetown Motors', 'FTM', 'Automotive', 'Medium', 156.75, 2.10, -15.00, 22.00, false),
('West Africa Telecom', 'WAT', 'Telecom', 'Low', 67.80, 0.30, -12.00, 20.00, true),
('SL Cement Corp', 'SLCC', 'Construction', 'Medium', 98.25, -0.50, -14.00, 24.00, false),
('Royal Palm Hotels', 'RPH', 'Hospitality', 'Medium', 72.50, 1.85, -16.00, 26.00, false),
('Kono Diamonds', 'KND', 'Mining', 'High', 189.00, 3.45, -28.00, 55.00, true),
('Lumley Beach Resort', 'LBR', 'Tourism', 'Medium', 45.25, 0.95, -12.00, 22.00, false),
('Bo Trading Co', 'BTC', 'Retail', 'Low', 28.50, 0.25, -8.00, 14.00, false);

-- Insert initial market events
INSERT INTO public.market_events (event_type, message, impact) VALUES
('status', 'Market Rising', 'positive'),
('alert', 'High trading volume detected', 'positive'),
('news', 'Tech sector showing strong momentum', 'positive');

-- Insert initial chat messages
INSERT INTO public.chat_feed (message, message_type) VALUES
('Large buy order detected on TSLA', 'trade'),
('Market sentiment: Bullish', 'info'),
('Mining sector gaining momentum', 'news'),
('New investors joining the platform', 'info'),
('High volatility alert: KND', 'alert');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email);
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 10000.00);
  
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (NEW.id, 'deposit', 10000.00, 'Welcome bonus - Start your investment journey!');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();