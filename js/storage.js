/* ======================= js/storage.js v0.0.4 ======================= */
/* Persistent storage voor MyFamTreeCollab
   - Slaat alle velden op, ongeacht of het schema er 14 of meer bevat
   - UI/logic gebruikt alleen schema velden
   - Compatibel met schema.js v0.0.2
   - Publieke API: get, set, add, update, clear, export
*/

(function(){ 
'use strict'; // veilige JS uitvoering

/* ======================= CONSTANTEN ======================= */
const STORAGE_KEY = 'stamboomData'; // localStorage sleutel

/* ======================= SAFE JSON PARSING ======================= */
function safeParse(json){
    if(!json) return [];
    try { return JSON.parse(json); }
    catch(e){ console.warn('Storage corrupte JSON. Reset.'); return []; }
}

/* ======================= MIGRATIE FUNCTIE ======================= */
function migrateLegacy(record){
    if(!record || typeof record !== "object") return {};
    // kopie van originele record zodat alle velden behouden blijven
    const migrated = {...record};

    // zorg dat alle 14 schema velden aanwezig zijn
    if(window.StamboomSchema && window.StamboomSchema.fields){
        window.StamboomSchema.fields.forEach(field => {
            if(!(field in migrated)) migrated[field] = "";
        });
    } else {
        console.error("StamboomSchema niet geladen!");
    }

    // genereer ID indien ontbrekend
    if(!migrated.ID || migrated.ID.trim() === ""){
        migrated.ID = window.genereerCode ? window.genereerCode(migrated, []) : 'P'+Date.now();
    }

    return migrated;
}

/* ======================= GET ======================= */
function get(){
    let raw = localStorage.getItem(STORAGE_KEY);
    let parsed = safeParse(raw);
    if(!Array.isArray(parsed)) parsed = [];

    // voer migratie uit op alle records
    parsed = parsed.map(r => migrateLegacy(r));

    return parsed;
}

/* ======================= SET ======================= */
function set(dataset){
    if(!Array.isArray(dataset)){ 
        console.warn('set() verwacht array'); 
        return false; 
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    return true;
}

/* ======================= ADD ======================= */
function add(person){
    if(typeof person !== 'object' || person === null){ console.warn('add() verwacht object'); return false; }
    const dataset = get();
    const migrated = migrateLegacy(person);
    dataset.push(migrated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    return true;
}

/* ======================= UPDATE ======================= */
function update(personID, updates){
    const dataset = get();
    const idx = dataset.findIndex(p => p.ID === personID);
    if(idx === -1) return false;
    dataset[idx] = {...dataset[idx], ...updates};
    set(dataset);
    return true;
}

/* ======================= CLEAR ======================= */
function clear(){
    localStorage.removeItem(STORAGE_KEY);
    return true;
}
/* ======================= CLEAR ======================= */
function clear(){
    localStorage.removeItem(STORAGE_KEY);
    return true;
}

/* ======================= EXPORT FUNCTIES ======================= */
function exportJSON(){
    const data = get(); // gebruik StamboomStorage intern
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = 'stamboom_export.json';
    a.click();
    URL.revokeObjectURL(url);
}

function exportCSV(){
    const data = get();
    if(!data.length) return;
    const fields = window.StamboomSchema.fields || Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(fields.join(","));
    data.forEach(person => {
        const row = fields.map(f => {
            let val = person[f] || "";
            if(typeof val === 'string' && (val.includes(',') || val.includes('"'))){
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csvRows.push(row.join(","));
    });
    const csvStr = csvRows.join("\n");
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = 'stamboom_export.csv';
    a.click();
    URL.revokeObjectURL(url);
}

/* ======================= PUBLIEKE API ======================= */
window.StamboomStorage = {
    get,
    set,
    add,
    update,
    clear,
    exportJSON,  
    exportCSV,  
    version: "v0.0.4" // optioneel versie verhogen
};

console.log("StamboomStorage geladen:", window.StamboomStorage.version);

})();
