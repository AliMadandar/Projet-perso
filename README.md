# Rivqo — Devis et facturation

Application de chiffrage avec espace terrain, bureau et administration. Les devis et les factures affichent l’identité de l’entreprise qui les émet. Le même projet sert l’interface sur ordinateur, la vue mobile et le portail client.

## Essayer immédiatement

**Ouvrez APERCU.html par double-clic après extraction du ZIP.** Un devis fictif de cuisine est déjà ouvert. Modifiez la surface d’une prestation ou la remise dans « Dates et conditions ». L’aperçu client change immédiatement. Le document d’exemple part de 3 360 € HT, soit 3 696 € TTC avec le taux de démonstration de 10 %. Une remise de 10 % le ramène à 3 326,40 € TTC. Les modifications de la démonstration restent en mémoire jusqu’au rechargement.

## Lancer la vraie application

Prérequis local : **Node.js 24.x**. Aucun paquet npm à télécharger. Depuis le dossier qui contient package.json, lancez la commande suivante.

```sh
node --env-file-if-exists=.env src/server.js
```

Sous Windows, **DEMARRER-WINDOWS.cmd** lance cette commande par double-clic, y compris lorsque PowerShell bloque les scripts npm. Sur Mac, utilisez **DEMARRER-MAC.command** ou le terminal dans le dossier du projet. Ouvrez http://localhost:3000 pour la vitrine publique. **Essayer la démo** ouvre un dossier fictif sans compte. **Se connecter** ouvre votre atelier à l’adresse http://localhost:3000/atelier. Au premier lancement local, le terminal affiche le mot de passe du compte **admin**. Conservez-le. Pour choisir le mot de passe initial, copiez .env.example vers .env avant le premier lancement et renseignez ADMIN_PASSWORD avec au moins 12 caractères. Les comptes existants se gèrent dans **Paramètres → Ouvrir l’administration**. La base persistante est créée dans data/atelier.sqlite.

### Les trois réglages pour MA RENOVATION

1. Dans **Paramètres → Ouvrir l’administration → Entreprise**, complétez l’adresse, les coordonnées, les identifiants professionnels, les mentions et les conditions qui figurent sur vos devis. Ces champs alimentent le document client. Faites valider vos mentions et conditions avant la première émission réelle.
2. Dans **Catalogue**, ouvrez une prestation pour modifier chacun des quatre prix HT. « Pose seule » correspond à la main-d’œuvre. Les trois autres colonnes sont les forfaits fourniture et pose Essentiel, Confort et Premium. Les 110 prestations initiales constituent un barème de départ à adapter aux achats, aux formats et aux conditions du chantier. Les services de préparation ont aussi leurs propres prix. Chaque ligne de devis peut recevoir un libellé et un prix négociés.
3. Dans **Paramètres → Ouvrir l’administration → Équipe**, créez un compte Terrain pour la prise de cotes et un compte Bureau pour préparer les devis. La validation, le partage et l’envoi sont réservés aux administrateurs. Le rôle Lecture consulte les dossiers. Les comptes de cette installation partagent les clients et chantiers d’une même entreprise.

## Paramètres d’affichage et de compte

Ouvrez **Paramètres** dans le menu ou **Plus → Paramètres** sur téléphone. Dans **Apparence**, choisissez **Automatique**, **Clair** ou **Sombre**. Le mode automatique utilise l’heure de l’appareil et affiche le thème clair de 7 h à 20 h. Le navigateur conserve votre choix.

Cette page donne aussi accès aux notifications du navigateur et aux informations de votre compte. Les administrateurs y retrouvent l’accès aux réglages de l’entreprise et de l’équipe ainsi que l’état de Gmail, Gemini et ntfy.

## Personnaliser le document client

Dans l’atelier, ouvrez **Personnaliser le devis**. Le domaine adapte la couleur proposée, les spécifications et les lots suggérés à la saisie des prestations. Vous pouvez choisir le modèle Atelier ou Compact et une des quatre couleurs. Les textes de présentation, fournitures, déchets, délais, frais et règlements sont modifiables. **Appliquer au devis** actualise l’aperçu. Enregistrez ensuite le brouillon. Les PDF et le portail utilisent le même rendu.

L’administrateur peut **Mémoriser pour ce domaine**. Sur un autre chantier, choisir le domaine puis **Reprendre le modèle du domaine** charge ses réglages. Mémorisez uniquement des mentions réutilisables. Le modèle « Tous corps d’état » détermine les valeurs des prochains devis. Les anciens devis gardent leur rendu ; un brouillon existant peut adopter la nouvelle présentation via Personnaliser.

