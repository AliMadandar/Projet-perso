export const euros = cents => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(cents / 100);
export function amounts(lines, discount = 0, deposit = 0) {
  const taxGroups = new Map();
  let gross = 0,
    net = 0;
  for (const l of lines) {
    const raw = Math.round(l.quantity * l.price / 100);
    const base = Math.round(raw * (10000 - discount) / 10000);
    gross += raw;
    net += base;
    taxGroups.set(l.tax, (taxGroups.get(l.tax) || 0) + base);
  }
  const taxes = Array.from(taxGroups, ([rate, base]) => ({
    rate,
    base,
    amount: Math.round(base * rate / 10000)
  })).sort((a, b) => a.rate - b.rate);
  const tax = taxes.reduce((s, t) => s + t.amount, 0),
    total = net + tax;
  return {
    gross,
    discount: gross - net,
    net,
    tax,
    taxes,
    total,
    deposit: Math.round(total * deposit / 10000)
  };
}
