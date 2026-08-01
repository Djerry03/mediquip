import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retours et remboursements',
  description:
    'Conditions de retour, délais et modalités de remboursement du matériel médical acheté chez Mediquipe.',
};

export default function RetoursPage() {
  return (
    <>
      <div className="page-header">
        <h1>Retours et remboursements</h1>
      </div>

      <div className="alert alert-warn">
        <strong>Modèle à adapter à votre pratique réelle avant la mise en ligne.</strong> Les délais
        et exclusions doivent correspondre à ce que votre équipe applique effectivement, et être
        vérifiés au regard de la réglementation sanitaire.
      </div>

      <h2>1. Vérification à la réception</h2>
      <p>
        Vérifiez l’état du colis devant le livreur, ou en boutique au moment du retrait. Toute
        anomalie visible (emballage ouvert, article endommagé, référence différente) doit être
        signalée immédiatement : c’est le moment où le litige se règle le plus simplement.
      </p>

      <h2>2. Délai de retour</h2>
      <p>
        Un article défectueux ou non conforme peut être signalé dans un délai de{' '}
        <strong>48 heures</strong> après la livraison, par WhatsApp ou par téléphone, en indiquant
        votre numéro de commande. Nous organisons alors la reprise de l’article.
      </p>

      <h2>3. Conditions</h2>
      <ul>
        <li>L’article doit être retourné complet, avec ses accessoires et son emballage d’origine.</li>
        <li>Il ne doit pas avoir été utilisé au-delà de ce qu’exige sa vérification.</li>
        <li>Le numéro de commande doit être communiqué.</li>
      </ul>

      <h2>4. Articles non repris</h2>
      <p>Pour des raisons d’hygiène et de sécurité sanitaire, ne peuvent pas être repris :</p>
      <ul>
        <li>les consommables descellés (masques, gants, pansements, seringues) ;</li>
        <li>les produits relevant de la chaîne du froid une fois l’emballage isotherme ouvert ;</li>
        <li>les articles personnalisés ou commandés spécialement pour le Client ;</li>
        <li>les produits délivrés sur ordonnance, sauf défaut avéré.</li>
      </ul>

      <h2>5. Remboursement</h2>
      <p>
        Après réception et contrôle de l’article retourné, le remboursement intervient sous{' '}
        <strong>[délai]</strong> jours ouvrés :
      </p>
      <ul>
        <li>par Mobile Money, sur le numéro ayant servi au paiement ;</li>
        <li>en espèces en boutique, pour une commande réglée à la livraison ;</li>
        <li>ou sous forme d’avoir, si vous le préférez.</li>
      </ul>
      <p>
        Les frais de livraison initiaux sont remboursés lorsque le retour résulte d’une erreur de
        notre part ou d’un défaut du produit.
      </p>

      <h2>6. Garantie fabricant</h2>
      <p>
        Les appareils électroniques (tensiomètres, oxymètres, concentrateurs, lits médicalisés) sont
        couverts par la garantie du fabricant. Sa durée est indiquée sur la fiche produit ou dans la
        documentation livrée. Conservez votre preuve d’achat : elle est nécessaire pour toute prise
        en charge.
      </p>

      <h2>7. Nous contacter</h2>
      <p>WhatsApp : 698 642 205 / 658 476 862 — Téléphone : 658 764 216.</p>

      <p className="legal-updated">Dernière mise à jour : [date].</p>
    </>
  );
}
