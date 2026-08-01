# Mediquipe

Boutique en ligne de matériel médical pour Yaoundé : livraison à domicile calculée
au quartier, retrait en boutique, paiement à la livraison ou Mobile Money.

- **Frontend** — Next.js 14 (App Router), bilingue FR/EN, `apps/web`
- **API** — NestJS 10 + PostgreSQL 16 (TypeORM), `apps/api`

---

## Démarrage rapide

```bash
# 1. Configuration
cp .env.example .env
# Générez un secret de session et changez le mot de passe admin :
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
sed -i "s|^PAYMENT_WEBHOOK_SECRET=.*|PAYMENT_WEBHOOK_SECRET=$(openssl rand -hex 24)|" .env
$EDITOR .env   # renseignez ADMIN_EMAIL / ADMIN_PASSWORD

# 2. Dépendances
npm install --legacy-peer-deps

# 3. Base, API et frontend d'un seul coup
npm run dev
```

- Frontend : http://localhost:3004
- API : http://localhost:4000/api

Au premier démarrage, la base est amorcée avec le catalogue, les 3 boutiques,
les 4 zones, 38 quartiers, la matrice tarifaire et le compte administrateur
défini par `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Base + API + frontend en parallèle |
| `npm run dev:api` / `npm run dev:web` | Une seule application |
| `npm run build` | Compile les deux applications |
| `npm run test` | Tests unitaires de l'API |
| `npm run typecheck` | Vérifie les types des deux applications |
| `npm --workspace apps/api run migration:run` | Applique les migrations |
| `npm --workspace apps/api run migration:generate src/migrations/<Nom>` | Génère une migration depuis les entités |

---

## Architecture

```
apps/api/src
├── auth/           inscription, connexion JWT, guards et rôles
├── products/       catalogue public + administration, images, stock, CSV
├── marketing/      bannières et bandeaux programmés
├── orders/         création transactionnelle, machine à états, réservation de stock
├── delivery/       zones, quartiers, boutiques, calcul des frais de livraison
├── payments/       statut de paiement, fournisseurs (manual, MTN MoMo), webhooks
├── promotions/     codes promo, validation et consommation
├── reviews/        avis clients à achat vérifié, modération
├── prescriptions/  dépôt d'ordonnances et demandes de devis
├── notifications/  e-mails client et alertes équipe
├── entities/       schéma de la base
└── migrations/     évolutions de schéma versionnées
```

### Décisions structurantes

**L'API est l'unique source de vérité sur les prix.** Le client envoie des
identifiants de produits et des quantités ; jamais un prix. Le `ValidationPipe`
est configuré en `forbidNonWhitelisted` : une requête contenant un champ non
déclaré (`price`, `role`, `status`…) est rejetée, pas silencieusement ignorée.

**La création de commande est atomique.** Numéro de commande, réservation de
stock et consommation du code promo se font dans une seule transaction, avec un
verrou pessimiste sur chaque ligne de stock. Deux commandes simultanées ne
peuvent pas vendre le même dernier article.

**Le statut suit une machine à états.** Les transitions autorisées sont
déclarées dans `orders/order-status.ts`. Sortir d'un état où le stock était
réservé le restitue automatiquement, et libère le code promo.

**Le suivi de commande est confidentiel.** Les numéros sont séquentiels et donc
devinables : un invité doit présenter le jeton de suivi reçu à l'achat, comparé
en temps constant. Le propriétaire connecté et les administrateurs y accèdent
directement.

**Aucune interface ne fabrique de données.** Si l'API est injoignable, le
frontend affiche une erreur — il n'invente ni commande, ni numéro de suivi, ni
catalogue de secours.

---

## Back-office

Accessible aux comptes `admin` via **Mon compte → Accéder au back-office**.
Six onglets, tous branchés sur l'API : rien n'y est simulé.

**Commandes** — filtrage par statut et recherche, avancement du statut selon les
transitions autorisées, vérification d'ordonnance bloquante.

**Catalogue** — création, modification et retrait des produits. Chaque fiche
règle le prix et le prix barré, les étiquettes de vignette, les contraintes
logistiques (fragile, chaîne du froid, retrait obligatoire, ordonnance), les
visuels et le stock par boutique.

- Les **visuels** sont téléversés depuis l'interface. Le format annoncé est
  recoupé avec la signature binaire du fichier, et le premier visuel sert de
  vignette au catalogue.
- Un produit **désactivé** disparaît du site mais reste lisible dans
  l'historique des commandes. La **suppression définitive** n'est possible que
  pour un produit jamais commandé — l'API refuse le reste.
- L'**import/export CSV** permet de travailler le catalogue dans un tableur.
  Un mode « vérifier sans rien modifier » compte les créations et mises à jour
  avant d'écrire, et les lignes fautives sont signalées avec leur numéro sans
  bloquer le reste du fichier.

**Codes promo** — pourcentage, montant fixe ou livraison offerte, avec panier
minimum, plafond de remise, quota global, limite par client et fenêtre de
validité. Un exemple chiffré montre l'effet du code sur un panier type.

**Bannières** — bandeau haut de page, bannière d'accueil, encart catalogue et
encart panier. Chaque bannière a ses textes bilingues, ses couleurs, son bouton,
sa priorité et sa **fenêtre de diffusion** : elle apparaît et disparaît seule aux
dates choisies. Un aperçu montre le rendu avant publication. Sans campagne
active, le bandeau retombe sur les arguments de vente par défaut.

**Avis** — modération avant publication ; la note du produit est recalculée à
partir des seuls avis publiés.

**Ordonnances** — demandes de devis reçues, avec accès au document (authentifié,
servi en pièce jointe).

---

## Configuration

Toutes les variables sont documentées dans [`.env.example`](.env.example).

> ⚠️ Une variable préfixée `NEXT_PUBLIC_` est **inlinée dans le JavaScript
> envoyé au navigateur**. N'y placez jamais de secret. La CI vérifie ce point.

### Paiement

`PAYMENT_PROVIDER=manual` (défaut) : aucun contrat marchand requis. Le paiement
à la livraison fonctionne de bout en bout, et un règlement Mobile Money est
confirmé à la main depuis le back-office.

`PAYMENT_PROVIDER=momo` : branche l'API MTN MoMo Collections. Renseignez les
variables `MOMO_*`. Les webhooks entrants sont rejetés si leur signature HMAC ne
correspond pas à `PAYMENT_WEBHOOK_SECRET`.

Ajouter un opérateur (Orange Money, agrégateur) consiste à implémenter
l'interface `PaymentProvider` (`apps/api/src/payments/payment-provider.ts`) et à
l'enregistrer dans `PaymentsService` — le tunnel de commande n'a pas à changer.

### Notifications

`NOTIFICATION_TRANSPORT=log` (défaut) écrit les messages dans les journaux du
serveur : rien à configurer en développement. Passez à `smtp` avec les variables
`SMTP_*` pour envoyer de vrais e-mails. Un échec d'envoi ne fait jamais échouer
une commande.

---

## Mise en production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

En `NODE_ENV=production`, l'API **refuse de démarrer** si `JWT_SECRET`,
`CORS_ORIGINS` ou `ADMIN_PASSWORD` sont restés à leur valeur d'exemple, ou si le
mot de passe PostgreSQL est encore `postgres`. `synchronize` est désactivé : le
schéma n'évolue que par migration.

### Reste à faire avant l'ouverture au public

- [ ] Remplacer les visuels produits génériques par de vraies photos, depuis
      le back-office (onglet Catalogue → Modifier → Visuels).
- [ ] Compléter les pages légales (`apps/web/app/legal/`) : les mentions entre
      crochets doivent être renseignées et le tout relu par un juriste — la
      vente de dispositifs médicaux est une activité réglementée.
- [ ] Souscrire un contrat marchand Mobile Money et basculer
      `PAYMENT_PROVIDER=momo`.
- [ ] Configurer un vrai SMTP (`NOTIFICATION_TRANSPORT=smtp`) et renseigner
      `OPS_NOTIFICATION_EMAIL` : sans cela, personne n'est prévenu qu'un colis
      est à préparer.
- [ ] Sauvegarder la base ainsi que les volumes `prescriptions` (documents de
      santé) et `uploads/media` (visuels téléversés).
- [ ] Mettre en place la supervision des erreurs et la rotation des journaux.
