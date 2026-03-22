# MyFamTreeCollab — Backlog

> Dit bestand bevat alle taken georganiseerd per fase en prioriteit.
> Status: 📋 Open · 🔄 In uitvoering · ✅ Gedaan · ❌ Geannuleerd · 🔮 Toekomst

---

## Fase 0 — Audit & opschoning ✅ AFGEROND

| ID    | Taak                                          | Status |
|-------|-----------------------------------------------|--------|
| F0-01 | ZIP analyseren en alle bestanden inventariseren | ✅ Gedaan |
| F0-02 | `js/DeleteRow.js` verwijderen (leeg bestand)   | ✅ Gedaan |
| F0-03 | `js/schemaGlobal.js` verwijderen (verouderd)   | ✅ Gedaan |
| F0-04 | Alle dubbele functies in kaart brengen         | ✅ Gedaan |
| F0-05 | Kapotte bestanden identificeren                | ✅ Gedaan |

---

## Fase 1 — Structuur & centrale modules ✅ AFGEROND

| ID    | Taak                                                        | Status |
|-------|-------------------------------------------------------------|--------|
| F1-01 | `idGenerator.js` herbouwen als centrale module (v2.0.0)     | ✅ Gedaan |
| F1-02 | `utils.js` aanmaken met `safe()`, `formatDate()`, `parseBirthday()` | ✅ Gedaan |
| F1-03 | Lokale `safe()` verwijderen uit `view.js`, `timeline.js`, `manage.js`, `LiveSearch.js`, `relatieEngine.js` | ✅ Gedaan |
| F1-04 | `computeRelaties()` uit `manage.js` verwijderen → centrale `relatieEngine.js` | ✅ Gedaan |
| F1-05 | `LiveSearch.js` volledig in IIFE wikkelen (bugfix: `safe` already declared) | ✅ Gedaan |
| F1-06 | `utils.js` als eerste script toevoegen aan `manage.html`, `view.html`, `timeline.html` | ✅ Gedaan |
| F1-07 | `relatieEngine.js` toevoegen aan `manage.html` (ontbrak)    | ✅ Gedaan |

---

## Fase 2 — Kapotte bestanden repareren ✅ AFGEROND

| ID    | Taak                                                        | Status |
|-------|-------------------------------------------------------------|--------|
| F2-01 | `export.js` herschrijven als centrale module met CSV + JSON | ✅ Gedaan |
| F2-02 | `export.html` repareren: `storage.js` + `schema.js` laden  | ✅ Gedaan |
| F2-03 | `export.html` uitbreiden met JSON-knop en knoppen van `storage.html` | ✅ Gedaan |
| F2-04 | `storage.html` exportcode vervangen door centrale `export.js` | ✅ Gedaan |
| F2-05 | Export JSON/CSV knoppen verwijderen uit `storage.html`      | ✅ Gedaan |
| F2-06 | `storage.js` herschrijven: `migrate()` niet meer bij elke `get()` | ✅ Gedaan |
| F2-07 | `storage.js`: `migrate()` geeft `null` bij ongeldig record  | ✅ Gedaan |
| F2-08 | `storage.js`: `console.log` bij laden verwijderd            | ✅ Gedaan |
| F2-09 | `js/LSD.js` dubbele `DOMContentLoaded`                      | ❌ Geannuleerd — buiten scope |

---

## Fase 3 — Kernfeatures verbeteren 🔄 HUIDIG

### 3A — Zoekfunctie
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-01 | 🔴 Hoog   | Zoekresultaten highlighten (zoekterm vetgedrukt in resultaat) | 📋 Open |
| F3-02 | 🔴 Hoog   | Zoeken op meerdere velden tegelijk (bijv. voornaam + achternaam) | 📋 Open |
| F3-03 | 🟡 Middel | Popup-stijl verplaatsen van inline JS naar `style.css`      | 📋 Open |
| F3-04 | 🟡 Middel | Keyboard navigatie in zoekpopup (pijltoetsen + Enter)       | 📋 Open |
| F3-05 | 🟢 Laag   | Zoekgeschiedenis (recent gezochte personen)                 | 📋 Open |

