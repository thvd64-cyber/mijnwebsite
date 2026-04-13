# MyFamTreeCollab — Project Roadmap

> Commerciële heritage & genealogie webapplicatie.
> Privacy first — data blijft standaard lokaal in de browser.
> Gebouwd met vanilla HTML, CSS en JavaScript + Supabase backend.

---

## Project status

| Onderdeel | Status | Versie |
|-----------|--------|--------|
| Kernstructuur | ✅ Stabiel | — |
| JS centrale modules | ✅ Opgeschoond | v2.0.0 |
| CSS Tree layout | ✅ Opgeschoond | v2.0.0 |
| Export | ✅ Gecentraliseerd + facelift | v2.1.0 |
| Storage | ✅ Opgeschoond | v2.0.2 |
| Facelift alle NL pagina's | ✅ Gedaan | v2.0.0 |
| Auth — login/registratie/reset | ✅ Volledig werkend | v2.3.0 |
| TopBar login modal | ✅ Werkend op alle pagina's | v2.0.3 |
| Ko-fi donatie knop | ✅ Toegevoegd | v1.5 |
| SMTP e-mail (Gmail) | ✅ Werkend | — |
| E-mail templates (alle 5) | ✅ Huisstijl toegepast | — |
| Cloud backup (Fase A+) | ✅ Afgerond | v1.1.0 |
| Admin dropdown beveiliging | ✅ Alleen zichtbaar voor admin | — |
| Tier/rollen systeem | ✅ Placeholder aangemaakt | — |
| Zoekfunctie | ⚠️ Basisversie | v2.0.0 |
| Stamboomweergave | ⚠️ Basisversie | v2.0.0 |
| Tijdlijn | ⚠️ Basisversie | v2.0.0 |
| Relaties | ⚠️ Basisversie | v2.0.0 |
| Engelse versies | ❌ Onvolledig | — |

---

## Fasering

### Fase 0 — Audit & opschoning ✅ AFGEROND
### Fase 1 — Structuur & centrale modules ✅ AFGEROND
### Fase 2 — Kapotte bestanden repareren ✅ AFGEROND
### Fase 3 — Kernfeatures verbeteren 🔄 HUIDIG
### Fase A — Account & donaties ✅ AFGEROND
### Fase A+ — Cloud backup ✅ AFGEROND
### Fase 4 — Nieuwe features 📋 GEPLAND
### Fase 5 — Cloud & accounts (uitgebreid) 🔮 TOEKOMST

---

## Architectuurbeslissingen (ADR)

### ADR-001: Geen server, alleen localStorage (lokale versie)
**Beslissing:** de app werkt volledig in de browser zonder backend voor basisfunctionaliteit.
**Reden:** eenvoud, geen hosting nodig, werkt offline.
**Gevolg:** cloud-sync vereist Supabase (zie ADR-007).

### ADR-002: Centrale JS-modules via window.*
**Beslissing:** gedeelde functies worden geëxporteerd als `window.ModuleNaam`.
**Reden:** geen bundler/npm, scripts worden via `<script src>` geladen.
**Gevolg:** laadvolgorde in HTML is verplicht.

### ADR-003: Schema als single source of truth
**Beslissing:** alle veldnamen komen uit `window.StamboomSchema.fields`.
**Reden:** één aanpassing in schema.js werkt door in import, export, manage en storage.

### ADR-004: Export alleen via export.html
**Beslissing:** CSV en JSON export zit alleen op de exportpagina.
**Reden:** één plek voor exportlogica, geen duplicaten.

### ADR-005: Versienummering vanaf v2.0.0
**Beslissing:** alle nieuwe of door ons aangepaste bestanden starten op v2.0.0.
**Reden:** duidelijk onderscheid tussen originele code en onze versie.

### ADR-006: Consistente UI-standaarden
**Beslissing:** alle pagina's volgen dezelfde opmaakstandaard.
**Standaard:**
- Welkomstblok bovenaan elke pagina
- Zoekbalk: width 50%, padding 9px 12px
- Knoppen: padding 9px 18px, font-weight bold
- Kleurcodes: grijs=neutraal, groen=aanmaken, blauw=primaire actie, rood=destructief

