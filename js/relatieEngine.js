/* ======================= js/relatieEngine.js v2.0.0 =======================
   Centrale relatie-berekening voor MyFamTreeCollab
   Berekent alle familierelaties rond een geselecteerde hoofdpersoon
   Exporteert: window.RelatieEngine.computeRelaties(data, hoofdId)

   Vereist: utils.js (voor safe()) — moet eerder geladen zijn in HTML
   Gebruikt door: view.js, timeline.js, manage.js
   ========================================================================= */

(function () {                                                              // Zelfuitvoerende functie: voorkomt globale variabelen buiten window.RelatieEngine
    'use strict';                                                           // Strikte modus: voorkomt stille JS-fouten

    /* ======================= HULPFUNCTIE ======================= */
    const safe = window.ftSafe;                                             // Gebruik de centrale safe() uit utils.js — geen lokale kopie meer nodig

    /* ======================= RELATIE ENGINE ======================= */

    /**
     * Berekent alle familierelaties van alle personen t.o.v. de hoofdpersoon.
     * @param  {Array}  data    - Volledige dataset van persoon-objecten
     * @param  {string} hoofdId - ID van de geselecteerde hoofdpersoon
     * @returns {Array}         - Kopie van dataset, elk persoon aangevuld met .Relatie en ._priority
     */
    function computeRelaties(data, hoofdId) {

        if (!hoofdId) return [];                                            // Geen hoofdpersoon opgegeven → geef lege array terug, niets te berekenen

        const hoofd = data.find(p => safe(p.ID) === safe(hoofdId));        // Zoek de hoofdpersoon op in de dataset op basis van ID
        if (!hoofd) return [];                                              // Hoofdpersoon niet gevonden in dataset → stop, geen resultaten mogelijk

        const VHoofdID = safe(hoofd.VaderID);                              // ID van de vader van de hoofdpersoon (lege string als geen vader ingevuld)
        const MHoofdID = safe(hoofd.MoederID);                             // ID van de moeder van de hoofdpersoon (lege string als geen moeder ingevuld)
        const PHoofdID = safe(hoofd.PartnerID);                            // ID van de partner van de hoofdpersoon (lege string als geen partner ingevuld)

        /* ======================= KINDEREN VERDELEN IN 3 TYPES ======================= */

        const KindID   = [];                                                // Kinderen van ZOWEL hoofdpersoon als diens partner samen
        const HKindID  = [];                                                // Kinderen van ALLEEN de hoofdpersoon (andere ouder is onbekend of anders)
        const PHKindID = [];                                                // Kinderen van ALLEEN de partner (hoofdpersoon is niet de andere ouder)

        data.forEach(p => {                                                 // Loop door alle personen in de dataset
            const vader  = safe(p.VaderID);                                // Haal VaderID op als veilige string
            const moeder = safe(p.MoederID);                               // Haal MoederID op als veilige string

            if (vader === hoofdId && moeder === PHoofdID) {                 // Vader = hoofd EN moeder = partner van hoofd → gedeeld kind
                KindID.push(p.ID);                                         // Voeg toe aan de lijst van gezamenlijke kinderen

            } else if (vader === hoofdId) {                                 // Vader = hoofd maar moeder is iemand anders (of onbekend)
                HKindID.push(p.ID);                                        // Voeg toe aan lijst van kinderen alleen via de hoofdpersoon

            } else if (PHoofdID && moeder === PHoofdID) {                   // Moeder = partner van hoofd, maar vader is iemand anders
                PHKindID.push(p.ID);                                       // Voeg toe aan lijst van kinderen alleen via de partner
            }
        });

        /* ======================= BROERS EN ZUSSEN ======================= */

        const BZID = data                                                   // Zoek alle broers en zussen van de hoofdpersoon
            .filter(p => {
                const pid = safe(p.ID);                                    // Haal ID van huidige persoon op als veilige string

                if (pid === hoofdId)              return false;             // Sla de hoofdpersoon zelf over
                if (pid === PHoofdID)             return false;             // Sla de partner van de hoofdpersoon over
                if (KindID.includes(pid))         return false;             // Sla gezamenlijke kinderen over
                if (HKindID.includes(pid))        return false;             // Sla kinderen van alleen hoofd over
                if (PHKindID.includes(pid))       return false;             // Sla kinderen van alleen partner over

                return (VHoofdID && safe(p.VaderID) === VHoofdID)          // Zelfde vader als hoofdpersoon → broer of zus
                    || (MHoofdID && safe(p.MoederID) === MHoofdID);        // OF zelfde moeder als hoofdpersoon → broer of zus
            })
            .map(p => p.ID);                                               // Bewaar alleen de ID's van gevonden broers/zussen

        /* ======================= PARTNERS VAN KINDEREN ======================= */

        const KindPartnerID = [...KindID, ...HKindID, ...PHKindID]         // Combineer alle drie kindtypen in één lijst
            .map(id => {
                const k = data.find(p => p.ID === id);                     // Zoek het kind-object op via zijn ID
                return k && k.PartnerID ? k.PartnerID : null;              // Geef PartnerID terug als het kind een partner heeft, anders null
            })
            .filter(Boolean);                                              // Verwijder alle null-waarden (kinderen zonder partner)

        /* ======================= PARTNERS VAN BROERS/ZUSSEN ======================= */

        const BZPartnerID = BZID                                           // Loop door alle broer/zus-ID's
            .map(id => {
                const s = data.find(p => p.ID === id);                     // Zoek de broer/zus op via zijn ID
                return s && s.PartnerID ? s.PartnerID : null;              // Geef PartnerID terug als broer/zus een partner heeft, anders null
            })
            .filter(Boolean);                                              // Verwijder alle null-waarden (broers/zussen zonder partner)

        /* ======================= RELATIE CLASSIFICATIE ======================= */

        return data                                                        // Verwerk elk persoon naar een object met Relatie-label en prioriteit
            .map(p => {
                const pid   = safe(p.ID);                                  // Haal het ID van de huidige persoon op als veilige string
                const clone = { ...p };                                    // Maak een ondiepe kopie zodat het origineel niet gewijzigd wordt

                clone.Relatie   = '';                                      // Start met lege relatie, wordt hieronder ingevuld
                clone._priority = 99;                                      // Standaard lage prioriteit voor personen buiten de directe familie

                if      (pid === hoofdId)               { clone.Relatie = 'HoofdID';       clone._priority = 1;   } // De hoofdpersoon zelf
                else if (pid === VHoofdID)              { clone.Relatie = 'VHoofdID';      clone._priority = 0;   } // Vader van hoofd (bovenaan)
                else if (pid === MHoofdID)              { clone.Relatie = 'MHoofdID';      clone._priority = 0;   } // Moeder van hoofd (bovenaan)
                else if (pid === PHoofdID)              { clone.Relatie = 'PHoofdID';      clone._priority = 2;   } // Partner van hoofd
                else if (KindID.includes(pid))          { clone.Relatie = 'KindID';        clone._priority = 3;   } // Gedeeld kind van hoofd + partner
                else if (HKindID.includes(pid))         { clone.Relatie = 'HKindID';       clone._priority = 3;   } // Kind van alleen hoofd
                else if (PHKindID.includes(pid))        { clone.Relatie = 'PHKindID';      clone._priority = 3;   } // Kind van alleen partner
                else if (KindPartnerID.includes(pid))   { clone.Relatie = 'KindPartnerID'; clone._priority = 3.5; } // Partner van een kind
                else if (BZID.includes(pid))            { clone.Relatie = 'BZID';          clone._priority = 4;   } // Broer of zus van hoofd
                else if (BZPartnerID.includes(pid))     { clone.Relatie = 'BZPartnerID';   clone._priority = 4.5; } // Partner van een broer/zus

                return clone;                                              // Geef het persoon-object terug met ingevulde Relatie en _priority
            })
            .sort((a, b) => a._priority - b._priority);                   // Sorteer op prioriteit: ouders (0) → hoofd (1) → partner (2) → kinderen (3) → ...
    }

    /* ======================= EXPORTEER ALS GLOBAAL OBJECT ======================= */
    window.RelatieEngine = {                                                // Exporteer onder één namespace zodat andere scripts dit kunnen aanroepen
        computeRelaties                                                     // window.RelatieEngine.computeRelaties(data, hoofdId)
    };

})();                                                                       // Sluit en voer de zelfuitvoerende functie direct uit