### 3B — Relaties
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-06 | 🔴 Hoog   | Meerdere partners ondersteunen (PartnerID als array met `\|`) | 📋 Open |
| F3-07 | 🔴 Hoog   | Relatie toevoegen vanuit `manage.html` (dropdown + zoekbalk) | 📋 Open |
| F3-08 | 🟡 Middel | Grootouders en kleinkinderen tonen in view.html             | 📋 Open |
| F3-09 | 🟡 Middel | Halfbroers/halfzussen correct onderscheiden van broers/zussen | 📋 Open |
| F3-10 | 🟢 Laag   | Relatie-labels vertalen (VHoofdID → Vader, MHoofdID → Moeder) | 📋 Open |

### 3C — Stamboomvisualisatie (view.html)
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-11 | 🔴 Hoog   | Verbindingslijnen tekenen tussen nodes (SVG of CSS)         | 📋 Open |
| F3-12 | 🔴 Hoog   | Foto/avatar toevoegen aan persoon-node                      | 📋 Open |
| F3-13 | 🟡 Middel | Klikbare nodes navigeren naar die persoon als nieuw hoofd   | 📋 Open |
| F3-14 | 🟡 Middel | Zoom en pan op de stamboomweergave                          | 📋 Open |
| F3-15 | 🟢 Laag   | Uitklappen/inklappen van takken                             | 📋 Open |

### 3D — Tijdlijn (timeline.html)
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-16 | 🔴 Hoog   | Overlijdensdatum tonen op tijdlijn naast geboortedatum      | 📋 Open |
| F3-17 | 🟡 Middel | Levensspanne als balk weergeven (geboorte → overlijden)     | 📋 Open |
| F3-18 | 🟡 Middel | Schaalbare tijdas (zoom in op bepaalde periode)             | 📋 Open |
| F3-19 | 🟢 Laag   | Historische gebeurtenissen toevoegen aan tijdlijn           | 📋 Open |

### 3E — Import / export
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-20 | 🔴 Hoog   | `import.js` herschrijven met inline commentaar              | 📋 Open |
| F3-21 | 🔴 Hoog   | Import validatie: dubbele ID's detecteren en melden         | 📋 Open |
| F3-22 | 🟡 Middel | Import preview tonen vóór opslaan                          | 📋 Open |
| F3-23 | 🟡 Middel | GEDCOM-formaat importeren (standaard stamboomformaat)       | 📋 Open |

### 3F — Overige pagina's ✅ F3-29 gedaan
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F3-24 | 🔴 Hoog   | `stamboom/manage-en.html` repareren (mist bijna alle scripts) | 📋 Open |
| F3-25 | 🔴 Hoog   | `home/export-en.html` synchroniseren met `export.html`      | 📋 Open |
| F3-26 | 🟡 Middel | `stats.html` inline JS verplaatsen naar apart `stats.js`    | 📋 Open |
| F3-27 | 🟡 Middel | `home/print.html` implementeren (printweergave stamboom)    | 📋 Open |
| F3-28 | 🟢 Laag   | `schema.js` herschrijven met inline commentaar              | 📋 Open |
| F3-29 | 🟡 Middel | `export.html` facelift: welkomstblok, CSV en JSON als aparte secties | ✅ Gedaan |

---

## Fase 4 — Nieuwe features 📋 GEPLAND

### 4A — Persoonsbeheer
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F4-01 | 🔴 Hoog   | Persoon verwijderen vanuit `manage.html` (DeleteRow.js implementeren) | 📋 Open |
| F4-02 | 🔴 Hoog   | Persoon dupliceren als startpunt voor vergelijkbaar record  | 📋 Open |
| F4-03 | 🟡 Middel | Foto uploaden en koppelen aan persoon (base64 in localStorage) | 📋 Open |
| F4-04 | 🟡 Middel | Notities/opmerkingen per persoon uitbreiden (rijke tekst)   | 📋 Open |

