import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Quelles données Mediquipe collecte, pourquoi, combien de temps, et comment exercer vos droits.',
};

export default function ConfidentialitePage() {
  return (
    <>
      <div className="page-header">
        <h1>Politique de confidentialité</h1>
      </div>

      <div className="alert alert-warn">
        <strong>Modèle à faire valider avant la mise en ligne.</strong> Les durées de conservation
        et le nom du responsable de traitement doivent être renseignés, et la conformité à la loi
        camerounaise sur la protection des données à caractère personnel vérifiée.
      </div>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>[Dénomination sociale]</strong>, [adresse], Yaoundé, Cameroun. Contact :
        [adresse e-mail dédiée].
      </p>

      <h2>2. Données collectées et finalités</h2>
      <ul>
        <li>
          <strong>Compte client</strong> (nom, e-mail, téléphone, mot de passe chiffré) : créer et
          sécuriser votre espace, retrouver vos commandes.
        </li>
        <li>
          <strong>Commande</strong> (nom, téléphone, quartier, point de repère, contenu du panier) :
          préparer, livrer et facturer votre commande.
        </li>
        <li>
          <strong>Paiement</strong> (numéro Mobile Money, référence de transaction) : encaisser la
          commande et traiter les litiges. Nous ne stockons aucun code secret Mobile Money.
        </li>
        <li>
          <strong>Ordonnances et listes de matériel</strong> : établir un devis et vérifier le droit
          à la délivrance d’un produit réglementé. Ce sont des <strong>données de santé</strong>,
          traitées avec une confidentialité renforcée.
        </li>
      </ul>

      <h2>3. Base légale</h2>
      <p>
        Les données de commande et de paiement sont nécessaires à l’exécution du contrat. Les
        documents de santé ne sont traités qu’avec votre consentement explicite, matérialisé par
        leur envoi volontaire.
      </p>

      <h2>4. Destinataires</h2>
      <p>
        Vos données sont accessibles à notre équipe commerciale et logistique, ainsi qu’à nos
        prestataires techniques (hébergement, envoi d’e-mails, opérateur Mobile Money), dans la
        stricte limite de leur mission. Les documents de santé ne sont consultables que par le
        personnel habilité. Vos données ne sont ni vendues ni louées.
      </p>

      <h2>5. Durées de conservation</h2>
      <ul>
        <li>Compte client : jusqu’à sa suppression, puis [durée] à des fins de preuve.</li>
        <li>Commandes et pièces comptables : [durée] conformément aux obligations légales.</li>
        <li>Ordonnances et listes : [durée], puis suppression définitive du document.</li>
      </ul>

      <h2>6. Sécurité</h2>
      <p>
        Les mots de passe sont stockés hachés (bcrypt) et jamais en clair. Les accès au back-office
        sont authentifiés et restreints par rôle. Les documents médicaux sont conservés hors de
        l’espace public du site et ne sont accessibles qu’après authentification.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Vous pouvez accéder à vos données, les rectifier, en demander l’effacement ou une copie, et
        vous opposer à leur traitement, en écrivant à [adresse e-mail dédiée]. Une réponse vous sera
        apportée sous [délai] jours.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Le site n’utilise pas de cookie publicitaire ni de traceur tiers. Votre panier, votre langue
        et votre session sont conservés localement dans votre navigateur ; les effacer vous
        déconnecte et vide votre panier.
      </p>

      <p className="legal-updated">Dernière mise à jour : [date].</p>
    </>
  );
}
