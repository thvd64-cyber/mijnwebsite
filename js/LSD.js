// ================================
// Admin Menu Visibility – lines 1-15
// ================================

// Functie check of admin modus aan staat
// Controleert localStorage of de admin modus actief is
function isAdmin() {
    return localStorage.getItem("ft_admin_mode") === "true";
}

// Admin menu tonen/verbergen
// Vroeger selecteerde dit de eerste dropdown (bijv. Home), wat fout ging
// Nu targeten we specifiek het Admin menu via ID 'adminDropdown'
function updateAdminMenu() {
    const dropdown = document.getElementById("adminDropdown"); // target correct element
    if (!dropdown) return; // check of element bestaat

    if (isAdmin()) {
        dropdown.style.display = "block"; // admin menu zichtbaar
    } else {
        dropdown.style.display = "none";  // admin menu verborgen
    }
}

// Run bij DOM ready
// Zorgt dat het menu direct correct wordt weergegeven zodra de pagina geladen is
document.addEventListener("DOMContentLoaded", updateAdminMenu);

// Optioneel: activeer admin via geheime code in console
// localStorage.setItem("ft_admin_mode", "true"); location.reload();

// Run bij DOM ready
document.addEventListener("DOMContentLoaded", updateAdminMenu);

// Optioneel: activeer admin via geheime code
// localStorage.setItem("ft_admin_mode", "true"); location.reload();

/* ==========================================
   LSD.js – Local Storage Delete Manager
   Scope: ft_ and famTreeData keys only
   ========================================== */

const PREFIXES = ["ft_", "famTreeData"];
const TRASH_PREFIX = "ft_trash_";
const ADMIN_LOG = "ft_admin_log";

/* =========================
   INIT
   ========================= */
document.addEventListener("DOMContentLoaded", loadStorage);

/* =========================
   LOAD STORAGE OVERVIEW
   ========================= */
function loadStorage() {
    const tableDiv = document.getElementById("storageTable");
    const summaryDiv = document.getElementById("storageSummary");

    let totalSize = 0;
    let rows = "";

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (isAppKey(key)) {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            totalSize += size;

            rows += `
                <tr>
                    <td><input type="checkbox" value="${key}"></td>
                    <td>${key}</td>
                    <td>${size} bytes</td>
                    <td>
                        <button onclick="viewDetails('${key}')">View</button>
                    </td>
                </tr>
            `;
        }
    }

    tableDiv.innerHTML = `
        <table>
            <tr>
                <th>Select</th>
                <th>Key</th>
                <th>Size</th>
                <th>Details</th>
            </tr>
            ${rows}
        </table>
    `;

    summaryDiv.innerHTML = `
        <p><strong>Total Used:</strong> ${totalSize} bytes</p>
    `;
}

/* =========================
   CHECK APP KEY
   ========================= */
function isAppKey(key) {
    return PREFIXES.some(prefix => key.startsWith(prefix)) &&
           !key.startsWith(TRASH_PREFIX);
}

/* =========================
   VIEW DETAILS
   ========================= */
function viewDetails(key) {
    const value = localStorage.getItem(key);

    document.getElementById("modalContent").innerHTML =
        `<pre>${formatJSON(value)}</pre>`;

    document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

/* =========================
   SOFT DELETE (Move to Trash)
   ========================= */
function moveToTrash() {
    const selected = document.querySelectorAll("input[type='checkbox']:checked");

    if (selected.length === 0) {
        alert("Geen selectie gemaakt.");
        return;
    }

    if (!confirm("Selectie verplaatsen naar prullenbak?")) return;

    selected.forEach(cb => {
        const key = cb.value;
        const value = localStorage.getItem(key);

        localStorage.setItem(TRASH_PREFIX + key, value);
        localStorage.removeItem(key);

        logAdminAction("Moved to trash: " + key);
    });

    alert("Verplaatst naar prullenbak.");
    loadStorage();
}

/* =========================
   FACTORY RESET
   ========================= */
function factoryReset() {
    if (!confirm("Volledige reset uitvoeren?")) return;

    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);

        if (isAppKey(key)) {
            localStorage.removeItem(key);
        }
    }

    logAdminAction("Factory Reset uitgevoerd");

    alert("Reset voltooid.");
    loadStorage();
}

/* =========================
   ADMIN LOGGING
   ========================= */
function logAdminAction(action) {
    const log = JSON.parse(localStorage.getItem(ADMIN_LOG)) || [];

    log.push({
        action: action,
        timestamp: new Date().toISOString()
    });

    localStorage.setItem(ADMIN_LOG, JSON.stringify(log));
}

/* =========================
   FORMAT JSON OUTPUT
   ========================= */
function formatJSON(value) {
    try {
        return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
        return value;
    }
}
