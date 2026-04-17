/**
 * account/account.js — v1.0.0
 * MyFamTreeCollab — Account overview page
 * -----------------------------------------
 * Handles: profile display, cloud tree list,
 *          local data summary, password change
 * Depends on: auth.js, cloudSync.js, storage.js
 * Author: MyFamTreeCollab
 * Last updated: 2026-04
 */

// ─── Wait for DOM to be fully loaded ────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {

  // ── 1. Check auth state — redirect to home if not logged in ─────────────
  const session = await window.AuthModule.getSession();           // fetch current Supabase session
  if (!session) {                                                  // no active session
    window.location.href = "/MyFamTreeCollab/index.html";                   // redirect to homepage
    return;                                                        // stop execution
  }

  // ── 2. Load profile from Supabase ───────────────────────────────────────
  const profile = await window.AuthModule.getProfile();           // fetch profiles row for current user

  // ── 3. Render profile section ────────────────────────────────────────────
  renderProfile(session, profile);                                 // fill in avatar, name, tier, email

  // ── 4. Load cloud tree list ──────────────────────────────────────────────
  await renderCloudTrees();                                        // list all stambomen from Supabase

  // ── 5. Render local data summary ─────────────────────────────────────────
  renderLocalSummary();                                            // count local persons + active tree

  // ── 6. Wire up password change form ──────────────────────────────────────
  initPasswordForm();                                              // attach submit handler

  // ── 7. Wire up avatar selector ───────────────────────────────────────────
  initAvatarSelector(profile);                                     // highlight current avatar, save on click

});

// ─── AVATAR CONFIG ──────────────────────────────────────────────────────────
const AVATARS = [                                                  // list of available avatar IDs
  { id: 1, emoji: "👤", label: "Standaard" },
  { id: 2, emoji: "👴", label: "Opa" },
  { id: 3, emoji: "👵", label: "Oma" },
  { id: 4, emoji: "🧑", label: "Persoon" },
  { id: 5, emoji: "👨‍💼", label: "Professional" },
  { id: 6, emoji: "👩‍💼", label: "Professional V" },
  { id: 7, emoji: "🧓", label: "Senior" },
  { id: 8, emoji: "🕵️", label: "Onderzoeker" },
];

// ─── TIER LABELS ─────────────────────────────────────────────────────────────
const TIER_LABELS = {                                              // human-readable tier names
  free:       { label: "Gratis",      badge: "badge-free"       },
  viewer:     { label: "Viewer",      badge: "badge-viewer"     },
  supporter:  { label: "Supporter",   badge: "badge-supporter"  },
  personal:   { label: "Persoonlijk", badge: "badge-personal"   },
  family:     { label: "Familiepakket", badge: "badge-family"   },
  researcher: { label: "Onderzoeker", badge: "badge-researcher" },
  admin:      { label: "Admin",       badge: "badge-admin"      },
};

// ─── renderProfile ───────────────────────────────────────────────────────────
/**
 * Fills the profile card with user data.
 * @param {object} session  - Supabase session object
 * @param {object|null} profile - profiles table row
 */
function renderProfile(session, profile) {

  const user = session.user;                                       // extract Supabase user object

  // -- avatar emoji --
  const avatarId   = profile?.avatar_id ?? 1;                    // default to avatar 1
  const avatarObj  = AVATARS.find(a => a.id === avatarId) || AVATARS[0]; // find matching avatar
  document.getElementById("profile-avatar").textContent = avatarObj.emoji; // show emoji

  // -- username --
  const username = profile?.username ?? user.email;              // fallback to email if no username
  document.getElementById("profile-username").textContent = username;

  // -- email --
  document.getElementById("profile-email").textContent = user.email;

  // -- member since --
  const since = new Date(user.created_at).toLocaleDateString("nl-BE", {
    year: "numeric", month: "long", day: "numeric"               // format: 12 april 2025
  });
  document.getElementById("profile-since").textContent = since;

  // -- tier badge --
  const tier      = profile?.tier ?? "free";                     // default to free
  const tierInfo  = TIER_LABELS[tier] || TIER_LABELS.free;      // lookup label config
  const tierEl    = document.getElementById("profile-tier");
  tierEl.textContent = tierInfo.label;                           // set label text
  tierEl.className   = `tier-badge ${tierInfo.badge}`;          // apply tier-specific CSS class

  // -- tier until date (if applicable) --
  const untilEl = document.getElementById("profile-tier-until");
  if (profile?.tier_until && tier !== "free" && tier !== "admin") {
    const until = new Date(profile.tier_until).toLocaleDateString("nl-BE", {
      year: "numeric", month: "long", day: "numeric"
    });
    untilEl.textContent = `Geldig tot: ${until}`;               // show expiry date
    untilEl.style.display = "block";                             // make visible
  } else {
    untilEl.style.display = "none";                              // hide if no expiry
  }

  // -- cloud access indicator --
  const cloudTiers = ["supporter","personal","family","researcher","admin"]; // tiers with cloud access
  const hasCloud   = cloudTiers.includes(tier);
  document.getElementById("cloud-access-status").textContent =
    hasCloud ? "✅ Cloud toegang actief" : "❌ Geen cloud toegang (upgrade vereist)";
}

