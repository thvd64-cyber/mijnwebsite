/* ======================= js/import.js v2.0.0 ======================= */
/* Compatibel met schema.js v0.1.x en storage.js
   Robuuste CSV importer voor MyFamTreeCollab
   - delimiter detectie
   - BOM verwijdering
   - quotes + commas correct
   - max 22 kolommen
   - eerste 14 schema velden
   - extra kolommen → _extra
*/

document.getElementById("importBtn").addEventListener("click", async function(){

const status = document.getElementById("importStatus"); // status element voor meldingen

try{

/* ======================= STORAGE CHECK ======================= */

if(typeof StamboomStorage === "undefined"){ // controleer of storage beschikbaar is

status.innerHTML = "❌ storage.js niet geladen"; // toon foutmelding
status.style.color = "red";
console.error("StamboomStorage ontbreekt");
return;

}

/* ======================= SCHEMA CHECK ======================= */

if(!window.StamboomSchema){ // controleer schema module

status.innerHTML = "❌ schema.js niet geladen";
status.style.color = "red";
console.error("StamboomSchema ontbreekt");
return;

}

const schema = window.StamboomSchema; // referentie naar schema module

/* ======================= FILE PICK ======================= */

const fileInput = document.getElementById("importFile"); // file input element
const file = fileInput.files[0]; // geselecteerd bestand

if(!file){

status.innerHTML = "❌ Geen CSV bestand geselecteerd";
status.style.color = "red";
return;

}

/* ======================= FILE READER ======================= */

const reader = new FileReader(); // browser file reader

reader.onload = function(e){

/* ======================= RAW TEXT ======================= */

let text = e.target.result; // inhoud CSV bestand

text = text.replace(/^\uFEFF/,''); // verwijder BOM indien aanwezig

/* ======================= DELIMITER DETECTIE ======================= */

function detectDelimiter(csv){

const firstLine = csv.split(/\r?\n/)[0]; // eerste regel = header

const options = [",",";","\t"]; // mogelijke delimiters

let best = ","; // standaard delimiter
let bestScore = 0;

options.forEach(d=>{

const score = firstLine.split(d).length; // aantal kolommen bij split

if(score > bestScore){ // hoogste kolom aantal wint

bestScore = score;
best = d;

}

});

return best;

}

const delimiter = detectDelimiter(text); // bepaal delimiter

/* ======================= SPLIT LINES ======================= */

const lines = text
.split(/\r?\n/) // split Windows/Mac regels
.map(l=>l.trim()) // trim whitespace
.filter(l=>l.length); // verwijder lege regels

if(lines.length < 2){

status.innerHTML = "❌ CSV bevat geen data";
status.style.color = "red";
return;

}

/* ======================= HEADER ANALYSE ======================= */

const headerLine = lines[0]; // eerste regel = header

const headerInfo = schema.normalizeHeader(headerLine); // detecteer schema type

if(headerInfo.type === "unknown"){ // header niet herkend

status.innerHTML = "❌ Onbekende CSV header";
status.style.color = "red";
console.error("Header onbekend:", headerLine);
return;

}

/* ======================= DATA PARSE ======================= */

let newRows = []; // array met nieuwe personen

const existing = StamboomStorage.get(); // bestaande data

lines.slice(1).forEach((line,index)=>{ // loop door alle data regels

if(!line.trim()) return; // sla lege regels over

/* ======================= CSV PARSER ======================= */

let values = []; // array voor kolom waarden
let current = ""; // huidige kolom tekst
let insideQuotes = false; // quote status

for(let i=0;i<line.length;i++){

const char = line[i]; // huidige karakter

if(char === '"'){ // toggle quote status

insideQuotes = !insideQuotes;

}else if(c
