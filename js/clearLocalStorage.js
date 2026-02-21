// ===============================
// manageLocalStorage.js
// Wis alle MyFamTreeCollab data + table cleanup + unieke ID generatie
// ===============================

(function() {

    // ===========================
    // Configuratie
    // ===========================
    const prefixes = ["personen_", "import_", "create_", "export_"];
    const extraKeys = ["ID"];
    const dynamicIDPattern = /^XHJ\d+$/; 
    const tableSelector = "#personTable tbody"; // pas aan naar jouw tabel tbody selector

    // ===========================
    // Functie: Clear alle personen data
    // ===========================
    function clearPersonData() {
        try {
            // Wis LocalStorage keys
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (
                    prefixes.some(prefix => key.startsWith(key)) ||
                    extraKeys.includes(key) ||
                    dynamicIDPattern.test(key)
                ) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if(keysToRemove.length) {
                console.log(`MyFamTreeCollab data verwijderd: ${keysToRemove.join(", ")}`);
            }

            // Wis alle tabelrijen
            const tbody = document.querySelector(tableSelector);
            if(tbody) {
                while(tbody.firstChild) {
                    tbody.removeChild(tbody.firstChild);
                }
                console.log("Tabelinhoud verwijderd voor een clean start.");
            }

        } catch (error) {
            console.error("Fout bij verwijderen MyFamTreeCollab data:", error);
        }
    }

    // ===========================
    // Functie: Genereer unieke ID
    // ===========================
    function generateUniqueID() {
        let newID;
        const existingIDs = Object.keys(localStorage)
            .filter(key => dynamicIDPattern.test(key) || key === "ID");
        do {
            const randomNumber = Math.floor(Math.random() * 999999) + 1;
            newID = "XHJ" + String(randomNumber).padStart(6, "0");
        } while(existingIDs.includes(newID));
        return newID;
    }

    // ===========================
    // Auto-koppeling aan knoppen
    // ===========================
    const actions = ["create", "import", "refresh"];
    actions.forEach(action => {
        const buttons = document.querySelectorAll(`[data-action="${action}"]`);
        if(buttons.length) {
            buttons.forEach(btn => {
                btn.addEventListener("click", () => {
                    clearPersonData();

                    // Voor create-knop: genereer nieuwe unieke ID
                    if(action === "create") {
                        const newID = generateUniqueID();
                        localStorage.setItem(newID, JSON.stringify({id: newID}));
                        console.log(`Nieuwe unieke ID aangemaakt: ${newID}`);
                    }
                });
            });
            console.log(`Auto-clear + table cleanup + ID-gen actief op ${buttons.length} "${action}" knop(pen).`);
        }
    });

    // ===========================
    // Wis bij verlaten / afsluiten pagina
    // ===========================
    window.addEventListener("beforeunload", clearPersonData);

})();
