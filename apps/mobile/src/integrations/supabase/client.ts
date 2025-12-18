import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY =
  (import.meta.env as any).VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storageKey: "tmoshibi-mobile-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-client-info": "tmoshibi-mobile" },
    },
  });
} else {
  // Fallback stub to avoid runtime crashes if env is missing
  const stub = {
    auth: {
      onAuthStateChange: (_cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signUp: async (_params: any) => ({ data: null, error: null }),
      signInWithPassword: async (_params: any) => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          not: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
    channel: () => ({
      on: () => ({}),
      subscribe: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      unsubscribe: () => {},
    }),
    removeChannel: (_c: any) => {},
  } as any;
  supabaseInstance = stub;
}

export const supabase = supabaseInstance;
