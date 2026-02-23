// =======================================
// create.js - lean integratie met schema
// =======================================

<!-- ======================= CREATE PAGE FORMULIER + PREVIEW ======================= -->
<form id="addPersonForm" 
      style="display:flex; flex-direction:column; gap:15px; max-width:500px; margin:0 auto; align-items:center;">
    <!-- Form container: flex column, gecentreerd, max breedte, gap tussen rijen -->

    <!-- Doopnaam en Roepnaam -->
    <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1;">
            <label for="doopnaam">Doopnaam:</label>
            <input type="text" id="doopnaam" name="doopnaam" placeholder="Doopnaam" style="width:100%; padding:5px;">
        </div>
        <div style="flex:1;">
            <label for="roepnaam">Roepnaam:</label>
            <input type="text" id="roepnaam" name="roepnaam" placeholder="Roepnaam" style="width:100%; padding:5px;">
        </div>
    </div>

    <!-- Prefix en Achternaam -->
    <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1;">
            <label for="prefix">Prefix:</label>
            <input type="text" id="prefix" name="prefix" placeholder="Prefix" style="width:100%; padding:5px;">
        </div>
        <div style="flex:1;">
            <label for="achternaam">Achternaam:</label>
            <input type="text" id="achternaam" name="achternaam" placeholder="Achternaam" style="width:100%; padding:5px;">
        </div>
    </div>

    <!-- Geboortedatum en Geslacht -->
    <div style="display:flex; gap:10px; width:100%;">
        <div style="flex:1;">
            <label for="geboortedatum">Geboortedatum:</label>
            <input type="date" id="geboortedatum" name="geboortedatum" style="width:100%; padding:5px;">
        </div>
        <div style="flex:1;">
            <label for="geslacht">Geslacht:</label>
            <select id="geslacht" name="geslacht" style="width:100%; padding:5px;">
                <option value="">Selecteer</option>
                <option value="M">Man</option>
                <option value="V">Vrouw</option>
                <option value="X">Anders / Non-binair</option>
            </select>
        </div>
    </div>

    <!-- Opslaan knop -->
    <button type="submit" 
            style="padding:10px 20px; background:#1E90FF; color:#fff; border:none; border-radius:5px; cursor:pointer; width:150px; margin-bottom:20px;">
        Opslaan
    </button>
</form>

<!-- Meldingssectie voor bestaande data -->
<div id="warningMessage" 
     style="display:none; max-width:500px; margin:10px auto; padding:10px; background:#fff3cd; color:#856404; border-radius:5px; border:1px solid #ffeeba;">
</div>

<!-- Preview & Confirm sectie -->
<div id="personPreview" 
     style="display:none; margin-top:20px; padding:15px; border:1px solid #ccc; border-radius:8px; background:#f9f9f9; max-width:500px; margin-left:auto; margin-right:auto;">
    <h3>Bevestig de persoon</h3>
    <pre id="previewContent" style="white-space:pre-wrap;"></pre>
    <button id="confirmBtn" 
            style="padding:10px 20px; background:#28a745; color:#fff; border:none; border-radius:5px; cursor:pointer; margin-top:10px;">
        Bevestigen & Ga naar Manage
    </button>
</div>

<script>
// ======================= CREATE.JS ROBUUST =======================

// Lees bestaande stamboom data uit sessionStorage
let stamboomData = JSON.parse(sessionStorage.getItem('stamboomData') || '[]');

// Referenties naar DOM elementen
const form = document.getElementById('addPersonForm'); // Formulier element
const previewDiv = document.getElementById('personPreview'); // Preview container
const previewContent = document.getElementById('previewContent'); // JSON preview
const confirmBtn = document.getElementById('confirmBtn'); // Confirm knop
const warningMessage = document.getElementById('warningMessage'); // Waarschuwing voor bestaande data

// ======================= ID GENERATOR =======================
function genereerCode(doopnaam, roepnaam, achternaam, geslacht) {
    // Genereer unieke ID: eerste letter doopnaam + roepnaam + achternaam + geslacht + timestamp
    return (doopnaam[0]||'') + (roepnaam[0]||'') + (achternaam[0]||'') + (geslacht[0]||'X') + Date.now();
}

// ======================= FORM SUBMIT HANDLER =======================
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Voorkom pagina reload

    // Controleer of er al data bestaat
    if(stamboomData.length > 0){
        // Toon waarschuwing en stop verdere verwerking
        warningMessage.textContent = "Er staat al een persoon in de stamboom. Nieuwe invoer kan hier niet toegevoegd worden.";
        warningMessage.style.display = 'block';
        previewDiv.style.display = 'none';
        return; // stop functie
    }

    // Lees formulier waarden
    const doopnaam = document.getElementById('doopnaam').value.trim();
    const roepnaam = document.getElementById('roepnaam').value.trim();
    const prefix = document.getElementById('prefix').value.trim();
    const achternaam = document.getElementById('achternaam').value.trim();
    const geboorte = document.getElementById('geboortedatum').value;
    const geslacht = document.getElementById('geslacht').value;

    // Genereer unieke ID
    const uniekeID = genereerCode(doopnaam, roepnaam, achternaam, geslacht);

    // Maak persoon object
    const person = {
        ID: uniekeID, // unieke identifier
        Doopnaam: doopnaam,
        Roepnaam: roepnaam,
        Prefix: prefix,
        Achternaam: achternaam,
        Geslacht: geslacht,
        Geboortedatum: geboorte,
        Relatie: 'Hoofd-ID', // automatisch hoofdpersoon
        PartnerID: [] // start leeg
    };

    // Toon preview sectie
    previewContent.textContent = JSON.stringify(person, null, 2); // leesbare JSON
    previewDiv.style.display = 'block'; // zichtbaar maken
});

// ======================= CONFIRM HANDLER =======================
confirmBtn.addEventListener('click', function() {
    // Haal persoon op uit preview
    const person = JSON.parse(previewContent.textContent);

    // Voeg toe aan stamboomData
    stamboomData.push(person);

    // Sla op in sessionStorage
    sessionStorage.setItem('stamboomData', JSON.stringify(stamboomData));

    // Ga naar Manage pagina
    window.location.href = "https://thvd64-cyber.github.io/MyFamTreeCollab/stamboom/manage.html";
});
</script>
