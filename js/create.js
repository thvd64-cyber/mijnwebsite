// ======================= CREATE.JS – lean integratie met storage.js =======================
// ======================= MODULE IMPORTS =======================
import { genereerId } from './idGenerator.js';  // ID generator import
import { StamboomStorage } from './storage.js'; // Storage module import

// ======================= CREATE.JS – lean integratie =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot de volledige DOM is geladen voordat je elementen ophaalt

    // ======================= DOM ELEMENTEN =======================
    const form = document.getElementById('persoonForm');          // Formulier waar gebruiker gegevens invult
    const previewDiv = document.getElementById('personPreview');  // Container voor JSON preview
    const previewContent = document.getElementById('previewContent'); // <pre> element waar preview wordt getoond
    const confirmBtn = document.getElementById('confirmBtn');     // Knop om bevestiging te geven en data op te slaan
    const warningMessage = document.getElementById('warningMessage'); // Div voor waarschuwingen

    // ======================= IMPORT ID GENERATOR =======================
import { genereerId } from './idGenerator.js'; // Importeert de centrale ID functie uit dezelfde map
    
    // ======================= FORM SUBMIT HANDLER =======================
    form.addEventListener('submit', function(e){
        e.preventDefault(); // Voorkom dat formulier pagina reloadt

        const dataset = StamboomStorage.get(); // Haal huidige dataset uit centrale storage

        // Controleer of er al data aanwezig is
        if(dataset.length > 0){
            warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden."; // waarschuwing tonen
            warningMessage.style.display = 'block'; // waarschuwing zichtbaar maken
            previewDiv.style.display = 'none';       // preview verbergen
            return; // stop verwerking
        }

        // ======================= FORMULIER WAARDEN OPHALEN =======================
        const doopnaam = document.getElementById('doopnaam').value.trim(); // doopnaam
        const roepnaam = document.getElementById('roepnaam').value.trim(); // roepnaam
        const prefix = document.getElementById('prefix').value.trim();     // prefix
        const achternaam = document.getElementById('achternaam').value.trim(); // achternaam
        const geboorte = document.getElementById('geboortedatum').value;   // geboortedatum
        const geslacht = document.getElementById('geslacht').value;        // geslacht

       // ======================= NIEUWE PERSOON OBJECT =======================
const id = genereerId(doopnaam, roepnaam, achternaam, geslacht); // Maakt unieke ID aan via centrale idGenerator.js

const person = { // Bouwt nieuw persoon object volgens schema structuur
    id: id, // Slaat gegenereerde ID op in object
    Doopnaam: doopnaam, // Doopnaam veld
    Roepnaam: roepnaam, // Roepnaam veld
    Prefix: prefix, // Tussenvoegsel
    Achternaam: achternaam, // Achternaam veld
    Geslacht: geslacht, // Geslacht veld
    Geboortedatum: geboorte, // Geboortedatum veld
    Relatie: 'Hoofd-ID', // Standaard hoofdrelatie
    PartnerID: [] // Start met lege partnerlijst
};

        // ======================= PREVIEW TONEN =======================
        previewContent.textContent = JSON.stringify(person, null, 2); // JSON leesbaar maken in preview
        previewDiv.style.display = 'block'; // preview zichtbaar maken
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    confirmBtn.addEventListener('click', function(){
        const person = JSON.parse(previewContent.textContent); // haal persoon uit preview
        StamboomStorage.add(person); // voeg persoon toe aan centrale storage
        window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html"; // ga naar Manage pagina
    });

}); // einde DOMContentLoaded
