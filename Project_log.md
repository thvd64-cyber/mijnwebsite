# MyFamTreeCollab — Project Log & Bestandsoverzicht

> **Doel van dit bestand:** centraal overzicht van alle JS-bestanden, hun versie,
> wat ze doen, wat ze vereisen, en wat er per sessie gewijzigd is.
> Dit bestand wordt bijgewerkt na elke code-sessie.

---

## Laadvolgorde in HTML (verplicht)

```
utils.js          ← altijd EERSTE
schema.js
idGenerator.js    ← alleen op pagina's met formulier (create, manage)
storage.js
LiveSearch.js
relatieEngine.js  ← vóór view.js / manage.js / timeline.js
[pagina].js       ← altijd LAATSTE
```

---

## Bestandsoverzicht

---

### js/utils.js `v1.0.0` ✅ nieuw aangemaakt
```
Centrale hulpfuncties voor MyFamTreeCollab
Exporteert: window.FTUtils, window.ftSafe, window.ftFormatDate, window.ftParseBirthday
Vervangt lokale kopieën in: view.js, timeline.js, manage.js, LiveSearch.js, relatieEngine.js
Vereist: niets (moet als EERSTE geladen worden)
```
**Functies:**
- `safe(val)` — zet elke waarde veilig om naar getrimde string, voorkomt null-crashes
- `formatDate(d)` — datumstring naar leesbare Nederlandse weergave (bijv. "12 mrt 1954")
- `parseBirthday(d)` — datumstring naar Date-object voor gebruik in `.sort()`

**Wijzigingen t.o.v. origineel:** nieuw bestand, vervangt 9 lokale kopieën verspreid over 5 bestanden

---

### js/idGenerator.js `v2.0.0` ✅ herschreven
```
Centrale ID-generator voor MyFamTreeCollab
Exporteert: window.genereerCode(persoon, bestaandeDataset)
Vereist: niets
Gebruikt door: create.js, manage.js, storage.js
```
**Functies:**
- `genereerCode(persoon, bestaandeData)` — genereert uniek ID op basis van naamletters + 3 cijfers

**Wijzigingen t.o.v. v1.0.1:**
- HTML-commentaar (`<!-- -->`) in JS verwijderd — was een syntaxfout
- Zelf-import (`import './js/idGenerator.js'`) verwijderd
- Exporteert nu correct als `window.genereerCode`
- Uniciteitscheck toegevoegd via Set van bestaande ID's
- Veiligheidsstop na 1000 pogingen toegevoegd
- Alle letters worden nu consequent naar hoofdletter gezet

---

### js/create.js `v1.1.0` ✅ herschreven
```
Verwerkt het formulier voor aanmaken van de eerste persoon (Hoofd-ID)
Vereist: schema.js, idGenerator.js, storage.js
Gebruikt door: home/create.html
```
**Wijzigingen t.o.v. v1.0.1:**
- Lokale `genereerCode()` verwijderd — gebruikt nu `window.genereerCode` uit idGenerator.js
- Hardcoded absolute URL vervangen door relatief pad `../stamboom/manage.html`
- Inline commentaar toegevoegd op elke regel

---

### js/manage.js `v1.4.0` ✅ herschreven
```
Beheerpagina: toont stamboom als bewerkbare tabel
Exporteert: JSON en CSV download
Vereist: utils.js, schema.js, idGenerator.js, storage.js, LiveSearch.js, relatieEngine.js
Gebruikt door: stamboom/manage.html
```
**Wijzigingen t.o.v. v1.3.20:**
- Lokale `genereerCode()` (onderaan) verwijderd — gebruikt nu `window.genereerCode`
- Lokale `safe()` verwijderd — gebruikt nu `window.ftSafe` uit utils.js
- Volledige lokale `computeRelaties()` (~80 regels) verwijderd — gebruikt nu `window.RelatieEngine.computeRelaties`
- Inline commentaar toegevoegd op elke regel

---

### js/relatieEngine.js `v2.0.0` ✅ herschreven
```
Centrale relatie-berekening: berekent alle familierelaties rond een hoofdpersoon
Exporteert: window.RelatieEngine.computeRelaties(data, hoofdId)
Vereist: utils.js (voor safe())
Gebruikt door: view.js, timeline.js, manage.js
```
**Relaties die berekend worden:**
- `VHoofdID` / `MHoofdID` — vader / moeder van hoofd
- `HoofdID` — de geselecteerde hoofdpersoon zelf
- `PHoofdID` — partner van hoofd
- `KindID` — gedeeld kind van hoofd + partner
- `HKindID` — kind van alleen hoofd
- `PHKindID` — kind van alleen partner
- `KindPartnerID` — partner van een kind
- `BZID` — broer of zus van hoofd
- `BZPartnerID` — partner van een broer/zus

**Wijzigingen t.o.v. v1.0.0:**
- Lokale `safe()` verwijderd — gebruikt nu `window.ftSafe` uit utils.js
- Omgezet naar zelfuitvoerende functie `(function(){ })()` voor betere scope-afscherming
- Inline commentaar toegevoegd op elke regel

---

### js/LiveSearch.js `v1.1.0` ✅ herschreven
```
Universele live-zoekmodule: filtert dataset op ID, Roepnaam, Achternaam, Geboortedatum
Exporteert: window.liveSearch(), window.initLiveSearch()
Vereist: utils.js (voor safe())
Gebruikt door: view.js, timeline.js, manage.js
```
**Wijzigingen t.o.v. v1.0.3:**
- Lokale `safe()` verwijderd — gebruikt nu `window.ftSafe` uit utils.js
- Volledig in één IIFE `(function(){})()` gewikkeld — lost `Uncaught SyntaxError: Identifier 'safe' has already been declared` op
- `initLiveSearch` en `liveSearch` zitten nu beide binnen dezelfde IIFE scope
- Inline commentaar toegevoegd op elke regel

