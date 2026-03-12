// ======================= js/schema.js v0.0.2 =======================
// Schema manager voor MyFamTreeCollab
// Beheert: datastructuur, CSV parsing, schema validatie (14 & 19), legacy migratie

(function () { // start van self-executing functie zodat variabelen niet globaal lekken
'use strict'; // activeert strengere JavaScript controle om fouten te voorkomen

// ======================= SCHEMA VERSION =======================
// versienummer van de datastructuur zodat migraties mogelijk zijn
const SCHEMA_VERSION = "0.0.2"; // huidige schema versie van de datastructuur

// ======================= HUIDIGE DATA STRUCTUUR =======================
// dit bepaalt EXACT welke kolommen in CSV en objecten bestaan
const FIELDS = [
"ID",               // uniek persoon ID
"Doopnaam",         // officiële naam
"Roepnaam",         // naam die dagelijks gebruikt wordt
"Prefix",           // tussenvoegsel zoals van / de / van der
"Achternaam",       // familienaam
"Geslacht",         // M / V / X
"Geboortedatum",    // formaat yyyy-mm-dd
"Geboorteplaats",   // plaats van geboorte
"Overlijdensdatum", // formaat yyyy-mm-dd
"Overlijdensplaats",// plaats van overlijden
"VaderID",          // verwijzing naar vader
"MoederID",         // verwijzing naar moeder
"PartnerID",        // partners gescheiden met |
"Opmerkingen"       // vrije tekst
];

// ======================= LEGACY HEADERS =======================
// oude datastructuren die automatisch gemigreerd kunnen worden
const LEGACY_HEADERS = [
[
"ID",
"Doopnaam",
"Roepnaam",
"Prefix",
"Achternaam",
"Geslacht",
"Geboortedatum",
"Geboorteplaats",
"Overlijdensdatum",
"Overlijdensplaats",
"VaderID",
"MoederID",
"PartnerID",
"Huwelijksdatum",
"Huwelijksplaats",
"Opmerkingen",
"Huisadressen",
"ContactInfo",
"URL"
]
];

// ======================= DATUM VELDEN =======================
// velden die automatisch als datum worden behandeld
const DATE_FIELDS = [
"Geboortedatum",    // geboortedatum moet datum parsing krijgen
"Overlijdensdatum"  // overlijdensdatum moet datum parsing krijgen
];

// ======================= GESLACHT DEFINITIES =======================
// toegestane waarden voor geslacht
const GESLACHT_VALUES = {

nl: ["M","V","X"], // Nederlands formaat
en: ["M","F","X"]  // Engels formaat
};

const DEFAULT_GESLACHT = "X"; // standaard waarde wanneer niets ingevuld is

// ======================= HEADER GENERATOR =======================
// maakt CSV header regel op basis van FIELDS
function getHeader(){

return FIELDS.join(","); // combineert alle velden tot CSV header
}

// ======================= HEADER VALIDATOR =======================
// controleert of header exact overeenkomt met huidig schema
function validateHeader(headerLine){
return headerLine.trim() === getHeader(); // vergelijkt CSV header met schema
}

// ======================= HEADER NORMALIZER =======================
// detecteert huidig of legacy schema
function normalizeHeader(headerLine){
const header = headerLine.split(",").map(h => h.trim()); // split CSV header naar array

if(header.join(",") === FIELDS.join(",")) // controle of header huidige structuur is
return {type:"current", header}; // markeer als huidige versie

for(const legacy of LEGACY_HEADERS){ // loop door alle legacy schema's

if(header.join(",") === legacy.join(",")) // check of header legacy schema is
return {type:"legacy", header}; // markeer als legacy
}
return {type:"unknown", header}; // onbekend schema
}

// ======================= LEEG PERSOON OBJECT =======================
// maakt een nieuw leeg persoon object volgens schema
function createEmptyPersoon(){
const obj = {}; // maak leeg object
FIELDS.forEach(field => obj[field] = ""); // initialiseer elk veld leeg
obj.Geslacht = DEFAULT_GESLACHT; // zet standaard geslacht
return obj; // retourneer object
}

// ======================= BASIS VALIDATIE =======================
// minimale validatie van persoon object
function validatePerson(obj, lang="nl"){
if(!obj.ID) return false; // ID moet bestaan
if(!GESLACHT_VALUES[lang].includes(obj.Geslacht)) // controleer geldige geslacht waarde
return false;
return true; // object is geldig
}

// ======================= LEGACY MIGRATOR =======================
// converteert oude CSV rijen naar nieuwe structuur
function migrateLegacyRow(values, header){
const obj = {}; // maak nieuw object
FIELDS.forEach(field => { // loop door alle velden van huidige schema
const index = header.indexOf(field); // zoek veld positie in legacy header
if(index !== -1) // als veld bestaat
obj[field] = values[index]; // kopieer waarde

else
obj[field] = ""; // anders leeg veld
});
return obj; // retourneer geconverteerd object
}

// ======================= CSV → OBJECT =======================
// converteert CSV rij naar persoon object
function csvRowToObject(row, headerInfo){
const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // split CSV maar negeer komma's binnen quotes

if(headerInfo.type === "legacy") // als CSV legacy structuur heeft
return migrateLegacyRow(values, headerInfo.header); // voer migratie uit

if(values.length !== FIELDS.length){ // controleer kolom aantal
console.error(`CSV kolom mismatch: verwacht ${FIELDS.length}, kreeg ${values.length}`);
return null;
}

const obj = {}; // maak leeg object

FIELDS.forEach((field,i)=>{ // loop door velden
let value = values[i] || ""; // pak waarde
value = value.replace(/^"|"$/g,"").replace(/""/g,'"'); // verwijder CSV quotes
if(DATE_FIELDS.includes(field) && value){ // als veld datum is
const date = new Date(value); // probeer datum te maken
obj[field] = isNaN(date) ? "" : date; // valide datum of leeg
}
else{
obj[field] = value; // gewone tekst waarde
}
});
return obj; // retourneer object
}

// ======================= OBJECT → CSV =======================
// converteert persoon object naar CSV rij
function objectToCSVRow(obj){
return FIELDS.map(field=>{ // loop door velden
let value = obj[field] ?? ""; // pak veldwaarde
if(DATE_FIELDS.includes(field) && value instanceof Date) // als datum object
value = value.toISOString().split("T")[0]; // converteer naar yyyy-mm-dd

return `"${String(value).replace(/"/g,'""')}"`; // escape quotes
}).join(","); // combineer tot CSV rij
}

// ======================= PARTNER HELPERS =======================
// functies om meerdere partners te verwerken
function parsePartners(partnerField){
return partnerField ? partnerField.split("|").map(s=>s.trim()).filter(Boolean) : [];
}
function stringifyPartners(partnersArray){
return partnersArray.join("|");
}

// ======================= EXTRA HELPERS =======================
function getFieldCount(){
return FIELDS.length; // aantal velden in schema
}

// ======================= GLOBAL EXPORT =======================
// maakt schema beschikbaar voor andere scripts
window.StamboomSchema = {

version: SCHEMA_VERSION, // schema versie
fields: FIELDS, // lijst velden
header: getHeader, // header generator
validateHeader, // header validator
normalizeHeader, // detecteert schema type
empty: createEmptyPersoon, // leeg object generator
validate: validatePerson, // validatie
toCSV: objectToCSVRow, // object naar CSV
fromCSV: csvRowToObject, // CSV naar object
count: getFieldCount, // veld aantal
parsePartners, // partner parser
stringifyPartners, // partner stringifier
GESLACHT_VALUES // geslacht opties
};
})(); // einde self-executing functie
