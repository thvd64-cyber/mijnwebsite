/* =====================================================================
   js/timeline.js  v2.1.0
   Canvas-based tijdlijnvisualisatie voor MyFamTreeCollab
   Tekent alle familieleden van een geselecteerde hoofdpersoon als
   horizontale levensbalken op een gedeelde tijdas (MIN_YEAR → TODAY).
   Generaties -3 t/m +2 worden gevisualiseerd via relatieEngine.js.
   Wijziging v2.1.0: volledig herschreven — HTML5 Canvas vervangt
                     DOM-nodes, verbindingslijnen ouder→kind toegevoegd,
                     hover-tooltip, vraagteken-balk bij ontbrekende data,
                     stippelbalk voor nog levende personen.
   Vereist (laadvolgorde): utils.js → schema.js → storage.js →
                            LiveSearch.js → relatieEngine.js → timeline.js
   ===================================================================== */

(function () {
    'use strict'; // Strict mode voorkomt stille fouten

    /* =================================================================
       CONSTANTEN — tijdas en layout
       ================================================================= */
    const TODAY            = new Date().getFullYear(); // Huidig jaar (dynamisch)
    const MIN_YEAR         = 1800;                     // Tijdas begint hier
    const LEFT_PAD         = 140;                      // Pixels links voor generatielabels
    const RIGHT_PAD        = 30;                       // Pixels rechts marge
    const TICK_H           = 40;                       // Hoogte tijdas-balk bovenaan
    const ROW_H            = 32;                       // Hoogte per persoons-rij in pixels
    const ROW_GAP          = 8;                        // Ruimte tussen rijen
    const GEN_GAP          = 16;                       // Extra ruimte tussen generatieblokken
    const BAR_H            = 18;                       // Hoogte van een persoons-balk
    const RADIUS           = 4;                        // Afgeronde hoeken op balk
    const DEFAULT_LIFESPAN = 50;                       // Geschatte levensspanne bij ontbrekende data
    const LABEL_FONT       = '11px sans-serif';        // Tekst in balkjes
    const TICK_FONT        = '11px sans-serif';        // Jaarnummers op tijdas
    const GEN_FONT         = 'bold 12px sans-serif';   // Generatielabels links

    /* =================================================================
       KLEUREN — conform dev-plan sectie 2.3
       ================================================================= */
    const COLOR = {
        ouder    : '#2d7d46', // Groen  — VHoofdID, MHoofdID, grootouders
        hoofd    : '#d4a017', // Goud   — geselecteerde hoofdpersoon
        partner  : '#888888', // Grijs  — alle partners
        kind     : '#3a78b5', // Blauw  — kinderen en kleinkinderen
        broerZus : '#c05a1f', // Oranje — broers/zussen van HoofdID
        vandaag  : '#ee0055', // Rood   — stippellijn vandaag
        unknown  : '#aaaaaa', // Lichtgrijs — vraagteken-balk
        tick     : '#cccccc', // Tijdas achtergrond
        tickLine : '#e0e0e0', // Verticale hulplijnen
        text     : '#ffffff', // Tekst in balkje
        genLabel : '#555555', // Generatielabel links
        conn     : '#aaaaaa', // Verbindingslijnen ouder→kind
    };

    /* =================================================================
       DOM-REFERENTIES
       ================================================================= */
    const canvas      = document.getElementById('timelineCanvas');      // Canvas element
    const ctx         = canvas.getContext('2d');                         // 2D render context
    const container   = document.getElementById('timelineContainer');   // Scrollbare wrapper
    const placeholder = document.getElementById('timelinePlaceholder'); // Placeholder tekst
    const tooltip     = document.getElementById('timelineTooltip');     // Hover tooltip div
    const searchInput = document.getElementById('sandboxSearch');       // Zoekinput

    /* =================================================================
       STATE
       ================================================================= */
    let dataset         = window.StamboomStorage.get() || []; // Alle personen uit localStorage
    let selectedHoofdId = null;                               // ID van geselecteerde hoofdpersoon
    let hitBoxes        = [];                                 // Array van {x,y,w,h,persoon,ls} voor hover

    /* =================================================================
       HELPERS
       ================================================================= */

    // Haal persoon op uit dataset op basis van ID
    function findPerson(id) {
        if (!id) return null;                                             // Geen ID opgegeven
        const s = window.ftSafe(id);                                     // Trim en stringify via utils.js
        return dataset.find(p => window.ftSafe(p.ID) === s) || null;    // Eerste match of null
    }

    // Converteer jaar naar x-positie op het canvas
    function yearToX(year, timeW) {
        const clamped = Math.max(MIN_YEAR, Math.min(TODAY, year));       // Jaar binnen tijdas houden
        return LEFT_PAD + (clamped - MIN_YEAR) / (TODAY - MIN_YEAR) * timeW; // Lineaire interpolatie
    }

    // Extraheer geboortejaar als integer uit datumstring (via utils.js ftParseBirthday)
    function getYear(dateStr) {
        if (!dateStr) return null;                                        // Geen datum = null
        const d = window.ftParseBirthday(dateStr);                       // utils.js geeft Date object terug
        if (!d || isNaN(d.getTime())) return null;                       // Ongeldige datum = null
        return d.getFullYear();                                           // Geef jaar als integer terug
    }

    // Bereken start- en eindjaar van levensbalk voor een persoon
    function lifespan(persoon) {
        const geb  = getYear(persoon.Geboortedatum);                     // Geboortejaar of null
        const overl = getYear(persoon.Overlijdensdatum);                 // Overlijdensjaar of null

        if (geb === null) {
            // Geboortejaar onbekend: speciale vraagteken-balk
            return { startYear: null, endYear: null, alive: false, unknown: true };
        }

        const alive   = overl === null;                                  // Nog in leven als geen overlijdensdatum
        const endYear = overl !== null
            ? overl                                                       // Overlijdensdatum bekend
            : Math.min(geb + DEFAULT_LIFESPAN, TODAY);                   // Schatting of vandaag als nog in leven

        return { startYear: geb, endYear, alive, unknown: false };
    }

    /* =================================================================
       GENERATIESTRUCTUUR OPBOUWEN
       ================================================================= */

    // Bouw een geordende lijst van rijen op basis van relatieEngine output
    // Elke rij = { persoon, relatie, generatie, kleur }
    function buildRows(rootID) {
        const root = findPerson(rootID);                                  // Zoek hoofdpersoon
        if (!root) return [];                                             // Niet gevonden: lege lijst

        // Haal alle relaties op via centrale relatieEngine.js
        const relaties = window.RelatieEngine.computeRelaties(dataset, rootID);

        const rows = [];  // Resultaatlijst

        // Helper: voeg persoon toe als hij bestaat in dataset
        function addRow(id, generatie, kleur, relatieLabel) {
            const p = findPerson(id);                                     // Zoek persoon op ID
            if (!p) return;                                               // Niet gevonden: overslaan
            rows.push({ persoon: p, relatie: relatieLabel, generatie, kleur }); // Rij toevoegen
        }

        /* --- Generatie -2: grootouders (ouders van VHoofdID en MHoofdID) --- */
        const vader  = findPerson(root.VHoofdID);                        // Vader van root
        const moeder = findPerson(root.MHoofdID);                        // Moeder van root

        if (vader) {
            if (vader.VHoofdID) addRow(vader.VHoofdID, -2, COLOR.ouder, 'grootouder'); // Opa vaderszijde
            if (vader.MHoofdID) addRow(vader.MHoofdID, -2, COLOR.ouder, 'grootouder'); // Oma vaderszijde
        }
        if (moeder) {
            if (moeder.VHoofdID) addRow(moeder.VHoofdID, -2, COLOR.ouder, 'grootouder'); // Opa moederszijde
            if (moeder.MHoofdID) addRow(moeder.MHoofdID, -2, COLOR.ouder, 'grootouder'); // Oma moederszijde
        }

        /* --- Generatie -3: betovergrootouders (ouders van grootouders) --- */
        // Verzamel alle al toegevoegde gen -2 personen
        const grootouders = rows.filter(r => r.generatie === -2).map(r => r.persoon);
        grootouders.forEach(go => {
            if (go.VHoofdID) addRow(go.VHoofdID, -3, COLOR.ouder, 'gen-3'); // Vader van grootouder
            if (go.MHoofdID) addRow(go.MHoofdID, -3, COLOR.ouder, 'gen-3'); // Moeder van grootouder
        });

        /* --- Generatie -1: ouders van root --- */
        if (root.VHoofdID) addRow(root.VHoofdID, -1, COLOR.ouder,   'VHoofdID'); // Vader
        if (root.MHoofdID) addRow(root.MHoofdID, -1, COLOR.ouder,   'MHoofdID'); // Moeder

        /* --- Generatie 0: hoofdpersoon zelf --- */
        rows.push({ persoon: root, relatie: 'HoofdID', generatie: 0, kleur: COLOR.hoofd });

        /* --- Generatie 0: partner(s) van hoofdpersoon --- */
        if (root.PHoofdID) {
            root.PHoofdID.split('|').forEach(pid => {                    // Meerdere partners mogelijk
                addRow(pid.trim(), 0, COLOR.partner, 'PHoofdID');        // Elke partner op gen 0
            });
        }

        /* --- Generatie 0: broers en zussen + hun partners --- */
        relaties
            .filter(r => r.Relatie === 'BZID')                           // Broer/Zus relatietype
            .forEach(r => {
                addRow(r.ID, 0, COLOR.broerZus, 'BZID');                 // Broer/zus rij
                const bz = findPerson(r.ID);                             // Zoek broer/zus persoon
                if (bz && bz.PHoofdID) {
                    bz.PHoofdID.split('|').forEach(pid => {
                        addRow(pid.trim(), 0, COLOR.partner, 'PBZID');   // Partner van broer/zus
                    });
                }
            });

        /* --- Generatie +1: kinderen van root + hun partners --- */
        relaties
            .filter(r => ['KindID', 'HKindID', 'PKindID'].includes(r.Relatie)) // Alle kindtypes
            .forEach(r => {
                addRow(r.ID, 1, COLOR.kind, r.Relatie);                  // Kind rij
                const kind = findPerson(r.ID);                           // Zoek kind persoon
                if (kind && kind.PHoofdID) {
                    kind.PHoofdID.split('|').forEach(pid => {
                        addRow(pid.trim(), 1, COLOR.partner, 'KPartnerID'); // Partner van kind
                    });
                }
            });

        /* --- Generatie +2: kleinkinderen (kinderen van kinderen) --- */
        relaties
            .filter(r => ['KindID', 'HKindID', 'PKindID'].includes(r.Relatie))
            .forEach(r => {
                // Haal relaties van dit kind op om zijn kinderen te vinden
                const kindRelaties = window.RelatieEngine.computeRelaties(dataset, r.ID);
                kindRelaties
                    .filter(kr => ['KindID', 'HKindID', 'PKindID'].includes(kr.Relatie))
                    .forEach(kr => {
                        addRow(kr.ID, 2, COLOR.kind, 'KleinKind');       // Kleinkind rij
                    });
            });

        // Verwijder duplicaten — zelfde persoon kan via meerdere paden opduiken
        const seen = new Set();
        return rows.filter(row => {
            const id = window.ftSafe(row.persoon.ID);
            if (seen.has(id)) return false;                              // Al gezien: verwijder
            seen.add(id);
            return true;
        });
    }

    /* =================================================================
       CANVAS TEKENEN — hoofdfunctie
       ================================================================= */

    function drawTimeline(rootID) {
        hitBoxes = [];                                                    // Reset hit-boxes

        const rows = buildRows(rootID);                                   // Bouw rijstructuur op

        if (rows.length === 0) {
            // Geen data gevonden: toon placeholder en verberg canvas
            canvas.style.display      = 'none';
            placeholder.style.display = 'block';
            placeholder.textContent   = 'Geen familieleden gevonden voor deze persoon.';
            return;
        }

        // Bereken beschikbare breedte voor tijdas
        const containerW = container.clientWidth || 900;                 // Breedte van scrollcontainer
        const timeW      = containerW - LEFT_PAD - RIGHT_PAD;           // Breedte voor tijdas zelf

        // Groepeer rijen per generatie en sorteer in volgorde oud → jong
        const genOrder = [-3, -2, -1, 0, 1, 2];                         // Vaste volgorde generaties
        const rowsByGen = {};
        genOrder.forEach(g => { rowsByGen[g] = []; });                   // Initialiseer lege arrays
        rows.forEach(r => {
            const g = Math.max(-3, Math.min(2, r.generatie));            // Clamp generatie binnen bereik
            if (rowsByGen[g]) rowsByGen[g].push(r);                      // Rij in juiste generatie plaatsen
        });

        // Bereken totale canvashoogte op basis van inhoud
        let totalH = TICK_H + GEN_GAP;                                   // Begin met tijdas + marge
        const genStartY = {};                                             // Y-startpositie per generatie
        genOrder.forEach(g => {
            const count = rowsByGen[g].length;                           // Aantal rijen in generatie
            if (count === 0) return;                                      // Lege generatie overslaan
            genStartY[g] = totalH;                                       // Sla startpositie op
            totalH += count * (ROW_H + ROW_GAP) + GEN_GAP;              // Voeg hoogte van generatieblok toe
        });
        totalH += 20;                                                     // Marge onderaan

        // Stel canvas afmetingen in en maak zichtbaar
        canvas.width          = containerW;
        canvas.height         = totalH;
        canvas.style.display  = 'block';
        placeholder.style.display = 'none';

        /* --- Tijdas achtergrond --- */
        ctx.fillStyle = COLOR.tick;
        ctx.fillRect(LEFT_PAD, 0, timeW, TICK_H);                        // Grijze balk bovenaan canvas

        /* --- Verticale hulplijnen en jaarnummers op tijdas --- */
        const tickInterval = timeW > 600 ? 25 : 50;                      // Dichtere ticks bij meer ruimte
        ctx.font      = TICK_FONT;
        ctx.textAlign = 'center';

        for (
            let yr = Math.ceil(MIN_YEAR / tickInterval) * tickInterval;
            yr <= TODAY;
            yr += tickInterval
        ) {
            const x = yearToX(yr, timeW);                                // X-positie van dit jaar

            // Verticale hulplijn door hele canashoogte
            ctx.strokeStyle = COLOR.tickLine;
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, TICK_H);
            ctx.lineTo(x, totalH);
            ctx.stroke();

            // Jaarlabel in tijdas balk
            ctx.fillStyle = '#666';
            ctx.fillText(String(yr), x, TICK_H - 6);                     // Tekst net boven onderkant tijdas
        }

        /* --- Rode stippellijn = vandaag --- */
        const todayX = yearToX(TODAY, timeW);
        ctx.strokeStyle = COLOR.vandaag;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 3]);                                          // Stippelpatroon
        ctx.beginPath();
        ctx.moveTo(todayX, 0);
        ctx.lineTo(todayX, totalH);
        ctx.stroke();
        ctx.setLineDash([]);                                              // Reset stippelpatroon

        // Label "vandaag" boven de rode lijn
        ctx.fillStyle = COLOR.vandaag;
        ctx.font      = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('vandaag', todayX, 10);                             // Klein label bovenaan

        /* --- Bijhouden van balk-midpunten voor verbindingslijnen --- */
        const barMidX = {};  // Persoon-ID → x-middelpunt van balk
        const barMidY = {};  // Persoon-ID → y-middelpunt van rij

        /* --- Teken generatieblokken en balken --- */
        const genLabels = {  // Leesbare naam per generatienummer
            '-3': 'Gen -3',
            '-2': 'Grootouders',
            '-1': 'Ouders',
            '0' : 'Hoofdpersoon',
            '1' : 'Kinderen',
            '2' : 'Kleinkinderen'
        };

        genOrder.forEach(g => {
            const genRows = rowsByGen[g];
            if (!genRows || genRows.length === 0) return;                 // Lege generatie: overslaan

            const startY = genStartY[g];                                  // Y-startpositie van dit blok

            // Dunne scheidingslijn boven generatieblok
            if (startY > TICK_H + GEN_GAP) {
                ctx.strokeStyle = '#ddd';
                ctx.lineWidth   = 1;
                ctx.beginPath();
                ctx.moveTo(LEFT_PAD, startY - GEN_GAP / 2);
                ctx.lineTo(LEFT_PAD + timeW, startY - GEN_GAP / 2);
                ctx.stroke();
            }

            // Generatielabel links van tijdas
            ctx.font      = GEN_FONT;
            ctx.fillStyle = COLOR.genLabel;
            ctx.textAlign = 'right';
            ctx.fillText(
                genLabels[String(g)] || ('Gen ' + g),                    // Label of fallback
                LEFT_PAD - 8,                                             // Net links van tijdas
                startY + ROW_H / 2 + 4                                   // Verticaal gecentreerd op eerste rij
            );

            // Teken elke rij in dit generatieblok
            genRows.forEach((row, idx) => {
                const rowY    = startY + idx * (ROW_H + ROW_GAP);        // Y-bovenkant van rij
                const barTopY = rowY + (ROW_H - BAR_H) / 2;             // Y-bovenkant van balk
                const midY    = rowY + ROW_H / 2;                        // Y-midden van rij

                const ls = lifespan(row.persoon);                         // Bereken levensspanne

                if (ls.unknown) {
                    // Geboortejaar onbekend: teken vraagteken-balk
                    drawUnknownBar(row.persoon, barTopY, g);
                } else {
                    // Normaal: teken levensbalk
                    drawLifeBar(row.persoon, ls, row.kleur, barTopY, timeW);

                    // Bereken en sla x-midden op voor verbindingslijnen
                    const startX = yearToX(ls.startYear, timeW);
                    const endX   = yearToX(ls.endYear,   timeW);
                    barMidX[window.ftSafe(row.persoon.ID)] = (startX + endX) / 2; // Midden van balk
                    barMidY[window.ftSafe(row.persoon.ID)] = midY;                 // Midden van rij
                }
            });
        });

        /* --- Verbindingslijnen ouder → kind na alle balken --- */
        drawConnectors(rows, barMidX, barMidY, timeW);
    }

    /* =================================================================
       LEVENSBALK TEKENEN
       ================================================================= */

    function drawLifeBar(persoon, ls, kleur, barTopY, timeW) {
        const x1   = yearToX(ls.startYear, timeW);                       // X-positie geboortejaar
        const x2   = yearToX(ls.endYear,   timeW);                       // X-positie overlijden/schatting
        const barW = Math.max(x2 - x1, 4);                               // Minimale balkbreedte: 4px

        // Teken gevulde afgeronde rechthoek
        ctx.fillStyle = kleur;
        roundRect(ctx, x1, barTopY, barW, BAR_H, RADIUS);
        ctx.fill();

        if (ls.alive) {
            // Nog in leven: voeg stippelverlenging toe rechts van balk
            ctx.strokeStyle = kleur;
            ctx.lineWidth   = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x2, barTopY + BAR_H / 2);
            ctx.lineTo(Math.min(x2 + 30, LEFT_PAD + timeW), barTopY + BAR_H / 2); // Max 30px verlengd
            ctx.stroke();
            ctx.setLineDash([]);                                         // Reset stippel
        }

        // Naam op balk (geclipped binnen balkbreedte)
        ctx.fillStyle = COLOR.text;
        ctx.font      = LABEL_FONT;
        ctx.textAlign = 'left';
        ctx.save();
        ctx.beginPath();
        ctx.rect(x1 + 4, barTopY, barW - 8, BAR_H);                     // Clip-regio = balk zonder padding
        ctx.clip();
        const naam = [window.ftSafe(persoon.Roepnaam), window.ftSafe(persoon.Achternaam)]
            .filter(Boolean).join(' ');
        ctx.fillText(naam || window.ftSafe(persoon.ID), x1 + 5, barTopY + BAR_H / 2 + 4);
        ctx.restore();

        // Geboortejaar klein boven linker balkrand
        ctx.fillStyle = '#555';
        ctx.font      = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(ls.startYear), x1, barTopY - 2);

        // Registreer hit-box voor hover en klik
        hitBoxes.push({ x: x1, y: barTopY, w: barW, h: BAR_H, persoon, ls });
    }

    /* =================================================================
       VRAAGTEKEN-BALK (onbekende geboortedatum)
       ================================================================= */

    function drawUnknownBar(persoon, barTopY, generatie) {
        // Schat positie op basis van generatie: elke generatie ~30 jaar verschil
        const genOffset = generatie * -30;                                // Negatieve generaties = verder terug
        const estYear   = Math.max(MIN_YEAR, TODAY - 60 + genOffset);   // Geschat geboortejaar
        const timeW     = canvas.width - LEFT_PAD - RIGHT_PAD;          // Tijdas breedte
        const x1        = yearToX(estYear, timeW);                       // X-positie op tijdas
        const barW      = 60;                                            // Vaste breedte

        // Gestippelde omtrek in lichtgrijs
        ctx.strokeStyle = COLOR.unknown;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([4, 3]);
        roundRect(ctx, x1, barTopY, barW, BAR_H, RADIUS);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vraagteken + naam
        ctx.fillStyle = '#aaa';
        ctx.font      = LABEL_FONT;
        ctx.textAlign = 'left';
        const naam = [window.ftSafe(persoon.Roepnaam), window.ftSafe(persoon.Achternaam)]
            .filter(Boolean).join(' ');
        ctx.fillText('? ' + (naam || window.ftSafe(persoon.ID)), x1 + 5, barTopY + BAR_H / 2 + 4);

        // Hit-box registreren (unknown=true)
        hitBoxes.push({
            x: x1, y: barTopY, w: barW, h: BAR_H,
            persoon,
            ls: { startYear: null, endYear: null, alive: false, unknown: true }
        });
    }

    /* =================================================================
       VERBINDINGSLIJNEN OUDER → KIND (L-vormig, grijs gestippeld)
       ================================================================= */

    function drawConnectors(rows, barMidX, barMidY, timeW) {
        rows.forEach(row => {
            const p   = row.persoon;
            const pid = window.ftSafe(p.ID);

            // Alleen kind-rijen verwerken (gen +1 en +2)
            if (row.generatie !== 1 && row.generatie !== 2) return;
            if (!barMidX[pid] || !barMidY[pid]) return;                  // Kind heeft geen balkpositie

            // X-positie = geboortejaar van het kind (beginpunt verbindingslijn)
            const gebJaar = getYear(p.Geboortedatum);
            if (!gebJaar) return;                                         // Geen geboortejaar: overslaan
            const kindX = yearToX(gebJaar, timeW);                       // X = geboortejaar kind
            const kindY = barMidY[pid];                                   // Y = rij-midden van kind

            // Loop over beide ouders
            [p.VHoofdID, p.MHoofdID].forEach(ouderID => {
                if (!ouderID) return;                                     // Geen ouder opgegeven
                const oid = window.ftSafe(ouderID);
                if (!barMidX[oid] || !barMidY[oid]) return;              // Ouder heeft geen balkpositie

                const ouderX = barMidX[oid];                             // X-midden van ouderbalk
                const ouderY = barMidY[oid];                             // Y-midden van ouderrij

                // L-vormige lijn: horizontaal van oudermidden naar kindX, dan verticaal naar kindY
                ctx.strokeStyle = COLOR.conn;
                ctx.lineWidth   = 1;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(ouderX, ouderY);                               // Vertrekpunt: midden ouderbalk
                ctx.lineTo(kindX,  ouderY);                               // Horizontaal naar geboortejaar kind
                ctx.lineTo(kindX,  kindY);                                // Verticaal naar kindrij
                ctx.stroke();
                ctx.setLineDash([]);

                // Klein pijltje richting kindbalk
                ctx.strokeStyle = COLOR.conn;
                ctx.lineWidth   = 1;
                ctx.beginPath();
                ctx.moveTo(kindX - 4, kindY - 4);                        // Linkervleugel pijl
                ctx.lineTo(kindX,     kindY);                             // Pijlpunt
                ctx.lineTo(kindX + 4, kindY - 4);                        // Rechtervleugel pijl
                ctx.stroke();
            });
        });
    }

    /* =================================================================
       HULPFUNCTIE: afgeronde rechthoek via canvas path
       ================================================================= */

    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);                                   // Radius nooit groter dan helft zijde
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y,     x + w, y + r);               // Rechts boven
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);           // Rechts onder
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);           // Links onder
        ctx.lineTo(x,     y + r);
        ctx.quadraticCurveTo(x,     y,     x + r, y);                    // Links boven
        ctx.closePath();
    }

    /* =================================================================
       TOOLTIP LOGICA
       ================================================================= */

    // Bereken muispositie relatief aan canvas
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();                      // Canvas-positie in viewport
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };   // Relatieve positie
    }

    // Zoek hit-box onder de huidige muiscursor
    function findHit(mx, my) {
        return hitBoxes.find(hb =>
            mx >= hb.x && mx <= hb.x + hb.w &&
            my >= hb.y && my <= hb.y + hb.h
        ) || null;
    }

    // Beweeg muis over canvas: toon tooltip bij hit
    canvas.addEventListener('mousemove', function (e) {
        const pos = getCanvasPos(e);
        const hit = findHit(pos.x, pos.y);

        if (hit) {
            canvas.style.cursor = 'pointer';                              // Handje-cursor op balk

            const p  = hit.persoon;
            const ls = hit.ls;

            // Stel tooltiptekst in
            const naam  = [window.ftSafe(p.Roepnaam), window.ftSafe(p.Prefix), window.ftSafe(p.Achternaam)]
                            .filter(Boolean).join(' ') || '(onbekend)';
            const id    = window.ftSafe(p.ID);
            const geb   = window.ftFormatDate(p.Geboortedatum)    || '?'; // Opgemaakt via utils.js
            const overl = window.ftFormatDate(p.Overlijdensdatum) || (ls.alive ? 'nog in leven' : '?');
            const duur  = ls.unknown
                ? 'Geboortedatum onbekend'
                : ls.alive
                    ? (TODAY - ls.startYear) + ' jaar (leeftijd)'         // Leeftijd bij levenden
                    : (ls.startYear && ls.endYear)
                        ? (ls.endYear - ls.startYear) + ' jaar'           // Levensduur bij overledenen
                        : '?';

            tooltip.textContent = [
                naam,
                'ID: '         + id,
                'Geboorte: '   + geb,
                'Overlijden: ' + overl,
                'Levensduur: ' + duur
            ].join('\n');

            // Positioneer tooltip rechts van cursor, flip als te dicht bij rechterrand
            const contRect = container.getBoundingClientRect();
            const tipW     = 220;                                         // Geschatte tooltipbreedte
            let   tipLeft  = e.clientX - contRect.left + 14;             // Standaard: rechts van cursor
            if (tipLeft + tipW > contRect.width) {
                tipLeft = e.clientX - contRect.left - tipW - 8;          // Flip naar links
            }
            const tipTop = e.clientY - contRect.top + 10;                // Iets onder cursor

            tooltip.style.left    = tipLeft + 'px';
            tooltip.style.top     = tipTop  + 'px';
            tooltip.style.display = 'block';                             // Toon tooltip

        } else {
            canvas.style.cursor   = 'default';                           // Normale cursor buiten balk
            tooltip.style.display = 'none';                              // Verberg tooltip
        }
    });

    // Verberg tooltip als muis canvas verlaat
    canvas.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
        canvas.style.cursor   = 'default';
    });

    // Klik op balk → wisselt hoofdpersoon en hertekent tijdlijn
    canvas.addEventListener('click', function (e) {
        const pos = getCanvasPos(e);
        const hit = findHit(pos.x, pos.y);
        if (hit) {
            selectedHoofdId   = window.ftSafe(hit.persoon.ID);           // Stel nieuwe hoofdpersoon in
            searchInput.value = '';                                       // Zoekbalk leegmaken
            drawTimeline(selectedHoofdId);                               // Herteken tijdlijn
        }
    });

    /* =================================================================
       LIVE SEARCH — persoon selecteren hertekent tijdlijn
       ================================================================= */

    window.initLiveSearch({
        searchInput    : searchInput,                                     // Input element
        dataset        : dataset,                                         // Huidige dataset
        displayType    : 'popup',                                         // Popup-stijl resultaten
        renderCallback : function (selected) {                           // Callback bij selectie
            selectedHoofdId = window.ftSafe(selected.ID);                // Sla geselecteerd ID op
            drawTimeline(selectedHoofdId);                               // Teken tijdlijn opnieuw
        }
    });

    /* =================================================================
       HERTEKENNEN BIJ VENSTERRESIZE (responsive)
       ================================================================= */

    let resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);                                        // Debounce: wacht tot resize stopt
        resizeTimer = setTimeout(function () {
            if (selectedHoofdId) drawTimeline(selectedHoofdId);          // Herteken alleen als persoon geselecteerd
        }, 150);
    });

    /* =================================================================
       INITIALISATIE
       ================================================================= */

    function init() {
        dataset               = window.StamboomStorage.get() || [];     // Laad dataset opnieuw uit storage
        selectedHoofdId       = null;                                    // Reset selectie
        canvas.style.display  = 'none';                                  // Verberg canvas initieel
        placeholder.style.display = 'block';                            // Toon placeholder tekst
        placeholder.textContent   = 'Zoek een persoon om de tijdlijn te laden.';
    }

    init(); // Startpunt

})(); // Einde IIFE — geen globale variabelen gelekt
