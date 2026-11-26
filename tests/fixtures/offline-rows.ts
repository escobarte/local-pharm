// Database rows as /api/snapshot reads them (invented data).

import type { SnapshotRows } from "../../lib/offline/snapshot.ts";

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const IDS = {
  zone: u(1),
  category: u(2),
  boxA: u(3),
  boxB: u(4),
  cellA1: u(5),
  cellA2: u(6),
  cellB1: u(7),
  paracetamol: u(8),
  hedgehog: u(9),
  noPacks: u(10),
  tokenA: u(11),
  tokenB: u(12),
};

export function rows(): SnapshotRows {
  return {
    locations: [{ id: IDS.zone, name: "Быстрый доступ", sort_order: 1 }],
    categories: [{ id: IDS.category, name: "Боль и температура", sort_order: 1 }],
    boxes: [
      { id: IDS.boxA, name: "Аптечка", number: "1", color: "navy", location_id: IDS.zone, qr_token: IDS.tokenA },
      { id: IDS.boxB, name: "Дорожная", number: "2", color: null, location_id: IDS.zone, qr_token: IDS.tokenB },
    ],
    compartments: [
      { id: IDS.cellA2, box_id: IDS.boxA, code: "A2" },
      { id: IDS.cellA1, box_id: IDS.boxA, code: "A1" },
      { id: IDS.cellB1, box_id: IDS.boxB, code: "B1" },
    ],
    medications: [
      {
        id: IDS.paracetamol,
        name: "Парацетамол",
        active_ingredient: "paracetamol",
        form: "таблетки",
        dosage: "500 мг",
        indications: "Жар, головная боль",
        source: "manual",
        barcode: "4006381333931",
        category_id: IDS.category,
      },
      {
        id: IDS.hedgehog,
        name: "Ёжовый настой",
        active_ingredient: null,
        form: "капли",
        dosage: null,
        indications: null,
        source: "manual",
        barcode: null,
        category_id: null,
      },
      {
        id: IDS.noPacks,
        name: "Аспирин",
        active_ingredient: null,
        form: null,
        dosage: null,
        indications: null,
        source: "amdm",
        barcode: null,
        category_id: IDS.category,
      },
    ],
    packs: [
      pack(20, IDS.paracetamol, IDS.cellA1, 5, "2027-05-31"),
      pack(21, IDS.paracetamol, IDS.cellB1, 2, "2026-12-01"),
      { ...pack(22, IDS.hedgehog, IDS.cellA2, 1, null), running_low: true },
    ],
  };
}

function pack(n: number, medication: string, cell: string, quantity: number, expiry: string | null) {
  return {
    id: u(n),
    medication_id: medication,
    compartment_id: cell,
    quantity,
    expiry_date: expiry,
    opened_at: null,
    running_low: false,
  };
}
