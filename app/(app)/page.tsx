import { getAccess } from "@/lib/supabase/server";
import { signOut } from "./actions";

// Placeholder home screen for Phase 1. Real screens come in Phases 2–3.
export default async function HomePage() {
  const access = await getAccess();
  const email = access?.status === "allowed" ? access.email : "";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-bg px-5 pt-16 pb-12 text-navy">
      <h1 className="text-[28px] leading-tight font-bold">Local Pharm</h1>
      <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Вы вошли как</h2>
        <p className="text-[15px] font-medium break-all">{email || "—"}</p>
      </section>
      <p className="text-[15px] leading-normal text-muted">
        Здесь появятся поиск, места хранения и сроки годности.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center rounded-button border border-border bg-surface px-4 text-[15px] font-semibold text-navy hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Выйти
        </button>
      </form>
    </main>
  );
}
