import { validate } from './domain.js';

const tiling = /\b(?:carrelages?|carreler|carreaux|faiences?|gres cerame)\b/;
const tileInstallation = /\b(?:pose[rz]?|carreler|carrele[rz]?)\b/;
const noTiling = /\b(?:sans|pas|aucune?)(?: de| d)? (?:pose[rz]?|carreler|carrelage|faience)\b|\b(?:ne|n)(?: \w+){0,4} (?:pose[rz]?|carrele[rz]?) pas\b/;
const otherWork = /\b(?:peindre|repeindre|peintures?|enduits?|plomberie|tuyaux?|robinets?|robinetterie|radiateurs?|chauffage|electricite|electriques?|luminaires?|interrupteurs?|prises?|parquets?|moquettes?|vinyle|portes?|fenetres?|vitrages?|placo|cloisons?|isolations?|ventilation|meubles?|vasques?|baignoires?|receveurs?|joints epoxys?)\b/;
const removalWork = /\b(?:depose[rz]?|enleve[rz]?|retire[rz]?)\b/;
const roomPatterns = [
  ['Salle de bains', /\b(?:salles? de bains?|sdb)\b/g],
  ['Cuisine', /\bcuisines?\b/g],
  ['Douche', /\bdouches?\b/g],
  ['Séjour', /\b(?:sejours?|salons?|salles? a manger)\b/g],
  ['Autre', /\b(?:wc|toilettes?|chambres?|bureaux?|entrees?|couloirs?|buanderies?|terrasses?|garages?|verandas?|caves?)\b/g]
];
const facePatterns = [
  ['Sol', /\b(?:(?:au|aux|du|sur le|sur les|de|carreler le) sols?|carrelage sol)\b/],
  ['Mur', /\b(?:(?:au|aux|du|sur le|sur les|de|carreler les?) murs?|murales?|muraux|carrelage murs?)\b/]
];
const workPatterns = [
  ['removal', removalWork],
  ['primer', /\bprimaires?\b/],
  ['level', /\bragreages?\b/],
  ['sealing', /\betancheites?\b/]
];
const missingDecision = /\b(?:si besoin|si necessaire|le cas echeant|peut etre|eventuel\w*|a voir|a confirmer|a verifier|pas necessairement|ne pas oublier|est ce|faut il)\b/;
const partialWork = /\b(?:une partie|en partie|partiel\w*|portions?|moitie|par endroits|localise\w*|localement|quelques carreaux|un pan|ailleurs)\b/;
const negative = /\b(?:sans|pas|aucun\w*|non|inutile\w*|ni|exclu\w*)\b/;
const positive = /\b(?:avec|oui|applique[rz]?|met[s]?|mettre|prevoi[st]|prevoir|fais|faites|faire|realise[rz]?|ajoute[rz]?|necessaire\w*|compris\w*|inclus\w*|traitement)\b/;
const surfaceUnit = '(?:m\\s*2|metres? carres?)';
const quantity = '(\\d{1,3}(?: \\d{3})+|\\d+)(?:[,.](\\d+))?';
const surface = new RegExp('(?<![\\p{Letter}\\p{Number}.,+−-])' + quantity + '\\s*' + surfaceUnit + '\\b', 'gu');
const quantityRange = new RegExp('\\d(?:[.,]\\d+)?\\s*(?:a|ou|et|[-+−])\\s*' + quantity + '\\s*' + surfaceUnit + '\\b', 'u');
const multipleZones = /\b(?:(?:deux|trois|quatre|plusieurs|les|\d+) (?:pieces|zones|surfaces|salles|cuisines|douches|chambres)|autre (?:piece|zone|surface))\b/;

