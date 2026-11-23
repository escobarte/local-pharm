import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/Page";
import { RegistryPicked, RegistrySearch } from "@/components/RegistrySearch";
import { ScreenHeader } from "@/components/ScreenHeader";
import { primaryButtonClass } from "@/components/ui";
import { categoryForAtc } from "@/lib/amdm/atc-category";
import { prefillFromRegistry } from "@/lib/amdm/format";
import { getRegistryItem, searchRegistry } from "@/lib/amdm/queries";
import { REGISTRY_MAX_QUERY_LENGTH, addPageHref, isRegistryCode, type AddMode } from "@/lib/amdm/search";
import { createMedicationWithPack } from "@/lib/storage/actions";
import { getAddFormData } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";
import { AddForm } from "./AddForm";

export const metadata: Metadata = { title: "Добавить препарат — Local Pharm" };

type Param = string | string[] | undefined;
type Props = {
  searchParams: Promise<{ box?: Param; cell?: Param; mode?: Param; q?: Param; reg?: Param }>;
};

const first = (v: Param): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const tabClass =
  "flex min-h-11 flex-col items-center justify-center rounded-field px-1 text-sm leading-tight font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

export default async function AddPage({ searchParams }: Props) {
  const sp = await searchParams;
  const mode: AddMode = first(sp.mode) === "search" ? "search" : "manual";
  const query = first(sp.q).replace(/\s+/g, " ").trim().slice(0, REGISTRY_MAX_QUERY_LENGTH);
  const reg = first(sp.reg);
  const pickedCode = mode === "search" && isRegistryCode(reg) ? reg : null;

  const [{ categories, boxes }, picked, search] = await Promise.all([
    getAddFormData(),
    pickedCode ? getRegistryItem(pickedCode) : Promise.resolve(null),
    mode === "search" && !pickedCode ? searchRegistry(query) : Promise.resolve(null),
  ]);

  // Preselect from "Добавить сюда": a compartment id wins, then a box id.
  const cell = first(sp.cell);
  const box = first(sp.box);
  const cellId = isUuid(cell) ? cell : "";
  const boxFromCell = boxes.find((b) => b.compartments.some((c) => c.id === cellId));
  const boxFromParam = isUuid(box) ? boxes.find((b) => b.id === box) : undefined;
  const preselected = boxFromCell ?? boxFromParam;
  const closeHref = preselected ? `/storage/${preselected.id}` : "/";

  // Only valid ids travel between the tabs.
  const keep = { box: isUuid(box) ? box : undefined, cell: cellId || undefined };
  const searchHref = addPageHref({ mode: "search", q: query, ...keep });
  const hidden: Record<string, string> = {};
  if (keep.box) hidden.box = keep.box;
  if (keep.cell) hidden.cell = keep.cell;

  const tabs = [
    { label: "Поиск", mode: "search" as const, href: addPageHref({ mode: "search", ...keep }) },
    { label: "Вручную", mode: "manual" as const, href: addPageHref({ mode: "manual", ...keep }) },
  ];

  const noBoxes = (
    <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-xl lg:p-0">
      <p className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
        Сначала создайте коробку и отсек, куда положить упаковку.
      </p>
      <Link href="/storage/new" className={`${primaryButtonClass} no-underline`}>
        Создать коробку
      </Link>
    </main>
  );

  const form = (props: { registryCode?: string; initialValues?: Record<string, string> }) =>
    boxes.length === 0 ? (
      noBoxes
    ) : (
      <AddForm
        // A new registry pick must remount the form: defaultValue applies only once.
        key={props.registryCode ?? "manual"}
        action={createMedicationWithPack}
        categories={categories}
        boxes={boxes}
        initialBoxId={preselected?.id ?? boxes[0].id}
        initialCompartmentId={cellId}
        registryCode={props.registryCode}
        initialValues={props.initialValues}
      />
    );

  let body;
  if (mode === "manual") {
    body = form({});
  } else if (pickedCode && picked) {
    const categoryName = categoryForAtc(picked.atc);
    const categoryId = categories.find((c) => c.name === categoryName)?.id ?? "";
    body = (
      <>
        <RegistryPicked item={picked} changeHref={searchHref} />
        {form({
          registryCode: picked.code,
          initialValues: { ...prefillFromRegistry(picked), categoryId },
        })}
      </>
    );
  } else if (pickedCode) {
    body = (
      <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-xl lg:p-0">
        <p role="alert" className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
          Препарат с кодом {pickedCode} не найден в реестре AMDM.
        </p>
        <Link href={searchHref} className={`${primaryButtonClass} no-underline`}>
          Вернуться к поиску
        </Link>
      </main>
    );
  } else {
    body = (
      <main className="flex flex-col gap-4 px-5 pb-6 lg:p-0">
        <RegistrySearch
          query={query}
          result={search ?? { status: "idle" }}
          hidden={hidden}
          pickHref={(code) => addPageHref({ mode: "search", q: query, reg: code, ...keep })}
        />
      </main>
    );
  }

  return (
    <Page>
      <ScreenHeader title="Добавить препарат" backHref={closeHref} backIcon="close" heading />

      <nav
        aria-label="Способ добавления"
        className="mx-5 mt-1 mb-3 grid grid-cols-3 gap-1 rounded-button bg-tint p-1 lg:mx-0 lg:mt-0 lg:mb-5 lg:max-w-105"
      >
        <span aria-disabled="true" className={`${tabClass} cursor-not-allowed text-muted`}>
          Скан
          <span className="text-[10px] font-medium">скоро</span>
        </span>
        {tabs.map((t) => {
          const active = t.mode === mode;
          return (
            <Link
              key={t.mode}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`${tabClass} ${active ? "bg-surface text-navy" : "text-navy hover:bg-surface/60"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {body}
    </Page>
  );
}
