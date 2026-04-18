/**
 * history.js
 * Version: 1.1.0
 * Page logic for account/history.html — version history viewer.
 * Depends on: window.VersionControl (versionControl.js),
 *             window.CloudSync      (cloudSync.js),
 *             window.AuthModule     (auth.js)
 *
 * Wijziging v1.1.0:
 * - getPersonNaam() — Roepnaam/ID toegevoegd (MyFamTreeCollab veldnamen)
 * - laadStamboomLijst() — CloudSync.listStambomen() geeft { success, stambomen }
 *   terug, GEEN directe array. Fix: result.stambomen unwrappen.
 */

(function () {
  "use strict";

  // ── DOM references ─────────────────────────────────────────────────────────
  const stamboomSelect   = document.getElementById("stamboom-select");   // dropdown: which tree
  const versieLijst      = document.getElementById("versie-lijst");       // version list container
  const statusMsg        = document.getElementById("status-msg");         // feedback banner
  const previewPanel     = document.getElementById("preview-panel");      // preview section
  const previewTitel     = document.getElementById("preview-titel");      // preview heading
  const previewInhoud    = document.getElementById("preview-inhoud");     // preview content
  const diffPanel        = document.getElementById("diff-panel");         // diff section
  const diffTitel        = document.getElementById("diff-titel");         // diff heading
  const diffToegevoegd   = document.getElementById("diff-toegevoegd-inhoud");  // added column
  const diffGewijzigd    = document.getElementById("diff-gewijzigd-inhoud");   // changed column
  const diffVerwijderd   = document.getElementById("diff-verwijderd-inhoud");  // removed column
  const cntToegevoegd    = document.getElementById("diff-count-toegevoegd");   // count badge
  const cntGewijzigd     = document.getElementById("diff-count-gewijzigd");    // count badge
  const cntVerwijderd    = document.getElementById("diff-count-verwijderd");   // count badge

  // ── State ──────────────────────────────────────────────────────────────────
  let huidigStamboomId  = null;  // UUID of the currently selected family tree
  let gelaadenVersies   = [];    // cached array of version metadata objects
  let compareVanVersie  = null;  // UUID of the first version selected for comparison

  // ── Utility helpers ────────────────────────────────────────────────────────

  function showStatus(tekst, type = "info", ms = 4000) {
    statusMsg.textContent = tekst;
    statusMsg.className = `status-${type}`;
    statusMsg.style.display = "block";
    if (ms > 0) {
      setTimeout(() => { statusMsg.style.display = "none"; }, ms);
    }
  }

  function formatDatum(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("nl-BE", {
      day:    "numeric",
      month:  "short",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });
  }

  // v1.1.0 — uitgebreid met MyFamTreeCollab veldnamen (Roepnaam, ID)
  function getPersonNaam(p) {
    return p.Roepnaam  ||  // MyFamTreeCollab primair naamveld
           p.naam      ||  // generiek
           p.voornaam  ||  // generiek
           p.name      ||  // generiek
           p.ID        ||  // MyFamTreeCollab ID veld
           p.id        ||  // generiek
           "Onbekend";
  }

  // ── Stamboom list loading ──────────────────────────────────────────────────

  // v1.1.0 — CloudSync.listStambomen() geeft { success, stambomen: [...] } terug,
  // GEEN directe array. De v1.0.0 code deed stambomen.length op het result-object
  // zelf → altijd falsy → dropdown bleef leeg.
  async function laadStamboomLijst() {
    if (!window.CloudSync || typeof window.CloudSync.listStambomen !== "function") {
      showStatus("CloudSync niet beschikbaar. Ben je ingelogd?", "error", 0);
      return;
    }

    try {
      const result = await window.CloudSync.listStambomen(); // { success, stambomen, error? }

      // Foutafhandeling op basis van result object
      if (!result.success) {
        const berichten = {
          not_logged_in:   "Je bent niet ingelogd.",
          no_cloud_access: "Geen cloud-toegang voor dit account.",
        };
        showStatus(berichten[result.error] || "Fout: " + result.error, "error", 0);
        return;
      }

      // Unwrap — stambomen zit in result.stambomen, niet in result zelf
      const stambomen = result.stambomen || [];

      stamboomSelect.innerHTML = '<option value="">— Kies een stamboom —</option>';

      if (stambomen.length === 0) {
        showStatus("Geen stambomen gevonden in je account.", "info");
        return;
      }

      stambomen.forEach((sb) => {
        const opt = document.createElement("option");
        opt.value       = sb.id;
        opt.textContent = `${sb.naam || sb.id} (${sb.aantalPersonen || 0} personen)`;
        stamboomSelect.appendChild(opt);
      });

    } catch (err) {
      console.error("[history] laadStamboomLijst error:", err);
      showStatus("Fout bij laden van stambomen: " + err.message, "error", 0);
    }
  }

  // ── Version list rendering ─────────────────────────────────────────────────

  async function laadVersies(stamboomId) {
    versieLijst.innerHTML = '<p class="leeg-bericht">Versies laden…</p>';
    previewPanel.style.display = "none";
    diffPanel.style.display   = "none";
    compareVanVersie = null;

    try {
      gelaadenVersies = await window.VersionControl.listVersions(stamboomId);

      if (!gelaadenVersies || gelaadenVersies.length === 0) {
        versieLijst.innerHTML = '<p class="leeg-bericht">Geen versies gevonden voor deze stamboom.</p>';
        return;
      }

      versieLijst.innerHTML = "";
      gelaadenVersies.forEach((v) => {
        versieLijst.appendChild(maakVersieRij(v));
      });

    } catch (err) {
      console.error("[history] laadVersies error:", err);
      showStatus("Fout bij laden van versies: " + err.message, "error", 0);
      versieLijst.innerHTML = '<p class="leeg-bericht">Kan versies niet laden.</p>';
    }
  }

  function maakVersieRij(versie) {
    const rij = document.createElement("div");
    rij.className  = "versie-rij";
    rij.dataset.id = versie.id;

    const badge = document.createElement("span");
    badge.className   = "versie-badge";
    badge.textContent = `v${versie.versienummer}`;

    const info = document.createElement("span");
    info.className   = "versie-info";
    info.textContent = `${formatDatum(versie.opgeslagen_op)}  —  ${versie.label || ""}`;

    const acties = document.createElement("div");
    acties.className = "versie-acties";

    const btnPreview = document.createElement("button");
    btnPreview.textContent = "👁 Preview";
    btnPreview.title       = "Bekijk de inhoud van deze versie";
    btnPreview.addEventListener("click", () => toonPreview(versie));

    const btnRestore = document.createElement("button");
    btnRestore.textContent = "⏪ Terugzetten";
    btnRestore.title       = "Zet je stamboom terug naar deze versie";
    btnRestore.className   = "btn-terugzetten";
    btnRestore.addEventListener("click", () => bevestigTerugzetten(versie));

    const btnVergelijk = document.createElement("button");
    btnVergelijk.textContent = "🔍 Vergelijk";
    btnVergelijk.title       = "Vergelijk met een andere versie";
    btnVergelijk.addEventListener("click", () => startVergelijking(versie, rij));

    acties.appendChild(btnPreview);
    acties.appendChild(btnRestore);
    acties.appendChild(btnVergelijk);
    rij.appendChild(badge);
    rij.appendChild(info);
    rij.appendChild(acties);

    return rij;
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  async function toonPreview(versie) {
    previewTitel.textContent  = `Preview — v${versie.versienummer} (${formatDatum(versie.opgeslagen_op)})`;
    previewInhoud.innerHTML   = "Laden…";
    previewPanel.style.display = "block";
    diffPanel.style.display    = "none";

    try {
      const data = await window.VersionControl.getVersionData(versie.id);
      const persons = Array.isArray(data) ? data : (data?.personen || []);

      if (persons.length === 0) {
        previewInhoud.innerHTML = '<span class="leeg-bericht">Geen personen in deze versie.</span>';
        return;
      }

      previewInhoud.innerHTML = "";
      persons.forEach((p) => {
        const chip = document.createElement("span");
        chip.className   = "persoon-chip";
        chip.textContent = getPersonNaam(p);
        previewInhoud.appendChild(chip);
      });

      const teller = document.createElement("p");
      teller.style.cssText  = "width:100%;font-size:0.8rem;color:var(--text-muted,#888);margin-top:0.5rem";
      teller.textContent    = `${persons.length} persoon/personen`;
      previewInhoud.appendChild(teller);

    } catch (err) {
      console.error("[history] toonPreview error:", err);
      previewInhoud.innerHTML = `<span style="color:red">Fout: ${window.ftSafe ? window.ftSafe(err.message) : err.message}</span>`;
    }
  }

  // ── Restore ────────────────────────────────────────────────────────────────

  async function bevestigTerugzetten(versie) {
    const ok = window.confirm(
      `Weet je zeker dat je je stamboom wilt terugzetten naar v${versie.versienummer}?\n` +
      `(${formatDatum(versie.opgeslagen_op)})\n\n` +
      `De huidige versie wordt eerst opgeslagen als nieuwe versie.`
    );

    if (!ok) return;

    showStatus("Terugzetten bezig…", "info", 0);

    try {
      await window.VersionControl.restoreVersion(huidigStamboomId, versie.id);
      showStatus(`✅ Stamboom teruggezet naar v${versie.versienummer}. Pagina ververst…`, "ok", 0);
      setTimeout(() => laadVersies(huidigStamboomId), 1800);
    } catch (err) {
      console.error("[history] bevestigTerugzetten error:", err);
      showStatus("Fout bij terugzetten: " + err.message, "error", 0);
    }
  }

  // ── Compare / Diff ─────────────────────────────────────────────────────────

  async function startVergelijking(versie, rij) {
    if (!compareVanVersie) {
      compareVanVersie = versie;
      document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = "");
      rij.style.outline = "2px solid var(--accent, #5b4fcf)";
      showStatus(`v${versie.versienummer} geselecteerd als vergelijkingsbasis. Klik nu op een andere versie om te vergelijken.`, "info", 0);
      return;
    }

    if (compareVanVersie.id === versie.id) {
      compareVanVersie = null;
      document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = "");
      showStatus("Vergelijking geannuleerd.", "info");
      return;
    }

    const versionA = compareVanVersie.versienummer < versie.versienummer ? compareVanVersie : versie;
    const versionB = compareVanVersie.versienummer < versie.versienummer ? versie : compareVanVersie;

    compareVanVersie = null;
    document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = "");
    showStatus("Vergelijking laden…", "info", 0);

    try {
      const diff = await window.VersionControl.compareVersions(versionA.id, versionB.id);
      toonDiff(diff, versionA, versionB);
      showStatus("", "info", 1);
    } catch (err) {
      console.error("[history] startVergelijking error:", err);
      showStatus("Fout bij vergelijken: " + err.message, "error", 0);
    }
  }

  function toonDiff(diff, versionA, versionB) {
    diffTitel.textContent = `Vergelijking — v${versionA.versienummer} → v${versionB.versienummer}`;

    cntToegevoegd.textContent  = diff.toegevoegd.length;
    cntGewijzigd.textContent   = diff.gewijzigd.length;
    cntVerwijderd.textContent  = diff.verwijderd.length;

    diffToegevoegd.innerHTML = "";
    if (diff.toegevoegd.length === 0) {
      diffToegevoegd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.toegevoegd.forEach((p) => {
        const div = document.createElement("div");
        div.className   = "diff-item";
        div.textContent = getPersonNaam(p);
        diffToegevoegd.appendChild(div);
      });
    }

    diffGewijzigd.innerHTML = "";
    if (diff.gewijzigd.length === 0) {
      diffGewijzigd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.gewijzigd.forEach((persoon) => {
        const div = document.createElement("div");
        div.className = "diff-item";

        const naam = document.createElement("strong");
        naam.textContent = persoon.naam;
        div.appendChild(naam);

        persoon.velden.forEach((v) => {
          const veldDiv = document.createElement("div");
          veldDiv.className = "diff-veld";

          const label = document.createElement("span");
          label.textContent = `${v.veld}: `;

          const oud = document.createElement("span");
          oud.className   = "diff-oud";
          oud.textContent = v.oud !== undefined ? String(v.oud) : "—";

          const pijl = document.createTextNode(" → ");

          const nieuw = document.createElement("span");
          nieuw.className   = "diff-nieuw";
          nieuw.textContent = v.nieuw !== undefined ? String(v.nieuw) : "—";

          veldDiv.appendChild(label);
          veldDiv.appendChild(oud);
          veldDiv.appendChild(pijl);
          veldDiv.appendChild(nieuw);
          div.appendChild(veldDiv);
        });

        diffGewijzigd.appendChild(div);
      });
    }

    diffVerwijderd.innerHTML = "";
    if (diff.verwijderd.length === 0) {
      diffVerwijderd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.verwijderd.forEach((p) => {
        const div = document.createElement("div");
        div.className   = "diff-item";
        div.textContent = getPersonNaam(p);
        diffVerwijderd.appendChild(div);
      });
    }

    diffPanel.style.display    = "block";
    previewPanel.style.display = "none";
    diffPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  stamboomSelect.addEventListener("change", async () => {
    huidigStamboomId = stamboomSelect.value;

    if (!huidigStamboomId) {
      versieLijst.innerHTML = '<p class="leeg-bericht">Kies een stamboom om de versiehistorie te laden.</p>';
      previewPanel.style.display = "none";
      diffPanel.style.display    = "none";
      return;
    }

    await laadVersies(huidigStamboomId);
  });

  // ── Initialisation ─────────────────────────────────────────────────────────

  async function init() {
    if (!window.AuthModule || typeof window.AuthModule.getUser !== "function") {
      showStatus("Authenticatie laden…", "info", 0);
      await new Promise((res) => setTimeout(res, 800));    // wacht op auth.js initialisatie
    }

    try {
      const user = await window.AuthModule?.getUser?.();
      if (!user) {
        showStatus("Je bent niet ingelogd. Ga naar de inlogpagina.", "error", 0);
        return;
      }
    } catch {
      // AuthModule heeft geen getUser() — RLS doet de toegangscontrole server-side
    }

    await laadStamboomLijst();
    showStatus("Kies een stamboom om de versiehistorie te bekijken.", "info", 3000);
  }

  document.addEventListener("DOMContentLoaded", init);

})();
