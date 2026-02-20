// ===============================
// Universeel Auto-clear LocalStorage Script
// ===============================
(function() {
    const prefixes = ["import_", "create_", "export_"]; // keys die verwijderd worden
    const extraKeys = ["ID"]; // losse keys zoals ID

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

    // Koppel automatisch aan knoppen via data-action attribute
    const actions = ["create", "import", "refresh"];
    actions.forEach(action => {
        const buttons = document.querySelectorAll(`[data-action="${action}"]`);
        buttons.forEach(btn => btn.addEventListener("click", clearAppLocalStorage));
        console.log(`LocalStorage auto-clear actief op ${buttons.length} "${action}" knop(pen).`);
    });
})();
