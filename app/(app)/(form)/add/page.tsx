import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  AddSearchForm,
  BarcodeNotice,
  DuplicateNotice,
  HomeResults,
  OpenFdaLoading,
  OpenFdaResults,
  PickedCard,
  RegistryResults,
  openFdaLines,
  registryLines,
} from "@/components/AddSearch";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { FormField } from "@/components/FormField";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { errorBoxClass, inputClass, primaryButtonClass, secondaryButtonClass, sectionTitleClass } from "@/components/ui";
import { addPageHref, parseOpenFdaPick, type AddMode, type AddParams } from "@/lib/add-href";
import { categoryForAtc } from "@/lib/amdm/atc-category";
import { prefillFromRegistry } from "@/lib/amdm/format";
import { findRegistryByBarcode, getRegistryItem, searchRegistry } from "@/lib/amdm/queries";
import { REGISTRY_MAX_QUERY_LENGTH, isRegistryCode } from "@/lib/amdm/search";
import { parseBarcode } from "@/lib/barcode";
import { todayIso } from "@/lib/dates";
import { findDuplicate, resolveScan, type Duplicate, type ExistingMedication } from "@/lib/medications/duplicates";
import { findExistingMedications, getCatalog } from "@/lib/medications/queries";
import { searchHome } from "@/lib/medications/search";
import { createMedicationWithPack } from "@/lib/storage/actions";
import { getAddFormData } from "@/lib/storage/queries";
import { isUuid } from "@/lib/storage/validation";
import { AddForm } from "./AddForm";

export const metadata: Metadata = { title: "Добавить препарат — Local Pharm" };

type Param = string | string[] | undefined;
type Props = { searchParams: Promise<Record<string, Param>> };

const first = (v: Param): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? ""));

const tabClass =
  "flex min-h-11 flex-col items-center justify-center rounded-field px-1 text-sm leading-tight font-semibold no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";
const mainClass = "flex flex-col gap-4 px-5 pb-6 lg:gap-5 lg:p-0";

/** Duplicate check before showing a prefilled form. A failed lookup is not fatal: the action checks again. */
async function duplicateOf(params: { registryCode?: string | null; barcode?: string | null }): Promise<Duplicate | null> {
  if (!params.registryCode && !params.barcode) return null;
  try {
    return findDuplicate(await findExistingMedications(params), params);
  } catch {
    return null;
  }
}

