// ======================= account/account.js v1.0.1 =======================
// MyFamTreeCollab - Account dashboard logic (clean Supabase separation)

// ======================= GLOBAL STATE =======================
let currentUser = null; // Logged-in Supabase user
let userProfile = null; // Profile from user_profiles table
let userTrees = []; // All stambomen for user
let activeTreeId = null; // Currently selected tree

// ======================= INIT =======================
document.addEventListener("DOMContentLoaded", async () => {
    await initAccount(); // Start account flow after DOM is ready
});

// ======================= MAIN FLOW =======================
async function initAccount() {
    await loadUser(); // Get logged-in user

    if (!currentUser) {
        console.warn("No user logged in"); // Debug info
        return; // Stop if not authenticated
    }

    await ensureProfile(); // Create profile if missing
    await loadTrees(); // Load user trees

    renderProfile(); // Render profile UI
    renderTreeDropdown(); // Build dropdown selector
    renderTreeCards(); // Build card overview
}

// ======================= LOAD USER =======================
async function loadUser() {
    try {
        const { data, error } = await window.supabase.auth.getUser(); // Get session user

        if (error) {
            console.error("Auth error:", error);
            return;
        }

        currentUser = data?.user || null; // Safe assignment
    } catch (err) {
        console.error("loadUser failed:", err); // Hard fallback debug
    }
}

// ======================= PROFILE UPSERT =======================
async function ensureProfile() {
    if (!currentUser) return;

    try {
        const { data: existing, error: fetchError } = await window.supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", currentUser.id)
            .maybeSingle(); // safer than single()

        if (fetchError) {
            console.error("Profile fetch error:", fetchError);
        }

        if (existing) {
            userProfile = existing;
            return;
        }

        const { data: created, error: insertError } = await window.supabase
            .from("user_profiles")
            .insert([
                {
                    user_id: currentUser.id,
                    display_name: currentUser.email
                }
            ])
            .select()
            .maybeSingle();

        if (insertError) {
            console.error("Profile insert error:", insertError);
        }

        userProfile = created;
    } catch (err) {
        console.error("ensureProfile failed:", err);
    }
}

// ======================= LOAD TREES =======================
async function loadTrees() {
    if (!currentUser) return;

    try {
        const { data, error } = await window.supabase
            .from("stambomen")
            .select("*")
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Tree load error:", error);
        }

        userTrees = data || [];

        if (userTrees.length > 0) {
            activeTreeId = userTrees[0].id; // default active tree
        }
    } catch (err) {
        console.error("loadTrees failed:", err);
    }
}

// ======================= PROFILE UI =======================
function renderProfile() {
    const container = document.getElementById("profileInfo");
    if (!container) return;

    container.innerHTML = "";

    const name = userProfile?.display_name || "Onbekend";
    const email = currentUser?.email || "-";

    container.innerHTML = `
        <p><strong>Naam:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
    `;
}

// ======================= DROPDOWN =======================
function renderTreeDropdown() {
    const dropdown = document.getElementById("treeDropdown");
    if (!dropdown) return;

    dropdown.innerHTML = "";

    userTrees.forEach(tree => {
        const option = document.createElement("option");

        option.value = tree.id;
        option.textContent = tree.naam || "Mijn stamboom";

        dropdown.appendChild(option);
    });

    dropdown.value = activeTreeId;

    dropdown.onchange = (e) => {
        activeTreeId = e.target.value;
        renderTreeCards();
    };
}

// ======================= TREE CARDS =======================
function renderTreeCards() {
    const container = document.getElementById("treeCards");
    if (!container) return;

    container.innerHTML = "";

    userTrees.forEach(tree => {
        const card = document.createElement("div");
        card.className = "tree-card";

        const isActive = tree.id === activeTreeId;

        card.innerHTML = `
            <h3>${tree.naam || "Mijn stamboom"}</h3>
            <p>ID: ${tree.id}</p>
            <button>Open</button>
        `;

        if (isActive) {
            card.style.border = "2px solid green";
        }

        card.querySelector("button").onclick = () => {
            activeTreeId = tree.id;
            const dropdown = document.getElementById("treeDropdown");
            if (dropdown) dropdown.value = tree.id;

            renderTreeCards();
        };

        container.appendChild(card);
    });
}
