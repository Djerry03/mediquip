'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '../context/AppContext';
import { apiFetch, ApiError } from '../lib/api';

type State = 'pending' | 'done' | 'error';

function UnsubscribeContent() {
  const params = useSearchParams();
  const { lang } = useApp();

  const [state, setState] = useState<State>('pending');
  const [message, setMessage] = useState('');

  const t = {
    fr: {
      title: 'Désinscription',
      working: 'Traitement en cours…',
      done: 'C’est fait : vous ne recevrez plus nos actualités.',
      keep:
        'Vous continuerez toutefois à recevoir les e-mails liés à vos commandes (confirmation, suivi de livraison) : ce sont des messages nécessaires au traitement de vos achats, pas de la publicité.',
      resubscribe:
        'Vous pouvez vous réabonner à tout moment depuis votre compte, rubrique « Mes informations ».',
      missing: 'Lien de désinscription incomplet. Utilisez le lien reçu dans l’e-mail.',
      account: 'Mon compte',
      home: 'Retour à la boutique',
    },
    en: {
      title: 'Unsubscribe',
      working: 'Processing…',
      done: 'Done: you will no longer receive our news.',
      keep:
        'You will still receive emails related to your orders (confirmation, delivery tracking): these are needed to process your purchases, not advertising.',
      resubscribe: 'You can resubscribe at any time from your account, under “My details”.',
      missing: 'Incomplete unsubscribe link. Use the link received in the email.',
      account: 'My account',
      home: 'Back to the shop',
    },
  }[lang];

  useEffect(() => {
    const token = params.get('token');

    if (!token) {
      setState('error');
      setMessage(t.missing);
      return;
    }

    apiFetch('/marketing/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => setState('done'))
      .catch((err) => {
        setState('error');
        setMessage(
          err instanceof ApiError ? err.message : 'La désinscription n’a pas pu être enregistrée.',
        );
      });
    // Volontairement exécuté une seule fois : relancer la requête à chaque
    // changement de langue n'aurait pas de sens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="confirm-panel">
      {state === 'done' ? (
        <>
          <span className="confirm-check">✓</span>
          <h1>{t.title}</h1>
          <p>{t.done}</p>
          <p className="cart-note">{t.keep}</p>
          <p className="cart-note">{t.resubscribe}</p>
        </>
      ) : state === 'error' ? (
        <>
          <h1>{t.title}</h1>
          <div className="alert alert-error">{message}</div>
        </>
      ) : (
        <>
          <h1>{t.title}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>{t.working}</p>
        </>
      )}

      <div className="confirm-actions">
        <Link href="/" className="btn btn-dark">
          {t.home}
        </Link>
        <Link href={'/account' as any} className="btn btn-ghost">
          {t.account}
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<p style={{ marginTop: 32 }}>…</p>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
