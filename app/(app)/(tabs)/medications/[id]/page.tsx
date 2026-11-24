import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconPill } from "@/components/icons";
import { Indications, MedicationActions, MedicationHead, PackList } from "@/components/MedicationParts";
import { Page } from "@/components/Page";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getMedication } from "@/lib/medications/queries";
import { isMedicationInShoppingList } from "@/lib/shopping/queries";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Препарат — Local Pharm" };

export default async function MedicationPage({ params }: Props) {
  const { id } = await params;
  const med = await getMedication(id);
  if (!med) notFound();
  // Before migration 0006 is applied the list does not exist: the card must still open.
  const inShoppingList = await isMedicationInShoppingList(med.id).catch(() => false);

  return (
    <Page>
      <ScreenHeader title="Препарат" backHref="/search" backLabel="К поиску" />
      <main className="flex flex-col gap-5 px-5 pt-1 pb-6 lg:gap-6 lg:p-0">
        <MedicationHead med={med} iconClassName="lg:hidden" />

        {/* Mobile: one column (packs, indications, actions). Desktop: photo and
            indications on the left, packs and actions on the right. */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-6">
          <div className="hidden lg:flex lg:flex-col lg:gap-5">
            <div
              aria-hidden="true"
              className="flex h-55 items-center justify-center rounded-card bg-tint text-muted"
            >
              <IconPill size={56} />
            </div>
            <Indications med={med} titleId="indications-desktop" />
          </div>
          <div className="flex flex-col gap-5">
            <PackList med={med} titleId="packs-title" inShoppingList={inShoppingList} />
            <Indications med={med} titleId="indications-title" className="lg:hidden" />
            <MedicationActions med={med} />
          </div>
        </div>
      </main>
    </Page>
  );
}
