// Lightning payments (README, „Zahlungen“). Amounts carry their unit in the
// type, so sats and msats can't be mixed up: NWC counts in msats, BTCPay and
// the database in sats.
declare const unit: unique symbol;
export type Sats = number & { readonly [unit]: 'sats' };
export type Msats = number & { readonly [unit]: 'msats' };

export function sats(amount: number): Sats {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`Not a positive whole sats amount: ${amount}`);
  return amount as Sats;
}

export const toMsats = (amount: Sats) => (amount * 1000) as Msats;

// What the checkout sells. The price lives only here and on the server, the
// client only names the product. A project replaces the demo with its own,
// the names are productNames in messages.ts.
export const PRODUCTS = {
  demo: { sats: sats(21) },
} as const;

export type Product = keyof typeof PRODUCTS;
export const productIds = Object.keys(PRODUCTS) as [Product, ...Product[]];
