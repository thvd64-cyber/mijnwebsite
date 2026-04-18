/**
 * history.js
 * Version: 1.0.0
 * Page logic for account/history.html — version history viewer.
 * Depends on: window.VersionControl (versionControl.js),
 *             window.CloudSync      (cloudSync.js),
 *             window.AuthModule     (auth.js)
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

  /**
   * showStatus — display a feedback message in the status banner.
   * @param {string} tekst    — message to display
   * @param {"ok"|"error"|"info"} type — visual style
   * @param {number} ms       — auto-hide after ms (0 = stay visible)
   */
  function showStatus(tekst, type = "info", ms = 4000) {
    statusMsg.textContent = tekst;                          // set message text
    statusMsg.className = `status-${type}`;                 // apply colour class
    statusMsg.style.display = "block";                      // make visible
    if (ms > 0) {
      setTimeout(() => { statusMsg.style.display = "none"; }, ms); // auto-hide
    }
  }

  /**
   * formatDatum — convert ISO timestamp to Dutch locale datetime string.
   * @param {string} iso — ISO 8601 string from Supabase
   * @returns {string} formatted date, e.g. "14 apr. 2026 15:42"
   */
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

  /**
   * getPersonNaam — extract the best display name from a person object.
   * @param {object} p — person data object
   * @returns {string}
   */
  function getPersonNaam(p) {
    // Try common field name variations used in the schema
    return p.naam || p.voornaam || p.name || p.id || "Onbekend";
  }

  // ── Stamboom list loading ──────────────────────────────────────────────────

  /**
   * laadStamboomLijst — populate the stamboom <select> dropdown.
   * Uses CloudSync.listStambomen() which returns [ { id, naam } ].
   */
  async function laadStamboomLijst() {
    // Guard: CloudSync must be loaded
    if (!window.CloudSync || typeof window.CloudSync.listStambomen !== "function") {
      showStatus("CloudSync niet beschikbaar. Ben je ingelogd?", "error", 0);
      return;
    }

    try {
      const stambomen = await window.CloudSync.listStambomen(); // fetch from Supabase

      // Clear existing options except the placeholder
      stamboomSelect.innerHTML = '<option value="">— Kies een stamboom —</option>';

      if (!stambomen || stambomen.length === 0) {
        showStatus("Geen stambomen gevonden in je account.", "info");
        return;
      }

      // Add one <option> per family tree
      stambomen.forEach((sb) => {
        const opt = document.createElement("option");
        opt.value       = sb.id;          // UUID
        opt.textContent = sb.naam || sb.id; // display name
        stamboomSelect.appendChild(opt);
      });

    } catch (err) {
      console.error("[history] laadStamboomLijst error:", err);
      showStatus("Fout bij laden van stambomen: " + err.message, "error", 0);
    }
  }

  // ── Version list rendering ─────────────────────────────────────────────────

  /**
   * laadVersies — fetch and render the version list for the selected stamboom.
   * @param {string} stamboomId — UUID of the selected family tree
   */
  async function laadVersies(stamboomId) {
    // Reset UI state
    versieLijst.innerHTML = '<p class="leeg-bericht">Versies laden…</p>';
    previewPanel.style.display = "none";   // hide stale preview
    diffPanel.style.display   = "none";    // hide stale diff
    compareVanVersie = null;               // reset comparison state

    try {
      gelaadenVersies = await window.VersionControl.listVersions(stamboomId); // fetch metadata

      if (!gelaadenVersies || gelaadenVersies.length === 0) {
        versieLijst.innerHTML = '<p class="leeg-bericht">Geen versies gevonden voor deze stamboom.</p>';
        return;
      }

      // Render each version as a card row
      versieLijst.innerHTML = ""; // clear loading message
      gelaadenVersies.forEach((v) => {
        versieLijst.appendChild(maakVersieRij(v)); // add DOM card
      });

    } catch (err) {
      console.error("[history] laadVersies error:", err);
      showStatus("Fout bij laden van versies: " + err.message, "error", 0);
      versieLijst.innerHTML = '<p class="leeg-bericht">Kan versies niet laden.</p>';
    }
  }

  /**
   * maakVersieRij — create and return a DOM element for one version row.
   * @param {object} versie — version metadata { id, versienummer, opgeslagen_op, label }
   * @returns {HTMLElement}
   */
  function maakVersieRij(versie) {
    const rij = document.createElement("div");
    rij.className  = "versie-rij";
    rij.dataset.id = versie.id; // store UUID for button handlers

    // Version number badge
    const badge = document.createElement("span");
    badge.className   = "versie-badge";
    badge.textContent = `v${versie.versienummer}`;

    // Date and label info
    const info = document.createElement("span");
    info.className   = "versie-info";
    info.textContent = `${formatDatum(versie.opgeslagen_op)}  —  ${versie.label || ""}`;

    // Action buttons container
    const acties = document.createElement("div");
    acties.className = "versie-acties";

    // Preview button
    const btnPreview = document.createElement("button");
    btnPreview.textContent = "👁 Preview";
    btnPreview.title       = "Bekijk de inhoud van deze versie";
    btnPreview.addEventListener("click", () => toonPreview(versie)); // attach handler

    // Restore button
    const btnRestore = document.createElement("button");
    btnRestore.textContent = "⏪ Terugzetten";
    btnRestore.title       = "Zet je stamboom terug naar deze versie";
    btnRestore.className   = "btn-terugzetten";
    btnRestore.addEventListener("click", () => bevestigTerugzetten(versie)); // attach handler

    // Compare button — selects this version as the "compare from" anchor
    const btnVergelijk = document.createElement("button");
    btnVergelijk.textContent = "🔍 Vergelijk";
    btnVergelijk.title       = "Vergelijk met een andere versie";
    btnVergelijk.addEventListener("click", () => startVergelijking(versie, rij)); // attach handler

    acties.appendChild(btnPreview);
    acties.appendChild(btnRestore);
    acties.appendChild(btnVergelijk);

    rij.appendChild(badge);
    rij.appendChild(info);
    rij.appendChild(acties);

    return rij;
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  /**
   * toonPreview — load and display the person list of a historic version.
   * @param {object} versie — version metadata object
   */
  async function toonPreview(versie) {
    previewTitel.textContent  = `Preview — v${versie.versienummer} (${formatDatum(versie.opgeslagen_op)})`;
    previewInhoud.innerHTML   = "Laden…";          // loading placeholder
    previewPanel.style.display = "block";           // show panel
    diffPanel.style.display    = "none";            // hide diff if open

    try {
      const data = await window.VersionControl.getVersionData(versie.id); // fetch full snapshot

      // Normalise to persons array
      const persons = Array.isArray(data) ? data : (data?.personen || []);

      if (persons.length === 0) {
        previewInhoud.innerHTML = '<span class="leeg-bericht">Geen personen in deze versie.</span>';
        return;
      }

      // Render each person as a small chip
      previewInhoud.innerHTML = "";
      persons.forEach((p) => {
        const chip = document.createElement("span");
        chip.className   = "persoon-chip";
        chip.textContent = getPersonNaam(p);  // best available name
        previewInhoud.appendChild(chip);
      });

      // Show total count
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

  /**
   * bevestigTerugzetten — show a confirmation dialog before restoring a version.
   * @param {object} versie — version metadata object
   */
  async function bevestigTerugzetten(versie) {
    // Use native confirm() — no custom modal dependency
    const ok = window.confirm(
      `Weet je zeker dat je je stamboom wilt terugzetten naar v${versie.versienummer}?\n` +
      `(${formatDatum(versie.opgeslagen_op)})\n\n` +
      `De huidige versie wordt eerst opgeslagen als nieuwe versie.`
    );

    if (!ok) return; // user cancelled

    showStatus("Terugzetten bezig…", "info", 0); // sticky while processing

    try {
      await window.VersionControl.restoreVersion(huidigStamboomId, versie.id); // restore
      showStatus(`✅ Stamboom teruggezet naar v${versie.versienummer}. Pagina ververst…`, "ok", 0);
      // Reload version list to reflect the new restore-entry
      setTimeout(() => laadVersies(huidigStamboomId), 1800);
    } catch (err) {
      console.error("[history] bevestigTerugzetten error:", err);
      showStatus("Fout bij terugzetten: " + err.message, "error", 0);
    }
  }

  // ── Compare / Diff ─────────────────────────────────────────────────────────

  /**
   * startVergelijking — handle the compare flow.
   * First click selects version A; second click on another version triggers the diff.
   * @param {object} versie   — the clicked version
   * @param {HTMLElement} rij — the DOM row element (for visual highlight)
   */
  async function startVergelijking(versie, rij) {
    if (!compareVanVersie) {
      // First selection: mark this version as anchor A
      compareVanVersie = versie;
      // Highlight the selected row so user knows which one is "A"
      document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = ""); // clear all
      rij.style.outline = "2px solid var(--accent, #5b4fcf)";                       // highlight A
      showStatus(`v${versie.versienummer} geselecteerd als vergelijkingsbasis. Klik nu op een andere versie om te vergelijken.`, "info", 0);
      return;
    }

    // Second selection: run the diff between A and the clicked version
    if (compareVanVersie.id === versie.id) {
      // Same version clicked twice: cancel comparison
      compareVanVersie = null;
      document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = "");
      showStatus("Vergelijking geannuleerd.", "info");
      return;
    }

    // Determine which version is older (A) and which is newer (B) by versienummer
    const versionA = compareVanVersie.versienummer < versie.versienummer ? compareVanVersie : versie;
    const versionB = compareVanVersie.versienummer < versie.versienummer ? versie : compareVanVersie;

    // Reset highlight and comparison state
    compareVanVersie = null;
    document.querySelectorAll(".versie-rij").forEach((r) => r.style.outline = "");
    showStatus("Vergelijking laden…", "info", 0);

    try {
      const diff = await window.VersionControl.compareVersions(versionA.id, versionB.id); // compute diff
      toonDiff(diff, versionA, versionB); // render result
      showStatus("", "info", 1); // hide status
    } catch (err) {
      console.error("[history] startVergelijking error:", err);
      showStatus("Fout bij vergelijken: " + err.message, "error", 0);
    }
  }

  /**
   * toonDiff — render the diff result into the three-column diff panel.
   * @param {object} diff     — { toegevoegd, verwijderd, gewijzigd }
   * @param {object} versionA — older version metadata
   * @param {object} versionB — newer version metadata
   */
  function toonDiff(diff, versionA, versionB) {
    // Update heading with version numbers being compared
    diffTitel.textContent = `Vergelijking — v${versionA.versienummer} → v${versionB.versienummer}`;

    // Update count badges
    cntToegevoegd.textContent  = diff.toegevoegd.length;
    cntGewijzigd.textContent   = diff.gewijzigd.length;
    cntVerwijderd.textContent  = diff.verwijderd.length;

    // ── Render "Toegevoegd" column ─────────────────────────────────────────
    diffToegevoegd.innerHTML = "";
    if (diff.toegevoegd.length === 0) {
      diffToegevoegd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.toegevoegd.forEach((p) => {
        const div = document.createElement("div");
        div.className   = "diff-item";
        div.textContent = getPersonNaam(p);   // display name of added person
        diffToegevoegd.appendChild(div);
      });
    }

    // ── Render "Gewijzigd" column ──────────────────────────────────────────
    diffGewijzigd.innerHTML = "";
    if (diff.gewijzigd.length === 0) {
      diffGewijzigd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.gewijzigd.forEach((persoon) => {
        const div = document.createElement("div");
        div.className = "diff-item";

        // Person name header
        const naam = document.createElement("strong");
        naam.textContent = persoon.naam; // display name
        div.appendChild(naam);

        // Field-level changes
        persoon.velden.forEach((v) => {
          const veldDiv = document.createElement("div");
          veldDiv.className = "diff-veld";

          const label = document.createElement("span");
          label.textContent = `${v.veld}: `; // field name

          const oud = document.createElement("span");
          oud.className   = "diff-oud";
          oud.textContent = v.oud !== undefined ? String(v.oud) : "—"; // old value

          const pijl = document.createTextNode(" → ");

          const nieuw = document.createElement("span");
          nieuw.className   = "diff-nieuw";
          nieuw.textContent = v.nieuw !== undefined ? String(v.nieuw) : "—"; // new value

          veldDiv.appendChild(label);
          veldDiv.appendChild(oud);
          veldDiv.appendChild(pijl);
          veldDiv.appendChild(nieuw);
          div.appendChild(veldDiv);
        });

        diffGewijzigd.appendChild(div);
      });
    }

    // ── Render "Verwijderd" column ─────────────────────────────────────────
    diffVerwijderd.innerHTML = "";
    if (diff.verwijderd.length === 0) {
      diffVerwijderd.innerHTML = '<p class="leeg-bericht">Geen</p>';
    } else {
      diff.verwijderd.forEach((p) => {
        const div = document.createElement("div");
        div.className   = "diff-item";
        div.textContent = getPersonNaam(p);   // display name of removed person
        diffVerwijderd.appendChild(div);
      });
    }

    // Show the diff panel and scroll to it
    diffPanel.style.display   = "block";
    previewPanel.style.display = "none"; // hide preview to avoid clutter
    diffPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Event listeners ────────────────────────────────────────────────────────

  /** Stamboom dropdown change — load version list for selected tree */
  stamboomSelect.addEventListener("change", async () => {
    huidigStamboomId = stamboomSelect.value; // store selected UUID

    if (!huidigStamboomId) {
      // Placeholder selected: reset UI
      versieLijst.innerHTML = '<p class="leeg-bericht">Kies een stamboom om de versiehistorie te laden.</p>';
      previewPanel.style.display = "none";
      diffPanel.style.display    = "none";
      return;
    }

    await laadVersies(huidigStamboomId); // load versions for selected tree
  });

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * init — main entry point, runs after DOMContentLoaded.
   * Checks auth state, then loads the stamboom list.
   */
  async function init() {
    // Guard: user must be logged in
    if (!window.AuthModule || typeof window.AuthModule.getUser !== "function") {
      // AuthModule may not be ready yet — wait for it
      showStatus("Authenticatie laden…", "info", 0);
      // Retry once after a short delay
      await new Promise((res) => setTimeout(res, 800));
    }

    try {
      // Check if a user session is active
      const user = await window.AuthModule?.getUser?.(); // some implementations return user object
      if (!user) {
        showStatus("Je bent niet ingelogd. Ga naar de inlogpagina.", "error", 0);
        return;
      }
    } catch {
      // Some auth module shapes don't expose getUser() — proceed anyway
      // The Supabase RLS will enforce access server-side
    }

    // Load the family tree dropdown
    await laadStamboomLijst();
    showStatus("Kies een stamboom om de versiehistorie te bekijken.", "info", 3000);
  }

  // Run init after DOM is fully ready
  document.addEventListener("DOMContentLoaded", init);

})();
