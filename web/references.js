// ADEME, Coûts des travaux de rénovation — ECS. Calcul sur les coûts totaux HT positifs par type.
export const ecsReference=[
  ['Chauffe-eau classique',6,1052.37],
  ['Chauffe-eau thermodynamique individuel',88,2859.50],
  ['Chauffe-eau solaire individuel',284,6444.08],
  ['Système solaire combiné',38,15222.53],
  ['Autre solaire / non communiqué',10,4604.15]
];
export function priceReference(){
  return '<details class="ecs-reference"><summary>Repères ADEME · eau chaude sanitaire</summary><p>Enquête FAIRE 2017–2018. Médiane des coûts totaux HT positifs par type, toutes régions et configurations confondues. Les tarifs du catalogue restent réglables indépendamment.</p><table><thead><tr><th>Équipement</th><th>Observations</th><th>Médiane historique HT</th></tr></thead><tbody>'+ecsReference.map(([k,n,v])=>'<tr><td>'+k+'</td><td>'+n+'</td><td>'+v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})+'</td></tr>').join('')+'</tbody></table><a href="https://www.data.gouv.fr/datasets/couts-des-travaux-de-renovation-ecs" target="_blank" rel="noopener">Source ADEME · Licence Ouverte 2.0</a></details>';
}
