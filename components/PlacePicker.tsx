"use client";

import Link from "next/link";
import { useState } from "react";
import { boxLabel } from "@/lib/storage/sort";
import { FormField, fieldAria } from "./FormField";
import { inputClass } from "./ui";

export type PlaceBox = {
  id: string;
  name: string;
  number: string | null;
  compartments: { id: string; code: string }[];
};

/** Box + compartment selection state shared by the forms that choose a place. */
export function usePlaceSelection(
  boxes: PlaceBox[],
  wantedBoxId: string,
  wantedCompartmentId: string,
) {
  const [boxId, setBoxId] = useState(wantedBoxId || boxes[0]?.id || "");
  const box = boxes.find((b) => b.id === boxId) ?? boxes[0];
  const compartments = box?.compartments ?? [];
  const compartmentId = compartments.some((c) => c.id === wantedCompartmentId)
    ? wantedCompartmentId
    : (compartments[0]?.id ?? "");
  return { boxId, setBoxId, box, compartments, compartmentId };
}

type Props = {
  boxes: PlaceBox[];
  selection: ReturnType<typeof usePlaceSelection>;
  error?: string;
};

/**
 * "Коробка" + "Отсек" selects. Renders a fragment (two grid cells plus an
 * optional full-width hint), so put it inside a two-column grid.
 */
export function PlacePicker({ boxes, selection, error }: Props) {
  const { boxId, setBoxId, box, compartments, compartmentId } = selection;
  return (
    <>
      <FormField label="Коробка" htmlFor="boxId">
        <select
          id="boxId"
          name="boxId"
          defaultValue={boxId}
          onChange={(e) => setBoxId(e.target.value)}
          className={inputClass}
        >
          {boxes.map((b) => (
            <option key={b.id} value={b.id}>
              {boxLabel(b)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Отсек" htmlFor="compartmentId" error={error}>
        <select
          {...fieldAria("compartmentId", error)}
          key={boxId}
          name="compartmentId"
          defaultValue={compartmentId}
          disabled={compartments.length === 0}
          className={inputClass}
        >
          {compartments.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
      </FormField>
      {compartments.length === 0 && box ? (
        <p className="col-span-2 text-[13px] leading-normal text-muted">
          В этой коробке нет отсеков.{" "}
          <Link href={`/storage/${box.id}`} className="font-semibold text-navy underline">
            Добавить отсек
          </Link>
        </p>
      ) : null}
    </>
  );
}
