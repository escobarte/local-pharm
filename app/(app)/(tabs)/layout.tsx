import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";

/** Screens with the bottom menu. Content is centered with a max width on wide screens. */
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-navy">
      <div className="mx-auto w-full max-w-md flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