### 4B — Zoeken & filteren
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F4-05 | 🟡 Middel | Geavanceerd zoeken: filteren op geboortejaar, geslacht, relatie | 📋 Open |
| F4-06 | 🟡 Middel | Personen sorteren op achternaam, geboortedatum              | 📋 Open |
| F4-07 | 🟢 Laag   | Zoeken over meerdere stambomen tegelijk                     | 📋 Open |

### 4C — Statistieken (stats.html)
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F4-08 | 🟡 Middel | Grafiek: verdeling geboortejaren per decennium              | 📋 Open |
| F4-09 | 🟡 Middel | Grafiek: verhouding M/V/X in de stamboom                    | 📋 Open |
| F4-10 | 🟢 Laag   | Oudste en jongste persoon highlighten                       | 📋 Open |
| F4-11 | 🟢 Laag   | Gemiddelde leeftijd berekenen                               | 📋 Open |

### 4D — UX verbeteringen
| ID    | Prioriteit | Taak                                                        | Status |
|-------|-----------|-------------------------------------------------------------|--------|
| F4-12 | 🟡 Middel | Donkere modus ondersteuning (CSS variabelen)                | 📋 Open |
| F4-13 | 🟡 Middel | Mobielvriendelijke weergave voor manage en view             | 📋 Open |
| F4-14 | 🟡 Middel | Ongedaan maken (undo) bij verwijderen of wijzigen           | 📋 Open |
| F4-15 | 🟢 Laag   | Toetsenbordsnelkoppelingen voor veelgebruikte acties        | 📋 Open |

---

## Fase 5 — Cloud & accounts 🔮 TOEKOMST

| ID    | Taak                                                        | Status |
|-------|-------------------------------------------------------------|--------|
| F5-01 | Backend kiezen (Firebase / Supabase / eigen server)         | 🔮 Toekomst |
| F5-02 | Gebruikersaccounts: registreren, inloggen, uitloggen        | 🔮 Toekomst |
| F5-03 | Data sync tussen apparaten                                  | 🔮 Toekomst |
| F5-04 | Stamboom delen met andere gebruikers (leesrechten)          | 🔮 Toekomst |
| F5-05 | Samenwerkingsmodus: meerdere gebruikers bewerken samen      | 🔮 Toekomst |
| F5-06 | Versiebeheer per persoon (wijzigingshistorie)               | 🔮 Toekomst |

---

## Technische schuld

> Bekende problemen die opgelost moeten worden maar nog niet gepland zijn.

| ID    | Omschrijving                                                | Ernst |
|-------|-------------------------------------------------------------|-------|
| TD-01 | `js/Sandbox.js` — testbestand staat nog in de repo          | 🟢 Laag |
| TD-02 | `js/script.js` — doet alleen `console.log`, wordt op 9 pagina's geladen | 🟡 Middel |
| TD-03 | `js/LSD.js` — dubbele `DOMContentLoaded` event listener     | 🟢 Laag |
| TD-04 | `Layout/*.html` worden via `fetch()` geladen — werkt niet op `file://` protocol | 🟡 Middel |
| TD-05 | Popup-stijlen in `LiveSearch.js` zijn hardcoded inline CSS  | 🟢 Laag |
| TD-06 | `home/import-en.html` laadt `import.js` zonder `schema.js` en `storage.js` | 🔴 Hoog |

---

## Definitie of Done

Een taak is **klaar** als:
- [ ] De code werkt zoals bedoeld
- [ ] Inline commentaar aanwezig op elke coderegel
- [ ] Bestandsheader bijgewerkt met nieuw versienummer
- [ ] `PROJECT_LOG.md` bijgewerkt met wijzigingen
- [ ] `BACKLOG.md` bijgewerkt: taak op ✅ Gedaan gezet
- [ ] Getest in de browser (geen console-errors)
