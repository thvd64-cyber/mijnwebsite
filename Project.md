# MyFamTreeCollab — Project.md

## Projectvisie
MyFamTreeCollab is een **commerciële heritage & genealogie webapplicatie** waarbij
de gebruiker altijd volledige controle houdt over zijn eigen data.

### Kernprincipes
- **Privacy first** — data blijft standaard lokaal in de browser (localStorage)
- **Geen betaalde account vereist** voor basisfunctionaliteit
- **Open standaarden** — export naar CSV, JSON én GEDCOM (standaard stamboomformaat)

### Huidige scope (MVP — lokale versie)
- Stamboomdata aanmaken, bewerken en beheren in de browser
- Visualiseren: stamboomweergave, tijdlijn, statistieken
- Exporteren: CSV, JSON (GEDCOM gepland — F3-64)
- Importeren: CSV/TXT (GEDCOM import gepland — F3-64)
- Data support: lokaal & cloud

### Uitbreidingen
- 👥 Samenwerken met anderen aan dezelfde stamboom
- 🔗 Delen van stambomen (met leesrechten)
- 📜 Versiebeheer per persoon

---

## Technische informatie
**Live:** https://thvd64-cyber.github.io/MyFamTreeCollab/index.html
**Broncode:** https://github.com/thvd64-cyber/MyFamTreeCollab
**Stack:** Vanilla HTML + CSS + JavaScript — geen frameworks, geen backend
**Backend:** Supabase (auth + cloud opslag)

### Verplichte laadvolgorde in HTML
```
utils.js          ← altijd EERSTE
schema.js
idGenerator.js    ← alleen op pagina's met formulier (create, manage)
storage.js
LiveSearch.js
relatieEngine.js  ← vóór view.js / manage.js / timeline.js
auth.js           ← vóór topbar.js
cloudSync.js      ← vóór pagina-scripts die cloud gebruiken
versionControl.js ← vóór pagina-scripts die versies gebruiken (F5-06)
[pagina].js       ← altijd LAATSTE
```

### Standaard paginaformaat
Elke pagina gebruikt:
- Favicon-blok met `/MyFamTreeCollab/` prefix
- `style.css` via absoluut pad
- `eruda` debug tool
- TopBar / Navbar / Footer via `fetch('/MyFamTreeCollab/Layout/...')`
- `topbar.js` geïnjecteerd ná TopBar HTML (garandeert `#top-auth` in DOM)
- Alle JS-paden absoluut: `/MyFamTreeCollab/js/...`

### Globale exports (window.*) — nooit lokaal herdefiniëren
| Export | Bron |
|---|---|
| `window.ftSafe`, `window.ftFormatDate`, `window.ftParseBirthday` | utils.js |
| `window.genereerCode` | idGenerator.js |
| `window.StamboomSchema` | schema.js |
| `window.StamboomStorage` | storage.js |
| `window.RelatieEngine.computeRelaties` | relatieEngine.js |
| `window.liveSearch`, `window.initLiveSearch` | LiveSearch.js |
| `window.ExportModule.exportCSV`, `window.ExportModule.exportJSON` | export.js |
| `window.AuthModule` | auth.js |
| `window.CloudSync` | cloudSync.js |
| `window.VersionControl` | versionControl.js *(F5-06 — nog te bouwen)* |

---

## Supabase configuratie

| Onderdeel | Waarde |
|---|---|
| Project URL | `https://xpufzrjncivyzyukwcmn.supabase.co` |
| Anon key | `sb_publishable_4Pg_TkSymTbA-uX29z0Zaw_d1A1c5lE` |
| SMTP | Gmail App Password |
| Redirect URL | `https://thvd64-cyber.github.io/MyFamTreeCollab/home/reset.html` |
| Site URL | `https://thvd64-cyber.github.io/MyFamTreeCollab` |
| Admin account | thvd64@gmail.com (tier=admin, is_admin=true, is_premium=true) |