Les nouveaux devis proposent 30 jours de validité et une répartition 40 % à la signature, 50 % en cours de chantier et 10 % à la réception. Pour la variante 50/40/10, modifiez les deux premières échéances. Le solde est calculé sur le TTC au centime. Renseignez le délai convenu, les coordonnées d’assurance et de médiation effectivement applicables, ainsi que le traitement et le coût des déchets selon le chantier. Les données de l’émetteur reprises des modèles fournis sont à vérifier dans Administration. Les prix, la TVA et les modalités initiales sont ajustables.

**Assistant de rédaction** permet de choisir l’objet, une ligne, la présentation ou les conditions. Relisez la proposition, éditez-la et appliquez-la au champ choisi. La reformulation locale utilise des règles de rédaction françaises ; l’option Gemini accepte des tournures plus variées et transmet le texte choisi lors du clic. Quantités et tarifs numériques du devis restent sous le contrôle de l’éditeur.

**Catalogue** présente un encart « Repères ADEME ». Calcul à partir des 428 lignes du CSV ECS : regroupement par type_ecs, sélection des valeurs cout_total_ht présentes et strictement positives, médiane sans pondération. 426 lignes retenues dont 88 CETI et 284 CESI. Les montants observés et les tarifs commerciaux proposés sont affichés séparément. Source : ADEME, Coûts des travaux de rénovation — ECS, enquête FAIRE 2017–2018, Licence Ouverte 2.0. https://www.data.gouv.fr/datasets/couts-des-travaux-de-renovation-ecs

## Préparer un devis sur chantier

1. Choisissez **Nouveau devis**, indiquez l’objet, le client et l’adresse de chantier. Le carnet clients permet de réutiliser des coordonnées. Le devis en conserve une copie.
2. Sélectionnez **Carrelage guidé** pour une pièce. Le questionnaire fonctionne sans clé. Il précise la surface, le sol ou le mur, le fournisseur des carreaux, la dépose et le primaire. La pièce et le support déterminent les questions sur l’étanchéité et le ragréage.
3. Avec Gemini activé, **Dicter un chantier** accepte aussi plusieurs pièces et métiers. Appuyez une fois sur Dicter pour enregistrer, puis sur Terminer. Réécoutez, annulez ou appuyez sur Analyser. Un enregistrement dure au maximum deux minutes. Le microphone exige un contexte sécurisé (HTTPS ou localhost) et l’autorisation du navigateur.
4. L’assistant affiche ses questions et les postes identifiés dans le catalogue. Répondez, vérifiez les quantités, la gamme et la TVA, cochez les postes retenus puis ajoutez-les. Pour une prestation spécifique, sélectionnez **Ajouter une prestation → Ligne libre**.
5. Ajustez les quantités, les prix unitaires et les lots. Dans **Modifier**, « Position dans le devis » réordonne une ligne. Dans **Dates et conditions**, réglez la remise, l’acompte, la validité et les précisions. Le taux de TVA est un paramètre du chiffrage que l’utilisateur choisit pour chaque ligne.
6. **Photos du chantier** permet de joindre jusqu’à quatre photos légendées qui apparaissent dans l’aperçu et le document client. Le navigateur les réduit avant enregistrement.
7. **Enregistrer** écrit le devis sur le serveur et lui attribue un numéro. En cas de rechargement dans le même onglet, l’accueil permet de reprendre la saisie locale si le navigateur autorise son stockage. Une déconnexion volontaire efface ces reprises de saisie. L’onglet doit rester ouvert entre la saisie locale et sa reprise.

### Du bureau au client

- **Valider et figer** conserve le contenu, les coordonnées et les prix du devis. Une révision commerciale repart d’une duplication. Chaque enregistrement et chaque changement de statut sont consultables dans **Historique des versions**.
- **Imprimer / PDF** lance le dialogue du navigateur avec le seul document client en A4. Sélectionnez « Enregistrer au format PDF ». Les lignes sont regroupées par lot dans leur ordre d’affichage.
- **Créer un lien client** produit une adresse privée valable 30 jours. Copiez-la dans votre propre message au client. La création d’un nouveau lien remplace le précédent. Une adresse localhost n’est accessible que depuis la machine de test.
- **Marquer comme envoyé** permet au destinataire d’accepter ou de refuser le devis dans sa période de validité. La confirmation enregistre le nom saisi, l’heure et la décision. Le lien permet ensuite de consulter la réponse. Il s’agit d’une confirmation par le détenteur du lien. Une identification forte ou une signature électronique qualifiée nécessite un prestataire dédié.
- **Mes devis** recherche par client, chantier, adresse ou numéro, filtre par statut et exporte la sélection en CSV. **Activité** suit les dernières opérations et les nouvelles réponses.
- **Archiver** conserve les montants et ferme l’accès public du dossier. Le bouton de désactivation révoque également un lien actif.

