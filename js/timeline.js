/* ======================= js/timeline.js v2.3.5 =======================
 * Canvas-based family timeline renderer
 *
 * Wijzigingen v2.3.5 t.o.v. v2.3.4:
 *  - Sticky generatiekolom: #tlStickyCol blijft zichtbaar bij horizontaal scrollen
 *  - DOM-referenties gesplitst: container (#timelineContainer), stickyCol (#tlStickyCol),
 *    scrollArea (#tlScrollArea) — canvas en tooltip zitten nu in scrollArea
 *  - updateGenLabels() schrijft labels naar #tlStickyCol i.p.v. absolute overlay op canvas
 *  - Canvas-breedte berekend op basis van scrollArea.clientWidth i.p.v. container.clientWidth
 *  - stickyCol hoogte wordt na elke render gelijkgesteld aan canvas hoogte
 *
 * Wijzigingen v2.3.4 t.o.v. v2.3.1:
 *  - Versienummer bijgewerkt (geen functionele wijzigingen)
 *
 * Wijzigingen v2.3.1 t.o.v. v2.3.0:
 *  - Bug fix: ancestor volgorde was -1,-2,-3 (wrong) → nu -3,-2,-1,0 (correct)
 *  - Bug fix: genNum was null voor alle ancestors → linkerkolom labels overlapten
 *  - addAncestorLevel vervangen door collectAncestorLevel (buffer-aanpak)
 *
 * Wijzigingen v2.3.0 t.o.v. v2.2.0:
 *  - Jaren naast de balk op balkcenterhoogte: jjjj [ naam ] jjjj
 *  - Gen +1 en verder: alle balkjes flat op tijdlijn
 *  - Kleuren per generatieniveau
 *  - Scheidingslijn alleen tussen blokken -3 t/m 0
 *  - Linkerkolom: gen-label op Y van eerste persoon van die generatie
 *
 * Dependencies:
 *   utils.js         -> window.ftSafe, window.ftParseBirthday, window.ftFormatDate
 *   storage.js       -> window.StamboomStorage.get()
 *   LiveSearch.js    -> window.initLiveSearch(inputEl, dataset, cb)
 *   relatieEngine.js -> window.RelatieEngine.computeRelaties(data, hoofdId)
 * ===================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * SECTION 1 — DOM REFERENCES
     * ------------------------------------------------------------------ */
    const container   = document.getElementById('timelineContainer'); // Buitenste wrapper — overflow-x:auto
    const stickyCol   = document.getElementById('tlStickyCol');       // Sticky generatiekolom links
    const scrollArea  = document.getElementById('tlScrollArea');      // Scrollgebied rechts — bevat canvas
    const canvas      = document.getElementById('timelineCanvas');    // Canvas voor balkjes en tijdas
    const placeholder = document.getElementById('timelinePlaceholder'); // Melding als geen persoon geselecteerd
    const tooltip     = document.getElementById('timelineTooltip');   // Hover-tooltip
    const searchInput = document.getElementById('sandboxSearch');     // Zoekveld

    /* ------------------------------------------------------------------
     * SECTION 2 — LAYOUT CONSTANTS
     * ------------------------------------------------------------------ */
    const ROW_H         = 28;  // Height of one person row in pixels
    const ROW_GAP       = 4;   // Gap between rows within same family unit
    const GROUP_GAP     = 12;  // Gap between family units
    const RIGHT_PAD     = 32;  // Right margin after time axis end
    const TICK_AREA_H   = 40;  // Height reserved for time axis at top
    const BAR_H         = 16;  // Height of a life bar
    const RADIUS        = 3;   // Corner radius for bars
    const DEFAULT_SPAN  = 50;  // Assumed lifespan when death date unknown
    const TICK_INTERVAL = 10;  // Years between tick marks
    const UNKNOWN_BAR_W = 60;  // Width for bars with unknown birth date
    const LABEL_COL_W   = 155; // Moet overeenkomen met CSS width van #tlStickyCol
    const MIN_PX_YEAR   = 5;   // Minimum pixels per year
    const SECTION_H     = 20;  // Height of section header row
    const YEAR_PAD      = 5;   // Pixels between year text and bar edge

    /* ------------------------------------------------------------------
     * SECTION 3 — COLOUR PALETTE
     * ------------------------------------------------------------------ */
    const COLOR = {
        HoofdID:     '#c8960c',
        PHoofdID:    '#7b56c2',
        VHoofdID:    '#2d7d46',
        MHoofdID:    '#2d7d46',
        BZID:        '#c8741a',
        BZPartnerID: '#9e9e9e',
        partner:     '#9e9e9e',
        today:       '#ee0055',
        tick:        '#bbbbbb',
        barText:     '#ffffff',
        barTextDark: '#1a1a1a',
        birthLabel:  '#555555',
        unknown:     '#cccccc',
        unknownText: '#666666',
        connLine:    '#cccccc',
        genSep:      '#e8e8e8',
        sectionText: '#888888',
    };

    function descendantColor(genDepth) {
        if (genDepth <= 1) return '#2196f3';
        if (genDepth === 2) return '#00897b';
        const steps  = genDepth - 2;
        const factor = Math.min(steps * 0.20, 0.80);
        const r = Math.round(0   + (255 - 0)   * factor);
        const g = Math.round(137 + (255 - 137) * factor);
        const b = Math.round(123 + (255 - 123) * factor);
        return `rgb(${r},${g},${b})`;
    }

    /* ------------------------------------------------------------------
     * SECTION 4 — STATE
     * ------------------------------------------------------------------ */
    let dataset    = [];
    let rootId     = null;
    let hitRects   = [];
    let dynMinYear = 1800;
    let dynMaxYear = new Date().getFullYear();
    const TODAY    = new Date().getFullYear();

    /* ------------------------------------------------------------------
     * SECTION 5 — DATE UTILITIES
     * ------------------------------------------------------------------ */
    function resolveQ(s) { return String(s).replace(/\?/g, '0'); }

    function parseYear(dateStr) {
        if (!dateStr) return null;
        const d = resolveQ(String(dateStr).trim());

        const dmyA = d.match(/^(\d{1,2})[-/\s]([a-zA-Z]+)[-/\s](\d{4})$/);
        if (dmyA) { const yr = parseInt(dmyA[3], 10); return (yr >= 100 && yr <= TODAY + 5) ? yr : null; }

        const ymdA = d.match(/^(\d{4})[-/\s]([a-zA-Z]+)[-/\s](\d{1,2})$/);
        if (ymdA) { const yr = parseInt(ymdA[1], 10); return (yr >= 100 && yr <= TODAY + 5) ? yr : null; }

        const yOnly = d.match(/^(\d{4})$/);
        if (yOnly) { const yr = parseInt(yOnly[1], 10); return (yr >= 100 && yr <= TODAY + 5) ? yr : null; }

        try {
            const obj = window.ftParseBirthday(d);
            if (!obj || isNaN(obj.getTime())) return null;
            const yr = obj.getFullYear();
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        } catch (e) { return null; }
    }

    function fmtDate(dateStr) {
        if (!dateStr) return '—';
        const r = resolveQ(String(dateStr).trim());
        return window.ftFormatDate ? window.ftFormatDate(r) : r;
    }

    /* ------------------------------------------------------------------
     * SECTION 6 — UTILITY HELPERS
     * ------------------------------------------------------------------ */
    function safe(val) { return window.ftSafe(val); }

    function findPerson(id) {
        const sid = safe(id);
        if (!sid) return null;
        return dataset.find(p => safe(p.ID) === sid) || null;
    }

    function displayName(p) {
        return [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)].filter(Boolean).join(' ');
    }

    function needsDarkText(hexOrRgb) {
        if (!hexOrRgb) return false;
        const rgb = hexOrRgb.match(/\d+/g);
        if (!rgb) return false;
        const lum = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        return lum > 160;
    }

    /* ------------------------------------------------------------------
     * SECTION 7 — TIME AXIS MATH
     * ------------------------------------------------------------------ */
    function yearToX(year, timeW) {
        return ((year - dynMinYear) / (dynMaxYear - dynMinYear)) * timeW;
    }

    /* ------------------------------------------------------------------
     * SECTION 8 — DYNAMIC YEAR RANGE
     * ------------------------------------------------------------------ */
    function setDynamicRange(rootPerson) {
        const rb = parseYear(rootPerson.Geboortedatum);
        if (rb) {
            dynMinYear = rb - 200;
            dynMaxYear = Math.max(rb + 200, TODAY);
        } else {
            const years = dataset.map(p => parseYear(p.Geboortedatum)).filter(Boolean);
            dynMinYear  = years.length ? Math.min(...years) - 10 : TODAY - 200;
            dynMaxYear  = TODAY;
        }
    }

    /* ------------------------------------------------------------------
     * SECTION 9 — ROW BUILDER
     * ------------------------------------------------------------------ */
    function buildRows(rootPerson) {
        const relaties = window.RelatieEngine.computeRelaties(dataset, safe(rootPerson.ID));
        const seen = new Set();
        const rows = [];

        function makeEntry(person, relatie, color) {
            const by = parseYear(person.Geboortedatum);
            const dy = parseYear(person.Overlijdensdatum);
            return { person, relatie, color, birthYear: by, deathYear: dy,
                     isDead: dy !== null, isUnknown: by === null,
                     isRoot: safe(person.ID) === safe(rootPerson.ID) };
        }

        function addRow(id, relatie, color, genNum, isDescendant, genDepth, sectionLabel, isLastInUnit) {
            const sid = safe(id);
            if (!sid || seen.has(sid)) return false;
            const p = findPerson(sid);
            if (!p) return false;
            seen.add(sid);
            rows.push({ entry: makeEntry(p, relatie, color), isDescendant, genDepth,
                        genNum, sectionLabel, isLastInUnit });
            return true;
        }

        function collectAncestorLevel(parentIds, sectionLabel, genNum) {
            const buffer    = [];
            const nextLevel = [];
            parentIds.forEach(pid => {
                const parent = findPerson(pid);
                if (!parent || seen.has(safe(pid))) return;
                seen.add(safe(pid));
                const rootFatherId = safe(rootPerson.VaderID);
                const relatie = genNum === -1
                    ? (safe(parent.ID) === rootFatherId ? 'VHoofdID' : 'MHoofdID')
                    : 'VHoofdID';
                buffer.push({ id: pid, relatie, color: COLOR[relatie], genNum, sectionLabel });
                const partnerId = safe(parent.PartnerID);
                if (partnerId && !seen.has(partnerId)) {
                    seen.add(partnerId);
                    buffer.push({ id: partnerId, relatie: 'PHoofdID', color: COLOR.PHoofdID, genNum, sectionLabel: null });
                }
                [safe(parent.VaderID), safe(parent.MoederID)]
                    .filter(id => id && !seen.has(id))
                    .forEach(id => nextLevel.push(id));
            });
            return { buffer, nextLevel: [...new Set(nextLevel)] };
        }

        const gen1Ids = [safe(rootPerson.VaderID), safe(rootPerson.MoederID)].filter(Boolean);
        const col1    = collectAncestorLevel(gen1Ids, 'Ouders  (gen −1)', -1);
        const col2    = collectAncestorLevel(col1.nextLevel, 'Grootouders  (gen −2)', -2);
        const col3    = collectAncestorLevel(col2.nextLevel, 'Betovergrootouders  (gen −3)', -3);

        [col3.buffer, col2.buffer, col1.buffer].forEach(buffer => {
            buffer.forEach(item => {
                const p = findPerson(item.id);
                if (!p) return;
                rows.push({ entry: makeEntry(p, item.relatie, item.color), isDescendant: false,
                            genDepth: 0, genNum: item.genNum,
                            sectionLabel: item.sectionLabel, isLastInUnit: false });
            });
        });

        addRow(rootPerson.ID, 'HoofdID', COLOR.HoofdID, 0, false, 0, 'Hoofdpersoon  (gen 0)', false);

        if (safe(rootPerson.PartnerID)) {
            addRow(rootPerson.PartnerID, 'PHoofdID', COLOR.PHoofdID, 0, false, 0, null, false);
        }

        relaties
            .filter(r => safe(r.Relatie) === 'BZID')
            .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999))
            .forEach(r => {
                addRow(r.ID, 'BZID', COLOR.BZID, 0, false, 0, null, false);
                const sib = findPerson(r.ID);
                if (sib && safe(sib.PartnerID)) {
                    addRow(sib.PartnerID, 'BZPartnerID', COLOR.BZPartnerID, 0, false, 0, null, false);
                }
            });

        const childRelaties  = new Set(['KindID', 'HKindID', 'PHKindID']);
        const rootChildren   = relaties
            .filter(r => childRelaties.has(safe(r.Relatie)))
            .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999));

        const shownGenLabels = new Set();

        function genLabel(depth) {
            if (shownGenLabels.has(depth)) return null;
            shownGenLabels.add(depth);
            const names = ['', 'Kinderen', 'Kleinkinderen', 'Achterkleinkinderen',
                           'Betachterkleinkinderen', 'Verdere nakomelingen'];
            return `${names[depth] || 'Gen +' + depth}  (gen +${depth})`;
        }

        function addDescendantGroup(personId, genDepth) {
            const person = findPerson(personId);
            if (!person || seen.has(safe(personId))) return;
            addRow(safe(personId), 'KindID', descendantColor(genDepth), genDepth, true, genDepth, genLabel(genDepth), false);
            const partnerId = safe(person.PartnerID);
            if (partnerId) addRow(partnerId, 'PHoofdID', COLOR.partner, genDepth, true, genDepth, null, false);
            dataset
                .filter(p => safe(p.VaderID) === safe(personId) || safe(p.MoederID) === safe(personId))
                .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999))
                .forEach(child => { if (!seen.has(safe(child.ID))) addDescendantGroup(safe(child.ID), genDepth + 1); });
        }

        rootChildren.forEach((r, idx) => {
            addDescendantGroup(safe(r.ID), 1);
            if (idx !== rootChildren.length - 1 && rows.length > 0) rows[rows.length - 1].isLastInUnit = true;
        });

        if (rows.length > 0) rows[rows.length - 1].isLastInUnit = true;
        return rows;
    }

    /* ------------------------------------------------------------------
     * SECTION 10 — CANVAS RENDERER
     * Wijziging v2.3.5: canvas-breedte gebaseerd op scrollArea.clientWidth
     * ------------------------------------------------------------------ */
    function renderCanvas(rows) {
        if (!rows || rows.length === 0) return;

        // Bereken canvas hoogte
        let totalH    = TICK_AREA_H;
        let prevLabel = null;
        rows.forEach(row => {
            if (row.sectionLabel && row.sectionLabel !== prevLabel) { totalH += SECTION_H; prevLabel = row.sectionLabel; }
            totalH += ROW_H + (row.isLastInUnit ? GROUP_GAP : ROW_GAP);
        });
        totalH += 20;

        // Canvas breedte — gebaseerd op scrollArea, sticky kolom staat buiten scrollArea
        const yearSpan  = dynMaxYear - dynMinYear;
        const available = Math.max(scrollArea.clientWidth - RIGHT_PAD, 400); // Scrollgebied breedte
        const pxPerYear = Math.max(available / yearSpan, MIN_PX_YEAR);
        const timeW     = yearSpan * pxPerYear;

        canvas.height = totalH;
        canvas.width  = timeW + RIGHT_PAD;

        // Sticky kolom hoogte gelijkstellen aan canvas hoogte
        stickyCol.style.height = totalH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        hitRects = [];
        const barPositions = {};
        const genLabelY    = {}; // genNum -> Y pixel voor sticky kolom

        // Pass 1: tijdas
        drawTimeAxis(ctx, timeW);

        // Pass 2: rijen
        let curY  = TICK_AREA_H;
        prevLabel = null;

        rows.forEach(row => {
            if (row.sectionLabel && row.sectionLabel !== prevLabel && !row.isDescendant) {
                ctx.fillStyle = COLOR.genSep;
                ctx.fillRect(0, curY, canvas.width, 1);
                curY += 1;
            }

            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                const gn = row.isDescendant ? row.genDepth : row.genNum;
                if (gn !== null && gn !== undefined && !(gn in genLabelY)) genLabelY[gn] = curY;
                curY     += SECTION_H;
                prevLabel = row.sectionLabel;
            }

            const gn = row.isDescendant ? row.genDepth : row.genNum;
            if (gn !== null && gn !== undefined && !(gn in genLabelY)) genLabelY[gn] = curY;

            const rowY  = curY;
            const barY  = rowY + (ROW_H - BAR_H) / 2;
            const barCY = barY + BAR_H / 2;

            if (row.entry.isUnknown) {
                drawUnknownBar(ctx, barY, barCY, row.entry);
                barPositions[safe(row.entry.person.ID)] = { barX: 4, barEndX: 4 + UNKNOWN_BAR_W, barCY };
            } else {
                drawLifeBar(ctx, barY, barCY, row.entry, timeW);
                const bx    = yearToX(row.entry.birthYear, timeW);
                const endYr = row.entry.isDead ? row.entry.deathYear : Math.min(row.entry.birthYear + DEFAULT_SPAN, TODAY);
                const ex    = yearToX(Math.min(endYr, dynMaxYear), timeW);
                barPositions[safe(row.entry.person.ID)] = { barX: bx, barEndX: Math.max(ex, bx + 4), barCY };
            }

            hitRects.push({ x: 0, y: rowY, w: canvas.width, h: ROW_H, entry: row.entry });
            curY += ROW_H + (row.isLastInUnit ? GROUP_GAP : ROW_GAP);
        });

        // Pass 3: connectors
        rows.forEach(row => {
            const p = row.entry.person;
            [safe(p.VaderID), safe(p.MoederID)].forEach(parentId => {
                if (!parentId) return;
                const cp = barPositions[safe(p.ID)];
                const pp = barPositions[parentId];
                if (!cp || !pp) return;
                drawConnector(ctx, pp, cp);
            });
        });

        // Pass 4: vandaag-lijn
        drawTodayLine(ctx, timeW);

        // Pass 5: vul sticky kolom
        updateGenLabels(rows, genLabelY, totalH);
    }

    /* ------------------------------------------------------------------
     * SECTION 11 — DRAW FUNCTIONS
     * ------------------------------------------------------------------ */
    function drawTimeAxis(ctx, timeW) {
        ctx.strokeStyle = COLOR.tick;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, TICK_AREA_H - 4);
        ctx.lineTo(timeW, TICK_AREA_H - 4);
        ctx.stroke();
        ctx.font         = '9px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        const firstTick = Math.ceil(dynMinYear / TICK_INTERVAL) * TICK_INTERVAL;
        for (let y = firstTick; y <= dynMaxYear; y += TICK_INTERVAL) {
            const x       = yearToX(y, timeW);
            const isMajor = y % 50 === 0;
            ctx.strokeStyle = COLOR.tick;
            ctx.lineWidth   = isMajor ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, TICK_AREA_H - 4);
            ctx.lineTo(x, TICK_AREA_H - (isMajor ? 14 : 8));
            ctx.stroke();
            if (y % 25 === 0) { ctx.fillStyle = COLOR.tick; ctx.fillText(String(y), x, TICK_AREA_H - 16); }
        }
    }

    function drawTodayLine(ctx, timeW) {
        const x = yearToX(TODAY, timeW);
        if (x < 0 || x > timeW) return;
        ctx.save();
        ctx.strokeStyle = COLOR.today;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, TICK_AREA_H - 4);
        ctx.lineTo(x, canvas.height - 10);
        ctx.stroke();
        ctx.restore();
    }

    function drawLifeBar(ctx, barY, barCY, entry, timeW) {
        const { person, color, birthYear, deathYear, isDead } = entry;
        const startX    = yearToX(birthYear, timeW);
        const endYear   = isDead ? deathYear : Math.min(birthYear + DEFAULT_SPAN, TODAY);
        const solidEndX = yearToX(Math.min(endYear, dynMaxYear), timeW);
        const solidW    = Math.max(solidEndX - startX, 4);
        ctx.fillStyle = color;
        roundedRect(ctx, startX, barY, solidW, BAR_H, RADIUS);
        ctx.fill();
        if (!isDead) {
            const todayX = yearToX(Math.min(TODAY, dynMaxYear), timeW);
            if (todayX > solidEndX + 2) {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth   = 1.5;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(solidEndX, barCY);
                ctx.lineTo(todayX, barCY);
                ctx.stroke();
                ctx.restore();
            }
        }
        ctx.fillStyle = COLOR.birthLabel;
        ctx.font      = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        if (birthYear) ctx.fillText(String(birthYear), startX - YEAR_PAD, barCY);
        if (isDead && deathYear) { ctx.textAlign = 'left'; ctx.fillText(String(deathYear), solidEndX + YEAR_PAD, barCY); }
        drawBarLabel(ctx, displayName(person), startX, barY, solidW, needsDarkText(color));
        if (entry.isRoot) drawRootIndicator(ctx, startX + solidW / 2, barY);
    }

    function drawUnknownBar(ctx, barY, barCY, entry) {
        const barX = 4;
        ctx.fillStyle = COLOR.unknown;
        roundedRect(ctx, barX, barY, UNKNOWN_BAR_W, BAR_H, RADIUS);
        ctx.fill();
        ctx.fillStyle = COLOR.unknownText;
        ctx.font      = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', barX + 10, barCY);
        ctx.font      = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(clipText(ctx, displayName(entry.person), UNKNOWN_BAR_W - 18), barX + 18, barCY);
    }

    function drawBarLabel(ctx, name, barX, barY, barW, darkText) {
        const pad  = 5;
        const maxW = barW - pad * 2;
        if (maxW < 8) return;
        ctx.fillStyle    = darkText ? COLOR.barTextDark : COLOR.barText;
        ctx.font         = '9px sans-serif';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(clipText(ctx, name, maxW), barX + pad, barY + BAR_H / 2);
    }

    function clipText(ctx, text, maxW) {
        if (ctx.measureText(text).width <= maxW) return text;
        let t = text;
        while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
        return t + '…';
    }

    function drawRootIndicator(ctx, cx, barY) {
        ctx.fillStyle = COLOR.HoofdID;
        ctx.beginPath();
        ctx.moveTo(cx, barY - 5);
        ctx.lineTo(cx - 4, barY - 1);
        ctx.lineTo(cx + 4, barY - 1);
        ctx.closePath();
        ctx.fill();
    }

    function drawConnector(ctx, parentPos, childPos) {
        const px = parentPos.barEndX;
        const py = parentPos.barCY;
        const cx = childPos.barX;
        const cy = childPos.barCY;
        if (px >= cx - 2) return;
        ctx.save();
        ctx.strokeStyle = COLOR.connLine;
        ctx.lineWidth   = 0.8;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(cx, py);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = COLOR.connLine;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 3);
        ctx.lineTo(cx - 3, cy - 7);
        ctx.lineTo(cx + 3, cy - 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function roundedRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.arcTo(x + w, y,     x + w, y + rr,     rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        ctx.lineTo(x + rr, y + h);
        ctx.arcTo(x,     y + h, x,     y + h - rr, rr);
        ctx.lineTo(x,     y + rr);
        ctx.arcTo(x,     y,     x + rr, y,          rr);
        ctx.closePath();
    }

    /* ------------------------------------------------------------------
     * SECTION 12 — STICKY GEN-LABEL KOLOM
     * Wijziging v2.3.5: labels in #tlStickyCol i.p.v. absolute canvas-overlay
     * De kolom heeft position:sticky in CSS — bij horizontaal scrollen blijft
     * hij zichtbaar aan de linkerkant van de viewport.
     * ------------------------------------------------------------------ */
    function updateGenLabels(rows, genLabelY, totalH) {
        stickyCol.innerHTML = '';                                        // Verwijder bestaande labels

        const placed    = new Set();
        let   prevLabel = null;

        rows.forEach(row => {
            if (!row.sectionLabel || row.sectionLabel === prevLabel) return;
            prevLabel = row.sectionLabel;
            if (placed.has(row.sectionLabel)) return;
            placed.add(row.sectionLabel);

            const gn = row.isDescendant ? row.genDepth : row.genNum;   // Generatienummer als Y-sleutel
            const y  = (gn !== null && gn !== undefined && genLabelY[gn] !== undefined)
                ? genLabelY[gn]                                         // Y uit renderCanvas pass 2
                : 0;

            const lbl = document.createElement('div');
            Object.assign(lbl.style, {
                position:     'absolute',                               // Absoluut binnen sticky kolom
                top:          y + 'px',                                 // Y gealigneerd met canvas-rij
                left:         '5px',
                right:        '4px',
                height:       SECTION_H + 'px',
                lineHeight:   SECTION_H + 'px',
                fontWeight:   'bold',
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
            });
            lbl.textContent = row.sectionLabel;
            stickyCol.appendChild(lbl);                                 // Label in sticky kolom plaatsen
        });
    }

    /* ------------------------------------------------------------------
     * SECTION 13 — HIT DETECTION & TOOLTIP
     * ------------------------------------------------------------------ */
    function getHitAt(mx, my) {
        for (let i = hitRects.length - 1; i >= 0; i--) {
            const r = hitRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
        }
        return null;
    }

    function buildTooltipText(entry) {
        const p    = entry.person;
        const LBLS = { HoofdID:'Hoofdpersoon', VHoofdID:'Vader', MHoofdID:'Moeder',
                       PHoofdID:'Partner', KindID:'Kind', HKindID:'Kind (hoofd)',
                       PHKindID:'Kind (partner)', BZID:'Broer/Zus', BZPartnerID:'Partner broer/zus' };
        const rel   = LBLS[entry.relatie] || entry.relatie || '—';
        const name  = displayName(p) || '(geen naam)';
        const geb   = fmtDate(p.Geboortedatum);
        const overl = p.Overlijdensdatum ? fmtDate(p.Overlijdensdatum) : 'nog in leven';
        let life = '';
        if (entry.birthYear && entry.deathYear) life = `\nLeeftijd: ${entry.deathYear - entry.birthYear} jaar`;
        else if (entry.birthYear) life = `\nLeeftijd: ~${TODAY - entry.birthYear} jaar`;
        return `${name}  [${rel}]\nID: ${safe(p.ID) || '—'}\nGeboren: ${geb}\nOverleden: ${overl}${life}`;
    }

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            mx: (e.clientX - rect.left) * (canvas.width  / rect.width),
            my: (e.clientY - rect.top)  * (canvas.height / rect.height),
        };
    }

    canvas.addEventListener('mousemove', function (e) {
        const { mx, my } = canvasCoords(e);
        const hit = getHitAt(mx, my);
        if (hit) {
            canvas.style.cursor   = 'pointer';
            tooltip.style.display = 'block';
            tooltip.textContent   = buildTooltipText(hit.entry);
            const tipW  = tooltip.offsetWidth || 220;
            const flipL = (e.offsetX + tipW + 20 > scrollArea.clientWidth); // Gebruik scrollArea voor flip-check
            tooltip.style.left = (flipL ? e.offsetX - tipW - 8 : e.offsetX + 14) + 'px';
            tooltip.style.top  = Math.max(e.offsetY - 10, 0) + 'px';
        } else {
            canvas.style.cursor   = 'default';
            tooltip.style.display = 'none';
        }
    });

    canvas.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
        canvas.style.cursor   = 'default';
    });

    canvas.addEventListener('click', function (e) {
        const { mx, my } = canvasCoords(e);
        const hit = getHitAt(mx, my);
        if (hit) { rootId = safe(hit.entry.person.ID); searchInput.value = ''; draw(); }
    });

    /* ------------------------------------------------------------------
     * SECTION 14 — MAIN DRAW + PLACEHOLDER
     * ------------------------------------------------------------------ */
    function draw() {
        if (!rootId) return;
        const root = findPerson(rootId);
        if (!root) { showPlaceholder('Persoon niet gevonden.'); return; }
        setDynamicRange(root);
        const rows = buildRows(root);
        if (rows.length === 0) { showPlaceholder('Geen familieleden gevonden.'); return; }
        placeholder.style.display = 'none';
        canvas.style.display      = 'block';
        renderCanvas(rows);
    }

    function showPlaceholder(msg) {
        canvas.style.display      = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent   = msg;
        stickyCol.innerHTML       = '';              // Reset sticky kolom bij placeholder
    }

    /* ------------------------------------------------------------------
     * SECTION 15 — INIT
     * ------------------------------------------------------------------ */
    function init() {
        dataset = window.StamboomStorage.get() || [];
        window.initLiveSearch(searchInput, dataset, function (selectedId) {
            rootId = safe(selectedId);
            draw();
        });
        if (dataset.length === 1) { rootId = safe(dataset[0].ID); draw(); }
        window.addEventListener('resize', function () { if (rootId) draw(); });
    }

    init();

})();
