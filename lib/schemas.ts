import { z } from 'zod';

const optionalText = z.string().trim().max(2000).optional();

export const sirenSchema = z
  .string()
  .trim()
  .regex(/^[0-9\s]{9,14}$/, 'SIREN invalide');

export const dueDiligenceRequestSchema = z.object({
  siren: sirenSchema,
  context: optionalText,
});

export const kycRequestSchema = z
  .object({
    siren: z.string().trim().optional(),
    nom: z.string().trim().max(120).optional(),
    type: z.string().trim().min(1).max(50),
  })
  .refine((value) => Boolean(value.siren || value.nom), {
    message: 'siren ou nom requis',
    path: ['siren'],
  });

export const surveillanceRequestSchema = z.object({
  siren: sirenSchema,
  config: z
    .object({
      nom_client: optionalText,
      profil_risque: z.enum(['Conservateur', 'Equilibre', 'Équilibré', 'Dynamique', 'Entrepreneur']).optional(),
      aum: z.number().finite().nonnegative().optional(),
      part_entreprise: z.number().finite().nonnegative().optional(),
      part_patrimoine: optionalText,
      valeur_participation: optionalText,
      objectifs: z.array(z.string().trim().max(80)).max(20).optional(),
      siren: z.string().trim().optional(),
      portefeuille: z
        .object({
          actions: z.number().finite().nonnegative(),
          obligataire: z.number().finite().nonnegative(),
          immobilier: z.number().finite().nonnegative(),
          liquidites: z.number().finite().nonnegative(),
        })
        .optional(),
    })
    .optional(),
});

export const briefRdvRequestSchema = z.object({
  siren: sirenSchema,
  contexte_rdv: z.string().trim().max(2000).optional(),
});

const dueDiligenceResponseSchema = z.object({
  societe: z.record(z.string(), z.unknown()).default({}).catch({}),
  actionnariat: z.array(z.string()).default([]).catch([]),
  filiales: z.array(z.string()).default([]).catch([]),
  kyc: z.record(z.string(), z.unknown()).default({}).catch({}),
  signaux: z.array(z.record(z.string(), z.unknown())).default([]).catch([]),
  analyse: z.string().default('').catch(''),
  actions: z.array(z.record(z.string(), z.unknown())).default([]).catch([]),
});

const kycResponseSchema = z.object({
  identification: z.record(z.string(), z.unknown()),
  beneficiaires_effectifs: z.array(z.record(z.string(), z.unknown())),
  screening: z.record(z.string(), z.unknown()),
  structure: z.record(z.string(), z.unknown()),
  score_lcb: z.record(z.string(), z.unknown()),
  sources: z.array(z.string()),
});

const signalSchema = z.object({
  signal_type: z.string(),
  signal_niveau: z.string(),
  societe: z.string(),
  siren: z.string(),
  dirigeant: z.string(),
  secteur: z.string(),
  region: z.string(),
  potentiel_min: z.string(),
  potentiel_max: z.string(),
  description_courte: z.string(),
  source: z.string(),
  date_evenement: z.string(),
});

const surveillanceResponseSchema = z.object({
  entreprise: z.record(z.string(), z.unknown()),
  score_vigilance: z.record(z.string(), z.unknown()),
  alertes: z.array(z.record(z.string(), z.unknown())),
  brief_rdv: z.string(),
});

const briefRdvResponseSchema = z.object({
  entreprise: z.record(z.string(), z.unknown()),
  depuis_dernier_rdv: z.array(z.record(z.string(), z.unknown())),
  sujets_a_aborder: z.array(z.string()),
  questions_preparees: z.array(z.string()),
  synthese: z.string(),
});

export const claudeSchemas = {
  dueDiligence: dueDiligenceResponseSchema,
  kyc: kycResponseSchema,
  signaux: z.array(signalSchema),
  surveillance: surveillanceResponseSchema,
  briefRdv: briefRdvResponseSchema,
};
