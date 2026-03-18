/* ======================= js/timeline.js v1.2.0 ======================= */
/* Timeline module met lanes per relatie + RelatieEngine + datum fallback
   - Elke relatie krijgt een eigen lane: Ouder, Hoofd, Partner, Kind, Broer/Zus
   - Personen worden horizontaal gepositioneerd op basis van geboortejaar
   - RelatieEngine berekent alle relaties
   - Inline uitleg bij elke regel
*/

(function(){
'use strict';

// ======================= CONFIG LANES =======================
const laneConfig = [
    { key: 'VHoofdID', label: 'Ouder', y: 50 },
    { key: 'MHoofdID', label: 'Ouder', y: 80 },
    { key: 'HoofdID', label: 'Hoofd', y: 120 },
    { key: 'PHoofdID', label: 'Partner', y: 170 },
    { key: 'KindID', label: 'Kind', y: 240 },
    { key: 'HKindID', label: 'Kind', y: 240 },
    { key: 'PHKindID', label: 'Kind', y: 240 },
    { key: 'KindPartnerID', label: 'Kind Partner', y: 270 },
    { key: 'BZID', label: 'Broer/Zus', y: 300 },
    { key: 'BZPartnerID', label: 'BZ Partner', y: 330 }
];

// ======================= DATA LADEN =======================
let peopleData = window.StamboomStorage?.get() || [];
if(!peopleData || peopleData.length === 0){
    console.warn("Dataset leeg - gebruik testdata");
    peopleData = [
        { ID: "1", Roepnaam: "Martien", Achternaam: "van Doorn", Geslacht:"M", Geboortedatum: "1935-01-01", Overlijdensdatum:"2019-01-01" },
        { ID: "2", Roepnaam: "Tiny", Achternaam: "Peters", Geslacht:"V", Geboortedatum:"1933-01-01", Overlijdensdatum:"2007-01-01" },
        { ID: "3", Roepnaam: "Theo", Achternaam: "van Doorn", Geslacht:"M", Geboortedatum:"1964-01-01", VaderID:"1", MoederID:"2", PartnerID:"4" },
        { ID: "4", Roepnaam: "Marcia", Achternaam: "Lobos Astorga", Geslacht:"V", Geboortedatum:"1962-01-01" },
        { ID: "5", Roepnaam: "David", Achternaam: "van Doorn", Geslacht:"M", Geboortedatum:"1995-01-01", VaderID:"3", MoederID:"4" },
        { ID: "6", Roepnaam: "Esther", Achternaam: "van Doorn", Geslacht:"V", Geboortedatum:"1972-01-01", VaderID:"1", MoederID:"2" }
    ];
}

// ======================= HULPFUNCTIES =======================
function parseDateSafe(d){
    if(!d){ console.warn("Datum leeg, gebruik vandaag"); return new Date(); }
    const dt = new Date(d);
    if(isNaN(dt.getTime())){ console.warn(`Foute datum (${d}), gebruik vandaag`); return new Date(); }
    return dt;
}
function yearToX(year, minYear, maxYear){
    const range = maxYear - minYear || 1;
    return ((year - minYear)/range)*2800 + 50;
}

// ======================= DRAW TIMELINE =======================
function drawTimeline(rootPerson){
    if(!rootPerson) return;

    const container = document.getElementById("timelineContainer");
    if(!container){ console.error("timelineContainer niet gevonden"); return; }
    container.innerHTML="";

    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("width","3000");
    svg.setAttribute("height","400");
    container.appendChild(svg);

    // ======================= RELATIES VIA RELATIEENGINE =======================
    const relaties = window.RelatieEngine?.computeRelaties(peopleData, rootPerson.ID) || [];
    const timelinePersons = [rootPerson, ...relaties];

    // ======================= JAAR RANGE =======================
    const years = timelinePersons.map(p => parseDateSafe(p.Geboortedatum).getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    // ======================= JAAR GRID =======================
    const yearMarkers = [1930,1940,1950,1960,1970,1980,1990,2000,2010,2020,2026];
    yearMarkers.forEach(y=>{
        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1", yearToX(y,minYear,maxYear));
        line.setAttribute("x2", yearToX(y,minYear,maxYear));
        line.setAttribute("y1", 20);
        line.setAttribute("y2", 370);
        line.setAttribute("stroke","#ccc");
        svg.appendChild(line);

        const text = document.createElementNS("http://www.w3.org/2000/svg","text");
        text.setAttribute("x", yearToX(y,minYear,maxYear)-15);
        text.setAttribute("y", 15);
        text.setAttribute("class","timelineLabel");
        text.textContent = y;
        svg.appendChild(text);
    });

    // ======================= PERSONEN PER LANE TEKENEN =======================
    laneConfig.forEach(lane=>{
        const persons = timelinePersons.filter(p=>p.Relatie===lane.key);
        persons.forEach(p=>{
            const birth = parseDateSafe(p.Geboortedatum);
            const death = parseDateSafe(p.Overlijdensdatum);
            const startX = yearToX(birth.getFullYear(), minYear, maxYear);
            const endX = death ? yearToX(death.getFullYear(), minYear, maxYear) : yearToX(new Date().getFullYear(), minYear, maxYear);

            // lijn voor periode
            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("x1", startX);
            line.setAttribute("x2", endX);
            line.setAttribute("y1", lane.y);
            line.setAttribute("y2", lane.y);
            line.setAttribute("stroke", "#333");
            line.setAttribute("stroke-width","4");
            svg.appendChild(line);

            // label voor persoon
            const fullName = [p.Roepnaam, p.Prefix||"", p.Achternaam].filter(Boolean).join(" ");
            const label = document.createElementNS("http://www.w3.org/2000/svg","text");
            label.setAttribute("x", startX);
            label.setAttribute("y", lane.y - 10);
            label.setAttribute("class","timelineLabel");
            label.textContent = `*- ${fullName} ${p.Geslacht==='M'?'♂':'♀'} (${birth.getFullYear()}-${death.getFullYear()||''})`;
            svg.appendChild(label);
        });
    });
}

// ======================= INIT LIVESEARCH =======================
document.addEventListener('DOMContentLoaded',()=>{
    const input = document.getElementById('sandboxSearch');
    if(!input){ console.error("sandboxSearch input niet gevonden"); return; }

    if(typeof initLiveSearch==="function"){
        initLiveSearch(input, peopleData, personID=>{
            const person = peopleData.find(p=>p.ID===personID);
            if(person) drawTimeline(person);
        });

        // eerste persoon automatisch renderen
        if(peopleData.length>0) drawTimeline(peopleData[0]);
    }
});
})();
