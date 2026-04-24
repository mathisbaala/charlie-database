'use client';

import { useState } from 'react';
import type {
  BriefRDVResult,
  CompanySearchResult,
  DueDiligenceResult,
  KYCResult,
  SignalHebdo,
  SurveillanceResult,
} from '@/types';
import { CompanyPicker } from './CompanyPicker';
import { PanelHeader } from './PanelHeader';
import { ResultBlock } from './ResultBlock';
import { fetchJsonOrThrow, useApiRequest } from '@/hooks/use-api-request';

export function DueDiligencePanel() {
  const [company, setCompany] = useState<CompanySearchResult | null>(null);
  const [context, setContext] = useState('');
  const { state, execute } = useApiRequest<DueDiligenceResult>();

  const submit = async () => {
    if (!company) return;
    await execute(() =>
      fetchJsonOrThrow<DueDiligenceResult>('/api/due-diligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: company.siren,
          context: context.trim() || undefined,
        }),
      })
    );
  };

  return (
    <section className="panel panel-due-diligence">
      <PanelHeader title="Intelligence Client" />
      <CompanyPicker onChange={setCompany} disabled={state.loading} />
      <div className="field">
        <label>Contexte conseiller (optionnel)</label>
        <textarea
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Objectifs, contexte patrimonial, points d'attention..."
        />
      </div>
      <button className="btn-primary" onClick={submit} disabled={!company || state.loading}>
        Analyser le dossier
      </button>
      <ResultBlock
        title="Synthese Intelligence Client"
        state={state}
        className="result-block-premium"
        eyebrow="Sortie Charlie"
      />
    </section>
  );
}

export function BriefPanel() {
  const [company, setCompany] = useState<CompanySearchResult | null>(null);
  const [context, setContext] = useState('');
  const { state, execute } = useApiRequest<BriefRDVResult>();

  const submit = async () => {
    if (!company) return;
    await execute(() =>
      fetchJsonOrThrow<BriefRDVResult>('/api/brief-rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: company.siren,
          contexte_rdv: context.trim() || undefined,
        }),
      })
    );
  };

  return (
    <section className="panel">
      <PanelHeader title="Brief RDV" />
      <CompanyPicker onChange={setCompany} disabled={state.loading} />
      <div className="field">
        <label>Contexte RDV (optionnel)</label>
        <textarea
          rows={3}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Objectif du rendez-vous, sujets sensibles, dernier echange..."
        />
      </div>
      <button className="btn-primary" onClick={submit} disabled={!company || state.loading}>
        Generer le brief
      </button>
      <ResultBlock title="Resultat Brief RDV" state={state} />
    </section>
  );
}

export function SignauxPanel() {
  const { state, execute } = useApiRequest<{ signaux: SignalHebdo[] }>();

  const submit = async () => {
    await execute(() => fetchJsonOrThrow<{ signaux: SignalHebdo[] }>('/api/signaux'));
  };

  return (
    <section className="panel">
      <PanelHeader title="Radar Portefeuille" />
      <button className="btn-primary" onClick={submit} disabled={state.loading}>
        Scanner les signaux
      </button>
      <ResultBlock title="Resultat Radar Portefeuille" state={state} />
    </section>
  );
}

export function SurveillancePanel() {
  const [company, setCompany] = useState<CompanySearchResult | null>(null);
  const [profil, setProfil] = useState('Equilibre');
  const [part, setPart] = useState('40%');
  const [valeur, setValeur] = useState('2.5 M EUR');
  const [objectifs, setObjectifs] = useState('Transmission, diversification');
  const { state, execute } = useApiRequest<SurveillanceResult>();

  const submit = async () => {
    if (!company) return;
    await execute(() =>
      fetchJsonOrThrow<SurveillanceResult>('/api/surveillance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: company.siren,
          config: {
            profil_risque: profil,
            part_patrimoine: part,
            valeur_participation: valeur,
            objectifs: objectifs
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
          },
        }),
      })
    );
  };

  return (
    <section className="panel">
      <PanelHeader title="Veille Continue" />
      <CompanyPicker onChange={setCompany} disabled={state.loading} />
      <div className="grid-two">
        <div className="field">
          <label>Profil de risque</label>
          <select value={profil} onChange={(e) => setProfil(e.target.value)}>
            <option>Conservateur</option>
            <option>Equilibre</option>
            <option>Dynamique</option>
            <option>Entrepreneur</option>
          </select>
        </div>
        <div className="field">
          <label>Part dans le patrimoine</label>
          <input value={part} onChange={(e) => setPart(e.target.value)} />
        </div>
      </div>
      <div className="grid-two">
        <div className="field">
          <label>Valeur estimee</label>
          <input value={valeur} onChange={(e) => setValeur(e.target.value)} />
        </div>
        <div className="field">
          <label>Objectifs (separes par virgule)</label>
          <input value={objectifs} onChange={(e) => setObjectifs(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary" onClick={submit} disabled={!company || state.loading}>
        Lancer la surveillance
      </button>
      <ResultBlock title="Resultat Veille Continue" state={state} />
    </section>
  );
}

export function KycPanel() {
  const [company, setCompany] = useState<CompanySearchResult | null>(null);
  const [nom, setNom] = useState('');
  const [type, setType] = useState('Dirigeant');
  const { state, execute } = useApiRequest<KYCResult>();

  const submit = async () => {
    if (!company && !nom.trim()) return;
    await execute(() =>
      fetchJsonOrThrow<KYCResult>('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siren: company?.siren ?? '',
          nom: nom.trim() || company?.nom || '',
          type,
        }),
      })
    );
  };

  return (
    <section className="panel">
      <PanelHeader title="Qualification KYC" />
      <CompanyPicker onChange={setCompany} disabled={state.loading} />
      <div className="grid-two">
        <div className="field">
          <label>Nom (optionnel)</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom du dirigeant ou de la personne"
          />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>Dirigeant</option>
            <option>Actionnaire</option>
            <option>Beneficiaire effectif</option>
            <option>Entreprise</option>
          </select>
        </div>
      </div>
      <button className="btn-primary" onClick={submit} disabled={state.loading || (!company && !nom.trim())}>
        Generer le dossier KYC
      </button>
      <ResultBlock title="Resultat KYC" state={state} />
    </section>
  );
}
