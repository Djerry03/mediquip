'use client';

import React from 'react';
import { useApp } from '../context/AppContext';
import Reveal from '../components/Reveal';

export default function AboutPage() {
  const { lang } = useApp();

  const t = {
    fr: {
      aboutTitle: 'Qui sommes-nous',
      aboutSub: 'Mediquipe équipe particuliers, cliniques et pharmacies en matériel médical fiable, livré partout au Cameroun avec paiement à la réception.',
      aboutMissionT: 'Notre mission',
      aboutMissionP: 'Rendre le matériel médical accessible sans avance de frais ni déplacement, avec une confiance totale sur la qualité livrée.',
      aboutTeamT: 'Notre équipe',
      aboutTeamP: 'Une équipe locale, réactive sur WhatsApp, qui connaît les réalités logistiques du terrain camerounais.',
      aboutVisionT: 'Notre vision',
      aboutVisionP: "Devenir la référence de la vente en ligne d'équipement médical en Afrique centrale.",
    },
    en: {
      aboutTitle: 'About us',
      aboutSub: 'Mediquipe supplies individuals, clinics and pharmacies with reliable medical equipment, delivered anywhere in Cameroon with cash on delivery.',
      aboutMissionT: 'Our mission',
      aboutMissionP: "Make medical equipment accessible with no upfront cost and no travel, with full confidence in what's delivered.",
      aboutTeamT: 'Our team',
      aboutTeamP: 'A local, WhatsApp-responsive team that knows the realities of logistics on the ground in Cameroon.',
      aboutVisionT: 'Our vision',
      aboutVisionP: 'Become the reference for online medical equipment sales in Central Africa.',
    },
  }[lang];

  return (
    <>
      <div className="page-header">
        <h1>{t.aboutTitle}</h1>
        <p>{t.aboutSub}</p>
      </div>

      <div className="about-grid">
        {[
          { title: t.aboutMissionT, text: t.aboutMissionP },
          { title: t.aboutTeamT, text: t.aboutTeamP },
          { title: t.aboutVisionT, text: t.aboutVisionP },
        ].map((card, i) => (
          <Reveal key={card.title} delay={i * 80}>
            <div className="about-card">
              <h4>{card.title}</h4>
              <p>{card.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
