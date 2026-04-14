/* ======================= js/relatieEngine.js v2.4.0 =======================
   Centrale relatie-berekening voor MyFamTreeCollab
   Berekent alle familierelaties rond een geselecteerde hoofdpersoon
   Exporteert: window.RelatieEngine.computeRelaties(data, hoofdId)

   Vereist: utils.js (voor safe()) — moet eerder geladen zijn in HTML
   Gebruikt door: view.js, timeline.js, manage.js

   Wijziging v2.4.0 t.o.v. v2.3.0:
   - PHoofdID bepaald via split('|')[0]: eerste partner uit pipe-gescheiden
     PartnerID wordt gebruikt als primaire partner voor de scenario-logica.
     Overige partners worden niet meegenomen in de relatieberekening —
     view.js en manage.js tonen extra partners via eigen split-logica.

   Wijziging v2.3.0 t.o.v. v2.2.0:
   - KindPartnerID verwijderd — bestaat niet in de specificatie, partners van
     kinderen worden per pagina opgezocht via k.PartnerID
   - Sortering onbekende geboortedatum gecorrigeerd: new Date(0) → new Date(9999,0)
     zodat personen zonder datum écht achteraan komen (niet tussen 1970-personen)

   Wijziging v2.2.0 t.o.v. v2.1.0:
   - Secundaire sortering toegevoegd: binnen elke relatiegroep oud → jong
     op basis van Geboortedatum. Geldt voor manage, view en timeline.

   Wijziging v2.1.0 t.o.v. v2.0.0:
   - Kind-classificatie volledig herschreven zodat zowel vader als moeder
     als hoofdpersoon kan fungeren. Drie scenario's (conform specificatie):

     Scenario 1 — KindID:
       (VaderID = HoofdID EN MoederID = PHoofdID)
       OF (MoederID = HoofdID EN VaderID = PHoofdID)
       → Kind van BEIDE: hoofdpersoon + diens partner

     Scenario 2 — HKindID:
       (VaderID = HoofdID EN MoederID ≠ PHoofdID)
       OF (MoederID = HoofdID EN VaderID ≠ PHoofdID)
       → Kind van ALLEEN de hoofdpersoon (andere ouder is iemand anders of onbekend)

     Scenario 3 — PHKindID:
       (VaderID = PHoofdID EN MoederID ≠ HoofdID)
       OF (MoederID = PHoofdID EN VaderID ≠ HoofdID)
       → Kind van ALLEEN de partner (hoofdpersoon is niet de andere ouder)

   - BZID exclusie bijgewerkt om alle nieuwe kindtypen mee te nemen
   - KindPartnerID en BZPartnerID traversal bijgewerkt
   ========================================================================= */

