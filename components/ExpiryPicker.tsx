"use client";

import { useState, type FocusEvent } from "react";
import { todayIso } from "@/lib/dates";
import {
  composeExpiryValue,
  EXPIRY_PICKER_ERROR,
  expiryYearOptions,
  isHalfExpiry,
  MONTH_OPTIONS,
  splitExpiryValue,
} from "@/lib/expiry/picker";
import { inputClass } from "./ui";

type Props = {
  /** Value to show: "MM/YYYY" (what the server returns on a validation error), or empty. */
  defaultValue?: string;
  /** Server-side message for the "expiry" field. */
  error?: string;
  /** Spans the whole row of a two-column grid; each list takes half of it. */
  className?: string;
};

const selectLabelClass = "text-xs text-muted";

/**
 * "Годен до": two native lists, «Месяц» and «Год», with "—" for no expiry.
 * It submits ONE hidden field `expiry` in the format the old text input used
 * ("MM/YYYY", or empty), so server validation and Server Actions are untouched.
 * Only one list chosen → the hidden value is deliberately invalid and the server
 * rejects it; the same message is shown at once when focus leaves both lists.
 */
export function ExpiryPicker(props: Props) {
  // React resets a form after its action finishes. The lists are uncontrolled
  // (`defaultValue`) so that reset lands on the submitted value, and the key
  // re-creates the state from that value: what the person sees is what is sent.
  return <ExpiryFields key={props.defaultValue ?? ""} {...props} />;
}

function ExpiryFields({ defaultValue = "", error, className = "" }: Props) {
  const initial = splitExpiryValue(defaultValue);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [left, setLeft] = useState(false);

  const half = isHalfExpiry(month, year);
  const years = expiryYearOptions(Number(todayIso().slice(0, 4)), initial.year);

  // The server's text speaks about the typed format; with lists the only way to
  // get an expiry error is a half-filled date, so say that instead.
  const message = half && (error || left) ? EXPIRY_PICKER_ERROR : error;
  const invalid = Boolean(message);

  function onBlur(e: FocusEvent<HTMLFieldSetElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setLeft(true);
  }

  const aria = {
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": "expiry-msg",
  } as const;

  return (
    <fieldset onBlur={onBlur} className={`m-0 min-w-0 border-0 p-0 ${className}`}>
      <legend className="mb-1.5 p-0 text-[13px] font-semibold">Годен до</legend>
      <input type="hidden" name="expiry" value={composeExpiryValue(month, year)} />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="expiry-month" className={selectLabelClass}>
            Месяц
          </label>
          <select
            {...aria}
            id="expiry-month"
            defaultValue={initial.month}
            onChange={(e) => setMonth(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="expiry-year" className={selectLabelClass}>
            Год
          </label>
          <select
            {...aria}
            id="expiry-year"
            defaultValue={initial.year}
            onChange={(e) => setYear(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p
        id="expiry-msg"
        aria-live="polite"
        className={`mt-1.5 text-xs leading-normal ${invalid ? "font-semibold text-danger-fg" : "text-muted"}`}
      >
        {message ?? "Можно оставить пустым"}
      </p>
    </fieldset>
  );
}
