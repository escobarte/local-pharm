"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { primaryOnNavyClass } from "@/components/AuthScreen";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = { next?: string };

export function GoogleSignInButton({ next }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push("/not-configured");
      return;
    }
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Let the user pick another account after a "no access" result.
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser navigates to Google; we only get here on error.
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <>
      <button type="button" onClick={signIn} disabled={pending} className={primaryOnNavyClass}>
        <span
          aria-hidden="true"
          className="flex size-6 items-center justify-center rounded-full border-2 border-navy text-[13px] font-bold"
        >
          G
        </span>
        {pending ? "Переходим в Google…" : "Войти через Google"}
      </button>
      {failed ? (
        <p role="alert" className="text-center text-[13px] leading-normal text-white">
          Не удалось начать вход. Попробуйте ещё раз.
        </p>
      ) : null}
    </>
  );
}
