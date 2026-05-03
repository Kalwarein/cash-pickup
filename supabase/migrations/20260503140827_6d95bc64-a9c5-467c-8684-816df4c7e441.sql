ALTER TABLE public.investments DROP CONSTRAINT IF EXISTS investments_status_check;
ALTER TABLE public.investments ADD CONSTRAINT investments_status_check CHECK (status IN ('active', 'closed', 'matured'));

UPDATE public.investments
SET is_matured = true,
    matured_at = COALESCE(matured_at, now()),
    status = 'matured',
    final_value = COALESCE(final_value, current_value, amount),
    final_profit_loss = COALESCE(final_profit_loss, current_value - amount, 0),
    maturity_cpr = COALESCE(maturity_cpr, 0)
WHERE is_matured = false
  AND is_claimed = false
  AND maturity_date <= now();