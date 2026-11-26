const draft = { access: 'edit', statuses: ['Brouillon'], unsaved: true };
const billing = { access: 'admin', statuses: ['Accepté', 'Archivé'] };
const admin = { access: 'admin' };
const edit = { access: 'edit' };

const quoteActions = {
  quote: { ...draft, description: 'Préparer un nouveau devis ou chiffrer des travaux dans un brouillon.' },
  find: { description: 'Retrouver ou consulter un devis.' },
  rewrite: { ...draft, description: 'Reformuler le texte du devis.' },
  quoteMail: { ...admin, statuses: ['Validé'], description: 'Préparer le courriel d’envoi d’un devis validé.' },
  reminder: { ...admin, statuses: ['Validé', 'Envoyé'], description: 'Préparer une relance pour le devis.' },
  billing: { ...billing, description: 'Consulter la facturation, préparer une facture ou préparer son envoi.' },
  duplicate: { ...edit, description: 'Dupliquer un devis enregistré.' },
  saveQuote: { ...draft, description: 'Enregistrer le brouillon du devis.' },
  editQuote: { ...draft, description: 'Ouvrir le formulaire de saisie du brouillon.' },
  addLine: { ...draft, description: 'Ouvrir l’ajout manuel d’une prestation dans le devis.' },
  quoteDates: { ...draft, description: 'Modifier les dates, l’acompte ou les conditions du devis.' },
  quoteClient: { ...draft, description: 'Choisir ou modifier le client ou l’adresse de ce devis.' },
  quoteStyle: { ...draft, description: 'Personnaliser le style, le modèle, le logo ou les rubriques du devis.' },
  quotePhotos: { ...draft, description: 'Ajouter ou gérer les photos du chantier dans le devis.' },
  guidedQuote: { ...draft, description: 'Ouvrir la saisie guidée de carrelage.' },
  quotePdf: { unsaved: true, description: 'Imprimer le devis ou l’enregistrer en PDF.' },
  quoteHistory: { description: 'Consulter les versions enregistrées du devis.' },
  shareQuote: { ...admin, statuses: ['Validé', 'Envoyé'], description: 'Créer ou renouveler le lien privé du devis.' },
  revokeShare: { ...admin, statuses: ['Validé', 'Envoyé', 'Accepté', 'Refusé'], description: 'Désactiver le lien privé du devis.' },
  validateQuote: { ...admin, statuses: ['Brouillon'], description: 'Valider et figer le devis.' },
  markSent: { ...admin, statuses: ['Validé'], description: 'Marquer le devis comme envoyé manuellement.' },
  acceptQuote: { ...admin, statuses: ['Envoyé'], description: 'Marquer le devis comme accepté.' },
  rejectQuote: { ...admin, statuses: ['Envoyé'], description: 'Marquer le devis comme refusé.' },
  archiveQuote: { ...admin, statuses: ['Brouillon', 'Validé', 'Accepté', 'Refusé'], description: 'Archiver le devis.' },
  signatureProof: { ...admin, statuses: ['Accepté', 'Archivé'], description: 'Télécharger le dossier de preuve de signature.' },
  quoteDiscount: { ...draft, description: 'Modifier la remise du devis.' },
  invoicePayment: { ...billing, description: 'Préparer l’enregistrement d’un règlement partiel ou complet sur une facture.' },
  invoicePdf: { ...billing, description: 'Ouvrir une facture pour l’imprimer ou l’enregistrer en PDF.' }
};

const workspaceActions = {
  workspace: { description: 'Ouvrir une rubrique de Rivqo, selon destination.' },
  exportQuotes: { description: 'Exporter les devis en CSV.' },
  createClient: { ...edit, description: 'Créer une fiche dans le carnet clients.' },
  createService: { ...admin, description: 'Créer une prestation dans le catalogue.' },
  companySettings: { ...admin, description: 'Ouvrir les paramètres de l’entreprise et ses coordonnées.' },
  inviteMember: { ...admin, description: 'Ouvrir le formulaire de création d’un compte d’équipe.' },
  notificationSettings: { description: 'Ouvrir les paramètres de notifications du navigateur.' },
  geminiCheck: { ...admin, description: 'Tester la connexion entre Rivqo et Gemini.' },
  appearance: { description: 'Ouvrir les paramètres d’apparence ou choisir le thème.' },
  markActivityRead: { description: 'Marquer les événements de l’activité comme lus.' }
};

export const niloDestinations = ['Accueil', 'Devis', 'Clients', 'Catalogue', 'Activité', 'Paramètres', 'Administration', 'Terrain فارسی'];
export const niloThemes = ['auto', 'light', 'dark'];

export const niloActions = new Map([
  ...Object.entries(quoteActions).map(([action, definition]) => [action, { scope: 'quote', ...definition }]),
  ...Object.entries(workspaceActions).map(([action, definition]) => [action, { scope: 'workspace', ...definition }]),
  ['findClient', { scope: 'customer', description: 'Retrouver une fiche client dans le carnet.' }],
  ['editClient', { scope: 'customer', ...edit, description: 'Modifier une fiche du carnet clients.' }],
  ['findService', { scope: 'service', description: 'Retrouver une prestation dans le catalogue.' }],
  ['editService', { scope: 'service', ...admin, description: 'Modifier une prestation ou un tarif du catalogue.' }],
  ['editMember', { scope: 'member', ...admin, description: 'Gérer le compte d’un membre de l’équipe.' }]
]);
