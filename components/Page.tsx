import type { ReactNode } from "react";

/**
 * Desktop content column (from lg): centered, 32–40 px padding, up to 1080 px
 * (lists, forms) or 1160 px (`wide`: storage). Below lg it adds nothing: it
 * is a plain flex column, so mobile screens look exactly as before.
 */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`flex flex-1 flex-col lg:mx-auto lg:w-full lg:px-10 lg:pt-8 lg:pb-12 ${
        wide ? "lg:max-w-[1240px]" : "lg:max-w-[1160px]"
      }`}
    >
      {children}
    </div>
  );
}