## Activer Gemini quand vous serez prête

Copiez .env.example en .env, puis complétez la variable suivante **sur le serveur**. Conservez le modèle prérempli ou indiquez un modèle accessible à votre projet Google acceptant l’audio et les réponses JSON.

```dotenv
GEMINI_API_KEY=votre_cle
GEMINI_MODEL=gemini-3.8-flash
```

Redémarrez le processus Node. Avec Docker, relancez `docker compose up -d app` pour reprendre la configuration. La clé reste côté serveur. L’enregistrement et le texte du chantier sont envoyés à Google lorsque l’utilisateur choisit Analyser. Le dialogue actif reste dans la fenêtre de l’assistant. Fermer cette fenêtre libère l’enregistrement local. Les prix des suggestions proviennent du catalogue de l’entreprise. Une erreur de quota ou de modèle laisse accessibles le questionnaire et l’éditeur manuel.

## Installer sur téléphone et héberger

Le projet fournit une **application web installable (PWA)**. Après déploiement HTTPS, ouvrez l’URL sur le téléphone et utilisez l’option d’ajout à l’écran d’accueil disponible dans le navigateur. La connexion au serveur permet de retrouver les mêmes devis au bureau et sur chantier. Sans réseau, l’application affiche une page de reconnexion. Le catalogue et la base clients sont conservés sur le serveur.

Le déploiement fourni cible **une instance Node avec disque persistant**, derrière Caddy. Un VPS Linux avec Docker Compose et un domaine pointant vers ce serveur convient à cette architecture. Ouvrez les ports web 80 et 443 vers le proxy. Le service Node reste sur le réseau interne de Compose.

1. Installez le projet sur le serveur puis copiez .env.example en .env.
2. Renseignez DOMAIN (nom de domaine seul, sans protocole), ADMIN_PASSWORD et, éventuellement, GEMINI_API_KEY. Laissez le mot de passe hors du dépôt.
3. Lancez le déploiement depuis le dossier du projet.

```sh
docker compose up -d --build
docker compose ps
docker compose logs app proxy
```

Caddy gère le HTTPS du domaine. Compose construit APP_ORIGIN à partir de DOMAIN. Pour un autre hébergeur, définissez NODE_ENV=production, HOST=0.0.0.0, APP_ORIGIN avec l’origine HTTPS exacte, et DB_PATH sur un volume persistant. Les volumes Docker atelier, backups, tls et proxyconfig sont nommés. Une installation locale et un déploiement distant utilisent des bases distinctes.

### Notifications

Le journal intégré fonctionne immédiatement. Les notifications du navigateur s’activent depuis Activité et nécessitent que l’application soit ouverte. La vérification des nouveaux événements a lieu toutes les 20 secondes.

Pour être prévenu téléphone verrouillé, configurez un **sujet privé ntfy** et abonnez le téléphone à ce sujet avec l’application ntfy. Définissez NTFY_URL avec l’URL HTTPS complète du sujet et NTFY_TOKEN avec le jeton autorisé, puis redémarrez le serveur. Les créations et changements de statut sont placés dans une file SQLite. Le serveur transmet l’événement et la référence du devis. Les tentatives reprennent après indisponibilité avec un délai croissant. Un incident juste après l’envoi peut occasionner une notification en double. L’activation s’applique aux événements créés après configuration.

## Données, sauvegarde et reprise

La base contient les clients, tarifs, comptes, sessions, devis, versions, réponses client et événements. La procédure de sauvegarde utilise l’API de copie cohérente de SQLite et vérifie l’intégrité de la copie.

```sh
node --env-file-if-exists=.env scripts/backup.js
# ou dans le déploiement Compose
docker compose exec app node scripts/backup.js
```

Le fichier daté se trouve dans backups/. Copiez les sauvegardes vérifiées vers un espace distinct et conservez la configuration .env séparément. Pour un essai de restauration, copiez la sauvegarde vers **un nouveau dossier vide** et pointez DB_PATH vers cette copie. Démarrez une instance locale isolée sans configuration ntfy, connectez-vous et ouvrez un devis. Pour la bascule réelle, arrêtez les écritures, conservez l’ancien répertoire et utilisez un nouveau répertoire de données restaurées. Cette procédure évite de mélanger une sauvegarde et les journaux WAL de l’ancienne base.

