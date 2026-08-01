'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { lang } = useApp();

  const t = {
    fr: {
      about: "Matériel médical et livres de référence livrés chez vous, paiement à la réception. Cameroun.",
      navTitle: "Navigation",
      shop: "Boutique",
      packs: "Packs Médicaux",
      upload: "Envoyer ma liste",
      tracking: "Suivi de commande",
      b2b: "Devis groupés",
      aboutUs: "Qui sommes-nous",
      legalTitle: "Informations légales",
      cgv: "Conditions générales de vente",
      mentions: "Mentions légales",
      returns: "Retours et remboursements",
      contactTitle: "Contact & Commandes",
      infoTitle: "Pour plus d'informations :",
      whatsapp: "WhatsApp : 698 642 205 / 658 476 862",
      phone: "Téléphone : 658 764 216",
      socialTitle: "Suivez-nous",
      socialHandle: "@Mediquipe_Cameroun (Facebook, Instagram, TikTok)",
      partnersTitle: "Nos partenaires",
      rights: "© 2026 MEDIQUEPE — Tous droits réservés",
      privacy: "Politique de confidentialité",
    },
    en: {
      about: "Medical equipment and reference books delivered to your door, pay on arrival. Cameroon.",
      navTitle: "Navigation",
      shop: "Shop",
      packs: "Medical Packs",
      upload: "Send my list",
      tracking: "Track Order",
      b2b: "Bulk quotes",
      aboutUs: "About us",
      legalTitle: "Legal",
      cgv: "Terms and conditions",
      mentions: "Legal notice",
      returns: "Returns and refunds",
      contactTitle: "Contact & Orders",
      infoTitle: "For more information:",
      whatsapp: "WhatsApp: 698 642 205 / 658 476 862",
      phone: "Phone: 658 764 216",
      socialTitle: "Follow us",
      socialHandle: "@Mediquipe_Cameroun (Facebook, Instagram, TikTok)",
      partnersTitle: "Our partners",
      rights: "© 2026 MEDIQUEPE — All rights reserved",
      privacy: "Privacy policy",
    },
  }[lang];

  return (
    <footer className="site">
      <div className="footer-inner" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        <div>
          <div className="logo" style={{ color: '#fff', marginBottom: 10 }}>
            <span className="cross"></span> MEDIQUEPE
          </div>
          <p>{t.about}</p>
          <div style={{ marginTop: 14 }}>
            <h5 style={{ marginBottom: 6 }}>{t.socialTitle}</h5>
            <p style={{ color: '#B9E0CE', fontSize: '13px', fontWeight: 600 }}>
              📱 {t.socialHandle}
            </p>
          </div>
        </div>

        <div>
          <h5>{t.navTitle}</h5>
          <p><Link href="/catalog">{t.shop}</Link></p>
          <p><Link href="/packs" as={"/packs" as any}>{t.packs}</Link></p>
          <p><Link href="/upload-list" as={"/upload-list" as any}>{t.upload}</Link></p>
          <p><Link href="/tracking" as={"/tracking" as any}>{t.tracking}</Link></p>
          <p><Link href="/b2b">{t.b2b}</Link></p>
          <p><Link href="/about">{t.aboutUs}</Link></p>
        </div>

        <div>
          <h5>{t.legalTitle}</h5>
          <p><Link href={"/legal/cgv" as any}>{t.cgv}</Link></p>
          <p><Link href={"/legal/mentions-legales" as any}>{t.mentions}</Link></p>
          <p><Link href={"/legal/confidentialite" as any}>{t.privacy}</Link></p>
          <p><Link href={"/legal/retours" as any}>{t.returns}</Link></p>
        </div>

        <div>
          <h5>{t.contactTitle}</h5>
          <p style={{ fontWeight: 600, color: '#fff' }}>{t.infoTitle}</p>
          <p>
            <a href="https://wa.me/237698642205" target="_blank" rel="noopener noreferrer" style={{ color: '#68D391', fontWeight: 600 }}>
              💬 {t.whatsapp}
            </a>
          </p>
          <p>
            <a href="tel:+237658764216" style={{ color: '#E2E8F0' }}>
              📞 {t.phone}
            </a>
          </p>
        </div>

        <div>
          <h5>{t.partnersTitle}</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', width: 'fit-content' }}>
              HOLTEX +
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', width: 'fit-content' }}>
              Spengler
            </span>
            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', width: 'fit-content' }}>
              Laboratoires (L)
            </span>
          </div>
        </div>
      </div>

      <div className="foot-bottom">
        <span>{t.rights}</span>
        <span>{t.privacy}</span>
      </div>
    </footer>
  );
}
