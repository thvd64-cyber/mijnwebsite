// ===============================
// Auto-clear localStorage op export/create + ID-data
// ===============================
(function() {
    const prefixes = ["import_", "create_", "export_"]; // prefix keys
    const extraKeys = ["ID"]; // losse keys zoals ID die ook verwijderd moeten worden

    function clearAppLocalStorage() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (prefixes.some(prefix => key.startsWith(prefix)) || extraKeys.includes(key)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if(keysToRemove.length) {
                console.log(`LocalStorage keys verwijderd: ${keysToRemove.join(", ")}`);
            }
        } catch (error) {
            console.error("Fout bij het verwijderen van localStorage keys:", error);
        }
    }

    // Detecteer automatisch alle knoppen met data-action export of create
    const buttons = document.querySelectorAll('[data-action="export"], [data-action="create"]');
    buttons.forEach(btn => btn.addEventListener("click", clearAppLocalStorage));

    console.log(`Auto-clear active op ${buttons.length} knoppen.`);
})();