Pour migrer depuis le premier prototype, sauvegardez votre base existante puis démarrez cette version sur une copie de cette base. Les migrations reprennent les anciens devis HT au statut Archivé, importent les tarifs historiques disponibles et initialisent le reste du catalogue. Vérifiez les anciens dossiers et les prix avant la bascule.

## Architecture et maintenance

| Emplacement | Responsabilité |
| --- | --- |
| src/server.js | Entrée HTTP, contrôle des rôles, validation des requêtes et distribution des ressources |
| src/auth.js | Comptes, hachage scrypt, sessions expirantes, limitation des essais et révocation |
| src/store.js et migrations/ | Ouverture SQLite, migrations versionnées, compatibilité avec la première version |
| src/workspace.js | Validation métier, numérotation, mises à jour transactionnelles, versions et transitions |
| src/catalog.js | Prestations et gammes initiales pour une nouvelle installation |
| src/domain.js et src/gemini.js | Questionnaire carrelage, extraction ciblée et proposition multi-métiers |
| src/portal.js et src/notifications.js | Liens privés, réponses clients et file de notifications |
| web/app.js et web/ui.js | Navigation, accueil, carnet clients, catalogue, administration et composants |
| web/editor.js et web/money.js | Éditeur, document imprimable et calculs communs au navigateur et au serveur |
| web/assistant.js, web/brief.js, web/voice.js | Questionnaires, dictée révisable, encodage audio et validation des propositions |
| web/client.js | Consultation et réponse dans le portail client |
| scripts/ | Sauvegarde et reconstruction de la démonstration autonome |
| tests/ | Scénarios métier, HTTP, droits, assistant, notifications et aperçu autonome |

**Règles de calcul.** Prix en centimes, quantités en centièmes d’unité, pourcentages en centièmes de point. Le moteur arrondit les lignes HT au centime, applique la remise à chaque ligne, regroupe les bases par taux puis arrondit la TVA de chaque groupe. L’acompte est calculé sur le TTC. Un changement de prix du catalogue concerne les prochaines sélections de prestations.

**Écritures concurrentes.** Les formulaires transmettent la version lue. Une modification concurrente reçoit un conflit et invite l’utilisateur à recharger. Les transactions groupent le document, sa version et l’événement métier. Les documents sont consultables sur demande en détail. Les listes utilisent les résumés des devis.

**Validation locale.**

```sh
node scripts/build-preview.js
node --test
```

Les tests couvrent les centimes, les remises, la TVA, l’historique, les anciens prix, les transitions de statut, l’acceptation unique, la révocation, les accès HTTP, l’isolation des rôles, la file de notifications et le recalcul de l’aperçu autonome. Les appels externes sont simulés. La sauvegarde a aussi été exécutée avec contrôle d’intégrité.

**Périmètre de mise en service.** Cette édition sert une entreprise et une instance applicative. Une exploitation grand compte avec SSO d’entreprise, MFA, séparation de filiales, réplication multi-instance, haute disponibilité et objectifs de charge contractuels demande des développements et une recette supplémentaires. Les écritures et sauvegardes sont fonctionnelles. Le déploiement Docker/HTTPS, le parcours sur vos téléphones, les autorisations micro, l’impression de vos mentions et les appels réels à Gemini et ntfy sont à valider dans votre environnement avant ouverture à la clientèle.

## Terrain en persan

Le bouton **فارسی** ouvre la saisie de chantier en persan, de droite à gauche. Choisissez la prestation, la gamme, la quantité et la TVA, puis enregistrez le brouillon. Le libellé professionnel du catalogue reste en français sur le devis client. Le bouton Français permet de revenir au bureau. Sur un ancien brouillon, ouvrez la personnalisation pour adopter la nouvelle présentation.

## Envoi du PDF par Gmail et suivi des relances

