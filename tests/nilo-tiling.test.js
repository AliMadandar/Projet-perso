import test from 'node:test';
import assert from 'node:assert/strict';
import { tilingRecipe } from '../src/nilo-tiling.js';

test('le chantier carrelage d’Ali reprend les seules informations indiquées', () => {
  const message = "prepare un devis pour ali, il veut poser 30 m2 dez carrelage dans sa salle de bain, et je dépose l'ancien carrelage et j'applique un primaire";
  assert.deepEqual(tilingRecipe(message), {
    type: 'tiling',
    title: 'Carrelage · Salle de bains',
    clientName: 'Ali',
    facts: { area: 30, room: 'Salle de bains', removal: 'Oui', primer: 'Oui' }
  });
});

test('le carrelage reprend une surface décimale et des exclusions coordonnées', () => {
  const message = 'Carrelage sur le sol de la cuisine sur 12,75 m². Pose seule, sans dépose ni primaire. Pas de ragréage.';
  assert.deepEqual(tilingRecipe(message)?.facts, {
    area: 12.75, room: 'Cuisine', face: 'Sol', range: 'pose', removal: 'Non', primer: 'Non', level: 'Non'
  });
});

test('les négations suivent les travaux concernés', () => {
  const message = 'Pose 8 m2 de faïence murale dans la douche, je ne dépose pas l’ancien carrelage mais j’applique le primaire, étanchéité non comprise.';
  assert.deepEqual(tilingRecipe(message)?.facts, {
    area: 8, room: 'Douche', face: 'Mur', removal: 'Non', primer: 'Oui', sealing: 'Non'
  });
  assert.deepEqual(tilingRecipe('Pose 30 m² de carrelage sans dépose.')?.facts, { area: 30, removal: 'Non' });
  assert.deepEqual(tilingRecipe('Pose 10 m² de carrelage, primaire à ne pas appliquer.')?.facts, { area: 10, primer: 'Non' });
  assert.equal(tilingRecipe('Je ne veux pas poser 12 m² de carrelage.'), undefined);
});

test('les travaux, zones et mesures ambigus restent hors du chiffrage local', () => {
  for (const message of [
    'Pose 20 m² de carrelage dans la cuisine et peinture du plafond.',
    'Pose 20 m² de carrelage et retire un mur.',
    'Pose 20 m² de carrelage dans la cuisine et le séjour.',
    'Pose 20 m² de carrelage dans les deux salles de bains.',
    'Pose 20 m² de carrelage au sol et aux murs.',
    'Pose 20 m² de carrelage puis 7 m² de faïence.',
    'Pose entre 20 et 25 m² de carrelage.',
    'Pose environ 20 m² de carrelage.',
    'Pose du carrelage dans la cuisine, dépose 18 m² de carrelage.',
    'Pose 20 m² de carrelage, mais je dépose seulement une partie.',
    'Pose 20 m² de carrelage, je prévois un ragréage localisé.'
  ]) assert.equal(tilingRecipe(message), undefined, message);
});

test('la gamme, le support et les préparations restent à préciser quand ils sont incertains', () => {
  const uncertain = 'Pose de 28 m² de carrelage, fourniture et pose, primaire éventuel.';
  assert.deepEqual(tilingRecipe(uncertain), { type: 'tiling', title: 'Carrelage', facts: { area: 28 } });
  assert.equal(tilingRecipe('Pose de 28 m² de carrelage gamme Essentiel.')?.facts.range, 'eco');
  assert.equal(tilingRecipe('Pose de 10,123 m² de carrelage.'), undefined);
  assert.equal(tilingRecipe('Pose de 0 m² de carrelage.'), undefined);
});
