// ======================= js/create.js v1.1.0 =======================
// Verwerkt het formulier voor het aanmaken van de eerste persoon (Hoofd-ID)
// Vereist: schema.js, idGenerator.js, storage.js (in die volgorde geladen)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {               // Wacht tot de volledige HTML geladen is voordat we DOM-elementen opzoeken

    // ======================= DOM ELEMENTEN =======================
    const form           = document.getElementById('persoonForm');   // Het invulformulier met alle persoonsgegevens
    const previewDiv     = document.getElementById('personPreview'); // De sectie die de JSON-preview toont vóór opslaan
    const previewContent = document.getElementById('previewContent');// Het <pre> element binnenin previewDiv met de JSON-tekst
    const confirmBtn     = document.getElementById('confirmBtn');    // De knop waarmee de gebruiker de invoer bevestigt en opslaat
    const warningMessage = document.getElementById('warningMessage');// De div voor fout- of waarschuwingsberichten aan de gebruiker

    // ======================= FORM SUBMIT HANDLER =======================
    form.addEventListener('submit', function(e) {                    // Luister naar het moment dat de gebruiker op Opslaan klikt
        e.preventDefault();                                          // Voorkom dat de browser de pagina herlaadt bij formulier-submit

        const dataset = StamboomStorage.get();                       // Haal de huidige lijst van personen op uit localStorage via storage.js

        if (dataset.length > 0) {                                    // Controleer of er al minstens één persoon in de stamboom staat
            warningMessage.textContent = 'Er staat al een persoon in de stamboom. Gebruik Manage om personen toe te voegen.'; // Toon uitleg aan de gebruiker
            warningMessage.style.display = 'block';                  // Maak het waarschuwingsblok zichtbaar (was verborgen via CSS)
            previewDiv.style.display = 'none';                       // Verberg de preview sectie want er is niets te bevestigen
            return;                                                  // Stop de functie hier, sla niets op
        }

        // ======================= FORMULIER WAARDEN OPHALEN =======================
        const doopnaam   = document.getElementById('doopnaam').value.trim();    // Officiële voornaam, trim verwijdert spaties voor/achter
        const roepnaam   = document.getElementById('roepnaam').value.trim();    // Naam waarop persoon aangesproken wordt
        const prefix     = document.getElementById('prefix').value.trim();      // Tussenvoegsel zoals 'van', 'de', 'van den'
        const achternaam = document.getElementById('achternaam').value.trim();  // Familienaam
        const geboorte   = document.getElementById('geboortedatum').value;      // Geboortedatum in formaat yyyy-mm-dd (HTML date input)
        const geslacht   = document.getElementById('geslacht').value;           // Geslacht: M, V of X

        // ======================= NIEUWE PERSOON OBJECT =======================
        const person = {
            ID: window.genereerCode(                                 // Roep centrale ID-generator aan uit idGenerator.js
                { Doopnaam: doopnaam, Roepnaam: roepnaam,           // Geef naamvelden mee zodat ID-letters kloppen
                  Achternaam: achternaam, Geslacht: geslacht },      // Geslacht bepaalt de 4e letter in het ID
                StamboomStorage.get()                                // Geef huidige dataset mee zodat ID uniek is
            ),
            Doopnaam:      doopnaam,                                 // Sla officiële voornaam op in het persoon-object
            Roepnaam:      roepnaam,                                 // Sla roepnaam op
            Prefix:        prefix,                                   // Sla tussenvoegsel op (mag leeg zijn)
            Achternaam:    achternaam,                               // Sla familienaam op
            Geslacht:      geslacht,                                 // Sla geslacht op (M / V / X)
            Geboortedatum: geboorte,                                 // Sla geboortedatum op
            Relatie:       'Hoofd-ID',                               // Eerste persoon is altijd de Hoofd-ID van de stamboom
            PartnerID:     []                                        // Lege array: nog geen partner(s) gekoppeld bij aanmaken
        };

        // ======================= PREVIEW TONEN =======================
        previewContent.textContent = JSON.stringify(person, null, 2); // Zet het persoon-object om naar leesbare JSON-tekst (2 spaties inspringing)
        previewDiv.style.display = 'block';                          // Maak de preview sectie zichtbaar zodat gebruiker kan controleren
    });

    // ======================= CONFIRM BUTTON HANDLER =======================
    confirmBtn.addEventListener('click', function() {                // Luister naar klik op de bevestigingsknop onder de preview
        const person = JSON.parse(previewContent.textContent);       // Lees de JSON-tekst uit de preview terug naar een JavaScript object
        StamboomStorage.add(person);                                 // Voeg de nieuwe persoon toe aan localStorage via storage.js
        window.location.href = '../stamboom/manage.html';            // Stuur de gebruiker door naar de Manage pagina om verder te gaan
    });

}); // Einde DOMContentLoaded — alles hierboven wordt pas uitgevoerd als de hele pagina klaar is
