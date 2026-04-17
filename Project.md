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
- Exporteren: CSV, JSON (GEDCOM gepland — F3-23)
- Importeren: CSV/TXT (GEDCOM import gepland — F3-23)
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
[pagina].js       ← altijd LAATSTE
```

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

**Belangrijk:** geen unique constraint op user_id — meerdere stambomen per gebruiker toegestaan (F5-07).

**RLS policies:**
- SELECT / INSERT / UPDATE / DELETE — alleen eigen rijen via `auth.uid() = user_id`

---

## Bestandsversies (laatste bekende staat)

| Bestand | Versie | Laatste wijziging |
|---|---|---|
| `js/utils.js` | v1.x | Fase 1 |
| `js/schema.js` | v2.0.0 | Fase 3 |
| `js/idGenerator.js` | v2.0.0 | Fase 1 |
| `js/storage.js` | v2.1.0 | F5-07 — activeTreeId/Name toegevoegd |
| `js/LiveSearch.js` | v2.x | Fase 1 |
| `js/relatieEngine.js` | v2.x | Fase 1 |
| `js/auth.js` | v2.3.0 | Fase A — getTier(), getProfile() |
| `js/cloudSync.js` | v2.0.0 | F5-07 — meerdere stambomen |
| `js/topbar.js` | v2.0.3 | Fase A — admin dropdown |
| `js/export.js` | v2.x | Fase 2 |
| `stamboom/storage.html` | v2.4.0 | F5-07 — stambomenlijst UI |

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
| F5-03 | Data sync tussen apparaten | ✅ Gedaan (Fase A+) |
| F5-04 | Stamboom delen met andere gebruikers (leesrechten / viewer tier) | 🔮 Toekomst |
| F5-05 | Samenwerkingsmodus: meerdere gebruikers bewerken samen | 🔮 Toekomst |
| F5-06 | Versiebeheer per persoon (wijzigingshistorie) | 🔮 Toekomst |
| F5-07 | Meerdere stambomen per gebruiker in cloud | ✅ Gedaan |
| F5-08 | account.html — overzicht stambomen, backups, profiel | 📋 Open |
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

1. Upload dit Project.md als eerste bericht
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
- **Geen `/account/` map** — account pagina komt in `home/account.html` (F5-08)
- **Actieve stamboom** — UUID + naam opgeslagen in localStorage via `StamboomStorage`
