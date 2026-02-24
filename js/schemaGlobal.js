// ======================= schemaGlobal.js =======================
// Globaal schema object voor CSV ↔ object conversie, beschikbaar voor alle modules

window.schema = {
    // Zet een CSV-regel om naar een persoon object
    fromCSV: function(line){
        const parts = line.split(','); // split CSV op komma's
        if(parts.length < 6) return null; // minimaal 6 velden nodig

        return {
            ID: parts[0].trim(),                 // unieke ID
            Doopnaam: parts[1].trim(),           // doopnaam
            Roepnaam: parts[2].trim(),           // roepnaam
            Prefix: parts[3].trim(),             // prefix
            Achternaam: parts[4].trim(),         // achternaam
            Geslacht: parts[5].trim() || 'X',    // geslacht, default X
            Geboortedatum: parts[6]?.trim() || '', // geboortedatum optioneel
            PartnerID: []                         // start altijd leeg
        };
    },

    // Zet een array van partners om naar een string (optioneel voor CSV)
    stringifyPartners: function(partnersArray){
        return partnersArray.join(';'); // partners scheiden met puntkomma
    }
};