### ADR-007: Supabase als backend
**Beslissing:** Supabase gekozen als backend voor auth en cloud-opslag.
**Reden:** gratis tier, PostgreSQL, ingebouwde auth, realtime support, geen eigen server nodig.
**Project URL:** `https://xpufzrjncivyzyukwcmn.supabase.co`
**Gevolg:** auth werkt via `js/auth.js` met `window.AuthModule`.

### ADR-008: TopBar auth modal via topbar.js
**Beslissing:** login/registratie via popup modal in de TopBar, niet via aparte pagina.
**Reden:** professioneler, gebruiker verliest geen context.
**Gevolg:** `topbar.js` moet geladen worden via `createElement` NADAT TopBar HTML in DOM zit.

### ADR-009: Scripts laadvolgorde met fetch
**Beslissing:** TopBar, Navbar en Footer worden via fetch() geladen onderaan body.
**Reden:** fetch() werkt niet op file:// protocol — alleen op HTTPS.
**Gevolg:** topbar.js wordt via createElement geladen NA de TopBar fetch.

### ADR-010: Tier/rollen systeem in Supabase profiles
**Beslissing:** toegangscontrole via `tier` kolom in profiles tabel.
**Tiers:** free | viewer | supporter | personal | family | researcher | admin
**Admin:** thvd64@gmail.com — geen limieten, ziet Administrator dropdown in navbar.
**Free gebruikers:** max 100 personen lokaal, geen cloud toegang.
**Cloud toegang:** alleen voor betaalde tiers en donateurs (supporter+).
**Gevolg:** cloudSync.js en storage.js controleren tier via AuthModule.getTier().

### ADR-011: Admin dropdown verborgen voor niet-admins
**Beslissing:** `#adminDropdown` in Navbar staat standaard `display:none`.
**Gevolg:** topbar.js maakt het zichtbaar na `is_admin` check via getProfile().

---

## Laadvolgorde scripts (verplicht)

```
<!-- Altijd onderaan <body>, vóór </body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/utils.js"></script>
<script src="../js/auth.js"></script>

<script>
    // TopBar eerst laden, dan topbar.js injecteren
    fetch('/MyFamTreeCollab/Layout/TopBar.html')
        .then(resp => resp.text())
        .then(function(data) {
            document.getElementById('topbar-placeholder').innerHTML = data;
            var s = document.createElement('script');
            s.src = '../js/topbar.js';
            document.body.appendChild(s);
        });
    fetch('/MyFamTreeCollab/Layout/Navbar.html')...
    fetch('/MyFamTreeCollab/Layout/Footer.html')...
</script>

<!-- Pagina-specifieke scripts altijd als laatste -->
schema.js → idGenerator.js → storage.js → cloudSync.js (alleen op storage.html) → [pagina].js
```

**Let op voor index.html (root):** paden zijn `/MyFamTreeCollab/js/` niet `../js/`

---

## Supabase tabellen

```
auth.users    ← ingebouwd door Supabase Auth
profiles      ← username, avatar_id, is_admin, is_premium, tier, tier_until
stambomen     ← user_id, data JSON, updated_at (één rij per gebruiker)
```

## Supabase e-mail templates (alle bijgewerkt in huisstijl)

| Template | Status |
|----------|--------|
| Confirm signup | ✅ |
| Reset password | ✅ |
| Invite user | ✅ |
| Magic Link | ✅ |
| Change Email | ✅ |

## Toekomstige Supabase tabellen (gepland)

```
stamboom_shares  ← stamboom_id, owner_id, viewer_id (Fase 5 — viewer toegang)
```

## Globale exports (window.*)

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
| `window.TopBarAuth` | topbar.js |
| `window.CloudSync` | cloudSync.js |

---

## Bestandsstatus

