<!-- js/idGenerator.js v1.0.0 -->
 <!-- Genereert unieke ID voor een persoon -->
<!-- Neemt eerste letters van doopnaam, roepnaam, achternaam en geslacht -->
<!-- Voegt een oplopend nummer van 3 cijfers toe voor uniciteit -->
<!-- Controleert dat de ID nog niet bestaat in de huidige dataset -->
<!-- Gebruikt fallback letters als een veld leeg is -->
<!-- Wordt aangeroepen vanuit create.js bij het aanmaken van een persoon -->
  
import './js/idGenerator.js'; // Importeer de externe ID-generator (als module niet standaard, dan via <script> in HTML)

document.addEventListener('DOMContentLoaded', () => {

    // ======================= DOM ELEMENTEN =======================
    // Haal alle benodigde HTML-elementen op (formulier, preview, knoppen, waarschuwing)
    const form = document.getElementById('persoonForm');
    const previewDiv = document.getElementById('personPreview');
    const previewContent = document.getElementById('previewContent');
    const confirmBtn = document.getElementById('confirmBtn');
    const warningMessage = document.getElementById('warningMessage');

    // ======================= FORM SUBMIT HANDLER =======================
    // Luistert naar submit-event van het formulier
    form.addEventListener('submit', function(e){
        e.preventDefault(); // Voorkom standaard pagina reload

        const dataset = StamboomStorage.get(); // Huidige dataset ophalen

        if(dataset.length > 0){
            // Waarschuwing tonen als er al een persoon aanwezig is
            warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden.";
            warningMessage.style.display = 'block';
            previewDiv.style.display = 'none';
            return;
        }

        // ======================= FORMULIER WAARDEN OPHALEN =======================
        // Haal waarden van inputvelden op
        const doopnaam = document.getElementById('doopnaam').value.trim();
        const roepnaam = document.getElementById('roepnaam').value.trim();
        const prefix = document.getElementById('prefix').value.trim();
        const achternaam = document.getElementById('achternaam').value.trim();
        const geboorte = document.getElementById('geboortedatum').value;
        const geslacht = document.getElementById('geslacht').value;

        // ======================= NIEUWE PERSOON OBJECT =======================
        // Maak een object aan voor de nieuwe persoon zonder ID
        const person = {
            Doopnaam: doopnaam,
            Roepnaam: roepnaam,
            Prefix: prefix,
            Achternaam: achternaam,
            Geslacht: geslacht,
            Geboortedatum: geboorte,
            Relatie: 'Hoofd-ID',
            PartnerID: []
        };

        // ======================= UNIEKE ID TOEVOEGEN =======================
        // Gebruik externe ID-generator voor unieke ID op basis van dataset
        person.ID = window.genereerCode(person, dataset);

        // ======================= PREVIEW TONEN =======================
        // Toon JSON-preview van de nieuwe persoon
        previewContent.textContent = JSON.stringify(person, null, 2);
        previewDiv.style.display = 'block';
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    // Luistert naar klik op bevestigingsknop
    confirmBtn.addEventListener('click', function(){
        const person = JSON.parse(previewContent.textContent); // Haal persoon uit preview
        StamboomStorage.add(person); // Voeg persoon toe aan centrale storage
        window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html"; // Ga naar Manage pagina
    });

}); 
