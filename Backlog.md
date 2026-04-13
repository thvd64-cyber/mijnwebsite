# MyFamTreeCollab — Backlog

> Alle taken georganiseerd per fase en prioriteit.
> Status: 📋 Open · 🔄 In uitvoering · ✅ Gedaan · ❌ Geannuleerd · 🔮 Toekomst

---

## Fase 0 — Audit & opschoning ✅ AFGEROND

| ID | Taak | Status |
|----|------|--------|
| F0-01 | ZIP analyseren en alle bestanden inventariseren | ✅ Gedaan |
| F0-02 | `js/DeleteRow.js` verwijderen (leeg bestand) | ✅ Gedaan |
| F0-03 | `js/schemaGlobal.js` verwijderen (verouderd) | ✅ Gedaan |
| F0-04 | Alle dubbele functies in kaart brengen | ✅ Gedaan |
| F0-05 | Kapotte bestanden identificeren | ✅ Gedaan |

---

## Fase 1 — Structuur & centrale modules ✅ AFGEROND

| ID | Taak | Status |
|----|------|--------|
| F1-01 | `idGenerator.js` herbouwen als centrale module (v2.0.0) | ✅ Gedaan |
| F1-02 | `utils.js` aanmaken met `safe()`, `formatDate()`, `parseBirthday()` | ✅ Gedaan |
| F1-03 | Lokale `safe()` verwijderen uit alle bestanden | ✅ Gedaan |
| F1-04 | `computeRelaties()` uit `manage.js` → centrale `relatieEngine.js` | ✅ Gedaan |
| F1-05 | `LiveSearch.js` volledig in IIFE wikkelen (bugfix safe already declared) | ✅ Gedaan |
| F1-06 | `utils.js` als eerste script toevoegen aan alle pagina's | ✅ Gedaan |
| F1-07 | `relatieEngine.js` toevoegen aan `manage.html` (ontbrak) | ✅ Gedaan |

---

## Fase 2 — Kapotte bestanden repareren ✅ AFGEROND

| ID | Taak | Status |
|----|------|--------|
| F2-01 | `export.js` herschrijven als centrale module met CSV + JSON | ✅ Gedaan |
| F2-02 | `export.html` repareren: `storage.js` + `schema.js` laden | ✅ Gedaan |
| F2-03 | `export.html` uitbreiden met JSON-knop | ✅ Gedaan |
| F2-04 | `storage.html` exportcode vervangen door centrale `export.js` | ✅ Gedaan |
| F2-05 | Export JSON/CSV knoppen verwijderen uit `storage.html` | ✅ Gedaan |
| F2-06 | `storage.js`: `migrate()` niet meer bij elke `get()` | ✅ Gedaan |
| F2-07 | `storage.js`: `migrate()` geeft `null` bij ongeldig record | ✅ Gedaan |
| F2-08 | `storage.js`: `console.log` bij laden verwijderd | ✅ Gedaan |
| F2-09 | `js/LSD.js` dubbele `DOMContentLoaded` | ❌ Geannuleerd — buiten scope |

---

## Fase 3 — Kernfeatures verbeteren 🔄 HUIDIG

### 3A — Facelift alle pagina's ✅ AFGEROND

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-29 | 🟡 Middel | `home/export.html` facelift (v2.1.0) | ✅ Gedaan |
| F3-30 | 🟡 Middel | `home/create.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-31 | 🟡 Middel | `home/import.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-32 | 🟡 Middel | `home/about.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-33 | 🟡 Middel | `home/print.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-34 | 🟡 Middel | `stamboom/stats.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-35 | 🟡 Middel | `stamboom/view.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-36 | 🟡 Middel | `stamboom/timeline.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-37 | 🟡 Middel | `stamboom/storage.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-38 | 🟡 Middel | `index.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-39 | 🟡 Middel | `bronnen/template.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-40 | 🟡 Middel | `stamboom/manage.html` facelift (v2.0.0) | ✅ Gedaan |
| F3-41 | 🟡 Middel | `css/Tree.css` opgeschoond (v2.0.0) | ✅ Gedaan |
| F3-42 | 🟡 Middel | Alle versienummers gestandaardiseerd naar v2.0.0 | ✅ Gedaan |

### 3B — Zoekfunctie

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-43 | 🔴 Hoog | Zoekresultaten highlighten (zoekterm vetgedrukt in resultaat) | 📋 Open |
| F3-44 | 🔴 Hoog | Zoeken op meerdere velden tegelijk (voornaam + achternaam) | 📋 Open |
| F3-45 | 🟡 Middel | Popup-stijlen verplaatsen van inline JS naar `style.css` | 📋 Open |
| F3-46 | 🟡 Middel | Keyboard navigatie in zoekpopup (pijltoetsen + Enter) | 📋 Open |
| F3-47 | 🟢 Laag | Zoekgeschiedenis (recent gezochte personen) | 📋 Open |

