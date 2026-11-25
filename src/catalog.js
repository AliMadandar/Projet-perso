import {extensionRows} from './extensions.js';
// Prix de départ HT en euros. Chaque prestation dispose de quatre prix indépendants.
export const tiers = ['Pose seule', 'Essentiel', 'Confort', 'Premium'];
export const units = ['m²', 'ml', 'm³', 'u', 'h', 'forfait'];
const rows = [['Sols', 'Pose de carrelage', 'm²', 40, 65, 85, 115], ['Sols', 'Pose de parquet stratifié', 'm²', 20, 38, 55, 78], ['Sols', 'Pose de parquet contrecollé', 'm²', 35, 75, 105, 145], ['Sols', 'Pose de sol vinyle', 'm²', 30, 44, 59, 82], ['Sols', 'Pose de plinthes', 'ml', 8, 13, 17, 24], ['Préparation', 'Dépose de revêtement', 'm²', 10, 10, 10, 10], ['Préparation', 'Application de primaire', 'm²', 4, 5, 7, 9], ['Préparation', 'Ragréage du support', 'm²', 12, 17, 19, 25], ['Salle de bains', 'Pose de faïence', 'm²', 45, 68, 92, 130], ['Salle de bains', 'Étanchéité sous carrelage', 'm²', 16, 25, 32, 42], ['Salle de bains', 'Pose de receveur', 'u', 250, 440, 660, 950], ['Salle de bains', 'Pose de paroi de douche', 'u', 120, 260, 420, 620], ['Plomberie', 'Pose de mitigeur', 'u', 65, 120, 205, 320], ['Plomberie', 'Pose de meuble vasque', 'u', 120, 340, 560, 900], ['Plomberie', 'Pose de WC', 'u', 150, 270, 440, 690], ['Plomberie', 'Pose de chauffe-eau 50 L', 'u', 200, 380, 490, 630], ['Peinture', 'Peinture des murs', 'm²', 16, 23, 29, 38], ['Peinture', 'Peinture des plafonds', 'm²', 19, 26, 34, 44], ['Peinture', 'Préparation et enduit', 'm²', 10, 14, 18, 25], ['Cuisine', 'Pose de crédence', 'm²', 55, 85, 115, 160], ['Cuisine', 'Montage de meubles de cuisine', 'u', 70, 175, 320, 495], ['Plâtrerie', 'Cloison en plaques de plâtre', 'm²', 32, 52, 65, 82], ['Électricité', 'Pose de prise', 'u', 45, 60, 80, 105], ['Ventilation', 'Pose de VMC', 'forfait', 280, 520, 780, 1100], ['Finitions', 'Application de béton ciré', 'm²', 70, 100, 135, 175], ['Chantier', 'Protection du chantier', 'forfait', 80, 110, 150, 210], ['Chantier', 'Évacuation des gravats', 'forfait', 120, 200, 320, 480], ['Chantier', 'Main-d’œuvre complémentaire', 'h', 45, 45, 45, 45]];
export const catalog = rows.concat(extensionRows).map(([category, label, unit, ...values], i) => ({
  id: 's' + (i + 1),
  category,
  label,
  unit,
  prices: values.map(v => v * 100)
}));
