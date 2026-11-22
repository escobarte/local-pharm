import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

/**
 * Screens with the bottom menu (mobile). From lg the side menu comes from
 * app/(app)/layout.tsx, BottomNav hides itself and the column is widened by
 * each page through <Page>.
 */
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-navy">
      <div className="mx-auto w-full max-w-md flex-1 lg:max-w-none">{children}</div>
      <BottomNav />
    </div>
  );
}
