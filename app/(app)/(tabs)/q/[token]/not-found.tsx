import Link from "next/link";
import { IconStorage } from "@/components/icons";
import { Page } from "@/components/Page";
import { primaryButtonClass } from "@/components/ui";

/** Unknown or malformed sticker. No details: the token is never echoed back. */
export default function QrNotFound() {
  return (
    <Page>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center lg:max-w-md lg:self-center lg:px-0">
        <span className="flex size-14 items-center justify-center rounded-card bg-tint text-navy">
          <IconStorage size={28} />
        </span>
        <h1 className="text-2xl leading-tight font-bold">Коробка не найдена</h1>
        <p className="text-[15px] leading-normal text-muted">
          Этой наклейки нет в вашем хранении: коробку могли удалить, или код с ошибкой.
        </p>
        <Link href="/storage" className={`${primaryButtonClass} w-full no-underline`}>
          К списку коробок
        </Link>
      </main>
    </Page>
  );
}
