import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Сроки — Local Pharm" };

export default function ExpiryPage() {
  return (
    <ComingSoon title="Сроки годности">
      Здесь будут упаковки, сгруппированные по сроку: просроченные, на 30 и на 90 дней.
    </ComingSoon>
  );
}
