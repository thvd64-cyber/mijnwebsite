// ======================= CREATE.JS – lean integratie met storage.js =======================
// ======================= MODULE IMPORTS =======================
import { genereerId } from './idGenerator.js';  // Centrale ID generator import
import { StamboomStorage } from './storage.js'; // Centrale storage module import

// ======================= CREATE.JS – lean integratie =======================
document.addEventListener('DOMContentLoaded', () => { // Wacht tot de volledige DOM is geladen voordat je elementen ophaalt

    // ======================= DOM ELEMENTEN =======================
    const form = document.getElementById('persoonForm');          // Formulier waar gebruiker gegevens invult
    const previewDiv = document.getElementById('personPreview');  // Container voor JSON preview
    const previewContent = document.getElementById('previewContent'); // <pre> element waar preview wordt getoond
    const confirmBtn = document.getElementById('confirmBtn');     // Knop om bevestiging te geven en data op te slaan
    const warningMessage = document.getElementById('warningMessage'); // Div voor waarschuwingen

    // ======================= HELPER FUNCTIES =======================
    /**
     * Functie om waarden van het formulier op te halen
     * @returns {Object} - Object met alle formuliervelden
     */
    function getFormValues() {
        return {
            doopnaam: document.getElementById('doopnaam').value.trim(), 
            roepnaam: document.getElementById('roepnaam').value.trim(), 
            prefix: document.getElementById('prefix').value.trim(),     
            achternaam: document.getElementById('achternaam').value.trim(), 
            geboorte: document.getElementById('geboortedatum').value,   
            geslacht: document.getElementById('geslacht').value        
        };
    }

    /**
     * Functie om een nieuw persoon object te maken volgens schema
     * @param {Object} values - Formulierwaarden
     * @returns {Object} - Nieuw persoon object
     */
    function createPersonObject(values) {
        const id = genereerId(values.doopnaam, values.roepnaam, values.achternaam, values.geslacht); // Unieke ID aanmaken
        return {
            id: id,                    // Unieke ID van persoon
            Doopnaam: values.doopnaam, // Doopnaam veld
            Roepnaam: values.roepnaam, // Roepnaam veld
            Prefix: values.prefix,     // Tussenvoegsel
            Achternaam: values.achternaam, // Achternaam veld
            Geslacht: values.geslacht,     // Geslacht veld
            Geboortedatum: values.geboorte, // Geboortedatum veld
            Relatie: 'Hoofd-ID',       // Standaard hoofdrelatie
            PartnerID: []              // Start met lege partnerlijst
        };
    }

    /**
     * Functie om preview te tonen in het DOM
     * @param {Object} person - Persoon object
     */
    function showPreview(person) {
        previewContent.textContent = JSON.stringify(person, null, 2); // JSON leesbaar maken
        previewDiv.style.display = 'block'; // Preview zichtbaar maken
    }

    /**
     * Functie om waarschuwing te tonen
     * @param {string} message - Waarschuwingstekst
     */
    function showWarning(message) {
        warningMessage.textContent = message;
        warningMessage.style.display = 'block';
        previewDiv.style.display = 'none'; // Preview verbergen bij waarschuwing
    }

    // ======================= FORM SUBMIT HANDLER =======================
    form.addEventListener('submit', function(e){
        e.preventDefault(); // Voorkom dat formulier pagina reloadt

        const dataset = StamboomStorage.get(); // Haal huidige dataset uit centrale storage

        // Controleer of er al data aanwezig is
        if(dataset.length > 0){
            showWarning("Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden.");
            return; // stop verwerking
        }

        // Haal formulierwaarden op
        const values = getFormValues();

        // Maak nieuw persoon object volgens schema
        const person = createPersonObject(values);

        // Toon JSON preview
        showPreview(person);
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    confirmBtn.addEventListener('click', function(){
        const person = JSON.parse(previewContent.textContent); // Haal persoon uit preview
        StamboomStorage.add(person);                            // Voeg persoon toe aan centrale storage
        // Navigeer naar Manage pagina
        window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html";
    });

}); // einde DOMContentLoaded
