/* ======================= js/storage.js v0.0.6 ======================= */
/* Persistent storage voor MyFamTreeCollab, volledig schema-driven
   - Maakt gebruik van window.StamboomSchema.fields
   - Automatische migratie van legacy en nieuwe records
   - Publieke API: get, set, add, update, clear 
   - ID-generator toegevoegd en wordt correct toegepast bij lege ID-cellen
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

    return migrated;
}

/* ======================= GENERATE UNIQUE ID ======================= */
// Functie genereert een uniek ID op basis van cel2,3,5,6 + oplopende 3-cijfer code
window.genereerCode = function(person, allPersons){
    // ======================= PREPARE LETTERS =======================
    const c2 = person.Doopnaam && person.Doopnaam.trim() !== "" ? person.Doopnaam.trim()[0].toUpperCase() : 'X'; // eerste letter Doopnaam of X
    const c3 = person.Roepnaam && person.Roepnaam.trim() !== "" ? person.Roepnaam.trim()[0].toUpperCase() : 'X'; // eerste letter Roepnaam of X
    const c5 = person.Achternaam && person.Achternaam.trim() !== "" ? person.Achternaam.trim()[0].toUpperCase() : 'X'; // eerste letter Achternaam of X
    const c6 = person.Geslacht && person.Geslacht.trim() !== "" ? person.Geslacht.trim()[0].toUpperCase() : 'X'; // eerste letter Geslacht of X

    // ======================= BASE PREFIX =======================
    const prefix = `${c2}${c3}${c5}${c6}`; // samenvoegen van letters tot basis prefix

    // ======================= INITIALISE SEQUENCE =======================
    let seq = 1; // start van 3-cijferse oplopende code
    let newID = ''; // variabele voor volledige ID

    // ======================= GENERATE UNIQUE ID LOOP =======================
    do {
        const code = seq.toString().padStart(3,'0'); // 3-cijfer code met voorloopnullen
        newID = `${prefix}${code}`; // volledige ID samenstellen
        seq++; // volgende nummer voor poging als ID niet uniek is
    } while(allPersons.some(p => p.ID === newID)); // check: ID uniek tegen bestaande + import personen

    return newID; // retourneer unieke ID
};

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

    // ======================= GENEREER ID ALS LEEG =======================
    if(!migrated.ID || migrated.ID.trim() === ""){
        // genereer unieke ID met check tegen bestaande records
        migrated.ID = window.genereerCode(migrated, dataset);
    }

    dataset.push(migrated); // toevoegen aan dataset
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // opslaan in localStorage
    return true;
}

/* ======================= BULK IMPORT FUNCTION ======================= */
function importCSV(records){
    if(!Array.isArray(records)) return 0; // controle

    const dataset = get(); // huidige records
    const imported = []; // array voor nieuwe records met ID

    // loop door elke rij uit CSV
    records.forEach((row) => {
        const migrated = migrate(row); // schema velden vullen
        // ======================= GENEREER ID ALS LEEG =======================
        if(!migrated.ID || migrated.ID.trim() === ""){
            // check uniekheid tegen bestaande + reeds geïmporteerde rijen
            migrated.ID = window.genereerCode(migrated, dataset.concat(imported));
        }
        imported.push(migrated); // voeg toe aan tijdelijke import array
    });

    // voeg alles samen met bestaande dataset
    const finalDataset = dataset.concat(imported);
    set(finalDataset); // opslaan
    return imported.length; // retourneer aantal geïmporteerde rijen
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
    importCSV, // nieuwe functie toegevoegd voor bulk import met automatische ID generatie
    version: "v0.0.6"
};

console.log("StamboomStorage geladen:", window.StamboomStorage.version);

})();
