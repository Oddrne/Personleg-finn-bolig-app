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

## Test-verktøy for utvikler (nettleser/app)

Når backend kjører kan du åpne et enkelt testverktøy i nettleser:

1. Start backend + worker (kommandoene over)
2. Åpne `http://localhost:3000/dev/test-tool`
3. Kjør knappene i rekkefølge:
   - Opprett testdata
   - Kjør bolig-innhenting
   - Sett standard preferanser
   - Hent listings / swipe som bruker A og B
4. Sjekk matches og varslinger direkte i samme side

Verktøyet gjør det mulig å teste hele flyten uten egen frontend, og er nyttig før du kobler til iOS-klienten i `apps/ios`.

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

## Hvordan teste/kjøre app på iPhone

### Alternativ A: Kjør direkte fra Xcode (lokal installasjon)

1. Åpne Xcode og velg **File → Open...**
2. Åpne mappen `apps/ios` (Swift Package)
3. Opprett et lite iOS App-target i Xcode-prosjektet som bruker `BoligSwipeCore`
4. Koble iPhone til Mac, velg enheten i Xcode
5. Sett Team/Signing (Apple-ID), bygg og kjør
6. Appen blir installert direkte på iPhone for testing

### Alternativ B: Distribusjon via TestFlight

1. Lag app-wrapper rundt `BoligSwipeCore` i et iOS-app-prosjekt
2. Arkiver build i Xcode
3. Last opp til App Store Connect
4. Inviter testere i TestFlight
5. Testere laster ned appen via TestFlight på iPhone

## Hvordan hoste appen (flere alternativer)

### 1) PaaS (enklest): Render / Railway / Fly.io
- Host backend som Node-tjeneste
- Kjør migrasjoner ved deploy
- Bruk persistent disk for SQLite (eller migrer til Postgres for bedre skalerbarhet)
- Worker kan kjøres som separat service/prosess

### 2) Docker + VPS (f.eks. Hetzner/DO/Azure VM)
- Pakk backend + worker i containere
- Kjør med Docker Compose
- Legg SQLite-fil på vedvarende volum
- Sett opp reverse proxy (Nginx/Caddy) + TLS

### 3) AWS/GCP/Azure (mest fleksibelt)
- Kjør API i containerplattform (ECS/Fargate, Cloud Run, Container Apps)
- Kjør worker som egen jobb/service
- Bruk managed database (anbefalt Postgres i produksjon)
- Legg på overvåkning, alarmering og hemmelighetshåndtering

### 4) Serverless API + separat worker
- API som serverless funksjoner (hvis endepunkter brytes opp)
- Worker i queue-basert jobbplattform
- Passer best ved lav/moderat trafikk og når du vil minimere drift

## Videre arbeid mot pilot

- Koble til produksjonsklar ruting for sykkel/kollektiv/gange via eksterne API-er
- Robust salgsoppgaveinnlesing (PDF/OCR) og bedre verdsettelsesmodell
- Samtykkeflyt i app med eksplisitt personverntekst
- Ekte push-varslinger (APNs) og bakgrunnssynk
