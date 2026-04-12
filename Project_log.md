# MyFamTreeCollab — Project Log

> Chronologisch overzicht van alle sessies en wijzigingen.

---

## Sessie 10 — Fase A: Auth, Login Modal, Ko-fi, SMTP & Wachtwoord Reset

**Datum:** april 2026
**Doel:** Supabase authenticatie opzetten, login modal bouwen, Ko-fi integreren, SMTP werkend krijgen en wachtwoord-reset flow implementeren.

### Nieuwe bestanden

| Bestand | Versie | Omschrijving |
|---------|--------|--------------|
| `js/auth.js` | v2.2.0 | Supabase auth module: register, login, logout, resetPassword, updatePassword, getProfile |
| `js/topbar.js` | v2.0.2 | TopBar auth modal: login, registratie, wachtwoord vergeten tabs |
| `js/reset.js` | v1.0.0 | Wachtwoord reset logica voor reset.html |
| `home/reset.html` | v1.0.0 | Wachtwoord instellen pagina na resetlink uit mail |
| `bronnen/handleiding.html` | v1.0.0 | Gebruikershandleiding |

### Gewijzigde bestanden

| Bestand | Van | Naar | Wijziging |
|---------|-----|------|-----------|
| `Layout/TopBar.html` | v0.2 | v0.4 | Auth slot + Ko-fi knop toegevoegd |
| `Layout/Footer.html` | v1.4 | v1.5 | Ko-fi knop toegevoegd |
| `home/about.html` | v2.0.2 | v2.0.3 | Ko-fi sectie toegevoegd |
| `home/create.html` | v2.0.0 | v2.0.1 | Supabase scripts + correcte laadvolgorde |
| `home/export.html` | v2.1.0 | v2.1.1 | Supabase scripts + correcte laadvolgorde |
| `index.html` | v2.0.1 | v2.0.2 | Supabase scripts + correcte laadvolgorde |

### Supabase configuratie

| Onderdeel | Waarde |
|-----------|--------|
| Project URL | `https://xpufzrjncivyzyukwcmn.supabase.co` |
| Tabel | `profiles` (id, username, avatar_id, created_at) |
| RLS | Aan — gebruiker ziet alleen eigen profiel |
| Trigger | `handle_new_user` — maakt profiel aan bij registratie |
| SMTP | Gmail App Password |
| Redirect URL | `https://thvd64-cyber.github.io/MyFamTreeCollab/home/reset.html` |
| Site URL | `https://thvd64-cyber.github.io/MyFamTreeCollab` |

### Belangrijke beslissingen

- **Login modal** via popup — niet via aparte pagina
- **topbar.js** laadt via `createElement` NADAT TopBar HTML in DOM zit
- **SMTP** via Gmail App Password — tijdelijk, eigen domein aanbevolen later
- **Ko-fi** op `ko-fi.com/myfamtreecollab`
- **E-mailbevestiging** uitgeschakeld voor nu — aan te zetten zodra SMTP stabiel

### Technische schuld toegevoegd

| ID | Omschrijving |
|----|--------------|
| TD-07 | SMTP via Gmail — niet ideaal voor productie, eigen domein nodig |

### Volgende sessie: Fase A+

Doel: cloud backup implementeren.

Taken:
1. `FA+-01` — Supabase tabel `stambomen` aanmaken
2. `FA+-02` — `js/cloudSync.js` bouwen
3. `FA+-03` — Knop op `stamboom/storage.html`
4. `FA+-04` — Gratis limiet (max 100 personen) bewaken
5. `FA+-05` — Laad vanuit cloud knop

---

## Sessies 1–9 — Zie eerdere PROJECT_LOG.md entries
