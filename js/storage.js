// storage.js – verbeterde versie voor persistent stamboom
(function(){ 
    'use strict'; // strikte modus voor veiligere JS uitvoering

    const STORAGE_KEY = 'stamboomData'; // sleutel voor opslag in localStorage

    // =========================
    // interne helper: veilig JSON parsen
    // =========================
    function safeParse(json){
        try{ return JSON.parse(json); } // probeer JSON-string om te zetten naar object
        catch(e){ console.warn('Storage corrupte JSON. Reset.'); return []; } // bij fout: waarschuwing en lege array
    }

    // =========================
    // dataset ophalen
    // =========================
    function get(){
        const raw = localStorage.getItem(STORAGE_KEY); // ruwe JSON ophalen uit localStorage
        const parsed = safeParse(raw); // JSON veilig parsen
        return Array.isArray(parsed)? parsed : []; // als geen array → lege array teruggeven
    }

    // =========================
    // volledige dataset vervangen
    // =========================
    function set(dataset){
        if(!Array.isArray(dataset)){ console.warn('set() verwacht array'); return false; } // bescherming
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // opslaan als JSON
        return true; // succes
    }

    // =========================
    // persoon toevoegen
    // =========================
    function add(person){
        if(typeof person !== 'object' || person===null){ console.warn('add() verwacht object'); return false; } // validatie
        if(!person.ID) person.ID = 'P'+Date.now(); // fallback ID indien ontbrekend
        const dataset = get(); // huidige dataset ophalen
        dataset.push(person); // nieuw persoon toevoegen
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); // opslaan
        return true; // succes
    }

    // =========================
    // persoon updaten op basis van ID
    // =========================
    function update(personID, updates){
        const dataset = get(); // dataset ophalen
        const idx = dataset.findIndex(p=>p.ID===personID); // zoek index van persoon
        if(idx===-1) return false; // persoon niet gevonden → false
        dataset[idx] = {...dataset[idx], ...updates}; // merge updates
        set(dataset); // opslaan
        return true; // succes
    }

    // =========================
    // volledige storage leegmaken
    // =========================
    function clear(){ 
        localStorage.removeItem(STORAGE_KEY); // verwijder dataset uit storage
        return true; // succes
    }

    // =========================
    // publieke API
    // =========================
    window.StamboomStorage = { get, set, add, update, clear }; // expose functies
})();
