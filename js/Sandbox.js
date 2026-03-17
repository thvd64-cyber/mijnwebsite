/* ======================= js/Sandbox.js v0.0.0 ======================= */
/* ======================= INIT ======================= */
/* Initialisatie van LiveSearch in sandbox */

const searchInput = document.getElementById('sandboxSearch'); // Haal input element
const dataset = window.StamboomStorage.get() || [];          // Haal dataset uit storage

initLiveSearch(searchInput, dataset, (selectedId) => {
    console.log('Geselecteerde persoon ID:', selectedId);   // Callback bij selectie
    // Hier kan je bv. renderTree(selectedId) of andere actie aanroepen
});