### Supabase tabel: `profiles`
| kolom | type | default |
|---|---|---|
| id | uuid (PK, FK → auth.users) | — |
| username | text | — |
| avatar_id | integer | 1 |
| created_at | timestamptz | now() |
| is_admin | boolean | false |
| is_premium | boolean | false |
| tier | text | 'free' |
| tier_until | date | null |

**Tier constraint:** `free | viewer | supporter | personal | family | researcher | admin`

**Tier rechten:**
| Tier | Lokaal | Cloud |
|---|---|---|
| free | 100 personen | ❌ |
| viewer | — | ❌ eigen |
| supporter | Onbeperkt | ✅ |
| personal | Onbeperkt | ✅ |
| family | Onbeperkt | ✅ |
| researcher | Onbeperkt | ✅ |
| admin | Onbeperkt | ✅ geen limiet |

### Supabase tabel: `stambomen`
| kolom | type | default |
|---|---|---|
| id | uuid (PK) | gen_random_uuid() |
| user_id | uuid (FK → auth.users) | — |
| naam | text | 'Mijn stamboom' |
| data | jsonb | — |
| updated_at | timestamptz | now() |

**RLS policies:** SELECT / INSERT / UPDATE / DELETE — alleen eigen rijen via `auth.uid() = user_id`

### Supabase tabel: `stamboom_versies` *(F5-06 — nog aan te maken)*
| kolom | type | default |
|---|---|---|
| id | uuid (PK) | gen_random_uuid() |
| stamboom_id | uuid (FK → stambomen, cascade delete) | — |
| user_id | uuid (FK → auth.users) | — |
| versienummer | integer | — |
| data | jsonb | — |
| opgeslagen_op | timestamptz | now() |
| label | text | null |

**Limiet:** max 20 versies per stamboom (oudste automatisch verwijderen).

---

## Mappenstructuur (relevant)

```
/
├── account/
│   ├── index.html       ← v1.0.0 — account overzicht (F5-08)
│   ├── account.js       ← v1.0.0 — profiel, cloud trees, avatar, wachtwoord
│   └── history.html     ← (F5-06 — nog te bouwen)
├── home/
│   ├── reset.html
│   ├── create.html
│   ├── import.html
│   └── export.html
├── stamboom/
│   ├── storage.html     ← v2.4.0
│   ├── manage.html
│   ├── view.html
│   └── timeline.html
├── js/
│   ├── utils.js
│   ├── schema.js
│   ├── idGenerator.js
│   ├── storage.js
│   ├── auth.js          ← v2.3.0
│   ├── cloudSync.js     ← v2.0.0
│   ├── topbar.js        ← v2.0.3
│   ├── export.js
│   ├── relatieEngine.js
│   ├── LiveSearch.js
│   └── versionControl.js ← (F5-06 — nog te bouwen)
└── Layout/
    ├── TopBar.html
    ├── Navbar.html
    └── Footer.html
```

---

## Bestandsversies (laatste bekende staat)

| Bestand | Versie | Laatste wijziging |
|---|---|---|
| `js/utils.js` | v1.x | Fase 1 |
| `js/schema.js` | v2.0.0 | Fase 3 |
| `js/idGenerator.js` | v2.0.0 | Fase 1 |
| `js/storage.js` | v2.1.0 | F5-07 — activeTreeId/Name |
| `js/LiveSearch.js` | v2.x | Fase 1 |
| `js/relatieEngine.js` | v2.x | Fase 1 |
| `js/auth.js` | v2.3.0 | Fase A |
| `js/cloudSync.js` | v2.0.0 | F5-07 — meerdere stambomen |
| `js/topbar.js` | v2.0.3 | Fase A — admin dropdown |
| `js/export.js` | v2.x | Fase 2 |
| `js/versionControl.js` | — | *(F5-06 — nog te bouwen)* |
| `stamboom/storage.html` | v2.4.0 | F5-07 — stambomenlijst UI |
| `account/index.html` | v1.0.0 | F5-08 — account overzicht |
| `account/account.js` | v1.0.0 | F5-08 — profiel, cloud trees |

---

## Technische schuld

