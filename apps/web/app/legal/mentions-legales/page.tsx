import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: "Éditeur, hébergeur et informations légales du site Mediquipe.",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <div className="page-header">
        <h1>Mentions légales</h1>
      </div>

      <div className="alert alert-warn">
        <strong>À compléter avant la mise en ligne.</strong> Les champs entre crochets doivent être
        renseignés avec les informations réelles de l’entreprise (dénomination, registre du
        commerce, numéro de contribuable, autorisation de distribution de dispositifs médicaux).
        Faites relire cette page par un juriste : la vente de dispositifs médicaux est une activité
        réglementée au Cameroun.
      </div>

      <h2>1. Éditeur du site</h2>
      <p>
        Le site Mediquipe est édité par <strong>[Dénomination sociale]</strong>,
        [forme juridique] au capital de [montant] FCFA, immatriculée au Registre du Commerce et du
        Crédit Mobilier de Yaoundé sous le numéro <strong>[RCCM]</strong>, numéro de contribuable
        <strong> [NIU]</strong>.
      </p>
      <ul>
        <li>Siège social : [adresse complète], Yaoundé, Cameroun</li>
        <li>Téléphone : +237 658 764 216</li>
        <li>E-mail : [adresse e-mail de contact]</li>
        <li>Directeur de la publication : [nom et qualité]</li>
        <li>Pharmacien / responsable technique : [nom, numéro d’inscription à l’Ordre]</li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        Le site est hébergé par <strong>[nom de l’hébergeur]</strong>, [adresse de l’hébergeur],
        [téléphone].
      </p>

      <h2>3. Activité réglementée</h2>
      <p>
        Mediquipe distribue du matériel médical et paramédical. Certains articles sont soumis à
        prescription médicale : leur commande n’est confirmée qu’après vérification de l’ordonnance
        par notre équipe. Aucun conseil délivré sur ce site ne se substitue à l’avis d’un
        professionnel de santé.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus du site (textes, visuels, logos, structure) est protégé par le droit
        de la propriété intellectuelle. Toute reproduction sans autorisation écrite préalable est
        interdite. Les marques des fabricants partenaires demeurent la propriété de leurs
        titulaires respectifs.
      </p>

      <h2>5. Responsabilité</h2>
      <p>
        Les informations produits sont fournies à titre indicatif et peuvent évoluer. En cas d’écart
        entre la fiche produit et l’article livré, contactez-nous : la politique de retour
        s’applique.
      </p>

      <p className="legal-updated">Dernière mise à jour : [date].</p>
    </>
  );
}
