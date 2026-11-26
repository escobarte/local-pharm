"use client";

import { AuthScreen, primaryOnNavyClass } from "@/components/AuthScreen";
import { OFFLINE_PATH } from "@/lib/offline/sw";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AuthScreen
      title="Что-то пошло не так"
      description={<p>Не удалось связаться с сервером. Попробуйте ещё раз через минуту.</p>}
    >
      <button type="button" onClick={reset} className={primaryOnNavyClass}>
        Повторить
      </button>
      {/* A full navigation: the offline copy does not need the server. */}
      <a href={OFFLINE_PATH} className={primaryOnNavyClass}>
        Открыть сохранённые данные
      </a>
    </AuthScreen>
  );
}
