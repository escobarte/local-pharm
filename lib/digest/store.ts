import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IsoDate } from "@/lib/dates";
import type { DigestRow } from "./build";
import type { DigestStore } from "./run";

// The cron has no user session and the app never holds the service_role key.
// It calls three SECURITY DEFINER functions (migration 0006) with the publishable
// key plus the shared secret (the same value as CRON_SECRET). A wrong secret
// returns nothing: the functions never explain why.

type RawDigestRow = {
  medication_name: string;
  box_number: string | null;
  box_name: string;
  compartment_code: string;
  expiry_date: string;
  quantity: number;
};

export function createDigestStore(supabase: SupabaseClient, secret: string): DigestStore {
  return {
    async lastSentOn(): Promise<IsoDate | null> {
      const { data, error } = await supabase.rpc("digest_last_sent", { p_secret: secret });
      if (error) throw new Error(`digest_last_sent: ${error.code ?? error.message}`);
      return typeof data === "string" ? data : null;
    },
    async rows(days: number): Promise<DigestRow[]> {
      const { data, error } = await supabase.rpc("weekly_expiry_digest", { p_secret: secret, p_days: days });
      if (error) throw new Error(`weekly_expiry_digest: ${error.code ?? error.message}`);
      return ((data ?? []) as RawDigestRow[]).map((r) => ({
        medicationName: r.medication_name,
        boxNumber: r.box_number,
        boxName: r.box_name,
        compartmentCode: r.compartment_code,
        expiryDate: r.expiry_date,
        quantity: r.quantity,
      }));
    },
    async markSent(): Promise<void> {
      const { error } = await supabase.rpc("digest_mark_sent", { p_secret: secret });
      if (error) throw new Error(`digest_mark_sent: ${error.code ?? error.message}`);
    },
  };
}