| ID | Omschrijving | Ernst |
|----|-------------|-------|
| TD-01 | `js/Sandbox.js` — testbestand staat nog in de repo | 🟢 Laag |
| TD-02 | `js/script.js` — doet alleen console.log, geladen op 9 pagina's | 🟡 Middel |
| TD-03 | `js/LSD.js` — dubbele DOMContentLoaded event listener | 🟢 Laag |
| TD-04 | `Layout/*.html` via fetch() — werkt niet op file:// protocol | 🟡 Middel |
| TD-05 | Popup-stijlen in LiveSearch.js zijn hardcoded inline CSS | 🟢 Laag |
| TD-06 | `home/import-en.html` laadt import.js zonder schema.js en storage.js | 🔴 Hoog |
| TD-07 | SMTP via Gmail App Password — niet ideaal voor productie | 🟡 Middel |
| TD-08 | Cloud tabblad vereist handmatige refresh na inloggen | 🟡 Middel |

---

## Huidige fase & prioriteiten

## Fase 5 — Cloud & accounts 🔄 HUIDIG

| ID | Taak | Status |
|----|------|--------|
| F5-01 | Backend: Supabase gekozen en opgezet | ✅ Gedaan |
| F5-02 | Gebruikersaccounts: registreren, inloggen, uitloggen | ✅ Gedaan |
| F5-03 | Data sync tussen apparaten | ✅ Gedaan |
| F5-04 | Stamboom delen met andere gebruikers (leesrechten / viewer tier) | 🔮 Toekomst |
| F5-05 | Samenwerkingsmodus: meerdere gebruikers bewerken samen | 🔮 Toekomst |
| F5-06 | Versiebeheer per persoon (wijzigingshistorie) | 📋 Open — volgende sessie |
| F5-07 | Meerdere stambomen per gebruiker in cloud | ✅ Gedaan |
| F5-08 | account/ — overzicht stambomen, backups, profiel | ✅ Gedaan |
| F5-09 | Promotiecodes voor cloud toegang | 📋 Open |
| F5-10 | Abonnementen en betaaltiers verder uitwerken | 📋 Open |
| F5-11 | Ko-fi webhook integratie voor donateur-badge | 📋 Open |

---

## Definitie of Done

Een taak is klaar als:
- [ ] Code werkt zoals bedoeld (getest in browser, geen console-errors)
- [ ] Inline commentaar op elke coderegel
- [ ] Bestandsheader bijgewerkt met nieuw versienummer
- [ ] Project.md bijgewerkt
- [ ] PROJECT_LOG.md bijgewerkt met sessie-entry
- [ ] BACKLOG.md bijgewerkt: taak op ✅ Gedaan
- [ ] Handleiding.html bijgewerkt

---

## Werkwijze per sessie

1. Upload Project.md als eerste bericht (of sessie-briefing voor specifieke taak)
2. Geef aan wat er gedaan moet worden
3. Claude checkt backlog en bestandsstatus
4. Code wordt geschreven met volledig inline commentaar
5. Einde sessie: Claude levert gewijzigde bestanden + sessie-entry + bijgewerkte Project.md

---

## Taal & stijl

- Communicatie: **Nederlands**
- Code & commentaar: **Engels**
- Stijl: direct en technisch, geen overbodige uitleg
- Versienummering: gewijzigde bestanden krijgen verhoogd versienummer

---

## Belangrijke architectuurbeslissingen

- **Geen `auth-bootstrap.js`** — auth state loopt via bestaande `AuthModule` in `auth.js`
- **Geen `user_profiles` tabel** — profielen lopen via bestaande `profiles` tabel
- **`account/` map** — account pagina's staan in `account/index.html` en `account/history.html`
- **Actieve stamboom** — UUID + naam opgeslagen in localStorage via `StamboomStorage`
- **Standaard paginaformaat** — TopBar/Navbar/Footer via fetch(), topbar.js na TopBar HTML
- **Absolute paden** — alle asset- en scriptpaden via `/MyFamTreeCollab/...`
