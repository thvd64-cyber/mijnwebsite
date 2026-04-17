// ======================= ACCOUNT MODULE v1.0.0  =======================
// MyFamTreeCollab - Cloud profile & tree dashboard logic

// ======================= GLOBAL STATE =======================
let currentUser = null; // Active logged-in Supabase user
let userProfile = null; // Profile data from user_profiles table
let userTrees = []; // All trees belonging to user
let activeTreeId = null; // Currently selected tree

// ======================= INIT =======================
document.addEventListener("DOMContentLoaded", async () => {
    await initAccount(); // Start account initialization flow
});

// ======================= MAIN INIT FLOW =======================
async function initAccount() {
    await loadUser(); // Step 1: get logged-in user
    if (!currentUser) return; // Stop if no user logged in

    await ensureProfile(); // Step 2: create profile if missing
    await loadTrees(); // Step 3: load all trees

    renderProfile(); // Step 4: show profile UI
    renderTreeDropdown(); // Step 5: build dropdown
    renderTreeCards(); // Step 6: build cards
}

// ======================= LOAD USER =======================
async function loadUser() {
    // NOTE: assumes Supabase auth is available globally via window.supabase
    const { data } = await window.supabase.auth.getUser(); // Get current session user
    currentUser = data?.user || null; // Store user safely
}

// ======================= PROFILE UPSERT =======================
async function ensureProfile() {
    if (!currentUser) return; // Safety check

    const { data: existing } = await window.supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single(); // Try to fetch existing profile

    if (existing) {
        userProfile = existing; // Profile exists already
        return;
    }

    const { data: created } = await window.supabase
        .from("user_profiles")
        .insert([
            {
                user_id: currentUser.id, // Link to auth user
                display_name: currentUser.email // Default name
            }
        ])
        .select()
        .single(); // Create new profile

    userProfile = created; // Store created profile
}

// ======================= LOAD TREES =======================
async function loadTrees() {
    const { data } = await window.supabase
        .from("stambomen")
        .select("*")
        .eq("user_id", currentUser.id); // Only user trees

    userTrees = data || []; // Safe fallback

    if (userTrees.length > 0) {
        activeTreeId = userTrees[0].id; // Default first tree active
    }
}

// ======================= RENDER PROFILE =======================
function renderProfile() {
    const container = document.getElementById("profileInfo"); // Get UI container
    if (!container || !userProfile) return;

    container.innerHTML = `
        <p>Naam: ${userProfile.display_name || "Onbekend"}</p>
        <p>Email: ${currentUser.email}</p>
    `;
}

// ======================= DROPDOWN =======================
function renderTreeDropdown() {
    const dropdown = document.getElementById("treeDropdown"); // Get dropdown
    if (!dropdown) return;

    dropdown.innerHTML = ""; // Reset options

    userTrees.forEach(tree => {
        const option = document.createElement("option"); // Create option
        option.value = tree.id; // Tree ID
        option.textContent = tree.naam || "Mijn stamboom"; // Display name
        dropdown.appendChild(option); // Add to dropdown
    });

    dropdown.value = activeTreeId; // Set active

    dropdown.addEventListener("change", (e) => {
        activeTreeId = e.target.value; // Update active tree
        renderTreeCards(); // Refresh UI
    });
}

// ======================= TREE CARDS =======================
function renderTreeCards() {
    const container = document.getElementById("treeCards"); // Get container
    if (!container) return;

    container.innerHTML = ""; // Reset UI

    userTrees.forEach(tree => {
        const card = document.createElement("div"); // Create card
        card.className = "tree-card"; // CSS hook

        card.innerHTML = `
            <h3>${tree.naam || "Mijn stamboom"}</h3>
            <p>ID: ${tree.id}</p>
            <button data-id="${tree.id}">Open</button>
        `;

        // Highlight active tree
        if (tree.id === activeTreeId) {
            card.style.border = "2px solid green";
        }

        // Open handler
        card.querySelector("button").addEventListener("click", () => {
            activeTreeId = tree.id; // Set active
            document.getElementById("treeDropdown").value = tree.id; // Sync dropdown
            renderTreeCards(); // Refresh UI
        });

        container.appendChild(card); // Add to DOM
    });
}
