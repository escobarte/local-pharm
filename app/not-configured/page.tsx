import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthScreen, hintOnNavyClass } from "@/components/AuthScreen";
import { getSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Не настроено — Local Pharm" };

export default function NotConfiguredPage() {
  if (getSupabaseEnv()) redirect("/");

  return (
    <AuthScreen
      title="Не настроено"
      description={
        <p>
          Приложение пока не подключено к базе данных: не заданы переменные окружения
          Supabase.
        </p>
      }
    >
      <p className={hintOnNavyClass}>
        Владельцу: шаги в docs/SETUP-SUPABASE.md, после добавления переменных нужен Redeploy в
        Vercel.
      </p>
    </AuthScreen>
  );
}
