// Rounds a JS number to 2 decimal places for money values computed from
// percentage math (e.g. price * 0.01), avoiding floating-point artifacts
// like 100.01 * 0.01 === 1.0001000000000001 before the value is written to
// a Decimal(_, 2) column or shown to the customer.
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