| Bestand | Versie | Status |
|---|---|---|
| js/utils.js | v2.0.0 | ✅ stabiel |
| js/schema.js | v0.1.0 | ⚠️ nog te doen |
| js/idGenerator.js | v2.0.0 | ✅ stabiel |
| js/storage.js | v2.0.2 | ✅ stabiel |
| js/LiveSearch.js | v2.0.0 | ✅ stabiel |
| js/relatieEngine.js | v2.0.0 | ✅ stabiel |
| js/create.js | v2.0.0 | ✅ stabiel |
| js/manage.js | v2.0.0 | ✅ stabiel |
| js/view.js | v2.0.0 | ✅ stabiel |
| js/timeline.js | v2.0.0 | ✅ stabiel |
| js/export.js | v2.0.0 | ✅ stabiel |
| js/import.js | v2.0.3 | ⚠️ nog te doen |
| js/auth.js | v2.3.0 | ✅ stabiel |
| js/topbar.js | v2.0.3 | ✅ stabiel |
| js/reset.js | v1.0.0 | ✅ stabiel |
| js/cloudSync.js | v1.1.0 | ✅ stabiel |
| js/LSD.js | v0.0.0 | ❌ kapot (lage prio) |
| home/reset.html | v1.0.0 | ✅ stabiel |
| home/login.html | — | ❌ vervangen door modal |
| Layout/TopBar.html | v0.4 | ✅ stabiel |
| Layout/Navbar.html | v0.0.2 | ✅ stabiel |
| Layout/Footer.html | v1.5 | ✅ stabiel |
| stamboom/storage.html | v2.3.0 | ✅ stabiel |
| bronnen/handleiding.html | v1.1.0 | ✅ bijgewerkt |

---

## Mapstructuur

```
MyFamTreeCollab/
├── index.html                  ← startpagina (v2.0.2)
├── PROJECT.md                  ← roadmap en beslissingen
├── PROJECT_LOG.md              ← bestandsoverzicht en sessiehistorie
├── BACKLOG.md                  ← alle taken per fase
├── js/
│   ├── utils.js                ← centrale hulpfuncties (v2.0.0)
│   ├── schema.js               ← datastructuur definitie (v0.1.0)
│   ├── idGenerator.js          ← ID generatie (v2.0.0)
│   ├── storage.js              ← localStorage API (v2.0.2)
│   ├── LiveSearch.js           ← zoekfunctie (v2.0.0)
│   ├── relatieEngine.js        ← relatie berekening (v2.0.0)
│   ├── create.js               ← eerste persoon aanmaken (v2.0.0)
│   ├── manage.js               ← stamboom beheren (v2.0.0)
│   ├── view.js                 ← stamboom visualiseren (v2.0.0)
│   ├── timeline.js             ← tijdlijn visualisatie (v2.0.0)
│   ├── import.js               ← CSV/TXT importeren (v2.0.3)
│   ├── export.js               ← CSV/JSON exporteren (v2.0.0)
│   ├── auth.js                 ← Supabase authenticatie (v2.3.0)
│   ├── topbar.js               ← TopBar auth modal + admin check (v2.0.3)
│   ├── reset.js                ← wachtwoord reset (v1.0.0)
│   └── cloudSync.js            ← cloud backup met tiercontrole (v1.1.0)
├── css/
│   ├── style.css               ← globale stijlen (v1.0.6)
│   ├── Tree.css                ← stamboom stijlen (v2.0.0)
│   ├── timeline.css            ← tijdlijn stijlen (v1.3.0)
│   └── RelationColors.css      ← kleurcodering relaties (v1.0.1)
├── home/
│   ├── create.html             ← eerste persoon aanmaken (v2.0.1)
│   ├── import.html             ← data importeren (v2.0.0)
│   ├── export.html             ← data exporteren (v2.1.1)
│   ├── about.html              ← over de app + Ko-fi (v2.0.3)
│   ├── print.html              ← afdrukken — binnenkort (v2.0.0)
│   └── reset.html              ← wachtwoord resetten (v1.0.0)
├── stamboom/
│   ├── manage.html             ← stamboom beheren (v2.0.0)
│   ├── view.html               ← stamboom bekijken (v2.0.0)
│   ├── timeline.html           ← tijdlijn bekijken (v2.0.0)
│   ├── stats.html              ← statistieken (v2.0.0)
│   └── storage.html            ← data + cloud backup tabbladen (v2.3.0)
├── bronnen/
│   ├── template.html           ← CSV template download (v2.0.0)
│   └── handleiding.html        ← gebruikershandleiding (v1.1.0)
└── Layout/
    ├── Navbar.html             ← v0.0.2 — admin dropdown verborgen by default
    ├── TopBar.html             ← v0.4 met Ko-fi knop
    └── Footer.html             ← v1.5 met Ko-fi knop
```
