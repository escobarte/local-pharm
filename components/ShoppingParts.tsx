"use client";

import { useActionState } from "react";
import { addManualItem, deleteShoppingItem, setBought } from "@/lib/shopping/actions";
import { initialActionState, type ActionState } from "@/lib/storage/action-state";
import { IconClose, IconPlus } from "./icons";
import { SubmitButton } from "./SubmitButton";
import { addButtonClass, errorBoxClass, inputClass, removeIconButtonClass, textButtonClass } from "./ui";

/** "Что купить": adds a manual item. React clears the field after a successful action. */
export function ShoppingAddForm() {
  const [state, action] = useActionState<ActionState, FormData>(addManualItem, initialActionState);
  const error = state.fieldErrors?.title;

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <label htmlFor="shopping-title" className="text-[13px] font-semibold">
        Что купить
      </label>
      <div className="flex gap-2">
        <input
          id="shopping-title"
          name="title"
          type="text"
          maxLength={120}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Например, бинт"
          defaultValue={state.values?.title ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "shopping-title-msg" : undefined}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <SubmitButton className={addButtonClass} pendingText="…">
          <IconPlus size={20} strokeWidth={2.2} className="flex-none" />
          Добавить
        </SubmitButton>
      </div>
      {error ? (
        <p id="shopping-title-msg" role="alert" className="text-xs leading-normal font-semibold text-danger-fg">
          {error}
        </p>
      ) : null}
      {state.message ? (
        <p role="alert" className={errorBoxClass}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** The checkbox of an open item: ticking it marks the item bought (submits right away). */
export function BoughtCheckbox({ itemId, title }: { itemId: string; title: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setBought, initialActionState);

  return (
    <form action={action} className="flex-none">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="bought" value="true" />
      <label className="flex size-11 cursor-pointer items-center justify-center rounded-field hover:bg-tint has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy">
        <input
          type="checkbox"
          checked={pending}
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          aria-label={`Куплено: ${title}`}
          className="size-6 cursor-pointer accent-accent"
        />
      </label>
      {state.message ? (
        <p role="alert" className="sr-only">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** "Вернуть" in the bought block: puts an item back to the list (a mistaken tick). */
export function ReturnButton({ itemId }: { itemId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(setBought, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-1.5">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="bought" value="false" />
      <SubmitButton className={textButtonClass} pendingText="…">
        Вернуть в список
      </SubmitButton>
      {state.message ? (
        <p role="alert" className={errorBoxClass}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Icon-only remove button of an open item. */
export function RemoveItemButton({ itemId, title }: { itemId: string; title: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteShoppingItem, initialActionState);

  return (
    <form action={action} className="flex-none">
      <input type="hidden" name="itemId" value={itemId} />
      <SubmitButton className={removeIconButtonClass} pendingText="…" ariaLabel={`Удалить из списка: ${title}`}>
        <IconClose size={20} />
      </SubmitButton>
      {state.message ? (
        <p role="alert" className="sr-only">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
