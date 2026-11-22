"use client";

import { useActionState, useRef } from "react";
import type { ActionState, FormAction } from "@/lib/storage/action-state";
import { initialActionState } from "@/lib/storage/action-state";
import { SubmitButton } from "./SubmitButton";
import { dangerButtonClass, errorBoxClass, secondaryButtonClass } from "./ui";

type Props = {
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  description: string;
  confirmLabel: string;
  action: FormAction;
  /** Hidden fields sent with the action (ids). */
  fields: Record<string, string>;
};

/** Native <dialog> confirmation (focus trap and Esc come from the platform). */
export function ConfirmDialog({
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  action,
  fields,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(action, initialActionState);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="confirm-title"
        className="m-auto w-[calc(100%-2.5rem)] max-w-sm rounded-card bg-surface p-5 text-navy backdrop:bg-navy/60"
      >
        <form action={formAction} className="flex flex-col gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id="confirm-title" className="text-xl font-bold">
            {title}
          </h2>
          <p className="text-[15px] leading-normal">{description}</p>
          {state.message ? (
            <p role="alert" className={errorBoxClass}>
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <SubmitButton className={dangerButtonClass} pendingText="Удаляем…">
              {confirmLabel}
            </SubmitButton>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => ref.current?.close()}
            >
              Отмена
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