---

### js/storage.js `v0.0.4` ⚠️ ongewijzigd (nog te doen)
```
Persistente opslag via localStorage, volledig schema-driven
Exporteert: window.StamboomStorage (get, set, add, update, clear)
Vereist: schema.js, idGenerator.js
Gebruikt door: alle pagina's
```
**Bekende aandachtspunten:**
- Roept `window.genereerCode` aan zonder garantie dat idGenerator.js al geladen is

---

### js/schema.js `v0.1.0` ⚠️ ongewijzigd (nog te doen)
```
Centrale datastructuur: 14 kernvelden, CSV-parsing, header-validatie, legacy-migratie
Exporteert: window.StamboomSchema
Vereist: niets
Gebruikt door: storage.js, import.js, manage.js
```

---

### js/import.js `v2.0.3` ⚠️ ongewijzigd (nog te doen)
```
CSV/TXT importer: leest bestanden in, detecteert delimiter, koppelt aan storage
Vereist: schema.js, storage.js
Gebruikt door: home/import.html
```

---

### js/export.js `v1.2.8` ❌ kapot (prioriteit repareren)
```
CSV-export functie
Vereist: storage.js (ONTBREEKT in home/export.html!)
Gebruikt door: home/export.html
```
**Bekend probleem:**
- `home/export.html` laadt `storage.js` en `schema.js` niet → export werkt nooit
- Roept `get()` aan in plaats van `StamboomStorage.get()`

---

### js/view.js `v1.6.2` ✅ gedeeltelijk gewijzigd
```
Stamboomvisualisatie: rendert boom met nodes per relatietype
Vereist: utils.js, schema.js, storage.js, relatieEngine.js, LiveSearch.js
Gebruikt door: stamboom/view.html
```
**Wijzigingen t.o.v. origineel:**
- Lokale `safe()`, `formatDate()`, `parseBirthday()` verwijderd
- Gebruikt nu `window.ftSafe`, `window.ftFormatDate`, `window.ftParseBirthday` uit utils.js

---

### js/timeline.js `v2.2.0` ✅ gedeeltelijk gewijzigd
```
Tijdlijnvisualisatie: horizontale as = geboortedatum, verticale as = hiërarchie
Vereist: utils.js, schema.js, storage.js, LiveSearch.js, relatieEngine.js
Gebruikt door: stamboom/timeline.html
```
**Wijzigingen t.o.v. origineel:**
- Lokale `safe()`, `formatDate()`, `parseBirthday()` verwijderd
- Gebruikt nu `window.ftSafe`, `window.ftFormatDate`, `window.ftParseBirthday` uit utils.js

---

### js/LSD.js `v0.0.0` ❌ kapot (prioriteit repareren)
```
LocalStorage beheer voor admin: bekijken, verwijderen, factory reset
Vereist: niets
Gebruikt door: Admin/LSD.html
```
**Bekend probleem:**
- `DOMContentLoaded` event listener staat twee keer geregistreerd → admin menu gedraagt zich onvoorspelbaar

---

## Verwijderde bestanden

| Bestand              | Reden                                                         |
|----------------------|---------------------------------------------------------------|
| `js/DeleteRow.js`    | Volledig leeg (0 bytes), nooit geïmplementeerd                |
| `js/schemaGlobal.js` | Oud schema met slechts 6 velden, vervangen door schema.js     |

---

## Sessie-overzicht

### Sessie 1 — Audit & eerste opschoning
- ZIP geanalyseerd: 9 problemen gevonden
- `DeleteRow.js` en `schemaGlobal.js` verwijderd
- `idGenerator.js` volledig herschreven (v2.0.0)
- `create.js` en `manage.js` aangepast: lokale `genereerCode()` verwijderd

### Sessie 2b — Bugfix LiveSearch
- `LiveSearch.js` volledig in IIFE gewikkeld (v1.1.0)
- Oorzaak: `const safe` stond op globaal niveau en botste met `const safe` in view.js/timeline.js
- Foutmelding was: `Uncaught SyntaxError: Identifier 'safe' has already been declared`

### Sessie 2 — Duplicatenronde
- `utils.js` aangemaakt als centraal hulpbestand (nieuw)
- `relatieEngine.js` herschreven (v2.0.0): eigen `safe()` vervangen
- `manage.js` bijgewerkt (v1.4.0): lokale `computeRelaties()` verwijderd
- `LiveSearch.js` bijgewerkt: lokale `safe()` vervangen
- `view.js` en `timeline.js` bijgewerkt: alle 3 lokale helpers vervangen
- `manage.html`, `view.html`, `timeline.html`: `utils.js` als eerste script toegevoegd
- `manage.html`: `relatieEngine.js` toegevoegd (ontbrak)

---

## Volgende stappen (fase 2)

- [ ] `home/export.html` repareren: `storage.js` en `schema.js` toevoegen, `get()` → `StamboomStorage.get()`
- [ ] `js/LSD.js` repareren: dubbele `DOMContentLoaded` verwijderen
- [ ] `js/export.js` repareren: `get()` vervangen door `StamboomStorage.get()`
- [ ] Zoekfunctie verbeteren
- [ ] Relaties ouder/kind/partner uitbreiden
- [ ] Stamboomvisualisatie upgrade
