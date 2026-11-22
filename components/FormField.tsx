import type { ReactNode } from "react";

type Props = {
  label: string;
  /** id of the control inside; the label points to it. */
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Label + control + hint/error. Controls reference `${htmlFor}-msg` via aria-describedby. */
export function FormField({ label, htmlFor, error, hint, children }: Props) {
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {message ? (
        <p
          id={`${htmlFor}-msg`}
          className={`text-xs leading-normal ${error ? "font-semibold text-danger-fg" : "text-muted"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Props to spread on the control so errors are announced. */
export function fieldAria(id: string, error?: string, hint?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-msg` : undefined,
  } as const;
}
