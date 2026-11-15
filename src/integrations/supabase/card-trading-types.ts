// Frontend domain contract for the forward-only card-trading migration.
// Database row constraints and RPC signatures are mirrored in the Supabase map;
// keep these ergonomic types aligned when the migration contract changes.
import type { Json } from './types';

export type CardCategory = 'meme' | 'company' | 'fintech_collectible' | 'community';
export type CardStatus = 'active' | 'sold_out' | 'retired';
export type CardHoldingStatus = 'owned' | 'sold';
export type CardTradeSide = 'buy' | 'sell';

export interface CardCatalogRow {
  id: string;
  code: string;
  title: string;
  category: CardCategory;
  description: string;
  current_price: number;
  previous_price: number;
  price_change_percent: number;
  price_floor: number;
  price_ceiling: number;
  volatility_pct: number;
  buy_impact_pct: number;
  sell_impact_pct: number;
  is_limited: boolean;
  buyer_limit: number | null;
  lifetime_buyer_count: number;
  market_paused: boolean;
  status: CardStatus;
  last_tick_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardHoldingRow {
  id: string;
  user_id: string;
  card_id: string;
  serial_code: string;
  purchase_price: number;
  sold_price: number | null;
  status: CardHoldingStatus;
  purchased_at: string;
  sold_at: string | null;
}

export interface CardTradeRow {
  id: string;
  user_id: string;
  card_id: string;
  holding_id: string;
  side: CardTradeSide;
  unit_price: number;
  price_after: number;
  profit_loss: number | null;
  idempotency_key: string;
  created_at: string;
}

export interface CardWalletRow {
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface CardWalletLedgerRow {
  id: string;
  user_id: string;
  trade_id: string | null;
  entry_type: 'welcome_bonus' | 'card_buy' | 'card_sell';
  amount: number;
  balance_after: number;
  idempotency_key: string;
  description: string;
  created_at: string;
}

export interface CardPriceHistoryRow {
  id: number;
  card_id: string;
  price: number;
  change_percent: number;
  source: 'seed' | 'market_tick' | 'buy_pressure' | 'sell_pressure' | 'admin_adjustment';
  recorded_at: string;
}

export interface CardAdminAuditRow {
  id: number;
  admin_user_id: string;
  card_id: string | null;
  action: 'price_adjustment' | 'market_controls';
  reason: string;
  before_state: Json;
  after_state: Json;
  created_at: string;
}

export interface CardWelcomeBonusResult {
  granted: boolean;
  bonus_amount: number;
  balance: number;
  currency_label: string;
}

export interface CardTradeResult {
  trade_id: string;
  holding_id: string;
  serial_code?: string;
  side: CardTradeSide;
  unit_price: number;
  purchase_price?: number;
  price_after: number;
  profit_loss: number;
  balance: number;
  idempotent_replay: boolean;
}
