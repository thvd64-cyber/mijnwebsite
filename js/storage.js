/* ======================= js/storage.js v0.0.5 ======================= */
/* Persistent storage voor MyFamTreeCollab, volledig schema-driven
   - gebruik IDGenerator
   - Maakt gebruik van window.StamboomSchema.fields
   - Automatische migratie van legacy en nieuwe records
   - Publieke API: get, set, add, update, clear
*/

(function(){
'use strict'; // veilige uitvoering

/* ======================= CONSTANTEN ======================= */
const STORAGE_KEY = 'stamboomData'; // localStorage sleutel

/* ======================= SAFE JSON PARSING ======================= */
function safeParse(json){
    if(!json) return [];
    try { 
        return JSON.parse(json); // probeer JSON te parsen
    }
    catch(e){ 
        console.warn('Storage corrupte JSON. Reset.'); 
        return []; // bij fout, return lege array
    }
}

/* ======================= MIGRATIE FUNCTIE ======================= */
function migrate(record){
    if(!record || typeof record !== "object") return {};
    
    const migrated = {...record}; // maak kopie zodat originele objecten niet gewijzigd worden

    // Zorg dat alle velden uit schema aanwezig zijn
    if(window.StamboomSchema && Array.isArray(window.StamboomSchema.fields)){
        window.StamboomSchema.fields.forEach(field => {
            if(!(field in migrated)) migrated[field] = ""; // ontbrekende velden aanvullen
        });
    } else {
        console.error("StamboomSchema niet geladen!");
    }

   // ======================= ID GENERATIE VIA idGenerator.js =======================
// genereer ID indien ontbrekend
if(!migrated.ID || migrated.ID.trim() === ""){

    const bestaandeIDs = get().map(p => p.ID); 
    // haal alle bestaande IDs uit storage zodat de generator duplicaten kan vermijden

    if(window.genereerCode){
        migrated.ID = window.genereerCode(migrated, bestaandeIDs); 
        // gebruik centrale ID generator uit js/idGenerator.js
    } 
    else {
        migrated.ID = 'P' + Date.now(); 
        // fallback als idGenerator.js niet geladen is
    }
}

    return migrated;
}

/* ======================= GET ======================= */
function get(){
    let raw = localStorage.getItem(STORAGE_KEY); // haal JSON string
    let parsed = safeParse(raw); // parse JSON
    if(!Array.isArray(parsed)) parsed = [];

    // voer migratie uit op alle records
    parsed = parsed.map(r => migrate(r));

    return parsed; // return array van records
}

/* ======================= SET ======================= */
function set(dataset){
    if(!Array.isArray(dataset)){ 
        console.warn('set() verwacht array'); 
        return false; 
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // sla op
    return true;
}

/* ======================= ADD ======================= */
function add(person){
    if(typeof person !== 'object' || person === null){ 
        console.warn('add() verwacht object'); 
        return false; 
    }
    const dataset = get(); // huidige dataset ophalen
    const migrated = migrate(person); // migratie uitvoeren
    dataset.push(migrated); // toevoegen
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // opslaan
    return true;
}

/* ======================= UPDATE ======================= */
function update(personID, updates){
    const dataset = get();
    const idx = dataset.findIndex(p => p.ID === personID); // zoek persoon
    if(idx === -1) return false;
    dataset[idx] = {...dataset[idx], ...updates}; // merge updates
    set(dataset); // opslaan
    return true;
}

/* ======================= CLEAR ======================= */
function clear(){
    localStorage.removeItem(STORAGE_KEY); // verwijder key
    return true;
}

/* ======================= PUBLIEKE API ======================= */
window.StamboomStorage = {
    get,
    set,
    add,
    update,
    clear,
    version: "v0.0.4"
};

console.log("StamboomStorage geladen:", window.StamboomStorage.version);

})();
