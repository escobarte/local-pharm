// State shape shared by Server Actions (lib/storage/actions.ts) and forms.
// Lives outside the "use server" file, which may only export async functions.

import type { FieldErrors } from "./validation";

export type ActionState = {
  /** Form-level error (shown above the form). */
  message?: string;
  /** Short success note for in-place actions (announced politely, e.g. "Осталось 3 шт."). */
  notice?: string;
  /** Per-field errors keyed by field name. */
  fieldErrors?: FieldErrors;
  /** Submitted values, so the form can refill itself (React resets forms after an action). */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