// ─── renderCloudTrees ────────────────────────────────────────────────────────
/**
 * Loads cloud stambomen list and renders it.
 * Shows upgrade prompt for free users.
 */
async function renderCloudTrees() {

  const container = document.getElementById("cloud-trees-list");  // target element
  container.innerHTML = `<p class="loading-text">Laden...</p>`;   // show loading state

  // -- check cloud access --
  const tier = await window.AuthModule.getTier();                 // get current tier from profiles
  const cloudTiers = ["supporter","personal","family","researcher","admin"];
  if (!cloudTiers.includes(tier)) {                              // no cloud access
    container.innerHTML = `
      <div class="upgrade-notice">
        <span class="upgrade-icon">☁️</span>
        <p>Cloud opslag is beschikbaar vanaf het <strong>Supporter</strong> pakket.</p>
        <a href="/MyFamTreeCollab/abonnementen/index.html" class="btn-upgrade">Bekijk abonnementen</a>
      </div>`;
    return;                                                        // stop here for free users
  }

  // -- fetch cloud tree list --
  let trees = [];
  try {
    trees = await window.CloudSync.listStambomen();               // returns array of {id, naam, updated_at}
  } catch (err) {
    container.innerHTML = `<p class="error-text">Fout bij laden: ${window.ftSafe(err.message)}</p>`;
    return;                                                        // stop on error
  }

  if (!trees || trees.length === 0) {                            // no trees yet
    container.innerHTML = `<p class="empty-text">Nog geen stambomen in de cloud opgeslagen.</p>`;
    return;
  }

  // -- render list --
  const activeId = window.StamboomStorage.getActiveTreeId();     // currently loaded cloud tree
  container.innerHTML = "";                                       // clear loading text

  trees.forEach(tree => {                                         // iterate each cloud tree
    const isActive = tree.id === activeId;                       // check if this tree is active
    const updated  = new Date(tree.updated_at).toLocaleString("nl-BE", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });

    const item = document.createElement("div");                  // create row element
    item.className = `tree-item${isActive ? " tree-item--active" : ""}`;
    item.innerHTML = `
      <div class="tree-item__info">
        <span class="tree-item__name">
          🌳 ${window.ftSafe(tree.naam)}
          ${isActive ? `<span class="active-badge">Actief</span>` : ""}
        </span>
        <span class="tree-item__date">Opgeslagen: ${updated}</span>
      </div>
      <div class="tree-item__actions">
        <button class="btn-load" data-id="${tree.id}" data-naam="${window.ftSafe(tree.naam)}">Laden</button>
        <button class="btn-delete" data-id="${tree.id}" data-naam="${window.ftSafe(tree.naam)}">Verwijderen</button>
      </div>`;

    container.appendChild(item);                                  // add to DOM
  });

  // -- attach load button handlers --
  container.querySelectorAll(".btn-load").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id   = btn.dataset.id;                               // cloud tree UUID
      const naam = btn.dataset.naam;                             // tree name
      if (!confirm(`Stamboom "${naam}" laden? Dit overschrijft je huidige lokale data.`)) return;
      try {
        await window.CloudSync.loadFromCloud(id);                // load into localStorage
        window.StamboomStorage.setActiveTreeId(id);              // store active UUID
        window.StamboomStorage.setActiveTreeName(naam);          // store active name
        showToast(`✅ "${naam}" geladen!`);                      // success feedback
        await renderCloudTrees();                                 // refresh list (active badge update)
        renderLocalSummary();                                     // refresh local count
      } catch (err) {
        showToast(`❌ Fout: ${err.message}`, "error");           // error feedback
      }
    });
  });

  // -- attach delete button handlers --
  container.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id   = btn.dataset.id;
      const naam = btn.dataset.naam;
      if (!confirm(`Stamboom "${naam}" permanent verwijderen uit de cloud?`)) return;
      try {
        await window.CloudSync.deleteFromCloud(id);              // delete from Supabase
        if (window.StamboomStorage.getActiveTreeId() === id) {  // if deleted tree was active
          window.StamboomStorage.setActiveTreeId(null);          // clear active ID
          window.StamboomStorage.setActiveTreeName(null);        // clear active name
        }
        showToast(`🗑️ "${naam}" verwijderd.`);
        await renderCloudTrees();                                 // refresh list
      } catch (err) {
        showToast(`❌ Fout: ${err.message}`, "error");
      }
    });
  });
}

