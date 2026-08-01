import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description:
    'Conditions générales de vente Mediquipe : commande, prix, livraison, retrait, paiement et garanties.',
};

export default function CgvPage() {
  return (
    <>
      <div className="page-header">
        <h1>Conditions générales de vente</h1>
      </div>

      <div className="alert alert-warn">
        <strong>Modèle à faire valider par un juriste avant la mise en ligne.</strong> Ce texte
        décrit le fonctionnement réel de la boutique mais n’a pas valeur d’avis juridique. Complétez
        les mentions entre crochets et vérifiez la conformité au droit camerounais de la
        consommation et à la réglementation des dispositifs médicaux.
      </div>

      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes conditions régissent les ventes conclues sur le site Mediquipe entre
        <strong> [Dénomination sociale]</strong> (« le Vendeur ») et toute personne effectuant une
        commande (« le Client »). Toute commande implique l’acceptation sans réserve des présentes
        conditions.
      </p>

      <h2>Article 2 — Produits</h2>
      <p>
        Les produits proposés sont du matériel médical et paramédical. Les photographies et
        descriptions sont fournies à titre indicatif. Certains articles :
      </p>
      <ul>
        <li>
          <strong>sont soumis à ordonnance</strong> : la commande reste en attente tant que le
          justificatif n’a pas été transmis et validé par notre équipe ;
        </li>
        <li>
          <strong>ne peuvent pas être livrés</strong> et doivent être retirés en boutique, pour des
          raisons de traçabilité ou de contrôle du numéro de série ;
        </li>
        <li>
          <strong>relèvent de la chaîne du froid</strong> et ne sont expédiés que depuis une
          boutique disposant de l’équipement adapté.
        </li>
      </ul>

      <h2>Article 3 — Prix</h2>
      <p>
        Les prix sont indiqués en francs CFA (XAF), toutes taxes comprises, hors frais de livraison.
        Le prix appliqué est celui affiché au moment de la validation de la commande. Les frais de
        livraison sont calculés avant validation en fonction du quartier, du poids du colis et des
        contraintes de manutention (matériel fragile, chaîne du froid, livraison express).
      </p>

      <h2>Article 4 — Commande</h2>
      <p>
        La commande est enregistrée dès validation du formulaire de commande et confirmée par un
        numéro de commande et un lien de suivi. Notre équipe contacte le Client par téléphone avant
        expédition. Le Vendeur se réserve le droit d’annuler une commande en cas d’indisponibilité
        avérée, d’adresse manifestement erronée ou de défaut de justificatif pour un produit soumis
        à ordonnance ; le Client en est informé et remboursé le cas échéant.
      </p>

      <h2>Article 5 — Paiement</h2>
      <p>Deux modes de règlement sont proposés :</p>
      <ul>
        <li>
          <strong>Paiement à la livraison ou au retrait</strong> : le Client règle en espèces au
          livreur ou en boutique, à la remise du colis ;
        </li>
        <li>
          <strong>Mobile Money</strong> : le Client valide la demande de paiement reçue sur son
          téléphone. La commande est confirmée dès réception effective des fonds.
        </li>
      </ul>

      <h2>Article 6 — Livraison et retrait</h2>
      <p>
        Les délais annoncés (2 h à 24 h selon la zone, 24 h à 72 h selon l’article) courent à
        compter de la confirmation de la commande. Ils sont indicatifs et peuvent être allongés en
        cas de transfert entre boutiques, de rupture de stock ou d’événement indépendant de notre
        volonté.
      </p>
      <p>
        En retrait boutique, le Client présente son code de retrait à six caractères. Le colis est
        conservé <strong>[nombre]</strong> jours ouvrés ; passé ce délai, la commande est annulée et
        les articles remis en stock.
      </p>

      <h2>Article 7 — Annulation</h2>
      <p>
        Le Client peut annuler sa commande depuis son compte ou son lien de suivi tant qu’elle n’est
        pas passée en préparation. Au-delà, l’annulation se fait sur demande auprès de notre équipe.
      </p>

      <h2>Article 8 — Retours et garanties</h2>
      <p>
        Les modalités de retour sont détaillées dans la{' '}
        <a href="/legal/retours">politique de retours et remboursements</a>. Les produits bénéficient
        de la garantie légale contre les vices cachés ainsi que, le cas échéant, de la garantie
        commerciale du fabricant.
      </p>

      <h2>Article 9 — Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{' '}
        <a href="/legal/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Article 10 — Litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit camerounais. En cas de litige, une solution
        amiable sera recherchée en priorité. À défaut, compétence est attribuée aux tribunaux de
        Yaoundé.
      </p>

      <p className="legal-updated">Dernière mise à jour : [date].</p>
    </>
  );
}
