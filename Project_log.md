# MyFamTreeCollab — Project Log

> Chronologisch overzicht van alle sessies en wijzigingen.

---

## Sessie 12 — Fase A+: Tier systeem, admin beveiliging & e-mail templates

**Datum:** april 2026
**Doel:** Tier/rollen systeem opzetten, admin dropdown beveiligen, e-mail templates in huisstijl.

### Nieuwe bestanden

| Bestand | Versie | Omschrijving |
|---------|--------|--------------|
| — | — | Geen nieuwe bestanden |

### Gewijzigde bestanden

| Bestand | Van | Naar | Wijziging |
|---------|-----|------|-----------|
| `js/auth.js` | v2.2.0 | v2.3.0 | `getTier()` toegevoegd, `getProfile()` haalt nu ook tier, is_admin, is_premium op |
| `js/cloudSync.js` | v1.0.0 | v1.1.0 | Tiercontrole: alleen premium/admin mag cloud gebruiken |
| `js/storage.js` | v2.0.1 | v2.0.2 | `canAdd()` toegevoegd (lokaal limiet 100 voor free), `getModified()` voor conflictdetectie |
| `js/topbar.js` | v2.0.2 | v2.0.3 | `_showAdminDropdown()` toegevoegd — admin check na login |
| `Layout/Navbar.html` | v0.0.1 | v0.0.2 | `#adminDropdown` standaard `display:none` |
| `stamboom/storage.html` | v2.2.0 | v2.3.0 | Tier meldingen, FA+-06 conflictmelding, upgrade melding voor free gebruikers |
| `bronnen/handleiding.html` | v1.0.0 | v1.1.0 | Tekstverbeteringen doorgevoerd |

### Supabase wijzigingen

| Onderdeel | Wijziging |
|-----------|-----------|
| `profiles` tabel | Kolommen toegevoegd: `is_admin`, `is_premium`, `tier`, `tier_until` |
| Constraint | `profiles_tier_check` — geldige tiers: free, viewer, supporter, personal, family, researcher, admin |
| Admin account | `thvd64@gmail.com` ingesteld als `is_admin=true, is_premium=true, tier=admin` |
| SQL bestand | "MyFamTreeCollab — roles & tiers" opgeslagen in PRIVATE queries |

### E-mail templates (alle bijgewerkt in huisstijl)

| Template | Status |
|----------|--------|
| Confirm signup | ✅ Huisstijl toegepast |
| Reset password | ✅ Huisstijl toegepast |
| Invite user | ✅ Huisstijl toegepast |
| Magic Link | ✅ Huisstijl toegepast |
| Change Email | ✅ Huisstijl toegepast |

### Tier structuur vastgelegd

| Tier | Lokaal | Cloud | Opmerkingen |
|------|--------|-------|-------------|
| free | 100 personen | ❌ | Gratis, geen account vereist |
| viewer | — | ❌ eigen | ✅ gedeelde stambomen bekijken (Fase 5) |
| supporter | Onbeperkt | ✅ | Ko-fi donateur |
| personal | Onbeperkt | ✅ | Betaald abonnement |
| family | Onbeperkt | ✅ | Betaald abonnement |
| researcher | Onbeperkt | ✅ | Betaald abonnement |
| admin | Onbeperkt | ✅ geen limiet | thvd64@gmail.com |

### Toekomstige beslissingen vastgelegd (backlog)

- Meerdere stambomen per gebruiker → Fase 5 (F5-07)
- account.html → Fase 5 (F5-08)
- Promotiecodes → Fase 5 (F5-09)
- Abonnementsprijzen → nog te definiëren (F5-10)

---

## Sessie 11 — Fase A+: Cloud backup

**Datum:** april 2026
**Doel:** Cloud backup implementeren via Supabase tabel `stambomen`.

### Nieuwe bestanden

| Bestand | Versie | Omschrijving |
|---------|--------|--------------|
| `js/cloudSync.js` | v1.0.0 | Cloud sync module: `saveToCloud()`, `loadFromCloud()`, `getCloudMeta()` |

### Gewijzigde bestanden

| Bestand | Van | Naar | Wijziging |
|---------|-----|------|-----------|
| `stamboom/storage.html` | v2.0.2 | v2.2.0 | Tabbladen Mijn data + Cloud backup, cloud UI |
| `js/storage.js` | v1.0.0 | v2.0.1 | `replaceAll()` methode toegevoegd |

### Supabase wijzigingen

| Tabel | Kolommen | RLS |
|-------|----------|-----|
| `stambomen` | `id, user_id, data (jsonb), updated_at` | Aan — eigen rij per gebruiker |
| Constraint | `stambomen_user_id_unique` | Één rij per gebruiker — vereist voor upsert |

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

---

## Sessies 1–9 — Zie eerdere PROJECT_LOG.md entries
