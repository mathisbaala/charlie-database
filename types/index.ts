// charlie-live/types/index.ts

// ─── Navigation ───────────────────────────────────────────────────────────
export type UseCase = 'due-diligence' | 'kyc' | 'signaux' | 'surveillance' | 'brief-rdv';

// ─── Pappers API raw types ────────────────────────────────────────────────
export interface PappersSearchResult {
  siren: string;
  nom_entreprise: string;
  forme_juridique?: string;
  siege?: { ville?: string; code_postal?: string; departement?: string; };
  code_naf?: string;
  libelle_code_naf?: string;
  tranche_effectif?: string;
}

export interface PappersDirigeant {
  nom: string;
  prenom?: string;
  qualite: string;
  date_de_naissance?: string;
  nationalite?: string;
}

export interface PappersBeneficiaire {
  nom: string;
  prenom?: string;
  pourcentage_parts: number;
  pourcentage_votes?: number;
  date_greffe?: string;
}

export interface PappersFinance {
  annee: number;
  chiffre_affaires?: number;
  resultat_net?: number;
  capitaux_propres?: number;
  effectif?: number;
}

export interface PappersPublication {
  type_publication?: string;
  date?: string;
  libelle?: string;
  famille_libelle?: string;
}

export interface PappersCompany {
  siren: string;
  siren_formate: string;
  nom_entreprise: string;
  forme_juridique?: string;
  date_creation?: string;
  siege?: {
    siret?: string;
    code_naf?: string;
    libelle_code_naf?: string;
    adresse_ligne_1?: string;
    ville?: string;
    code_postal?: string;
    departement?: string;
  };
  tranche_effectif?: string;
  effectif_min?: number;
  effectif_max?: number;
  finances?: PappersFinance[];
  dirigeants?: PappersDirigeant[];
  beneficiaires?: PappersBeneficiaire[];
  publications_bodacc?: PappersPublication[];
  procedures_collectives?: { type?: string; date_debut?: string; }[];
}

// ─── BODACC types ─────────────────────────────────────────────────────────
export interface BODACCAnnouncement {
  siren?: string;
  commercant?: string;
  ville?: string;
  departement?: string;
  date_parution?: string;
  famille_avis?: string;
  type_annonce?: string;
  tribunal?: string;
  numero_annonce?: string;
}

// ─── Search types ─────────────────────────────────────────────────────────
export interface CompanySearchResult {
  siren: string;
  nom: string;
  forme_juridique?: string;
  ville?: string;
  secteur?: string;
  effectif?: string;
}

// ─── Due Diligence types ──────────────────────────────────────────────────
export type SignalNiveau = 'critique' | 'attention' | 'opportunite';
export type SignalType = 'Cession' | 'Holding' | 'Dividendes' | 'Transmission' | 'Retraite' | 'Création' | 'Restructuration';

export interface Signal {
  type: SignalType;
  niveau: SignalNiveau;
  titre: string;
  description: string;
  source: string;
}

export interface ActionRDV {
  priorite: number;
  action: string;
  timing: string;
  rationnel: string;
}

export interface DueDiligenceResult {
  societe: {
    nom: string;
    siren: string;
    forme: string;
    secteur: string;
    localisation: string;
    creation: string;
    salaries: string;
    ca: string;
    ebitda: string;
    capitaux_propres: string;
    valeur_estimee: string;
    dividendes: string;
    procedure_collective: 'Aucune' | 'En cours' | 'Historique';
  };
  actionnariat: string[];
  filiales: string[];
  kyc: {
    ppe: 'RAS' | 'À vérifier' | 'Alerte';
    sanctions: 'RAS' | 'Alerte';
    nantissements: string;
    immo_pro: string;
    score_lcb: 'Faible' | 'Moyen' | 'Élevé';
  };
  signaux: Signal[];
  analyse: string;
  actions: ActionRDV[];
}

// ─── KYC types ────────────────────────────────────────────────────────────
export interface BeneficiaireEffectif {
  nom: string;
  role: string;
  pct: string;
  date_declaration: string;
  statut: 'Conforme' | 'À vérifier';
}

export interface KYCResult {
  identification: {
    nom: string;
    role: string;
    detention_pct: string;
    naissance_approx: string;
    nationalite: string;
    residence_fiscale: string;
  };
  beneficiaires_effectifs: BeneficiaireEffectif[];
  screening: {
    ppe: 'Non' | 'Oui' | 'À vérifier';
    sanctions_eu: 'RAS' | 'Alerte';
    sanctions_ofac: 'RAS' | 'Alerte';
    pep_level: 'Aucun' | 'Indirect' | 'Direct';
  };
  structure: {
    organigramme_simplifie: string;
    nantissements: string;
    baux_commerciaux: string;
  };
  score_lcb: {
    niveau: 'Faible' | 'Moyen' | 'Élevé';
    score: number;
    facteurs: string[];
    recommandation: string;
  };
  sources: string[];
}

// ─── Signaux Hebdomadaires types ──────────────────────────────────────────
export type SignalTypeHebdo = 'CESSION' | 'HOLDING' | 'DIVIDENDES' | 'TRANSMISSION' | 'PME_55';

export interface SignalHebdo {
  signal_type: SignalTypeHebdo;
  signal_niveau: SignalNiveau;
  societe: string;
  siren: string;
  dirigeant: string;
  secteur: string;
  region: string;
  potentiel_min: string;
  potentiel_max: string;
  description_courte: string;
  source: string;
  date_evenement: string;
}

// ─── Surveillance types ───────────────────────────────────────────────────
export interface AlerteSurveillance {
  niveau: 'critique' | 'attention' | 'info';
  titre: string;
  description_personnalisee: string;
  source: string;
  action_suggeree: string;
}

export interface SurveillanceResult {
  entreprise: {
    nom: string;
    siren: string;
    ca: string;
    ebitda: string;
    capitaux_propres: string;
    sante: 'SAINE' | 'VIGILANCE' | 'ALERTE';
    procedure: 'Aucune' | 'En cours';
  };
  score_vigilance: {
    global: number;
    financier: number;
    entreprise: number;
    commentaire: string;
  };
  alertes: AlerteSurveillance[];
  brief_rdv: string;
}

export interface SurveillanceConfig {
  nom_client?: string;
  profil_risque?: 'Conservateur' | 'Équilibré' | 'Dynamique' | 'Entrepreneur';
  aum?: number;
  part_entreprise?: number;
  part_patrimoine?: string;
  valeur_participation?: string;
  objectifs?: string[];
  siren?: string;
  portefeuille?: {
    actions: number;
    obligataire: number;
    immobilier: number;
    liquidites: number;
  };
}

// ─── Brief RDV types ──────────────────────────────────────────────────────
export interface BriefRDVPoint {
  categorie: 'evenement' | 'opportunite' | 'risque' | 'sujet';
  titre: string;
  detail: string;
  source: string;
  urgence: 'haute' | 'normale' | 'faible';
}

export interface BriefRDVResult {
  entreprise: {
    nom: string;
    siren: string;
    ca: string;
    resultat_net: string;
    effectif: string;
    sante: 'SAINE' | 'VIGILANCE' | 'ALERTE';
  };
  depuis_dernier_rdv: BriefRDVPoint[];
  sujets_a_aborder: string[];
  questions_preparees: string[];
  synthese: string;
}
