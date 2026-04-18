# MyFamTreeCollab — Project.md
## Bijgewerkt: 2026-04-19

---

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

### Uitbreidingen (actief)
- ☁️ Cloud opslag per gebruiker (meerdere stambomen)
- 👤 Gebruikersaccounts met tiersysteem
- 📜 Versiegeschiedenis per stamboom

### Toekomstige uitbreidingen (Fase 5+)
- 👥 Samenwerken met anderen aan dezelfde stamboom (F5-05)
- 🔗 Delen van stambomen met leesrechten (F5-04)
- 🔍 Genealogisch onderzoek (bronnen, archieven)

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
auth.js           ← vereist Supabase SDK vóór dit script
LiveSearch.js
relatieEngine.js  ← vóór view.js / manage.js / timeline.js
cloudSync.js      ← na auth.js
versionControl.js ← na cloudSync.js (optioneel, non-fatal als afwezig)
topbar.js         ← geïnjecteerd ná TopBar HTML (garandeert #top-auth in DOM)
[pagina].js       ← altijd LAATSTE
```

### Globale exports (window.*) — nooit lokaal herdefiniëren

| Export | Bron | Versie |
|---|---|---|
| `window.ftSafe`, `window.ftFormatDate`, `window.ftParseBirthday` | utils.js | — |
| `window.genereerCode` | idGenerator.js | — |
| `window.StamboomSchema` | schema.js | — |
| `window.StamboomStorage` | storage.js | v2.1.0 |
| `window.AuthModule` | auth.js | v2.3.0 |
| `window.CloudSync` | cloudSync.js | v2.1.0 |
| `window.VersionControl` | versionControl.js | v1.0.0 |
| `window.RelatieEngine.computeRelaties` | relatieEngine.js | — |
| `window.liveSearch`, `window.initLiveSearch` | LiveSearch.js | — |
| `window.ExportModule.exportCSV`, `window.ExportModule.exportJSON` | export.js | — |
| `window.TopBarAuth` | topbar.js | v2.2.1 |

---

## Gewijzigde bestanden sessie 2026-04-19

| Bestand | Versie | Wijziging |
|---|---|---|
| `js/create.js` | v1.2.0 | async/await fix confirmBtn |
| `js/cloudSync.js` | v2.1.0 | F5-06 versie-integratie + bugfix dubbele eq() |
| `js/versionControl.js` | v1.0.0 | Nieuw — versiebeheersmodule |
| `js/topbar.js` | v2.2.1 | Dropdown menu + localStorage fix + token refresh fix |
| `account/history.html` | v1.0.0 | Nieuw — versiegeschiedenis pagina |
| `account/history.js` | v1.1.0 | Fix CloudSync result unwrap + getPersonNaam veldnamen |
| `stamboom/storage.html` | v2.5.0 | Wissel modal + renderTable() fix na laden |
| `bronnen/handleiding.html` | v1.4.0 | Sectie 9 versiegeschiedenis toegevoegd |

---

## Supabase tabellen

### `stambomen`
| kolom | type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| naam | text |
| data | jsonb |
| updated_at | timestamptz |

### `profiles`
| kolom | type |
|---|---|
| id | uuid (PK) |
| username | text |
| avatar_id | integer |
| tier | text |
| is_admin | boolean |
| is_premium | boolean |

### `stamboom_versies`
| kolom | type |
|---|---|
| id | uuid (PK) |
| stamboom_id | uuid (FK → stambomen.id, cascade delete) |
| user_id | uuid (FK → auth.users) |
| versienummer | integer |
| data | jsonb |
| opgeslagen_op | timestamptz |
| label | text (optioneel) |

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
| TD-08 | async/await mismatch — alle call-sites van storage.add() controleren buiten create.js | 🟡 Middel |

---

## Huidige fase & prioriteiten

### Fase 5 — Cloud & accounts

| ID | Taak | Status |
|----|------|--------|
| F5-01 | Backend: Supabase ✅ gekozen en opgezet | ✅ Gedaan |
| F5-02 | Gebruikersaccounts: registreren, inloggen, uitloggen | ✅ Gedaan |
| F5-03 | Data sync tussen apparaten | ✅ Gedaan |
| F5-04 | Stamboom delen met andere gebruikers (leesrechten / viewer tier) | 🔮 Toekomst |
| F5-05 | Samenwerkingsmodus: meerdere gebruikers bewerken samen | 🔮 Toekomst |
| F5-06 | Versiebeheer per persoon (wijzigingshistorie) | ✅ Gedaan |
| F5-07 | Meerdere stambomen per gebruiker in cloud | ✅ Gedaan |
| F5-08 | account.html — overzicht stambomen, backups, profiel | ✅ Gedaan |

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

1. Gebruiker geeft aan wat er gedaan moet worden (of vraagt wat de volgende prioriteit is)
2. Claude checkt backlog en huidige bestandsstatus
3. Code wordt geschreven/aangepast met volledig inline commentaar
4. Einde van sessie: Claude levert
   - Gewijzigde bestanden
   - Sessie-entry voor Project_log.md
   - Bijgewerkte: BACKLOG.md, Handleiding.html en Project.md
   - Sessie-briefing voor volgende taak

---

## Taal & stijl

- Communicatie: **Nederlands**
- Code & commentaar: **Engels**
- Stijl: direct en technisch, geen overbodige uitleg tenzij gevraagd
- Versienummering: gewijzigde bestanden krijgen verhoogd versienummer
