import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Покупки — Local Pharm" };

export default function ShoppingPage() {
  return (
    <ComingSoon title="Покупки">
      Здесь появится список того, что нужно купить, и история купленного.
    </ComingSoon>
  );
}
