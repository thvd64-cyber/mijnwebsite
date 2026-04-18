# BACKLOG.md — MyFamTreeCollab
## Bijgewerkt: 2026-04-19

---

## Fase 5 — Cloud & accounts

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

## Bugfixes sessie 2026-04-19

| ID | Omschrijving | Status |
|----|-------------|--------|
| BF-01 | Supabase Site URL verkeerd — bevestigingsmail wees naar 404 | ✅ Opgelost |
| BF-02 | create.js — confirmBtn async/await mismatch, eerste persoon niet opgeslagen | ✅ Opgelost |
| BF-03 | history.js — CloudSync.listStambomen() result object niet unwrapped | ✅ Opgelost |
| BF-04 | history.html — Supabase SDK + auth.js ontbraken in laadvolgorde | ✅ Opgelost |
| BF-05 | topbar.js — localStorage niet gewist bij uit/inloggen | ✅ Opgelost |
| BF-06 | topbar.js — SIGNED_IN bij token refresh wiste cloud-geladen data | ✅ Opgelost |
| BF-07 | storage.html — renderTable() niet aangeroepen na cloud laden | ✅ Opgelost |
| BF-08 | cloudSync.js — dubbele .eq('id', userId) bug in saveToCloud() | ✅ Opgelost |

---

## Verbeteringen sessie 2026-04-19

| ID | Omschrijving | Status |
|----|-------------|--------|
| VB-01 | topbar.js v2.2.0 — gebruikersmenu dropdown (Account / Versiegeschiedenis / Uitloggen) | ✅ Gedaan |
| VB-02 | storage.html v2.5.0 — wissel modal bij laden andere stamboom (3 knoppen) | ✅ Gedaan |

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
