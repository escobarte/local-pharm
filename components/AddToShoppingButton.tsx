"use client";

import { useActionState } from "react";
import { addToShopping } from "@/lib/shopping/actions";
import { initialActionState, type ActionState } from "@/lib/storage/action-state";
import type { ShoppingReason } from "@/lib/shopping/logic";
import { IconCart, IconCheck } from "./icons";
import { SubmitButton } from "./SubmitButton";
import { errorBoxClass, secondaryButtonSmClass } from "./ui";

type Props = {
  medicationId: string;
  reason: Extract<ShoppingReason, "expired" | "expiring" | "running_low">;
  /** The medication already has an open item (from the server). */
  inList: boolean;
  /** Wrapper classes (width in the parent layout). */
  className?: string;
};

/**
 * "В покупки" (secondary button). After the tap, and whenever the medication is
 * already on the open list, it turns into the quiet "В списке": a second tap is
 * impossible, and the database (one open item per medication) rejects a double
 * tap anyway.
 */
export function AddToShoppingButton({ medicationId, reason, inList, className = "" }: Props) {
  const [state, action] = useActionState<ActionState, FormData>(addToShopping, initialActionState);
  const done = inList || Boolean(state.notice);

  return (
    <div className={className}>
      <p role="status" className="sr-only">
        {state.notice ?? ""}
      </p>
      {done ? (
        <span className="flex min-h-11 items-center justify-center gap-1.5 rounded-field px-2 text-[13px] font-semibold text-muted">
          <IconCheck size={18} strokeWidth={2.2} className="flex-none" />В списке
        </span>
      ) : (
        <form action={action} className="flex flex-col gap-1.5">
          <input type="hidden" name="medicationId" value={medicationId} />
          <input type="hidden" name="reason" value={reason} />
          <SubmitButton className={`${secondaryButtonSmClass} w-full`} pendingText="Добавляем…">
            <IconCart size={18} className="flex-none" />В покупки
          </SubmitButton>
          {state.message ? (
            <p role="alert" className={errorBoxClass}>
              {state.message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
