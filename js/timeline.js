/* ======================= js/timeline.js v1.0.0 ======================= */
/* Timeline module met HoofdID integratie + RelatieEngine + datum fallback
   - LiveSearch selecteert hoofdpersoon
   - RelatieEngine vult overige relaties aan
   - Veilige datum parsing, lege/foute datum -> vandaag + console waarschuwing
   - SVG weergave: persoon als cirkel, naamlabel, jaartal
*/

(function(){
'use strict'; // strikte modus aan

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || []; // haal dataset uit storage

// fallback testdata als storage leeg is
if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Jan", Achternaam: "Jansen", Geboortedatum: "1950-01-01" },
        { ID: "2", Roepnaam: "Anna", Achternaam: "Jansen", Geboortedatum: "1970-06-15" },
        { ID: "3", Roepnaam: "Piet", Achternaam: "Jansen", Geboortedatum: "1975-03-20" },
        { ID: "4", Roepnaam: "Lisa", Achternaam: "Jansen", Geboortedatum: "2000-09-10" }
    ];
}

// ======================= HULPFUNCTIES =======================
function parseDateSafe(d){
    if(!d){ 
        console.warn("Datum leeg gevonden, gebruik vandaag als fallback");
        return new Date(); 
    }
    const dt = new Date(d);
    if(isNaN(dt.getTime())){
        console.warn(`Datum verkeerd gevonden (${d}), gebruik vandaag als fallback`);
        return new Date();
    }
    return dt;
}

function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1; 
    const x = ((year - minYear)/range)*2800 + 50; 
    return isNaN(x) ? 50 : x;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;

    const container = document.getElementById("timelineContainer");
    if(!container){
        console.error("timelineContainer niet gevonden");
        return;
    }
    container.innerHTML = ""; // oude timeline verwijderen

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");
    svg.setAttribute("height","200");
    container.appendChild(svg);

    // ======================= RELATIES OPHALEN VIA RELATIEENGINE =======================
    const relaties = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || [];
    // Relaties bevat nu alle verwantschappen (Vader, Moeder, Partner, Kind, BZ)

    // Voeg root zelf toe aan lijst
    const timelinePersons = [rootPerson, ...relaties];

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // ======================= BASIS LIJN =======================
    const baseLine = document.createElementNS("http://www.w3.org/2000/svg","line");
    baseLine.setAttribute("x1","50");
    baseLine.setAttribute("y1","100");
    baseLine.setAttribute("x2","2850");
    baseLine.setAttribute("y2","100");
    baseLine.setAttribute("stroke","black");
    svg.appendChild(baseLine);

    // ======================= PERSONEN TEKENEN =======================
    timelinePersons.forEach(p => {
        const dt = parseDateSafe(p.Geboortedatum);
        const year = dt.getFullYear();
        const x = yearToX(year, minYear, maxYear);
        const y = 100;

        // cirkel voor persoon
        const circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r","6");
        circle.setAttribute("fill", p.ID === rootPerson.ID ? "red" : "black"); // root persoon rood
        svg.appendChild(circle);

        // naam label
        const fullName = [p.ID, p.Roepnaam, p.Prefix || "", p.Achternaam].filter(Boolean).join(" ");
        const birthText = p.Geboortedatum ? `(${p.Geboortedatum})` : "(geen datum)";
        const label = document.createElementNS("http://www.w3.org/2000/svg","text");
        label.setAttribute("x", x + 8);
        label.setAttribute("y", y - 10);
        label.setAttribute("class","timelineLabel");
        label.textContent = `${fullName} ${birthText}`;
        svg.appendChild(label);

        // jaar onder cirkel
        const yearLabel = document.createElementNS("http://www.w3.org/2000/svg","text");
        yearLabel.setAttribute("x", x - 10);
        yearLabel.setAttribute("y", y + 25);
        yearLabel.setAttribute("class","timelineLabel");
        yearLabel.textContent = `${year}`;
        svg.appendChild(yearLabel);
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('sandboxSearch');
    if(!input){
        console.error("sandboxSearch input niet gevonden");
        return;
    }

    if(typeof initLiveSearch === "function"){
        // LiveSearch callback: render timeline met geselecteerde persoon
        initLiveSearch(input, peopleData, personID => {
            const person = peopleData.find(p => p.ID === personID);
            if(person) drawTimeline(person);
        });

        // ======================= START MET EERSTE PERSOON =======================
        if(peopleData.length > 0){
            drawTimeline(peopleData[0]);
        }
    }
});
})();
