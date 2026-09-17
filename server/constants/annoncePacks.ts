import { AppError } from "../middleware/error.middleware";

/**
 * The annonce packs, priced.
 *
 * This is the authoritative copy. src/constants.ts holds the same numbers for
 * display, but nothing the browser sends is trusted to price a purchase: the
 * checkout endpoint takes a pack *id* and looks the amount up here. Editing
 * the price in devtools changes the label on the button and nothing else —
 * the charge and the recorded order both come from this table.
 *
 * Keep in step with src/constants.ts ANNONCE_PACKS. If the two ever disagree
 * the customer is charged what this file says, which is the safe direction.
 */
export interface AnnoncePack {
  id: string;
  /** Annonces granted on payment. */
  jobs: number;
  /** Whole dinars. */
  price: number;
}

export const ANNONCE_PACKS: AnnoncePack[] = [
  { id: "pack-1", jobs: 1, price: 5900 },
  { id: "pack-2", jobs: 2, price: 11000 },
  { id: "pack-5", jobs: 5, price: 25000 },
  { id: "pack-10", jobs: 10, price: 45000 },
];

/** Resolves a pack id, or refuses. Never falls back to a default. */
export const requirePack = (packId: unknown): AnnoncePack => {
  if (typeof packId !== "string") {
    throw new AppError("A pack must be chosen.", 400);
  }

  const pack = ANNONCE_PACKS.find((p) => p.id === packId);
  if (!pack) {
    throw new AppError("Unknown pack.", 400);
  }

  return pack;
};
