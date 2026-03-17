/* ======================= js/timeline.js v0.1.2 ======================= */
/* Vereenvoudigde versie:
   - Alleen HoofdID + Vader + Moeder
   - Vader + Moeder komen samen in 1 knooppunt
   - Vanuit knooppunt lijn naar HoofdID
   - FIX: lijnen zichtbaar + juiste render volgorde + label positioning
*/

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // dataset ophalen uit storage of fallback naar lege array

if(!peopleData || peopleData.length === 0){ // controle of dataset leeg is
    console.warn("Dataset leeg - gebruik testdata"); // log waarschuwing
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" }, // vader testdata
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1955-01-01" }, // moeder testdata
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1980-01-01", VaderID:"1", MoederID:"2" } // kind testdata
    ];
}

// ======================= HULP FUNCTIES =======================
function parseDateSafe(d){ // veilige datum parser
    if(!d){ // check lege datum
        console.warn("Datum leeg → vandaag gebruikt"); // log waarschuwing
        return new Date(); // fallback naar vandaag
    }
    const dt = new Date(d); // probeer datum te parsen
    if(isNaN(dt.getTime())){ // check of datum ongeldig is
        console.warn(`Foute datum (${d}) → vandaag gebruikt`); // log waarschuwing
        return new Date(); // fallback naar vandaag
    }
    return dt; // retourneer geldige datum
}

