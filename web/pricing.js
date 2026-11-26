// La gamme reste un index du barème. Pour les postes à prix unique, le
// barème peut conserver les anciennes valeurs utilisées dans les devis.
const fixedCatalogTiers = new Map([
  ...[19, 26, 27, 28, 29, 30, 31, 32, 33, 38, 46, 48, 49, 54, 55, 57, 92, 94, 97, 101, 107, 108, 109, 110]
    .map(id => ['s' + id, 0]),
  ...[6, 7, 8, 10].map(id => ['s' + id, 1])
]);

const singleWork = /^(?:deposes?|demolitions?|demontages?|desinstallations?|evacuations?|enlevements?|tri et manutention|main[ -]d oeuvre|nettoyages?|lessivages?|grattages?|protections? du chantier|deplacements?)\b/u;

export function fixedTier(service) {
  if (!service) return undefined;
  const id = service.serviceId ?? service.id;
  if (fixedCatalogTiers.has(id)) return fixedCatalogTiers.get(id);
  const name = (service.label || '').toLowerCase().normalize('NFKD')
    .replace(/\p{Mark}/gu, '').replace(/[’']/g, ' ').trim();
  // Une prestation composite peut prévoir une fourniture après la dépose.
  if (singleWork.test(name) && !/\b(?:pose|repose|fourniture|installation|remplacement)\b/u.test(name)) return 0;
}

export function hasLineTier(line) {
  return Boolean(line.serviceId) && !line.fixedPrice && fixedTier(line) === undefined;
}
