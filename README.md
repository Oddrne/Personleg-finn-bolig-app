# Personleg-finn-bolig-app

MVP for boligmatch mellom to brukere med swipe-flyt, matching, analyse og avstandskalkyler.

## Viktige rammer (før produksjon)

- **FINN-vilkår**: Verifiser at datainnhenting er tillatt for valgt metode. Denne MVP-en har en scraper-adapter med fallback-data for utvikling.
- **Personvern**: Begge brukere må samtykke til databehandling (preferanser, swipe-historikk, varslinger).
- **Analyseinnhold**: Resultater fra salgsoppgave/TG er beslutningsstøtte, ikke juridisk/økonomisk rådgivning.

## Struktur

- `/backend` – Fastify API + Prisma (SQLite) + DB-basert jobbkø/worker
- `/apps/ios` – Swift Package med iOS-klientdomene + API-klient + SwiftUI-kortkomponent

## Backend kjøring

```bash
cd /home/runner/work/Personleg-finn-bolig-app/Personleg-finn-bolig-app/backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run prisma:generate
npm run dev
```

Start worker i eget vindu:

```bash
cd /home/runner/work/Personleg-finn-bolig-app/Personleg-finn-bolig-app/backend
npm run worker
```

## API-høydepunkter

- `POST /users`
- `POST /households`
- `PUT /users/:userId/preferences`
- `POST /ingestion/run`
- `GET /listings?userId=...`
- `POST /swipes`
- `POST /matches/:matchId/prospectus`
- `GET /matches/:householdId`
- `POST /favorites`
- `GET /history/:userId`
- `GET /notifications/:userId`
- `GET /metrics`

## Hva som er implementert i MVP

- Datainnhenting for boliger i Time/Klepp/Hå (scraper + fallback)
- Filtrering på pris, område, byggeår, sykkel/kollektivdistanse og fritekst
- To-bruker swipe og match når begge liker
- Etter-match analysejobb av tilstandsgradtekst vs pris med obs-punkter
- Gangavstand til nærmeste dagligvarebutikk (estimat)
- Favoritter, historikk, varslinger, anbefalingsforklaring
- Rate limiting, caching, helse/metrics-endepunkt og sentral feilhåndtering

## Test og kvalitet

```bash
cd /home/runner/work/Personleg-finn-bolig-app/Personleg-finn-bolig-app/backend
npm run lint
npm run test
npm run build
```

```bash
cd /home/runner/work/Personleg-finn-bolig-app/Personleg-finn-bolig-app/apps/ios
swift test
swift build
```

## Videre arbeid mot pilot

- Koble til produksjonsklar ruting for sykkel/kollektiv/gange via eksterne API-er
- Robust salgsoppgaveinnlesing (PDF/OCR) og bedre verdsettelsesmodell
- Samtykkeflyt i app med eksplisitt personverntekst
- Ekte push-varslinger (APNs) og bakgrunnssynk
