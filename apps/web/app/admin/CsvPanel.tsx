'use client';

import React, { useRef, useState } from 'react';
import { apiFetch, ApiError, API_URL } from '../lib/api';
import { ImportReport } from './types';

type Props = {
  onImported: () => void;
  notify: (message: string) => void;
};

export default function CsvPanel({ onImported, notify }: Props) {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * L'export est protégé par la session HttpOnly. On récupère le fichier puis
   * on déclenche le téléchargement depuis une URL blob éphémère.
   */
  const download = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/products/admin/export.csv`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `catalogue-mediquipe-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify('Catalogue exporté.');
    } catch {
      setError("L'export a échoué. Réessayez.");
    }
  };

  const readFile = async (file: File) => {
    setError(null);
    setReport(null);
    setApplied(false);
    setFileName(file.name);
    setContent(await file.text());
  };

  const run = async (dryRun: boolean) => {
    if (!content.trim()) return setError('Choisissez d’abord un fichier CSV.');

    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<ImportReport>('/products/admin/import', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ content, dryRun }),
      });
      setReport(result);
      setApplied(!dryRun);

      if (!dryRun) {
        notify(`${result.crees} création(s), ${result.misAJour} mise(s) à jour.`);
        onImported();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import impossible.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setContent('');
    setFileName('');
    setReport(null);
    setApplied(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="csv-panel">
      <div className="csv-block">
        <h3>Exporter</h3>
        <p className="cart-line-meta">
          Télécharge tout le catalogue, produits désactivés compris. Ouvrez-le dans un tableur,
          modifiez-le, puis réimportez-le.
        </p>
        <button className="btn btn-outline" onClick={download}>
          ⬇ Exporter le catalogue (CSV)
        </button>
      </div>

      <div className="csv-block">
        <h3>Importer</h3>
        <p className="cart-line-meta">
          Une ligne par produit. Les identifiants déjà connus sont mis à jour, les autres créés.
          Rien n’est supprimé par un import. Colonnes minimales : <code>id</code>,{' '}
          <code>nom_fr</code>, <code>prix</code>.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
        />

        <div className="csv-actions">
          <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
            📄 Choisir un fichier
          </button>
          {fileName && <span className="cart-line-meta">{fileName}</span>}
        </div>

        {content && !applied && (
          <div className="csv-actions">
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(true)}>
              {busy ? '…' : 'Vérifier sans rien modifier'}
            </button>
            <button className="btn btn-dark" disabled={busy} onClick={() => run(false)}>
              {busy ? '…' : 'Appliquer l’import'}
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {report && (
          <div className={`alert ${report.erreurs.length > 0 ? 'alert-warn' : 'alert-info'}`}>
            <strong>
              {applied ? 'Import appliqué' : 'Simulation'} : {report.crees} création(s),{' '}
              {report.misAJour} mise(s) à jour.
            </strong>
            {report.erreurs.length > 0 && (
              <>
                <p style={{ marginTop: 8 }}>
                  {report.erreurs.length} ligne(s) ignorée(s) — le reste du fichier a bien été
                  traité :
                </p>
                <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                  {report.erreurs.map((e, i) => (
                    <li key={i}>
                      {e.ligne > 0 ? `Ligne ${e.ligne} : ` : ''}
                      {e.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {applied && (
              <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={reset}>
                Importer un autre fichier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
