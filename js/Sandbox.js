/* ======================= js/Sandbox.js v0.0.2 ======================= */
/* ======================= INIT ======================= */
/* Initialisatie van LiveSearch in sandbox */

const searchInput = document.getElementById('sandboxSearch'); // Haal input element

// ======================= DATASET =======================
const dataset = window.StamboomStorage.get() || [           // Haal dataset uit storage, of gebruik testdata
    {ID:'1', Roepnaam:'Jan', Achternaam:'Jansen', Geboortedatum:'1980-05-12'},
    {ID:'2', Roepnaam:'Marie', Achternaam:'De Vries', Geboortedatum:'1990-11-23'},
    {ID:'3', Roepnaam:'Piet', Achternaam:'Van den Berg', Geboortedatum:'1975-09-03'}
];

// ======================= LIVE SEARCH INITIALISATIE =======================
initLiveSearch(searchInput, dataset, (selectedId) => {
    console.log('Geselecteerde persoon ID:', selectedId);   // Callback bij selectie
    // ⚡ Hier kan je bijvoorbeeld renderTree(selectedId) of andere actie aanroepen
});
