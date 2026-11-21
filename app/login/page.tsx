import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthScreen, hintOnNavyClass } from "@/components/AuthScreen";
import { getSupabaseEnv } from "@/lib/env";
import { NOT_CONFIGURED_PATH, safeNextPath } from "@/lib/routes";
import { GoogleSignInButton } from "./GoogleSignInButton";

export const metadata: Metadata = { title: "Вход — Local Pharm" };

const ERRORS: Record<string, string> = {
  auth: "Не удалось войти. Попробуйте ещё раз.",
  server: "Сервер не ответил. Попробуйте позже.",
};

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (!getSupabaseEnv()) redirect(NOT_CONFIGURED_PATH);

  const { error, next } = await searchParams;
  const errorText = error ? ERRORS[error] : undefined;
  const nextPath = next ? safeNextPath(next) : undefined;

  return (
    <AuthScreen
      title="Local Pharm"
      description={<p>Домашняя аптечка: что есть, где лежит и когда истекает срок.</p>}
    >
      {errorText ? (
        <p role="alert" className="rounded-field bg-danger-bg px-4 py-3 text-[13px] leading-normal text-danger-fg">
          {errorText}
        </p>
      ) : null}
      <GoogleSignInButton next={nextPath === "/" ? undefined : nextPath} />
      <p className={hintOnNavyClass}>Доступ только для двух приглашённых аккаунтов</p>
    </AuthScreen>
  );
}
