/**
 * Value-shape tests shared by every adapter. An adapter decides *classification*
 * from a value's shape plus naming context; the shape half lives here so two
 * adapters can never disagree about what counts as a length literal.
 */

// A raw length, or a 2–4 part shorthand of them. A bare number is deliberately
// excluded: unitless is too ambiguous (z-index, font-weight, opacity, a bezier
// control point) to treat as a design dimension.
// ponytail: fixed unit set, not the full CSS length grammar. Add units when a
// real source uses them (ch, cqw, dvh) rather than guessing now.
const LENGTH = /^-?\d*\.?\d+(px|rem|em|vh|vw)(\s+-?\d*\.?\d+(px|rem|em|vh|vw)){0,3}$/;

export function isLengthLiteral(value: string): boolean {
  return LENGTH.test(value.trim());
}
