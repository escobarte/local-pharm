import type { Metadata } from "next";
import { BoxForm } from "@/components/BoxForm";
import { ScreenHeader } from "@/components/ScreenHeader";
import { createBox } from "@/lib/storage/actions";
import { DEFAULT_BOX_COLOR } from "@/lib/storage/box-colors";
import { countBoxes, getLocations } from "@/lib/storage/queries";

export const metadata: Metadata = { title: "Новая коробка — Local Pharm" };

export default async function NewBoxPage() {
  const [zones, boxCount] = await Promise.all([getLocations(), countBoxes()]);

  return (
    <>
      <ScreenHeader title="Новая коробка" backHref="/storage" backIcon="close" />
      <BoxForm
        action={createBox}
        zones={zones}
        submitLabel="Создать коробку"
        cancelHref="/storage"
        initial={{
          name: "",
          locationId: zones[0]?.id ?? "",
          color: DEFAULT_BOX_COLOR,
          // Suggested next number; the owner can change or clear it.
          number: String(boxCount + 1),
        }}
      />
    </>
  );
}
