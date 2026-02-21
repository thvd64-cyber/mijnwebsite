// ===============================
// manageLocalStorage.js – aangepaste flow
// ===============================

(function() {

    const prefixes = ["personen_", "import_", "create_", "export_"];
    const extraKeys = ["ID"];
    const dynamicIDPattern = /^XHJ\d+$/; 
    const tableSelector = "#personTable tbody"; // pas aan naar jouw tabel tbody selector

    // ===========================
    // Functie: Wis LocalStorage en tabel
    // ===========================
    function clearPersonData() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (
                    prefixes.some(prefix => key.startsWith(prefix)) ||
                    extraKeys.includes(key) ||
                    dynamicIDPattern.test(key)
                ) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            if(keysToRemove.length) console.log(`Data verwijderd: ${keysToRemove.join(", ")}`);

            const tbody = document.querySelector(tableSelector);
            if(tbody) {
                while(tbody.firstChild) tbody.removeChild(tbody.firstChild);
                console.log("Tabelinhoud verwijderd voor clean start.");
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
    // Event: Knoppen create/import/refresh
    // ===========================
    const actions = ["create", "import", "refresh"];
    actions.forEach(action => {
        const buttons = document.querySelectorAll(`[data-action="${action}"]`);
        buttons.forEach(btn => {
            btn.addEventListener("click", e => {

                // Alleen clear voor create of import, niet voor refresh
                if(action === "create" || action === "import") {
                    clearPersonData();

                    if(action === "create") {
                        const newID = generateUniqueID();
                        localStorage.setItem(newID, JSON.stringify({id: newID}));
                        console.log(`Nieuwe unieke ID aangemaakt: ${newID}`);
                    }
                }

                // Refresh kan hier eventueel de tabel visual refresh triggeren
                if(action === "refresh") {
                    console.log("Refresh-knop: geen LocalStorage gewist.");
                }

            });
        });
    });

    // ===========================
    // Pagina afsluiten of form submit
    // ===========================
    window.addEventListener("unload", clearPersonData);
    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", e => {
            clearPersonData();
        });
    });

})();
