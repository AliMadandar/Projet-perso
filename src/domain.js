// Les tarifs sont exprimés en centimes HT par m².
export const seed = {
  pose: ['Pose seule', 4000],
  eco: ['Pose + fourniture · Essentiel', 6500],
  standard: ['Pose + fourniture · Confort', 8500],
  premium: ['Pose + fourniture · Premium', 11500],
  removal: ['Dépose', 1000],
  primer: ['Primaire', 500],
  level: ['Ragréage', 1700],
  sealing: ['Étanchéité', 2500]
};
export const fields = {
  area: ['Quelle surface faut-il carreler (m²) ?'],
  room: ['Dans quelle pièce ?', ['Cuisine', 'Salle de bains', 'Douche', 'Séjour', 'Autre']],
  face: ['Sur quelle surface ?', ['Sol', 'Mur']],
  range: ['Qui fournit les carreaux ?', ['pose', 'eco', 'standard', 'premium']],
  removal: ['Faut-il déposer le revêtement existant ?', ['Oui', 'Non']],
  primer: ['Faut-il appliquer un primaire ?', ['Oui', 'Non']],
  level: ['Faut-il prévoir un ragréage ?', ['Oui', 'Non']],
  sealing: ['Faut-il prévoir une étanchéité ?', ['Oui', 'Non']]
};
export const conditions = {
  level: ['face', ['Sol']],
  sealing: ['room', ['Douche', 'Salle de bains']]
};
export function relevant(k, facts) {
  const condition = conditions[k];
  return !condition || condition[1].includes(facts[condition[0]]);
}
export function validate(f) {
  if (!f || typeof f !== 'object' || Array.isArray(f)) throw Error('Chantier invalide.');
  for (const [k, v] of Object.entries(f)) {
    if (!Object.hasOwn(fields, k)) throw Error('Champ inconnu.');
    if (k === 'area') {
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0 || v > 10000 || Math.abs(v * 100 - Math.round(v * 100)) > 0.000001) throw Error('Surface attendue entre 0,01 et 10 000 m², avec deux décimales maximum.');
    } else if (!fields[k][1].includes(v)) throw Error('Réponse invalide.');
  }
  return f;
}
export function quote(f, prices) {
  validate(f);
  for (const k of Object.keys(fields)) {
    if (relevant(k, f) && f[k] == null) throw Error(fields[k][0]);
  }
  const codes = [f.range, ...['removal', 'primer', 'level', 'sealing'].filter(k => relevant(k, f) && f[k] === 'Oui')];
  const lines = codes.map(code => {
    const {
      label,
      cents
    } = prices[code];
    return {
      code,
      label,
      area: f.area,
      cents,
      total: Math.round(Math.round(f.area * 100) * cents / 100)
    };
  });
  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.total, 0)
  };
}
