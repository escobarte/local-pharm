import "server-only";
import { cache } from "react";
import { todayIso } from "@/lib/dates";
import { attentionHorizon } from "@/lib/expiry/group";
import type { NavCounts } from "@/components/nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// NavCounts: shopping = open (not yet bought) items; expiry = packs already expired
// or expiring within 30 days. The type lives next to the menu (components/nav.tsx).

/**
 * Menu badges: ONE lightweight call (public.nav_counts, migration 0006), memoized per
 * request so the side menu (app layout) and the bottom menu (tabs layout) share it.
 * Any failure (for example 0006 not applied yet) means "no badges", never a broken page.
 */
export const getNavCounts = cache(async (): Promise<NavCounts | null> => {
  // Outside the try: createSupabaseServerClient() reads cookies(), and Next signals
  // "this page is dynamic" by throwing from it. That signal must not be swallowed.
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("nav_counts", {
      p_expiry_until: attentionHorizon(todayIso()),
    });
    if (error) {
      console.error("nav_counts failed:", error.code ?? error.message);
      return null;
    }
    const row = (data as { shopping_open: number; expiry_attention: number }[] | null)?.[0];
    if (!row) return null;
    return { shopping: row.shopping_open, expiry: row.expiry_attention };
  } catch (error) {
    console.error("nav_counts failed:", error instanceof Error ? error.message : "unknown");
    return null;
  }
});
