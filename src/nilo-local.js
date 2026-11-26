function intent(action, options = {}) {
  return { action, target: '', newQuote: false, kind: '', delivery: false, ...options };
}

export function localNiloIntent(prompt, context, recipe) {
  const text = prompt.normalize('NFKD').replace(/\p{Mark}/gu, '').toLowerCase()
    .replace(/[’']|[-‐‑](?=\p{Letter})/gu, ' ')
    .replace(/\s+/g, ' ').trim();
  const newQuote = /^(?:(?:peux tu|pourrais tu|tu peux) (?:me )?)?(?:prepare[rz]?|cree[rz]?|fais|faire|etablis|etablir) (?:moi )?un (?:nouveau )?devis\b/;
  if (recipe && newQuote.test(text)) return intent('quote', { newQuote: true });
  if (recipe && context.currentQuoteStatus?.startsWith('Brouillon') &&
      /^(?:ajoute|prepare|chiffre)\b/.test(text) && /\b(?:ce|le) (?:devis|brouillon)\b/.test(text)) {
    return intent('quote');
  }

  if (context.currentQuoteStatus) {
    const invoice = /^(prepare[rz]?|cree[rz]?|fais|etablis|envoie|envoye[rz]) (?:une|la) facture (?:d|de) (acompte|situation|solde)(?: (?:pour|sur|de) ce devis)?[.!?]*$/;
    const match = text.match(invoice);
    if (match) {
      const [, verb, kind] = match;
      return intent('billing', { kind: kind[0].toUpperCase() + kind.slice(1), delivery: verb.startsWith('envo') });
    }
    if (/^(?:applique|mets|ajoute) (?:une|la) remise de \d{1,3}(?:[,.]\d{1,2})?\s*%(?: sur ce devis)?[.!?]*$/.test(text)) {
      return intent('quoteDiscount');
    }
  }
  if (/^(?:prepare|enregistre|saisis) un reglement de \d+(?:[,.]\d{1,2})?\s*(?:€|euros?) (?:sur|pour) la facture fac[- ]?\d+[.!?]*$/.test(text)) {
    return intent('invoicePayment');
  }
}