(function () {
    'use strict';

    const safe = window.ftSafe; // Centrale safe() uit utils.js

    /**
     * Berekent alle familierelaties van alle personen t.o.v. de hoofdpersoon.
     * @param  {Array}  data    - Volledige dataset van persoon-objecten
     * @param  {string} hoofdId - ID van de geselecteerde hoofdpersoon
     * @returns {Array}         - Kopie van dataset, elk persoon aangevuld met .Relatie en ._priority
     */
    function computeRelaties(data, hoofdId) {

        if (!hoofdId) return [];                                            // Geen hoofdpersoon → lege array

        const hoofd = data.find(p => safe(p.ID) === safe(hoofdId));        // Zoek hoofdpersoon op
        if (!hoofd) return [];                                              // Niet gevonden → stop

        const sid      = safe(hoofdId);                                    // Veilige string van hoofdId
        const VHoofdID = safe(hoofd.VaderID);                              // Vader van hoofdpersoon
        const MHoofdID = safe(hoofd.MoederID);                             // Moeder van hoofdpersoon
        const PHoofdID = safe(hoofd.PartnerID).split('|')[0].trim();         // Eerste partner uit pipe-lijst — gebruikt als primaire partner in scenario-logica

        /* ======================= KINDEREN — 3 SCENARIO'S ======================= */
        /*
         * Een persoon p is een kind als minstens één ouder de hoofdpersoon of diens
         * partner is. We bepalen het scenario op basis van BEIDE ouders samen.
         *
         * Scenario 1 — KindID  (kind van HoofdID + PHoofdID samen):
         *   (p.VaderID = HoofdID  EN p.MoederID = PHoofdID)
         *   OF (p.MoederID = HoofdID EN p.VaderID = PHoofdID)
         *
         * Scenario 2 — HKindID  (kind van alleen HoofdID):
         *   (p.VaderID = HoofdID  EN p.MoederID ≠ PHoofdID)
         *   OF (p.MoederID = HoofdID EN p.VaderID ≠ PHoofdID)
         *
         * Scenario 3 — PHKindID  (kind van alleen PHoofdID):
         *   (p.VaderID = PHoofdID  EN p.MoederID ≠ HoofdID)
         *   OF (p.MoederID = PHoofdID EN p.VaderID ≠ HoofdID)
         */

        const KindID   = []; // Scenario 1: kind van HoofdID én PHoofdID samen
        const HKindID  = []; // Scenario 2: kind van alleen HoofdID
        const PHKindID = []; // Scenario 3: kind van alleen PHoofdID

        data.forEach(p => {
            const pid   = safe(p.ID);
            const vader = safe(p.VaderID);
            const moeder = safe(p.MoederID);

            if (pid === sid) return;                                        // Hoofdpersoon zelf overslaan

            const hoofdIsVader  = (vader  === sid);                        // VaderID = HoofdID
            const hoofdIsMoeder = (moeder === sid);                        // MoederID = HoofdID
            const partnerIsVader  = PHoofdID && (vader  === PHoofdID);     // VaderID = PHoofdID
            const partnerIsMoeder = PHoofdID && (moeder === PHoofdID);     // MoederID = PHoofdID

            const hoofdIsOuder   = hoofdIsVader  || hoofdIsMoeder;        // Hoofd is minstens één ouder
            const partnerIsOuder = partnerIsVader || partnerIsMoeder;      // Partner is minstens één ouder

            if (!hoofdIsOuder && !partnerIsOuder) return;                  // Geen relatie met dit kind

            if (hoofdIsOuder && partnerIsOuder) {
                // Scenario 1: beide ouders zijn HoofdID en PHoofdID
                KindID.push(pid);

            } else if (hoofdIsOuder && !partnerIsOuder) {
                // Scenario 2: alleen HoofdID is ouder, andere ouder is iemand anders
                HKindID.push(pid);

            } else if (partnerIsOuder && !hoofdIsOuder) {
                // Scenario 3: alleen PHoofdID is ouder, andere ouder is niet de hoofdpersoon
                PHKindID.push(pid);
            }
        });

        /* ======================= BROERS EN ZUSSEN ======================= */

        const alleKinderen = [...KindID, ...HKindID, ...PHKindID];        // Alle kindtypen voor exclusie

        const BZID = data
            .filter(p => {
                const pid = safe(p.ID);
                if (pid === sid)                       return false;        // Hoofdpersoon zelf overslaan
                if (pid === PHoofdID)                  return false;        // Partner overslaan
                if (alleKinderen.includes(pid))        return false;        // Kinderen overslaan
                return (VHoofdID && safe(p.VaderID)  === VHoofdID)         // Zelfde vader = broer/zus
                    || (MHoofdID && safe(p.MoederID) === MHoofdID);        // Zelfde moeder = broer/zus
            })
            .map(p => safe(p.ID));

        /* ======================= PARTNERS VAN BROERS/ZUSSEN ======================= */

        const BZPartnerID = BZID
            .map(id => {
                const s = data.find(p => safe(p.ID) === id);
                return (s && safe(s.PartnerID)) ? safe(s.PartnerID) : null;
            })
            .filter(Boolean);

        /* ======================= RELATIE CLASSIFICATIE ======================= */

        return data
            .map(p => {
                const pid   = safe(p.ID);
                const clone = { ...p };                                    // Ondiepe kopie — origineel blijft intact

                clone.Relatie   = '';
                clone._priority = 99;

                if      (pid === sid)                    { clone.Relatie = 'HoofdID';  clone._priority = 1;   }
                else if (pid === VHoofdID)               { clone.Relatie = 'VHoofdID'; clone._priority = 0;   }
                else if (pid === MHoofdID)               { clone.Relatie = 'MHoofdID'; clone._priority = 0;   }
                else if (pid === PHoofdID)               { clone.Relatie = 'PHoofdID'; clone._priority = 2;   }
                else if (KindID.includes(pid))           { clone.Relatie = 'KindID';   clone._priority = 3;   }
                else if (HKindID.includes(pid))          { clone.Relatie = 'HKindID';  clone._priority = 3;   }
                else if (PHKindID.includes(pid))         { clone.Relatie = 'PHKindID'; clone._priority = 3;   }
                else if (BZID.includes(pid))             { clone.Relatie = 'BZID';     clone._priority = 4;   }
                else if (BZPartnerID.includes(pid))      { clone.Relatie = 'BZPartnerID'; clone._priority = 4.5; }

                return clone;
            })
            .sort((a, b) => {
                if (a._priority !== b._priority) return a._priority - b._priority;          // Primair: op relatievolgorde
                const da = a.Geboortedatum ? new Date(a.Geboortedatum) : new Date(9999, 0); // Onbekend datum → achteraan
                const db = b.Geboortedatum ? new Date(b.Geboortedatum) : new Date(9999, 0); // Onbekend datum → achteraan
                return da - db;                                                              // Secundair: oud → jong
            });
    }

    /* ======================= EXPORTEER ======================= */
    window.RelatieEngine = { computeRelaties };

})();
