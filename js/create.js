// ======================= js/create.js v1.0.2 =======================
// 1. Wacht tot de DOM volledig geladen is en haalt alle relevante HTML-elementen op (form, preview, knoppen, waarschuwing)
// 2. ID-generator wordt gebruikt via de externe `js/idGenerator.js` (window.genereerCode), geen inline functie meer
// 3. Luistert naar form submit:
//    - Voorkomt page reload
//    - Haalt formulierwaarden op
//    - Controleert of er al een persoon in de storage staat en toont waarschuwing indien ja
//    - Maakt een `person` object met ingevulde gegevens
//    - Roept `window.genereerCode(person, dataset)` aan om een unieke ID toe te voegen
//    - Toont JSON preview van het `person` object
// 4. Luistert naar confirm button click:
//    - Haalt `person` object uit preview
//    - Voegt dit toe aan centrale storage via `StamboomStorage.add()`
//    - Navigeert naar de Manage pagina
// 5. Verplichte velden (Doopnaam, Roepnaam, Achternaam, Geslacht) worden nu gecontroleerd vóór het aanmaken van het person object, met een waarschuwing en blokkade van de preview als ze leeg zijn
// ==============================================================

document.addEventListener('DOMContentLoaded', () => { // Wacht tot de volledige DOM is geladen voordat je elementen ophaalt

    // ======================= DOM ELEMENTEN =======================
    const form = document.getElementById('persoonForm');          // Formulier waar gebruiker gegevens invult
    const previewDiv = document.getElementById('personPreview');  // Container voor JSON preview
    const previewContent = document.getElementById('previewContent'); // <pre> element waar preview wordt getoond
    const confirmBtn = document.getElementById('confirmBtn');     // Knop om bevestiging te geven en data op te slaan
    const warningMessage = document.getElementById('warningMessage'); // Div voor waarschuwingen

    // ======================= ID GENERATOR =======================
    // → Externe generator wordt geladen via <script src="js/idGenerator.js"></script> in HTML
    // → Geen inline generator nodig, ID wordt toegevoegd via window.genereerCode()

    // ======================= FORM SUBMIT HANDLER =======================
    form.addEventListener('submit', function(e){
    e.preventDefault();

    const dataset = StamboomStorage.get();

    if(dataset.length > 0){
        warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden.";
        warningMessage.style.display = 'block';
        previewDiv.style.display = 'none';
        return;
    }

     // ======================= FORMULIER WAARDEN OPHALEN =======================
        const doopnaam = document.getElementById('doopnaam').value.trim(); // doopnaam
        const roepnaam = document.getElementById('roepnaam').value.trim(); // roepnaam
        const prefix = document.getElementById('prefix').value.trim();     // prefix
        const achternaam = document.getElementById('achternaam').value.trim(); // achternaam
        const geboorte = document.getElementById('geboortedatum').value;   // geboortedatum
        const geslacht = document.getElementById('geslacht').value;        // geslacht
    // ======================= CHECK VERPLICHTE VELDEN =======================
    if(!doopnaam || !roepnaam || !achternaam || !geslacht){
        warningMessage.textContent = "Vul alstublieft alle verplichte velden in: Doopnaam, Roepnaam, Achternaam en Geslacht.";
        warningMessage.style.display = 'block';
        previewDiv.style.display = 'none';
        return; // stop verwerking
    }
           
        // ======================= NIEUWE PERSOON OBJECT =======================
        const person = {
            Doopnaam: doopnaam,   // doopnaam
            Roepnaam: roepnaam,   // roepnaam
            Prefix: prefix,       // prefix
            Achternaam: achternaam, // achternaam
            Geslacht: geslacht,   // geslacht
            Geboortedatum: geboorte, // geboortedatum
            Relatie: 'Hoofd-ID',  // automatisch hoofd
            PartnerID: []         // start met lege partnerlijst
        };

        // ======================= UNIEKE ID TOEVOEGEN =======================
        person.ID = window.genereerCode(person, dataset); // → ID genereren via externe js/idGenerator.js

        // ======================= PREVIEW TONEN =======================
        previewContent.textContent = JSON.stringify(person, null, 2); // JSON leesbaar maken in preview
        previewDiv.style.display = 'block'; // preview zichtbaar maken
         warningMessage.style.display = 'none'; // waarschuwing weg
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    confirmBtn.addEventListener('click', function(){
        const person = JSON.parse(previewContent.textContent); // haal persoon uit preview
        StamboomStorage.add(person); // voeg persoon toe aan centrale storage
        window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html"; // ga naar Manage pagina
    });

}); // einde DOMContentLoaded