export default async function AddPage({ searchParams }: Props) {
  const sp = await searchParams;
  const modeRaw = first(sp.mode);
  const mode: AddMode = modeRaw === "search" || modeRaw === "scan" ? modeRaw : "manual";
  const query = first(sp.q).replace(/\s+/g, " ").trim().slice(0, REGISTRY_MAX_QUERY_LENGTH);
  const regRaw = first(sp.reg);
  const pickedCode = mode === "search" && isRegistryCode(regRaw) ? regRaw : null;
  const fdaPick = mode === "search" && !pickedCode ? parseOpenFdaPick(sp) : null;
  const bcParsed = parseBarcode(first(sp.bc));
  const bc = bcParsed.ok ? bcParsed.value : undefined;
  const dup = first(sp.dup) === "1";
  const notFound = first(sp.nf) === "1";

  const { categories, boxes } = await getAddFormData();

  // Preselect from "Добавить сюда": a compartment id wins, then a box id.
  const cell = first(sp.cell);
  const box = first(sp.box);
  const cellId = isUuid(cell) ? cell : "";
  const boxFromCell = boxes.find((b) => b.compartments.some((c) => c.id === cellId));
  const boxFromParam = isUuid(box) ? boxes.find((b) => b.id === box) : undefined;
  const preselected = boxFromCell ?? boxFromParam;
  const closeHref = preselected ? `/storage/${preselected.id}` : "/";

  // Only valid values travel between the tabs.
  const keep: AddParams = { box: isUuid(box) ? box : undefined, cell: cellId || undefined };
  const href = (p: AddParams) => addPageHref({ ...keep, ...p });
  const packHref = (id: string) => `/medications/${id}/pack/new${cellId ? `?cell=${cellId}` : ""}`;

  const tabs = [
    { label: "Скан", mode: "scan" as const, href: href({ mode: "scan" }) },
    { label: "Поиск", mode: "search" as const, href: href({ mode: "search", bc, dup }) },
    { label: "Вручную", mode: "manual" as const, href: href({ mode: "manual", bc, dup }) },
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

  const form = (props: {
    formKey: string;
    registryCode?: string;
    source?: "manual" | "openfda";
    initialValues?: Record<string, string>;
  }) =>
    boxes.length === 0 ? (
      noBoxes
    ) : (
      <AddForm
        // A new pick must remount the form: defaultValue applies only once.
        key={props.formKey}
        action={createMedicationWithPack}
        categories={categories}
        boxes={boxes}
        initialBoxId={preselected?.id ?? boxes[0].id}
        initialCompartmentId={cellId}
        registryCode={props.registryCode}
        source={props.source}
        initialValues={props.initialValues}
        allowDuplicate={dup}
      />
    );

  const duplicateBlock = (d: Duplicate, separate: AddParams) => (
    <main className={mainClass}>
      <DuplicateNotice
        medications={[d.medication]}
        reason={d.reason}
        packHref={packHref}
        separateHref={href({ ...separate, dup: true })}
      />
    </main>
  );

  let body: ReactNode;

  if (mode === "scan") {
    body = await scanBody();
  } else if (mode === "manual") {
    const d = bc && !dup ? await duplicateOf({ barcode: bc }) : null;
    body = d ? (
      duplicateBlock(d, { mode: "manual", bc })
    ) : (
      <>
        {bc ? (
          <div className="px-5 pb-3 lg:px-0 lg:pb-5">
            <BarcodeNotice barcode={bc} notFound={false} />
          </div>
        ) : null}
        {form({ formKey: `manual-${bc ?? ""}`, initialValues: bc ? { barcode: bc } : {} })}
      </>
    );
  } else if (pickedCode) {
    const picked = await getRegistryItem(pickedCode);
    if (!picked) {
      body = (
        <main className="flex flex-col gap-4 px-5 pb-6 lg:max-w-xl lg:p-0">
          <p role="alert" className="rounded-card border border-border bg-surface p-5 text-[15px] leading-normal">
            Препарат с кодом {pickedCode} не найден в реестре AMDM.
          </p>
          <Link href={href({ mode: "search", q: query, bc })} className={`${primaryButtonClass} no-underline`}>
            Вернуться к поиску
          </Link>
        </main>
      );
    } else {
      const prefill = prefillFromRegistry(picked);
      // A scanned code is what is on the box in hand — it wins over the registry's.
      const barcode = bc ?? prefill.barcode;
      const d = dup ? null : await duplicateOf({ registryCode: picked.code, barcode: barcode || null });
      if (d) {
        body = duplicateBlock(d, { mode: "search", q: query, reg: picked.code, bc });
      } else {
        const categoryId = categories.find((c) => c.name === categoryForAtc(picked.atc))?.id ?? "";
        const barcodeNote = picked.barcode && !prefill.barcode && !bc
          ? `В реестре штрихкод с ошибкой (${picked.barcode}) — не подставлен`
          : barcode
            ? `штрихкод ${barcode}`
            : null;
        body = (
          <>
            <PickedCard
              source="amdm"
              title={picked.name}
              lines={registryLines(picked, barcodeNote)}
              changeHref={href({ mode: "search", q: query, bc, dup })}
            />
            {form({
              formKey: `amdm-${picked.code}`,
              registryCode: picked.code,
              initialValues: { ...prefill, barcode, categoryId },
            })}
          </>
        );
      }
    }
  } else if (fdaPick) {
    const d = bc && !dup ? await duplicateOf({ barcode: bc }) : null;
    body = d ? (
      duplicateBlock(d, { mode: "search", q: query, fda: fdaPick, bc })
    ) : (
      <>
        <PickedCard
          source="openfda"
          title={fdaPick.name}
          lines={[...openFdaLines(fdaPick), bc ? `штрихкод ${bc}` : ""]}
          changeHref={href({ mode: "search", q: query, bc, dup })}
        />
        {form({
          formKey: `openfda-${fdaPick.name}-${fdaPick.strength ?? ""}`,
          source: "openfda",
          initialValues: {
            name: fdaPick.name,
            activeIngredient: fdaPick.inn ?? "",
            form: fdaPick.form ?? "",
            dosage: fdaPick.strength ?? "",
            barcode: bc ?? "",
          },
        })}
      </>
    );
  } else {
    const hidden: Record<string, string> = {};
    if (bc) hidden.bc = bc;
    if (dup) hidden.dup = "1";
    if (keep.box) hidden.box = keep.box;
    if (keep.cell) hidden.cell = keep.cell;

    let blocks: ReactNode = null;
    if (query) {
      const [catalog, registry] = await Promise.all([getCatalog(), searchRegistry(query)]);
      blocks = (
        <>
          <HomeResults results={searchHome(catalog, query, todayIso())} packHref={packHref} />
          <RegistryResults result={registry} pickHref={(code) => href({ mode: "search", q: query, reg: code, bc, dup })} />
          <Suspense fallback={<OpenFdaLoading />}>
            <OpenFdaResults query={query} pickHref={(fda) => href({ mode: "search", q: query, fda, bc, dup })} />
          </Suspense>
        </>
      );
    }
    body = (
      <main className={mainClass}>
        {bc ? <BarcodeNotice barcode={bc} notFound={notFound} /> : null}
        <AddSearchForm query={query} hidden={hidden} />
        {blocks}
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

  // ---------- "Скан" tab ----------

  async function scanBody(): Promise<ReactNode> {
    const codeRaw = first(sp.code);
    const parsed = codeRaw ? parseBarcode(codeRaw) : null;

    if (parsed?.ok) {
      const code = parsed.value;
      let home: ExistingMedication[];
      let registry: Awaited<ReturnType<typeof findRegistryByBarcode>>;
      try {
        [home, registry] = await Promise.all([findExistingMedications({ barcode: code }), findRegistryByBarcode(code)]);
      } catch {
        return (
          <main className={mainClass}>
            <p role="alert" className={errorBoxClass}>
              Не удалось проверить штрихкод {code}. Проверьте интернет и попробуйте ещё раз.
            </p>
            <Link href={href({ mode: "scan", code })} className={`${primaryButtonClass} no-underline lg:self-start`}>
              Попробовать ещё раз
            </Link>
          </main>
        );
      }

      const outcome = resolveScan(code, home, registry);
      // redirect() throws, so it stays outside try/catch.
      if (outcome.kind === "registry-one") redirect(href({ mode: "search", reg: outcome.item.code, bc: code }));
      if (outcome.kind === "none") redirect(href({ mode: "search", bc: code, notFound: true }));

      const again = (
        <Link href={href({ mode: "scan" })} className={`${secondaryButtonClass} no-underline lg:self-start`}>
          Сканировать другой
        </Link>
      );
      if (outcome.kind === "home") {
        const separate: AddParams =
          outcome.registry.length === 1
            ? { mode: "search", reg: (outcome.registry[0] as { code: string }).code, bc: code, dup: true }
            : { mode: "search", bc: code, dup: true };
        return (
          <main className={mainClass}>
            <p role="status" className="text-[13px] text-muted">
              Штрихкод {code}
            </p>
            <DuplicateNotice
              medications={outcome.medications}
              reason="barcode"
              packHref={packHref}
              separateHref={href(separate)}
            />
            {again}
          </main>
        );
      }
      return (
        <main className={mainClass}>
          <p role="status" className="text-[13px] leading-normal">
            Штрихкод {code}: в реестре несколько записей. Выберите свою упаковку.
          </p>
          <RegistryResults
            title="Реестр Молдовы"
            result={{ status: "ok", items: outcome.items, byBarcode: true, more: false }}
            pickHref={(reg) => href({ mode: "search", reg, bc: code })}
          />
          {again}
        </main>
      );
    }

    const error = parsed && !parsed.ok ? parsed.error : undefined;
    return (
      <main className={`${mainClass} lg:grid lg:grid-cols-2 lg:items-start`}>
        <section aria-labelledby="camera-title" className="flex flex-col gap-3">
          <h2 id="camera-title" className={`${sectionTitleClass} hidden lg:block`}>
            Камера
          </h2>
          <BarcodeScanner box={keep.box} cell={keep.cell} />
        </section>
        <section
          aria-labelledby="manual-code-title"
          className="flex flex-col gap-3 lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-6"
        >
          <h2 id="manual-code-title" className={sectionTitleClass}>
            Или введите штрихкод
          </h2>
          <form action="/add" method="get" className="flex flex-col gap-3" noValidate>
            <input type="hidden" name="mode" value="scan" />
            {keep.box ? <input type="hidden" name="box" value={keep.box} /> : null}
            {keep.cell ? <input type="hidden" name="cell" value={keep.cell} /> : null}
            <FormField
              label="Цифры под штрихкодом"
              htmlFor="code"
              error={error}
              hint={error ? undefined : "8 или 13 цифр (на американских упаковках — 12)"}
            >
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                maxLength={20}
                autoComplete="off"
                enterKeyHint="search"
                defaultValue={codeRaw}
                aria-invalid={error ? true : undefined}
                aria-describedby="code-msg"
                className={inputClass}
              />
            </FormField>
            <button type="submit" className={`${primaryButtonClass} lg:self-start lg:min-w-56`}>
              Найти по штрихкоду
            </button>
          </form>
        </section>
      </main>
    );
  }
}
