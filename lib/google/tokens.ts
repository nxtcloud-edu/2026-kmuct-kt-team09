// 멤버별 OAuth 토큰 보관. 서버 전용 — token·secret 값을 절대 로그에 찍지 않는다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string;
}

type TokenRow = { member_id: string; tokens: StoredTokens; updated_at: string };

function supabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 개발용 폴백. HMR에도 유지되도록 globalThis에 둔다.
function devStore(): Map<string, StoredTokens> {
  const g = globalThis as unknown as { __googleTokens?: Map<string, StoredTokens> };
  if (!g.__googleTokens) g.__googleTokens = new Map();
  return g.__googleTokens;
}

/** 기존 refresh_token이 있고 새 값에 없으면 기존 것을 유지한다. */
function mergeTokens(prev: StoredTokens | null, next: StoredTokens): StoredTokens {
  if (prev?.refresh_token && !next.refresh_token) {
    return { ...next, refresh_token: prev.refresh_token };
  }
  return next;
}

export async function saveTokens(memberId: string, t: StoredTokens): Promise<void> {
  const client = supabase();
  if (!client) {
    const store = devStore();
    store.set(memberId, mergeTokens(store.get(memberId) ?? null, t));
    return;
  }

  try {
    const { data, error: selectError } = await client
      .from("google_tokens")
      .select("tokens")
      .eq("member_id", memberId)
      .maybeSingle();
    if (selectError) {
      console.error("[google/tokens] saveTokens select failed");
    }

    const prev = (data as { tokens: StoredTokens } | null)?.tokens ?? null;
    const merged = mergeTokens(prev, t);

    const row: TokenRow = { member_id: memberId, tokens: merged, updated_at: new Date().toISOString() };
    const { error: upsertError } = await client.from("google_tokens").upsert(row, { onConflict: "member_id" });
    if (upsertError) {
      console.error("[google/tokens] saveTokens upsert failed");
    }
  } catch {
    console.error("[google/tokens] saveTokens threw");
  }
}

export async function loadTokens(memberId: string): Promise<StoredTokens | null> {
  const client = supabase();
  if (!client) {
    return devStore().get(memberId) ?? null;
  }

  try {
    const { data, error } = await client
      .from("google_tokens")
      .select("tokens")
      .eq("member_id", memberId)
      .maybeSingle();
    if (error) {
      console.error("[google/tokens] loadTokens failed");
      return null;
    }
    return (data as { tokens: StoredTokens } | null)?.tokens ?? null;
  } catch {
    console.error("[google/tokens] loadTokens threw");
    return null;
  }
}
