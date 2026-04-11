// =============================================================================
// reset.js — Wachtwoord Reset Logica
// MyFamTreeCollab v1.0.0
// -----------------------------------------------------------------------------
// Verwerkt het wachtwoord-resetformulier op home/reset.html.
//
// Flow:
// 1. Supabase detecteert de token in de URL en logt de gebruiker in
// 2. onAuthChange vangt het 'PASSWORD_RECOVERY' event op
// 3. Formulier is zichtbaar — gebruiker vult nieuw wachtwoord in
// 4. AuthModule.updatePassword() slaat het nieuwe wachtwoord op
// 5. Redirect naar home na succesvolle reset
//
// Dependencies: Supabase SDK, auth.js
// Load order:   utils.js → auth.js → topbar.js → reset.js
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Wacht op DOMContentLoaded zodat alle elementen beschikbaar zijn
  // ---------------------------------------------------------------------------
  document.addEventListener("DOMContentLoaded", function () {

    // Haal alle benodigde DOM-elementen op
    const formulier  = document.getElementById("reset-formulier"); // Formulier sectie
    const ongeldig   = document.getElementById("reset-ongeldig");  // Ongeldige link sectie
    const btn        = document.getElementById("btn-reset");       // Opslaan knop
    const msgEl      = document.getElementById("reset-msg");       // Feedback bericht
    const pwdInput   = document.getElementById("reset-pwd");       // Nieuw wachtwoord veld
    const pwd2Input  = document.getElementById("reset-pwd2");      // Herhaal wachtwoord veld

    // -------------------------------------------------------------------------
    // _showMsg(text, type)
    // Toont een feedback bericht onder het formulier.
    // type is 'error' of 'success'
    // -------------------------------------------------------------------------
    function _showMsg(text, type) {
      msgEl.textContent = text;
      msgEl.className   = "reset-msg " + type;
    }

    // -------------------------------------------------------------------------
    // Luister op auth-wijzigingen van Supabase
    // Supabase stuurt automatisch een PASSWORD_RECOVERY event als de gebruiker
    // via de resetlink op deze pagina komt — de token in de URL wordt automatisch
    // verwerkt door de Supabase client.
    // -------------------------------------------------------------------------
    AuthModule.onAuthChange(async function (event, session) {

      if (event === "PASSWORD_RECOVERY") {
        // Resetlink is geldig — toon het formulier
        // (formulier is al zichtbaar als standaard — geen actie nodig)
        if (pwdInput) pwdInput.focus(); // Focus op het eerste veld
      }

      if (event === "SIGNED_IN" && !session) {
        // Geen geldige sessie via resetlink — toon ongeldige link melding
        formulier.style.display = "none";
        ongeldig.style.display  = "block";
      }
    });

    // -------------------------------------------------------------------------
    // Controleer bij laden of er een actieve sessie is via de URL-token
    // Als er geen token in de URL zit EN geen sessie, toon ongeldige melding
    // -------------------------------------------------------------------------
    (async function checkToken() {
      // Wacht kort zodat Supabase de URL-token kan verwerken
      await new Promise(resolve => setTimeout(resolve, 500));

      const session = await AuthModule.getSession();
      const url     = window.location.href;

      // Als er geen sessie is en geen token in de URL, is de link ongeldig
      const heeftToken = url.includes("access_token") || url.includes("token_hash") || url.includes("code=");

      if (!session && !heeftToken) {
        formulier.style.display = "none";
        ongeldig.style.display  = "block";
      }
    })();

    // -------------------------------------------------------------------------
    // Knop click handler: valideer en sla nieuw wachtwoord op
    // -------------------------------------------------------------------------
    btn.addEventListener("click", async function () {
      const pwd  = pwdInput.value;
      const pwd2 = pwd2Input.value;

      // Client-side validatie: wachtwoorden moeten overeenkomen
      if (pwd !== pwd2) {
        _showMsg("Wachtwoorden komen niet overeen.", "error");
        return;
      }

      // Knop uitschakelen tijdens het opslaan
      btn.disabled    = true;
      btn.textContent = "Bezig…";

      const { error } = await AuthModule.updatePassword(pwd);

      // Knop altijd terugzetten — ongeacht resultaat
      btn.disabled    = false;
      btn.textContent = "Wachtwoord opslaan";

      if (error) {
        _showMsg(error, "error");
        return;
      }

      // Succes: toon bevestiging en redirect naar home na 2 seconden
      _showMsg("Wachtwoord opgeslagen! Je wordt doorgestuurd…", "success");
      setTimeout(function () {
        window.location.href = "/MyFamTreeCollab/";
      }, 2000);
    });

  }); // einde DOMContentLoaded

})();
