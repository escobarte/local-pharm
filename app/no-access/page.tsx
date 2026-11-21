import type { Metadata } from "next";
import Link from "next/link";
import { AuthScreen, hintOnNavyClass, primaryOnNavyClass } from "@/components/AuthScreen";

export const metadata: Metadata = { title: "Нет доступа — Local Pharm" };

export default function NoAccessPage() {
  return (
    <AuthScreen
      title="Нет доступа"
      description={
        <p>
          Этот аккаунт Google не входит в список приглашённых. Local Pharm открыт только
          для двух аккаунтов владельцев.
        </p>
      }
    >
      <Link href="/login" className={primaryOnNavyClass}>
        Войти другим аккаунтом
      </Link>
      <p className={hintOnNavyClass}>
        Если это ошибка, попросите владельца добавить ваш email в список.
      </p>
    </AuthScreen>
  );
}
