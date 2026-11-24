"use client";

import { useActionState } from "react";
import { setLowStock, takeOne } from "@/lib/medications/actions";
import { initialActionState, type ActionState } from "@/lib/storage/action-state";
import { AddToShoppingButton } from "./AddToShoppingButton";
import { IconCheck } from "./icons";
import { SubmitButton } from "./SubmitButton";
import { errorBoxClass, primaryButtonSmClass, secondaryButtonSmClass, warnButtonSmClass } from "./ui";

type Props = {
  packId: string;
  quantity: number;
  lowStock: boolean;
  medicationId: string;
  /** The medication already has an open shopping item. */
  inShoppingList: boolean;
};

/** "Взял 1 шт." and "Заканчивается" for one pack. Both are Server Actions. */
export function PackActions({ packId, quantity, lowStock, medicationId, inShoppingList }: Props) {
  const [takeState, takeAction] = useActionState<ActionState, FormData>(takeOne, initialActionState);
  const [lowState, lowAction] = useActionState<ActionState, FormData>(
    setLowStock,
    initialActionState,
  );
  const error = takeState.message ?? lowState.message;
  const notice = lowState.notice ?? takeState.notice;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,5fr)] gap-2">
        <form action={takeAction}>
          <input type="hidden" name="packId" value={packId} />
          <SubmitButton
            className={`${primaryButtonSmClass} w-full`}
            pendingText="Списываем…"
            disabled={quantity <= 0}
          >
            Взял 1 шт.
          </SubmitButton>
        </form>
        <form action={lowAction}>
          <input type="hidden" name="packId" value={packId} />
          <input type="hidden" name="lowStock" value={lowStock ? "false" : "true"} />
          <SubmitButton
            className={`${lowStock ? warnButtonSmClass : secondaryButtonSmClass} w-full`}
            pressed={lowStock}
            pendingText="Сохраняем…"
          >
            {lowStock ? (
              <>
                <IconCheck size={18} strokeWidth={2.2} className="flex-none" />
                Заканчивается
              </>
            ) : (
              "Заканчивается"
            )}
          </SubmitButton>
        </form>
      </div>
      {/* Marking "running low" never adds to the list by itself; this is the explicit step. */}
      {lowStock ? (
        <AddToShoppingButton medicationId={medicationId} reason="running_low" inList={inShoppingList} />
      ) : null}
      {error ? (
        <p role="alert" className={errorBoxClass}>
          {error}
        </p>
      ) : null}
      <p role="status" className="min-h-4 text-xs text-muted">
        {notice ?? ""}
      </p>
    </div>
  );
}