// ─── renderLocalSummary ───────────────────────────────────────────────────────
/**
 * Shows local storage stats: person count and active tree name.
 */
function renderLocalSummary() {

  const persons = window.StamboomStorage.getAll();               // get all local persons
  document.getElementById("local-count").textContent =
    `${persons.length} personen opgeslagen`;                     // show count

  const activeName = window.StamboomStorage.getActiveTreeName(); // active tree name from localStorage
  const activeEl   = document.getElementById("local-active");
  activeEl.textContent = activeName                              // show name or dash
    ? `Actieve stamboom: ${activeName}`
    : "Geen actieve stamboom geselecteerd";
}

// ─── initPasswordForm ─────────────────────────────────────────────────────────
/**
 * Attaches submit handler to the password change form.
 */
function initPasswordForm() {

  const form   = document.getElementById("password-form");       // form element
  const status = document.getElementById("password-status");     // feedback element

  form.addEventListener("submit", async (e) => {
    e.preventDefault();                                           // prevent page reload

    const newPw  = document.getElementById("new-password").value.trim();  // new password input
    const confPw = document.getElementById("confirm-password").value.trim(); // confirm input

    if (newPw.length < 8) {                                      // minimum length check
      status.textContent = "❌ Wachtwoord moet minimaal 8 tekens zijn.";
      status.className   = "form-status form-status--error";
      return;
    }
    if (newPw !== confPw) {                                       // match check
      status.textContent = "❌ Wachtwoorden komen niet overeen.";
      status.className   = "form-status form-status--error";
      return;
    }

    status.textContent = "Opslaan...";                            // loading feedback
    status.className   = "form-status";

    try {
      await window.AuthModule.updatePassword(newPw);             // call auth module to update
      status.textContent = "✅ Wachtwoord succesvol gewijzigd.";
      status.className   = "form-status form-status--success";
      form.reset();                                               // clear form fields
    } catch (err) {
      status.textContent = `❌ ${err.message}`;
      status.className   = "form-status form-status--error";
    }
  });
}

// ─── initAvatarSelector ───────────────────────────────────────────────────────
/**
 * Renders avatar grid and saves selection to Supabase profiles.
 * @param {object|null} profile - current profile row
 */
function initAvatarSelector(profile) {

  const grid    = document.getElementById("avatar-grid");        // avatar grid container
  const current = profile?.avatar_id ?? 1;                      // currently selected avatar

  AVATARS.forEach(av => {                                         // render each avatar option
    const btn = document.createElement("button");
    btn.className   = `avatar-btn${av.id === current ? " avatar-btn--active" : ""}`;
    btn.title       = av.label;                                   // tooltip
    btn.textContent = av.emoji;                                   // show emoji
    btn.dataset.id  = av.id;

    btn.addEventListener("click", async () => {
      grid.querySelectorAll(".avatar-btn").forEach(b =>           // deselect all
        b.classList.remove("avatar-btn--active"));
      btn.classList.add("avatar-btn--active");                   // select clicked
      document.getElementById("profile-avatar").textContent = av.emoji; // update header avatar

      try {
        await window.AuthModule.updateProfile({ avatar_id: av.id }); // save to Supabase
        showToast("✅ Avatar opgeslagen!");
      } catch (err) {
        showToast(`❌ ${err.message}`, "error");
      }
    });

    grid.appendChild(btn);                                        // add to DOM
  });
}

// ─── showToast ────────────────────────────────────────────────────────────────
/**
 * Shows a brief toast notification.
 * @param {string} msg   - message to display
 * @param {string} type  - "success" (default) or "error"
 */
function showToast(msg, type = "success") {

  const existing = document.getElementById("account-toast");     // check for existing toast
  if (existing) existing.remove();                               // remove if present

  const toast = document.createElement("div");                   // create toast element
  toast.id        = "account-toast";
  toast.className = `toast toast--${type}`;                     // apply type class
  toast.textContent = msg;
  document.body.appendChild(toast);                              // add to page

  setTimeout(() => toast.classList.add("toast--visible"), 10);  // trigger CSS transition
  setTimeout(() => {                                              // auto-remove after 3s
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 400);                        // wait for fade out
  }, 3000);
}
