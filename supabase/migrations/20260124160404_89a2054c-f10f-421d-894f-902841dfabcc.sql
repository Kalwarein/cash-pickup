-- Allow authenticated users to insert market candles (for seeding)
CREATE POLICY "Authenticated users can insert market candles"
ON public.market_candles
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert company price history (for seeding)
CREATE POLICY "Authenticated users can insert company price history"
ON public.company_price_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Seed initial market candles with 200 historical data points
DO $$
DECLARE
  i INTEGER;
  base_price NUMERIC := 1000.00;
  c_open NUMERIC;
  c_close NUMERIC;
  c_high NUMERIC;
  c_low NUMERIC;
  volatility NUMERIC;
  trend NUMERIC;
  price_change NUMERIC;
  candle_time TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR i IN 0..199 LOOP
    candle_time := NOW() - (INTERVAL '1 minute' * (200 - i));
    
    trend := CASE 
      WHEN random() > 0.6 THEN 1
      WHEN random() < 0.4 THEN -1
      ELSE 0
    END;
    
    volatility := random() * 0.015;
    price_change := base_price * volatility * (random() - 0.48 + trend * 0.1);
    
    c_open := base_price;
    base_price := GREATEST(800, LEAST(1200, base_price + price_change));
    c_close := base_price;
    
    c_high := GREATEST(c_open, c_close) * (1 + random() * 0.008);
    c_low := LEAST(c_open, c_close) * (1 - random() * 0.008);
    
    INSERT INTO public.market_candles (timestamp, open_price, close_price, high_price, low_price, volume)
    VALUES (
      candle_time,
      ROUND(c_open::numeric, 2),
      ROUND(c_close::numeric, 2),
      ROUND(c_high::numeric, 2),
      ROUND(c_low::numeric, 2),
      ROUND((random() * 100000 + 50000)::numeric, 0)
    );
  END LOOP;
END $$;

-- Seed company price history for all companies (60 data points each)
DO $$
DECLARE
  comp_id UUID;
  comp_price NUMERIC;
  i INTEGER;
  base_price NUMERIC;
  calc_price NUMERIC;
  volatility NUMERIC;
  price_change NUMERIC;
  history_time TIMESTAMP WITH TIME ZONE;
BEGIN
  FOR comp_id, comp_price IN SELECT c.id, c.current_price FROM public.companies c LOOP
    base_price := comp_price * (0.85 + random() * 0.15);
    
    FOR i IN 0..59 LOOP
      history_time := NOW() - (INTERVAL '1 day' * (60 - i));
      
      volatility := CASE 
        WHEN i < 20 THEN 0.03
        WHEN i < 40 THEN 0.025
        ELSE 0.02
      END;
      
      price_change := base_price * volatility * (random() - 0.4);
      calc_price := GREATEST(base_price * 0.7, LEAST(base_price * 1.5, base_price + price_change));
      
      IF i > 40 THEN
        calc_price := calc_price + (comp_price - calc_price) * (i - 40) / 40;
      END IF;
      
      INSERT INTO public.company_price_history (company_id, price, timestamp, change_percent)
      VALUES (
        comp_id,
        ROUND(calc_price::numeric, 2),
        history_time,
        ROUND(((calc_price - base_price) / base_price * 100)::numeric, 2)
      );
      
      base_price := calc_price;
    END LOOP;
  END LOOP;
END $$;