function yearToX(year, minYear, maxYear){ // bereken X positie op timeline
    const range = maxYear - minYear || 1; // voorkom delen door 0
    return ((year - minYear)/range)*2800 + 50; // schaal naar SVG breedte
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return; // stop als geen persoon

    const container = document.getElementById("timelineContainer"); // container ophalen
    if(!container){
        console.error("timelineContainer niet gevonden"); // foutmelding
        return;
    }

    container.innerHTML = ""; // reset container

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg"); // SVG element maken
    svg.setAttribute("width","3000"); // breedte instellen
    svg.setAttribute("height","300"); // hoogte instellen
    container.appendChild(svg); // SVG toevoegen aan DOM

    // ======================= VADER + MOEDER ZOEKEN =======================
    const vader = peopleData.find(p => p.ID === rootPerson.VaderID); // zoek vader via ID
    const moeder = peopleData.find(p => p.ID === rootPerson.MoederID); // zoek moeder via ID

    // ======================= PERSONEN SET =======================
    const persons = [rootPerson]; // start array met hoofd persoon

    if(vader) persons.push(vader); // voeg vader toe indien aanwezig
    if(moeder) persons.push(moeder); // voeg moeder toe indien aanwezig

    // ======================= JAAR RANGE =======================
    const years = persons.map(p => parseDateSafe(p.Geboortedatum).getFullYear()); // alle jaren ophalen
    const minYear = Math.min(...years); // minimum jaar bepalen
    const maxYear = Math.max(...years); // maximum jaar bepalen

    const baseY = 150; // Y positie hoofd persoon
    const parentY = 50; // Y positie ouders

    const positionMap = {}; // opslag voor posities

    // ======================= POSITIES BEREKENEN =======================
    persons.forEach(p=>{
        const dt = parseDateSafe(p.Geboortedatum); // datum ophalen
        const year = dt.getFullYear(); // jaar extraheren
        const x = yearToX(year, minYear, maxYear); // X positie berekenen

        const y = (p.ID === rootPerson.ID) ? baseY : parentY; // Y positie bepalen (ouders vs hoofd)

        positionMap[p.ID] = { x, y }; // positie opslaan voor later gebruik (lijnen)
    });

    // ======================= KNOOPPUNT + LIJNEN (EERST TEKENEN!) =======================
    if(vader && moeder){ // alleen als beide ouders bestaan
        const vPos = positionMap[vader.ID]; // positie vader ophalen
        const mPos = positionMap[moeder.ID]; // positie moeder ophalen
        const cPos = positionMap[rootPerson.ID]; // positie kind ophalen

        const junctionX = (vPos.x + mPos.x) / 2; // midden tussen ouders berekenen
        const junctionY = parentY + 30; // knooppunt iets onder ouders plaatsen

        // vader → knooppunt
        const lineV = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element maken
        lineV.setAttribute("x1", vPos.x); // start X vader
        lineV.setAttribute("y1", vPos.y); // start Y vader
        lineV.setAttribute("x2", junctionX); // eind X knooppunt
        lineV.setAttribute("y2", junctionY); // eind Y knooppunt
        lineV.setAttribute("stroke","blue"); // kleur lijn
        lineV.setAttribute("stroke-width","2"); // FIX: lijn zichtbaar maken
        svg.appendChild(lineV); // toevoegen aan SVG

        // moeder → knooppunt
        const lineM = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element maken
        lineM.setAttribute("x1", mPos.x); // start X moeder
        lineM.setAttribute("y1", mPos.y); // start Y moeder
        lineM.setAttribute("x2", junctionX); // eind X knooppunt
        lineM.setAttribute("y2", junctionY); // eind Y knooppunt
        lineM.setAttribute("stroke","blue"); // kleur lijn
        lineM.setAttribute("stroke-width","2"); // FIX: lijn zichtbaar maken
        svg.appendChild(lineM); // toevoegen aan SVG

        // knooppunt → hoofd
        const lineC = document.createElementNS("http://www.w3.org/2000/svg","line"); // lijn element maken
        lineC.setAttribute("x1", junctionX); // start X knooppunt
        lineC.setAttribute("y1", junctionY); // start Y knooppunt
        lineC.setAttribute("x2", cPos.x); // eind X hoofd
        lineC.setAttribute("y2", cPos.y); // eind Y hoofd
        lineC.setAttribute("stroke","blue"); // kleur lijn
        lineC.setAttribute("stroke-width","2"); // FIX: lijn zichtbaar maken
        svg.appendChild(lineC); // toevoegen aan SVG

        // knooppunt visueel punt
        const junctionDot = document.createElementNS("http://www.w3.org/2000/svg","circle"); // cirkel maken
        junctionDot.setAttribute("cx", junctionX); // positie X
        junctionDot.setAttribute("cy", junctionY); // positie Y
        junctionDot.setAttribute("r","4"); // FIX: iets groter maken
        junctionDot.setAttribute("fill","black"); // FIX: beter zichtbaar
        svg.appendChild(junctionDot); // toevoegen aan SVG
    }

    // ======================= PERSONEN TEKENEN (NA LIJNEN!) =======================
    persons.forEach(p=>{
        const { x, y } = positionMap[p.ID]; // positie ophalen

        // cirkel
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle"); // cirkel maken
        circle.setAttribute("cx", x); // X positie
        circle.setAttribute("cy", y); // Y positie
        circle.setAttribute("r","6"); // radius
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // kleur bepalen
        svg.appendChild(circle); // toevoegen aan SVG

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" "); // volledige naam samenstellen
        const label = document.createElementNS("http://www.w3.org/2000/svg","text"); // tekst element maken
        label.setAttribute("x", x + 8); // iets rechts van cirkel

        // ======================= LABEL POSITION FIX =======================
        let labelYOffset; // variabele voor verticale offset
        if(p.ID === rootPerson.ID){
            labelYOffset = 20; // hoofd → onder de cirkel
        } else {
            labelYOffset = -15; // ouders → boven de cirkel
        }

        label.setAttribute("y", y + labelYOffset); // Y positie toepassen
        label.textContent = fullName; // tekst instellen
        svg.appendChild(label); // toevoegen aan SVG

        // jaartal
        const year = parseDateSafe(p.Geboortedatum).getFullYear(); // jaar ophalen
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text"); // tekst element maken
        yearLabel.setAttribute("x", x - 10); // iets links van cirkel
        yearLabel.setAttribute("y", y + 35); // FIX: lager zetten om overlap te voorkomen
        yearLabel.textContent = year; // jaartal tonen
        svg.appendChild(yearLabel); // toevoegen aan SVG
    });
}

// ======================= INIT =======================
document.addEventListener('DOMContentLoaded', () => { // wacht tot DOM geladen is
    const input = document.getElementById('sandboxSearch'); // zoekveld ophalen

    if(typeof initLiveSearch === "function"){ // check of search functie bestaat
        initLiveSearch(input, peopleData, personID => { // initialiseer search
            const person = peopleData.find(p => p.ID === personID); // zoek geselecteerde persoon
            if(person) drawTimeline(person); // teken timeline
        });
    }

    if(peopleData.length > 0){ // check of data bestaat
        drawTimeline(peopleData[0]); // eerste persoon automatisch tonen
    }
});
