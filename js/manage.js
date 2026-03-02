 // =======================
    // Relatie mapping
    // =======================
    return contextData.map(p=>{
        const clone = { ...p };                                // Clone
        const pid = safe(p.ID);

        clone._priority = 99;                                  // Default
        clone._scenario = 0;
        clone._linkedTo = '';                                   // Voor sortering

        // ===== Ouders =====
        if(pid === vaderId || pid === moederId){
            clone.Relatie = 'Ouder';
            clone._priority = 0;
            return clone;
        }

        // ===== Hoofd =====
        if(pid === hoofdIdStr){
            clone.Relatie = 'Hoofd';
            clone._priority = 1;
            return clone;
        }

        // ===== Partner =====
        if(pid === partnerId){
            clone.Relatie = 'Partner';
            clone._priority = 2;
            return clone;
        }

        // ===== Kind =====
        const isKindHoofd =
            safe(p.VaderID) === hoofdIdStr ||
            safe(p.MoederID) === hoofdIdStr;

        const isKindPartner = partnerId && (
            safe(p.VaderID) === partnerId ||
            safe(p.MoederID) === partnerId
        );

        if(isKindHoofd || isKindPartner){
            clone.Relatie = 'Kind';
            clone._priority = 3;

            clone._scenario =
                isKindHoofd && isKindPartner ? 1 :
                isKindHoofd ? 2 : 3;

            return clone;
        }

        // ===== Partner van Kind =====
        const childLinked = data.find(k =>
            (safe(k.VaderID) === hoofdIdStr ||
             safe(k.MoederID) === hoofdIdStr) &&
            safe(k.PartnerID) === pid
        );

        if(childLinked){
            clone.Relatie = 'kind-partner';
            clone._priority = 3;
            clone._scenario = 4;
            clone._linkedTo = safe(childLinked.ID);
            return clone;
        }

        // ===== Broer/Zus =====
        const zelfdeVader  = vaderId  && safe(p.VaderID)  === vaderId;
        const zelfdeMoeder = moederId && safe(p.MoederID) === moederId;

        if(zelfdeVader || zelfdeMoeder){
            clone.Relatie = 'broer-zus';
            clone._priority = 4;

            clone._scenario =
                zelfdeVader && zelfdeMoeder ? 1 :
                zelfdeVader ? 2 : 3;

            return clone;
        }

        // ===== Partner van Broer/Zus =====
        const siblingLinked = data.find(k =>
            (
                (vaderId  && safe(k.VaderID)  === vaderId) ||
                (moederId && safe(k.MoederID) === moederId)
            ) &&
            safe(k.ID) !== hoofdIdStr &&
            safe(k.PartnerID) === pid
        );

        if(siblingLinked){
            clone.Relatie = 'sibling-partner';
            clone._priority = 4;
            clone._scenario = 4;
            clone._linkedTo = safe(siblingLinked.ID);
            return clone;
        }

        return clone;
    })

    // =======================
    // Sortering
    // =======================
    .sort((a,b)=>{

        // 1️⃣ Prioriteit
        if(a._priority !== b._priority)
            return a._priority - b._priority;

        // 2️⃣ Partner direct onder gekoppelde persoon
        if(a._linkedTo === b.ID) return 1;
        if(b._linkedTo === a.ID) return -1;

        // 3️⃣ Scenario volgorde
        if(a._scenario !== b._scenario)
            return a._scenario - b._scenario;

        // 4️⃣ Leeftijd (oudste eerst)
        return parseDate(a.Geboortedatum) -
               parseDate(b.Geboortedatum);
    });
}