function normalize(text) {
  return text.toLowerCase().normalize('NFKD').replace(/\p{Mark}/gu, '')
    .replace(/[’']/g, ' ').replace(/[\r\n]+/g, '; ').replace(/\s+/g, ' ').trim();
}

function splitClient(text) {
  const prefix = text.match(/^.{0,60}?\bdevis\s+(?:pour|au nom de)\s+(?:(?:le|la) client[e]?\s+)?([\p{Letter}\p{Mark}]+(?:[ '.’\-]+[\p{Letter}\p{Mark}]+){0,5})\s*[,;:\r\n]\s*/iu);
  if (!prefix || prefix[1].length > 70 || /^(?:un[e]?|le|la|les|du|des)\b/i.test(prefix[1])) {
    return { work: text };
  }
  const name = prefix[1].trim();
  const clientName = /^[a-zà-öø-ÿ]+$/.test(name) ? name[0].toLocaleUpperCase('fr') + name.slice(1) : name;
  return { work: text.slice(prefix[0].length), clientName };
}

function selections(text, patterns) {
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
}

function flagsFrom(clauses) {
  const details = {};
  for (const clause of clauses) {
    if (missingDecision.test(clause) || /\b(?:le client|la cliente|le proprietaire) (?:depose|applique|met|retire|enleve|fait)\b/.test(clause)) continue;
    const options = selections(clause, workPatterns);
    if (options.length > 1 && !/\b(?:sans|pas|ni)\b.*\bni\b/.test(clause)) continue;
    const excluded = negative.test(clause);
    for (const option of options) {
      const removal = option === 'removal' && /(?:^|\b(?:je|on) )\s*(?:depose|enleve|retire)[rz]?\b/.test(clause);
      if (!excluded && !positive.test(clause) && !removal) continue;
      const value = excluded ? 'Non' : 'Oui';
      if (details[option] && details[option] !== value) return;
      details[option] = value;
    }
  }
  return details;
}

function tilingRange(clauses) {
  const choices = new Set();
  for (const clause of clauses) {
    if (missingDecision.test(clause) || negative.test(clause)) continue;
    const clientSupplies = /\b(?:le client|la cliente) fournit (?:le carrelage|les carreaux|la faience)\b|\b(?:carrelage|carreaux|faience) fourni(?:e?s?) par (?:le client|la cliente)\b/;
    if (/\bpose seule\b/.test(clause) || clientSupplies.test(clause)) choices.add('pose');
    const tier = clause.match(/\bgamme (essentiel(?:le)?|confort|premium)\b/)?.[1];
    if (tier) choices.add(tier.startsWith('essentiel') ? 'eco' : tier === 'confort' ? 'standard' : 'premium');
  }
  return choices;
}

export function tilingRecipe(originalText) {
  if (typeof originalText !== 'string' || originalText.length > 1800) return;
  const { work, clientName } = splitClient(originalText.trim());
  const text = normalize(work);
  if (!tiling.test(text) || otherWork.test(text) || multipleZones.test(text) || quantityRange.test(text) ||
      /\b(?:environ|approximativement|a peu pres|plus ou moins|au moins|au maximum)\b/.test(text) ||
      /\b(?:installe[rz]?|remplace[rz]?|pose[rz]?) (?:un[e]?|la|le) (?:douche|wc)\b/.test(text) ||
      /\b(?:depose[rz]?|enleve[rz]?|retire[rz]?) (?:un[e]?|la|le) (?:douche|wc|mur|plafond)\b/.test(text)) return;

  const measures = [...text.matchAll(surface)];
  if (measures.length !== 1) return;
  const [measure, whole, fraction] = measures[0];
  const area = Number(whole.replaceAll(' ', '') + (fraction ? '.' + fraction : ''));
  const clauses = text.split(/[;!?]|[.,](?!\d)|\b(?:et|mais|puis)\b/).map(clause => clause.trim()).filter(Boolean);
  if (clauses.some(clause => partialWork.test(clause) && selections(clause, workPatterns).length)) return;
  const installations = clauses.filter(clause => tileInstallation.test(clause) || tiling.test(clause));
  if (installations.every(clause => noTiling.test(clause) || (removalWork.test(clause) && !tileInstallation.test(clause)))) return;
  const measuredClause = clauses.find(clause => clause.includes(measure));
  const beforeMeasure = measuredClause?.split(measure)[0] || '';
  const measuredPreparation = workPatterns.some(([, pattern]) => pattern.test(beforeMeasure));
  if (measuredPreparation || /\b(?:murs?|murales?|muraux)\b/.test(text) && /\bsols?\b/.test(text)) return;

  const rooms = roomPatterns.flatMap(([name, pattern]) => [...text.matchAll(pattern)].map(() => name));
  const faces = selections(text, facePatterns);
  if (rooms.length > 1 || faces.length > 1) return;
  const [room] = rooms;
  const [face] = selections(installations.join(' '), facePatterns);
  const range = tilingRange(clauses);
  const details = flagsFrom(clauses);
  if (range.size > 1 || !details) return;
  const [tier] = range;
  const facts = {
    area,
    ...(room && { room }),
    ...(face && { face }),
    ...(tier && { range: tier }),
    ...details
  };
  try {
    validate(facts);
  } catch {
    return;
  }
  const title = 'Carrelage' + (room && room !== 'Autre' ? ' · ' + room : '');
  return { type: 'tiling', facts, title, ...(clientName && { clientName }) };
}
