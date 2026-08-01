'use client';

import React from 'react';
import { useApp } from '../context/AppContext';

export default function B2bPage() {
  const { lang, showToast } = useApp();

  const t = {
    fr: {
      b2bTitle: 'Devis pour commandes groupées',
      b2bSub: 'Cliniques, cabinets, pharmacies : décrivez votre besoin, nous revenons vers vous sous 24h avec un devis.',
      b2bOrg: 'Nom de la structure',
      b2bContact: 'Contact',
      b2bNeeds: 'Détail de la demande (produits, quantités)',
      b2bSend: 'Envoyer la demande de devis',
      b2bSent: 'Demande envoyée. Notre équipe vous recontacte sous 24h.',
    },
    en: {
      b2bTitle: 'Quote for bulk orders',
      b2bSub: "Clinics, practices, pharmacies: describe your need, we'll get back to you within 24h with a quote.",
      b2bOrg: 'Organization name',
      b2bContact: 'Contact',
      b2bNeeds: 'Request details (products, quantities)',
      b2bSend: 'Send quote request',
      b2bSent: 'Request sent. Our team will contact you within 24h.',
    },
  }[lang];

  return (
    <>
      <div className="page-header">
        <h1>{t.b2bTitle}</h1>
        <p>{t.b2bSub}</p>
      </div>

      <div className="b2b-box">
        <div className="field" style={{ marginBottom: 12 }}>
          <label>{t.b2bOrg}</label>
          <input type="text" />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>{t.b2bContact}</label>
          <input type="text" placeholder="Téléphone / WhatsApp" />
        </div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>{t.b2bNeeds}</label>
          <textarea rows={4}></textarea>
        </div>
        <button className="btn btn-primary" onClick={() => showToast(t.b2bSent)}>
          {t.b2bSend}
        </button>
      </div>
    </>
  );
}
