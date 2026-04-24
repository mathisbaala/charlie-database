# Charlie Database

Application Next.js 16 (App Router) pour produire des analyses patrimoniales (Due Diligence, KYC, Signaux, Surveillance, Brief RDV) à partir de données publiques entreprises (RNE/BODACC/Pappers) et d'une synthèse IA (Anthropic).

## Prérequis

- Node.js 20+
- `ANTHROPIC_API_KEY`
- Optionnel: `PAPPERS_API_KEY` (utilisé pour le flux Signaux)

## Démarrage

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables d'environnement

- `ANTHROPIC_API_KEY`: clé API Anthropic
- `ANTHROPIC_MODEL`: modèle Anthropic (défaut `claude-sonnet-4-6`)
- `PAPPERS_API_KEY`: clé Pappers (optionnelle mais recommandée)
- `API_INTERNAL_TOKEN`: si défini, toutes les routes `/api/*` exigent `x-api-token`
- `API_RATE_LIMIT_PER_MIN`: limite de requêtes par IP/route (défaut `30`)
- `API_RATE_LIMIT_WINDOW_MS`: fenêtre rate limit (défaut `60000`)
- `UPSTREAM_FETCH_TIMEOUT_MS`: timeout appels HTTP externes (défaut `12000`)
- `CLAUDE_TIMEOUT_MS`: timeout appel Anthropic (défaut `35000`)
- `UPSTASH_REDIS_REST_URL`: URL REST Upstash Redis (optionnel)
- `UPSTASH_REDIS_REST_TOKEN`: token REST Upstash Redis (optionnel)
- `OTEL_SERVICE_NAME`: nom de service OpenTelemetry (défaut `charlie-database`)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: endpoint OTLP HTTP (`/v1/traces`) si collector externe
- `OTEL_EXPORTER_OTLP_HEADERS`: en-têtes OTLP (ex: auth)
- `NEXT_OTEL_VERBOSE=1`: active des spans Next.js supplémentaires
- `LOG_LEVEL`: niveau logs (`info`, `warn`, `error`)

## Scripts

- `npm run dev`: serveur de développement (webpack, mode stable)
- `npm run dev:clean`: purge `.next` puis démarre le serveur de développement (webpack)
- `npm run dev:turbo`: serveur de développement Turbopack (expérimental)
- `npm run build`: build production
- `npm run start`: run production
- `npm run lint`: lint
- `npm run typecheck`: vérification TypeScript stricte
- `npm run test`: tests unitaires et API
- `npm run test:e2e`: tests E2E Playwright

## Endpoints Ops

- `GET /api/health`: état applicatif + santé observabilité (Redis/OTel)
- `GET /api/metrics`: snapshot métriques API/upstream (latence, erreurs, statuts)
- Ces endpoints sont protégés par `API_INTERNAL_TOKEN` si configuré.

## Architecture

- `app/api/*/route.ts`: endpoints métier
- `proxy.ts`: injection/propagation `x-request-id` sur les routes API
- `instrumentation.ts`: bootstrap OpenTelemetry Next.js (`@vercel/otel`)
- `lib/datagouv.ts`, `lib/bodacc.ts`, `lib/pappers.ts`: connecteurs data
- `lib/claude.ts`: client Anthropic + parsing JSON robuste
- `lib/schemas.ts`: schémas runtime Zod (requêtes + réponses IA)
- `lib/security.ts`: contrôle d'accès et rate limiting
- `lib/rate-limit.ts`: rate limiting Redis/KV (fallback mémoire)
- `lib/logger.ts`: logs JSON structurés (niveau, event, route, request_id, durée)
- `lib/http.ts`: helpers d'erreurs API et parsing JSON

## Notes de robustesse

- Validation runtime des payloads entrants (Zod)
- Validation runtime des sorties IA avant retour API
- Timeouts explicites sur appels externes et IA
- Rate limiting distribué via Upstash Redis (fallback in-memory)
- Traçabilité des requêtes via `x-request-id` (réponse incluse en succès/erreur)
- Logs structurés JSON pour ingestion SIEM/observabilité
- Traces OpenTelemetry (spans Next.js + spans custom appels upstream/IA)
- Propagation `x-request-id` côté client et serveur pour corrélation complète
- CI GitHub Actions: lint + typecheck + tests + build
