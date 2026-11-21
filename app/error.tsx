"use client";

import { AuthScreen, primaryOnNavyClass } from "@/components/AuthScreen";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AuthScreen
      title="Что-то пошло не так"
      description={<p>Не удалось связаться с сервером. Попробуйте ещё раз через минуту.</p>}
    >
      <button type="button" onClick={reset} className={primaryOnNavyClass}>
        Повторить
      </button>
    </AuthScreen>
  );
}
