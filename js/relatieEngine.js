// ======================= js/relatieEngine.js v1.0.0 =======================
// Centrale relatie berekening voor MyFamTreeCollab
// Bevat alle genealogische logica (geen UI code)

/* ======================= SAFE VALUE ======================= */
// Zorgt dat null/undefined altijd een lege string wordt
function safe(v){
    return v ? String(v).trim() : ''; // voorkomt errors bij lege waarden
}


/* ======================= RELATIE ENGINE ======================= */
// Berekent alle relaties rond een geselecteerde persoon
function computeRelaties(data,hoofdId){

    if(!hoofdId) return [];                                    // Stop als er geen persoon gekozen is

    const hoofd = data.find(p=>safe(p.ID)===safe(hoofdId));    // Zoek hoofd persoon
    if(!hoofd) return [];                                      // Stop als hoofd niet bestaat

    const VHoofdID = safe(hoofd.VaderID);                      // Vader van hoofd
    const MHoofdID = safe(hoofd.MoederID);                     // Moeder van hoofd
    const PHoofdID = safe(hoofd.PartnerID);                    // Partner van hoofd


    /* ======================= KIND LOGICA ======================= */

    const KindID=[];                                           // Kind van hoofd + partner
    const HKindID=[];                                          // Kind alleen via hoofd
    const PHKindID=[];                                         // Kind alleen via partner

    data.forEach(p=>{                                          // Loop door alle personen

        const vader = safe(p.VaderID);                         // Veilig VaderID
        const moeder = safe(p.MoederID);                       // Veilig MoederID

        if(vader===hoofdId && moeder===PHoofdID){              // Kind van beide ouders
            KindID.push(p.ID);
        }
        else if(vader===hoofdId){                              // Kind alleen via hoofd
            HKindID.push(p.ID);
        }
        else if(PHoofdID && moeder===PHoofdID){                // Kind alleen via partner
            PHKindID.push(p.ID);
        }

    });


    /* ======================= BROER / ZUS ======================= */

    const BZID = data.filter(p=>{

        const pid=safe(p.ID);

        if(pid===hoofdId) return false;                        // Hoofd uitsluiten
        if(pid===PHoofdID) return false;                       // Partner uitsluiten

        if(KindID.includes(pid)) return false;                 // Kinderen uitsluiten
        if(HKindID.includes(pid)) return false;
        if(PHKindID.includes(pid)) return false;

        return (VHoofdID && safe(p.VaderID)===VHoofdID) ||     // Zelfde vader
               (MHoofdID && safe(p.MoederID)===MHoofdID);      // Zelfde moeder

    }).map(p=>p.ID);


    /* ======================= KIND PARTNERS ======================= */

    const KindPartnerID=[...KindID,...HKindID,...PHKindID]     // Combineer alle kindtypes
        .map(id=>{
            const k=data.find(p=>p.ID===id);                   // Zoek kind
            return k && k.PartnerID ? k.PartnerID : null;      // Haal partner op
        })
        .filter(Boolean);                                      // Verwijder null waarden


    /* ======================= BZ PARTNERS ======================= */

    const BZPartnerID=BZID.map(id=>{
        const s=data.find(p=>p.ID===id);                       // Zoek broer/zus
        return s && s.PartnerID ? s.PartnerID : null;          // Haal partner op
    }).filter(Boolean);


    /* ======================= RELATIE CLASSIFICATIE ======================= */

    return data.map(p=>{

        const pid=safe(p.ID);                                  // Veilig ID
        const clone={...p};                                    // Kopie persoon

        clone.Relatie='';                                      // Default relatie
        clone._priority=99;                                    // Default lage prioriteit

        if(pid===hoofdId){clone.Relatie='HoofdID'; clone._priority=1;}
        else if(pid===VHoofdID){clone.Relatie='VHoofdID'; clone._priority=0;}
        else if(pid===MHoofdID){clone.Relatie='MHoofdID'; clone._priority=0;}
        else if(pid===PHoofdID){clone.Relatie='PHoofdID'; clone._priority=2;}

        else if(KindID.includes(pid)){clone.Relatie='KindID'; clone._priority=3;}
        else if(HKindID.includes(pid)){clone.Relatie='HKindID'; clone._priority=3;}
        else if(PHKindID.includes(pid)){clone.Relatie='PHKindID'; clone._priority=3;}

        else if(KindPartnerID.includes(pid)){clone.Relatie='KindPartnerID'; clone._priority=3.5;}
        else if(BZID.includes(pid)){clone.Relatie='BZID'; clone._priority=4;}
        else if(BZPartnerID.includes(pid)){clone.Relatie='BZPartnerID'; clone._priority=4.5;}

        return clone;

    }).sort((a,b)=>a._priority-b._priority);                   // Sorteer op prioriteit
}


/* ======================= EXPORT NAAR GLOBAL ======================= */
// Maakt de functie beschikbaar voor andere scripts
window.RelatieEngine={
    computeRelaties
};