1. Dans Google Cloud, activez Gmail API pour le projet et configurez l’écran de consentement OAuth. En mode test, ajoutez votre adresse Gmail aux utilisateurs de test.
2. Créez un client OAuth de type application Web. Pour utiliser [OAuth Playground](https://developers.google.com/oauthplayground), ajoutez son URL exacte aux URI de redirection autorisées du client. Dans ses paramètres, sélectionnez « Use your own OAuth credentials », indiquez votre client et choisissez l’accès hors connexion. Autorisez le périmètre `https://www.googleapis.com/auth/gmail.send` avec la boîte qui expédiera les devis. Échangez le code pour obtenir le jeton d’actualisation.
3. Dans votre fichier .env existant, ajoutez GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET et GMAIL_REFRESH_TOKEN, chacun sur sa propre ligne sous la forme NOM=valeur. Redémarrez le serveur. Sur Windows, Chrome ou Edge installé permet de produire la pièce jointe. PDF_BROWSER accepte le chemin complet de l’exécutable si nécessaire.
4. En tant qu’administrateur, renseignez le courriel du client avant validation. Figez le devis, ouvrez l’envoi Gmail, vérifiez son destinataire et son texte, puis confirmez. Le statut passe à Envoyé après la réponse de Gmail. En cas de résultat incertain, vérifiez la boîte des messages envoyés.
5. Choisissez la date et le message du rappel depuis le devis. Le tableau de bord affiche les relances arrivées à échéance. L’envoi de chaque relance nécessite votre confirmation.

Pour la première utilisation, relisez les coordonnées reprises des modèles, renseignez les données réelles d’assurance et de médiation, puis adaptez les mentions au contrat, au client et au chantier. Les calendriers et les tarifs restent modifiables.

## Modifier la feuille, signer et facturer un chantier

Dans un brouillon utilisant la nouvelle présentation, ouvrez **Modifier sur la feuille**. Cliquez sur l’objet, le destinataire, l’adresse de chantier ou le texte d’une rubrique pour écrire directement. Cliquez sur une prestation pour sa quantité, son prix autorisé ou sa position. Sur ordinateur, glissez également une ligne sur une autre. Le logo et les échéances ouvrent les réglages du modèle. **Enregistrer** conserve les modifications. Pour un ancien brouillon, activez d’abord la nouvelle présentation dans **Personnaliser le devis**.

Pour une signature à distance, validez le devis, créez son lien privé, communiquez-le au client puis passez le devis à **Envoyé**. Le client ouvre le lien, écrit son nom, choisit **Signer et accepter le devis** et coche la déclaration de consentement. Le tracé au doigt ou à la souris est facultatif. Une signature apparaît sur le document imprimable. Le dossier JSON exportable depuis le devis contient le nom déclaré, la date serveur, le consentement, le tracé éventuel, la version et son contenu exact. Le SHA-256 se recalcule sur les octets UTF-8 du champ signedSnapshot. L’identité repose sur la possession du lien et le nom déclaré. Le système ne délivre aucun certificat qualifié. Une acceptation saisie par le bureau conserve sa nature d’acceptation manuelle.

Sur un devis accepté, l’administrateur ouvre **Factures et règlements**. Utilisez **Créer une facture** pour l’acompte, une ou plusieurs situations et le solde. L’outil propose le montant de la prochaine échéance, à adapter au chantier. Confirmez les coordonnées de facturation, la date du versement ou de prestation, l’échéance et les mentions pertinentes (identifiants TVA, bon de commande, conditions d’escompte, pénalités, indemnité de recouvrement selon la situation). Les factures émises sont numérotées dans une séquence propre à cette base. Chaque montant TTC est ventilé sur les bases HT et TVA restantes du devis, au centime. La dernière facture reprend le reliquat. Chaque facture porte le numéro de devis et les factures antérieures. **Saisir un règlement** accepte les paiements partiels et **Ouvrir → Imprimer / PDF** produit le document client.

Le suivi correspond à une facturation proportionnelle du devis en euros. Les situations détaillées selon avancement poste par poste, les avoirs et la transmission des factures structurées par plateforme agréée demandent un logiciel ou un raccordement complémentaire. Vérifiez les mentions économiques et fiscales de votre entreprise avec votre comptable avant usage réel. Une instance hébergée en HTTPS est nécessaire pour que les clients externes accèdent aux devis.

## Téléphone et Mac

Sur téléphone, la barre du bas donne accès à Accueil, Devis, Clients et Plus. Balayez horizontalement la page pour passer à l’onglet voisin. Les formulaires de chantier et les dialogues conservent leurs gestes de saisie. Plus regroupe le catalogue, l’activité, la saisie en persan, le compte et les outils autorisés. Dans un devis, Fiche, Feuille et Suivi affichent un seul espace de travail à la fois. Depuis Safari sur iPhone, ouvrez l’adresse HTTPS de l’installation et ajoutez-la à l’écran d’accueil. Les opérations sur les dossiers nécessitent la connexion au serveur.

Après un transfert Windows → Mac, dans le Finder, ⌘ + Maj + point affiche les fichiers cachés. Dans un terminal ouvert dans le dossier contenant package.json, utilisez `ls -la .env*` pour vérifier les noms. Si seul .env.example est présent, récupérez votre .env Windows, ou créez un nouveau fichier avec `cp -n .env.example .env` puis saisissez vos propres clés. Pour lancer le site malgré un droit d’exécution perdu pendant le transfert, utilisez `sh DEMARRER-MAC.command`.
