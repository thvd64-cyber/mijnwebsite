# MyFamTreeCollab — Project Roadmap

> Pure frontend applicatie voor het beheren en visualiseren van familiestambomen.
> Geen server, geen database — alles via localStorage in de browser.
> Gebouwd met vanilla HTML, CSS en JavaScript.

---

## Project status

| Onderdeel         | Status         | Versie  |
|-------------------|---------------|---------|
| Kernstructuur     | ✅ Stabiel     | —       |
| JS centrale modules | ✅ Opgeschoond | v2.0.0  |
| Export            | ✅ Gecentraliseerd | v2.0.0 |
| Storage           | ✅ Opgeschoond | v1.0.0  |
| Zoekfunctie       | ⚠️ Basisversie | v1.1.0  |
| Stamboomweergave  | ⚠️ Basisversie | v1.6.2  |
| Tijdlijn          | ⚠️ Basisversie | v2.2.0  |
| Relaties          | ⚠️ Basisversie | v2.0.0  |
| Engelse versies   | ❌ Onvolledig  | —       |
| Cloud / accounts  | ❌ Nog niet begonnen | — |

---

## Fasering

### Fase 0 — Audit & opschoning ✅ AFGEROND
Doel: begrijpen wat er is, dode code verwijderen, bugs fixen.

### Fase 1 — Structuur & centrale modules ✅ AFGEROND
Doel: één bron van waarheid voor gedeelde logica.

### Fase 2 — Kapotte bestanden repareren ✅ AFGEROND
Doel: alles wat al bestaat moet correct werken.

### Fase 3 — Kernfeatures verbeteren 🔄 HUIDIG
Doel: bestaande features die werken maar beter kunnen.
Zie BACKLOG.md voor alle taken.

### Fase 4 — Nieuwe features 📋 GEPLAND
Doel: uitbreidingen bovenop een stabiele basis.
Zie BACKLOG.md voor alle taken.

### Fase 5 — Cloud & accounts 🔮 TOEKOMST
Doel: data delen tussen apparaten, gebruikersaccounts.
Vereist externe backend — aparte technische beslissing nodig.

---

## Technische beslissingen (ADR)

### ADR-001: Geen server, alleen localStorage
**Beslissing:** de app werkt volledig in de browser zonder backend.
**Reden:** eenvoud, geen hosting nodig, werkt offline.
**Gevolg:** cloud-sync vereist een aparte fase met backend-keuze.

### ADR-002: Centrale JS-modules via window.*
**Beslissing:** gedeelde functies worden geëxporteerd als `window.ModuleNaam`.
**Reden:** geen bundler/npm, scripts worden via `<script src>` geladen.
**Gevolg:** laadvolgorde in HTML is verplicht en gedocumenteerd in PROJECT_LOG.md.

### ADR-003: Schema als single source of truth
**Beslissing:** alle veldnamen komen uit `window.StamboomSchema.fields`.
**Reden:** één aanpassing in schema.js werkt door in import, export, manage en storage.
**Gevolg:** nieuwe velden toevoegen = alleen schema.js aanpassen.

### ADR-004: Export alleen via export.html
**Beslissing:** CSV en JSON export zit alleen op de export-pagina.
**Reden:** één plek voor exportlogica, geen duplicaten.
**Gevolg:** storage.html toont data maar heeft geen exportknoppen meer.

---

## Laadvolgorde scripts (verplicht)

```
utils.js          ← 1e: hulpfuncties (safe, formatDate, parseBirthday)
schema.js         ← 2e: veldnamen en CSV-parsing
idGenerator.js    ← 3e: alleen op pagina's met formulier (create, manage)
storage.js        ← 4e: localStorage API
LiveSearch.js     ← 5e: zoekfunctie
relatieEngine.js  ← 6e: familierelaties berekenen
[pagina].js       ← altijd als LAATSTE
```

---

## Mapstructuur

```
MyFamTreeCollab/
├── index.html                  ← startpagina
├── PROJECT.md                  ← dit bestand: roadmap en beslissingen
├── PROJECT_LOG.md              ← bestandsoverzicht en versiehistorie
├── BACKLOG.md                  ← alle taken per fase
├── js/
│   ├── utils.js                ← centrale hulpfuncties
│   ├── schema.js               ← datastructuur definitie
│   ├── idGenerator.js          ← ID generatie
│   ├── storage.js              ← localStorage API
│   ├── LiveSearch.js           ← zoekfunctie
│   ├── relatieEngine.js        ← relatie berekening
│   ├── create.js               ← eerste persoon aanmaken
│   ├── manage.js               ← stamboom beheren
│   ├── view.js                 ← stamboom visualiseren
│   ├── timeline.js             ← tijdlijn visualisatie
│   ├── import.js               ← CSV/TXT importeren
│   └── export.js               ← CSV/JSON exporteren
├── css/
│   ├── style.css               ← globale stijlen
│   ├── Tree.css                ← stamboom stijlen
│   ├── timeline.css            ← tijdlijn stijlen
│   └── RelationColors.css      ← kleurcodering relaties
├── home/
│   ├── create.html             ← eerste persoon aanmaken
│   ├── import.html             ← data importeren
│   ├── export.html             ← data exporteren
│   └── about.html              ← over de app
├── stamboom/
│   ├── manage.html             ← stamboom beheren
│   ├── view.html               ← stamboom bekijken
│   ├── timeline.html           ← tijdlijn bekijken
│   ├── stats.html              ← statistieken
│   └── storage.html            ← data inzien en resetten
└── Layout/
    ├── Navbar.html
    ├── TopBar.html
    └── Footer.html
```