### 3C — Relaties

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-48 | 🔴 Hoog | Meerdere partners ondersteunen (PartnerID als array met `\|`) | 📋 Open |
| F3-49 | 🔴 Hoog | Relatie toevoegen vanuit `manage.html` (dropdown + zoekbalk) | 📋 Open |
| F3-50 | 🟡 Middel | Grootouders en kleinkinderen tonen in view.html | 📋 Open |
| F3-51 | 🟡 Middel | Halfbroers/halfzussen correct onderscheiden | 📋 Open |
| F3-52 | 🟢 Laag | Relatie-labels vertalen (VHoofdID → Vader, MHoofdID → Moeder) | 📋 Open |

### 3D — Stamboomvisualisatie (view.html)

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-53 | 🔴 Hoog | Verbindingslijnen tekenen tussen nodes (SVG of CSS) | 📋 Open |
| F3-54 | 🔴 Hoog | Foto/avatar toevoegen aan persoon-node | 📋 Open |
| F3-55 | 🟡 Middel | Zoom en pan op de stamboomweergave | 📋 Open |
| F3-56 | 🟢 Laag | Uitklappen/inklappen van takken | 📋 Open |

### 3E — Tijdlijn (timeline.html)

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-57 | 🔴 Hoog | Overlijdensdatum tonen op tijdlijn | 📋 Open |
| F3-58 | 🟡 Middel | Levensspanne als balk weergeven (geboorte → overlijden) | 📋 Open |
| F3-59 | 🟡 Middel | Schaalbare tijdas (zoom in op bepaalde periode) | 📋 Open |
| F3-60 | 🟢 Laag | Historische gebeurtenissen toevoegen aan tijdlijn | 📋 Open |

### 3F — Import / export

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-61 | 🔴 Hoog | `import.js` herschrijven met inline commentaar (v2.0.0) | 📋 Open |
| F3-62 | 🔴 Hoog | Import validatie: dubbele ID's detecteren en melden | 📋 Open |
| F3-63 | 🟡 Middel | Import preview tonen vóór opslaan | 📋 Open |
| F3-64 | 🟡 Middel | GEDCOM-formaat importeren (standaard stamboomformaat) | 📋 Open |

### 3G — Engelse versies

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-65 | 🔴 Hoog | `stamboom/manage-en.html` repareren en facelift | 📋 Open |
| F3-66 | 🔴 Hoog | `home/export-en.html` synchroniseren met `export.html` | 📋 Open |
| F3-67 | 🔴 Hoog | `home/import-en.html` repareren: mist schema.js + storage.js | 📋 Open |

### 3H — Overige

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F3-68 | 🟡 Middel | `stamboom/stats.html` JS verplaatsen naar apart `stats.js` | 📋 Open |
| F3-69 | 🟡 Middel | `home/print.html` implementeren (printweergave stamboom) | 📋 Open |
| F3-70 | 🟢 Laag | `schema.js` herschrijven met inline commentaar (v2.0.0) | 📋 Open |

---

## Fase A — Account & donaties ✅ AFGEROND

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| FA-01 | 🔴 Hoog | Supabase project aanmaken + API-key configureren | ✅ Gedaan |
| FA-02 | 🔴 Hoog | `js/auth.js` aanmaken: registreren, inloggen, uitloggen (v2.3.0) | ✅ Gedaan |
| FA-03 | 🔴 Hoog | Login modal via `js/topbar.js`: popup met tabs inloggen/registreren (v2.0.3) | ✅ Gedaan |
| FA-04 | 🔴 Hoog | TopBar uitbreiden: gebruikersnaam + uitlogknop via `topbar.js` | ✅ Gedaan |
| FA-05 | 🟡 Middel | Sessie bewaren na pagina-refresh (Supabase session) | ✅ Gedaan |
| FA-06 | 🟡 Middel | Ko-fi donatie knop in TopBar en Footer | ✅ Gedaan |
| FA-07 | 🔴 Hoog | Wachtwoord vergeten flow: `home/reset.html` + `js/reset.js` (v1.0.0) | ✅ Gedaan |
| FA-08 | 🔴 Hoog | SMTP instellen via Gmail App Password | ✅ Gedaan |
| FA-09 | 🟡 Middel | Supabase redirect URL instellen naar live GitHub Pages site | ✅ Gedaan |
| FA-10 | 🟡 Middel | Supabase profiles tabel aanmaken met username + avatar_id + RLS | ✅ Gedaan |
| FA-11 | 🟢 Laag | Donateurs-badge (toekomstig — na Ko-fi webhook integratie) | 🔮 Toekomst |
| FA-12 | 🟡 Middel | E-mail templates huisstijl (alle 5 templates) | ✅ Gedaan |
| FA-13 | 🔴 Hoog | Admin dropdown verbergen voor niet-admins | ✅ Gedaan |

---

