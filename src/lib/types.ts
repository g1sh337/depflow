export type UserRole = "admin" | "user";
export type DepositType = "ftd" | "redep";

export interface AppUser {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  role: UserRole;
  is_active: boolean;
  timezone: string;
}

export interface Geo {
  id: string;
  code: string;
  flag_emoji: string | null;
  sort_order: number;
}

export interface Link {
  id: string;
  name: string;
  geo_id: string | null;
  url: string | null;
  plan_count: number;
  plan_amount: number;
  amount_presets: number[];
  is_archived: boolean;
}

/** Row from the `link_today_stats` view. */
export interface LinkTodayStats {
  link_id: string;
  name: string;
  geo_id: string | null;
  url: string | null;
  geo_code: string | null;
  flag_emoji: string | null;
  plan_count: number;
  plan_amount: number;
  amount_presets: number[];
  is_archived: boolean;
  deposits_count: number;
  deposits_sum: number;
  last_deposit_at: string | null;
  plan_pct: number;
}

export interface Deposit {
  id: string;
  link_id: string;
  geo_id: string | null;
  amount: number;
  type: DepositType;
  user_id: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  link_id: string;
  amount: number;
  user_id: string;
  created_at: string;
}

export type PlanStatus = "danger" | "warn" | "success" | "premium" | "idle";
