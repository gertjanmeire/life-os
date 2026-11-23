# Life OS

Persoonlijke web-app om taken, afspraken, notities en (later) documenten op één plek te beheren.
Werkt op iPhone, iPad, Mac en Windows als installeerbare web-app (PWA).

Design: [Life OS-canvas](https://claude.ai/artifact/PQchnQPUjrTVFsoqPeTQfV)

## Stack

- SvelteKit 3 + Svelte 5, TypeScript
- Cloudflare Workers (adapter-cloudflare), D1 als database
- Later: R2 voor uploads, Google Drive-koppeling, Cloudflare Access met Google-login

## Lokaal starten

```sh
npm install
npx wrangler d1 migrations apply life-os --local   # eenmalig, en na elke nieuwe migratie
npm run dev
```

Lokaal draait alles met een nagebootste D1-database in `.wrangler/`.
Bindings en variabelen (`DB`, `OWNER_NAME`, `TIMEZONE`) lees je in servercode via
`import { env } from 'cloudflare:workers'`. Na een wijziging in `wrangler.jsonc`: `npm run gen`.

Let op: SvelteKit 3 gebruikt `#lib/...` (met bestandsextensie) in plaats van `$lib`.

## Online zetten

### 1. Database en app

```sh
npx wrangler login
npx wrangler d1 create life-os          # kopieer de database_id naar wrangler.jsonc
npm run gen
npx wrangler d1 migrations apply life-os --remote
npm run build
npx wrangler deploy                     # geeft https://life-os.<subdomein>.workers.dev
```

Nieuwe versies gaan automatisch online: Workers Builds bouwt en deployt elke push naar
`main` (build command `npm run build`, deploy command `npx wrangler deploy`).
Handmatig kan nog steeds met `npm run build` en `npx wrangler deploy`.
Migraties gaan niet automatisch mee: voer bij een nieuwe migratie eerst
`npx wrangler d1 migrations apply life-os --remote` uit.

### 2. Google-login voorbereiden (Google Cloud Console → Google Auth Platform)

Kies eerst je Zero Trust-teamnaam (stap 3.1), want die heb je hier nodig.

1. https://console.cloud.google.com → projectkiezer bovenaan → **New project** → naam
   "Life OS" → **Create**, en selecteer het nieuwe project.
2. Menu ☰ → **Google Auth Platform** → **Get started** (eenmalig):
   - App information: app-naam `Life OS`, user support e-mail = je Gmail-adres.
   - Audience: **External**.
   - Contact information: je Gmail-adres.
   - Akkoord gaan met het beleid → **Create**.
3. **Audience** → bij Test users **+ Add users** → je Gmail-adres → **Save**.
   (Publishing status blijft "Testing": enkel test users kunnen aanmelden, en dat is wat je wilt.)
4. **Clients** → **+ Create client**:
   - Application type: **Web application**, naam `Cloudflare Access`.
   - Authorized JavaScript origins: `https://<teamnaam>.cloudflareaccess.com`
   - Authorized redirect URIs: `https://<teamnaam>.cloudflareaccess.com/cdn-cgi/access/callback`
   - **Create**.
5. Kopieer meteen de **Client ID** en het **Client secret**: het secret kan je later niet
   meer bekijken (wel een nieuw aanmaken).

### 3. Cloudflare Zero Trust

1. Dashboard → Zero Trust. De eerste keer: kies een teamnaam (dezelfde als hierboven) en het
   gratis plan.
2. Settings → Authentication → Login methods → Add new → Google. Plak Client ID en secret,
   bewaar en klik "Test".
3. Workers & Pages → life-os → Settings → Domains & Routes → workers.dev → zet
   **Cloudflare Access** aan. Klik daarna "Manage Cloudflare Access":
   - Policy: Action Allow, Include → Emails → jouw Gmail-adres.
   - Login methods: alleen Google, en zet "Instant Auth" aan zodat je meteen naar Google gaat.
4. Test in een privévenster: je moet eerst langs Google voor je de app ziet.

### 4. Installeren op je toestellen

- iPhone/iPad: open de URL in Safari → Deel → Zet op beginscherm.
- Mac/Windows: open in Chrome of Edge → installeer-icoon in de adresbalk.

## Agenda's (Google, Outlook)

Onder **Agenda's** koppel je een agenda via zijn geheime ICS-link (alleen lezen).
Life OS haalt een agenda opnieuw op als hij ouder is dan 15 minuten en je de app opent
(op de achtergrond), of meteen met "Nu vernieuwen". Herhalingen worden uitgerold
van 30 dagen terug tot een jaar vooruit. De parser staat in `src/lib/server/ics.ts`
(met ical.js), het ophalen en bewaren in `src/lib/server/calendars.ts`.

## Structuur

- `migrations/` – databaseschema (gebieden en items)
- `src/lib/server/db.ts` – queries en datumhulp
- `src/routes/+page.*` – het scherm Vandaag
- `src/app.css` – kleuren en lettertypes, licht en donker
- `static/manifest.webmanifest` – installeerbare app