## Fase A+ — Cloud backup ✅ AFGEROND

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| FA+-01 | 🔴 Hoog | Supabase tabel `stambomen` aanmaken (user_id, data JSON, updated_at) | ✅ Gedaan |
| FA+-02 | 🔴 Hoog | `js/cloudSync.js` aanmaken: `saveToCloud()`, `loadFromCloud()`, `getCloudMeta()` | ✅ Gedaan |
| FA+-03 | 🔴 Hoog | `stamboom/storage.html` tabbladen: Mijn data + Cloud backup | ✅ Gedaan |
| FA+-04 | 🔴 Hoog | Gratis limiet bewaken: max 100 personen lokaal voor free tier | ✅ Gedaan |
| FA+-05 | 🟡 Middel | "Laad vanuit cloud" knop op `storage.html` | ✅ Gedaan |
| FA+-06 | 🟡 Middel | Conflictmelding tonen als cloud-versie nieuwer is dan lokale versie | ✅ Gedaan |
| FA+-07 | 🟡 Middel | `home/account.html` aanmaken — uitgesteld naar meerdere stambomen fase | 🔮 Toekomst |
| FA+-08 | 🟢 Laag | Timestamp tonen van laatste cloud-backup op `storage.html` | ✅ Gedaan |
| FA+-09 | 🔴 Hoog | Tier/rollen systeem: is_admin, is_premium, tier, tier_until in profiles | ✅ Gedaan |
| FA+-10 | 🔴 Hoog | Cloud toegang alleen voor premium/admin — gratis gebruikers zien upgrade melding | ✅ Gedaan |

---

## Fase 4 — Nieuwe features 📋 GEPLAND

### 4A — Persoonsbeheer

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F4-01 | 🔴 Hoog | Persoon verwijderen vanuit `manage.html` | 📋 Open |
| F4-02 | 🔴 Hoog | Persoon dupliceren als startpunt voor vergelijkbaar record | 📋 Open |
| F4-03 | 🟡 Middel | Foto uploaden en koppelen aan persoon (base64 in localStorage) | 📋 Open |
| F4-04 | 🟡 Middel | Notities/opmerkingen uitbreiden (rijke tekst) | 📋 Open |

### 4B — Zoeken & filteren

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F4-05 | 🟡 Middel | Geavanceerd zoeken: filteren op geboortejaar, geslacht, relatie | 📋 Open |
| F4-06 | 🟡 Middel | Personen sorteren op achternaam, geboortedatum | 📋 Open |
| F4-07 | 🟢 Laag | Zoeken over meerdere stambomen tegelijk | 📋 Open |

### 4C — Statistieken

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F4-08 | 🟡 Middel | Grafiek: verdeling geboortejaren per decennium | 📋 Open |
| F4-09 | 🟡 Middel | Grafiek: verhouding M/V/X in de stamboom | 📋 Open |
| F4-10 | 🟢 Laag | Oudste en jongste persoon highlighten | 📋 Open |
| F4-11 | 🟢 Laag | Gemiddelde leeftijd berekenen | 📋 Open |

### 4D — UX verbeteringen

| ID | Prioriteit | Taak | Status |
|----|-----------|------|--------|
| F4-12 | 🟡 Middel | Donkere modus ondersteuning (CSS variabelen) | 📋 Open |
| F4-13 | 🟡 Middel | Mobielvriendelijke weergave voor manage en view | 📋 Open |
| F4-14 | 🟡 Middel | Ongedaan maken (undo) bij verwijderen of wijzigen | 📋 Open |
| F4-15 | 🟢 Laag | Toetsenbordsnelkoppelingen voor veelgebruikte acties | 📋 Open |

---

## Fase 5 — Cloud & accounts 🔮 TOEKOMST

| ID | Taak | Status |
|----|------|--------|
| F5-01 | Backend: Supabase ✅ gekozen en opgezet | ✅ Gedaan |
| F5-02 | Gebruikersaccounts: registreren, inloggen, uitloggen | ✅ Gedaan |
| F5-03 | Data sync tussen apparaten | ✅ Gedaan (Fase A+) |
| F5-04 | Stamboom delen met andere gebruikers (leesrechten / viewer tier) | 🔮 Toekomst |
| F5-05 | Samenwerkingsmodus: meerdere gebruikers bewerken samen | 🔮 Toekomst |
| F5-06 | Versiebeheer per persoon (wijzigingshistorie) | 🔮 Toekomst |
| F5-07 | Meerdere stambomen per gebruiker in cloud | 🔮 Toekomst |
| F5-08 | account.html — overzicht stambomen, backups, profiel | 🔮 Toekomst |
| F5-09 | Promotiecodes voor cloud toegang | 🔮 Toekomst |
| F5-10 | Abonnementen en betaaltiers verder uitwerken | 🔮 Toekomst |
| F5-11 | Ko-fi webhook integratie voor donateur-badge | 🔮 Toekomst |

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
| TD-07 | SMTP via Gmail App Password — niet ideaal voor productie, eigen domein nodig | 🟡 Middel |

---

## Definition of Done

Een taak is **klaar** als:
- [ ] De code werkt zoals bedoeld
- [ ] Inline commentaar aanwezig op elke coderegel
- [ ] Bestandsheader bijgewerkt met versienummer (v2.0.0+)
- [ ] `PROJECT_LOG.md` bijgewerkt
- [ ] `BACKLOG.md` bijgewerkt: taak op ✅ Gedaan
- [ ] Getest in de browser (geen console-errors)
