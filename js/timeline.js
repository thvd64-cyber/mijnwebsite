/* ======================= js/timeline.js v2.2.0 =======================
 * Canvas-based family timeline renderer
 *
 * Wijzigingen v2.2.0 t.o.v. v2.1.1:
 *  obs.1  Tijdas dynamisch: HoofdID.geboortejaar ±200 jaar, 10-jaar ticks, horizontale scroll
 *  obs.2  Connectors starten aan balkrand (barEndX), niet balkcentrum — gaan niet meer door nodes
 *  obs.3  Geboorte- én overlijdensjaar boven balk (links resp. rechts van balk)
 *  obs.4  Datumparser: dd-mmm-jjjj + jjjj-mmm-dd + vraagtekens → afronden naar beneden (197?→1970)
 *  obs.5  Layout: koppel-groepen — partner als directe sub-rij onder persoon
 *  obs.6  Kleuren conform RelationColors.css v1.0.1
 *  obs.7  KindID / HKindID / MHKindID / PHKindID elk eigen kleur
 *  obs.8  Gen-labels als HTML-overlay links van canvas (altijd zichtbaar, nooit geclipped)
 *  obs.9  Kinderen genest: kind → partner → kleinkinderen (recursief), herhaalt per kind
 *  MHKindID toegevoegd voor kind via moeder-als-hoofd (relatieEngine v2.1.0)
 *
 * Dependencies (verified):
 *   utils.js         -> window.ftSafe, window.ftParseBirthday, window.ftFormatDate
 *   storage.js       -> window.StamboomStorage.get()
 *   LiveSearch.js    -> window.initLiveSearch(inputEl, dataset, cb) — cb krijgt persoon.ID string
 *   relatieEngine.js -> window.RelatieEngine.computeRelaties(data, hoofdId)
 *     Relatie-waarden: HoofdID, VHoofdID, MHoofdID, PHoofdID,
 *                      KindID, HKindID, MHKindID, PHKindID, KindPartnerID, BZID, BZPartnerID
 *   Persoon veldnamen: VaderID, MoederID, PartnerID
 *
 * Version: v2.2.0
 * ===================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * SECTION 1 — DOM REFERENCES
     * ------------------------------------------------------------------ */
    const container   = document.getElementById('timelineContainer');  // Outer wrapper, position:relative
    const canvas      = document.getElementById('timelineCanvas');     // <canvas> element
    const placeholder = document.getElementById('timelinePlaceholder'); // "Zoek een persoon" message
    const tooltip     = document.getElementById('timelineTooltip');    // Hover tooltip div
    const searchInput = document.getElementById('sandboxSearch');      // Live search input

    /* ------------------------------------------------------------------
     * SECTION 2 — LAYOUT CONSTANTS
     * ------------------------------------------------------------------ */
    const ROW_H         = 28;   // Height of one person row in pixels
    const ROW_GAP       = 4;    // Gap between rows within the same couple-group
    const GROUP_GAP     = 14;   // Gap between couple-groups (visual separator)
    const LEFT_PAD      = 0;    // No left pad on canvas — gen labels live in HTML overlay
    const RIGHT_PAD     = 32;   // Right margin after time axis end
    const TICK_AREA_H   = 40;   // Height reserved for the time axis at the top
    const BAR_H         = 16;   // Height of a life bar
    const RADIUS        = 3;    // Corner radius for bars
    const DEFAULT_SPAN  = 50;   // Assumed lifespan (years) when death date is unknown
    const TICK_INTERVAL = 10;   // Years between tick marks on the axis (obs.1)
    const UNKNOWN_BAR_W = 80;   // Fixed pixel width for bars with unknown birth date
    const LABEL_COL_W   = 150;  // Width of the HTML gen-label column (obs.8)
    const MIN_PX_YEAR   = 5;    // Minimum pixels per year (prevents bars collapsing)
    const SECTION_H     = 20;   // Height of a section header row

    /* ------------------------------------------------------------------
     * SECTION 3 — COLOUR PALETTE  (obs.6 + obs.7)
     * Aligned with RelationColors.css v1.0.1
     * ------------------------------------------------------------------ */
    const COLOR = {
        HoofdID:       '#c8960c', // Amber  — HoofdID (--color-hoofd feel, canvas-visible)
        PHoofdID:      '#7b56c2', // Purple — PHoofdID (--color-partner-hoofd darkened)
        VHoofdID:      '#2d7d46', // Green  — VHoofdID (--color-vader darkened for canvas)
        MHoofdID:      '#2d7d46', // Green  — MHoofdID same as vader per CSS
        KindID:        '#2196f3', // Blue   — KindID exact match --color-KindID
        HKindID:       '#64b5f6', // Sky    — HKindID (#90caf9 darkened for readability)
        MHKindID:      '#64b5f6', // Sky    — MHKindID same as HKindID (kind via moeder)
        PHKindID:      '#aac8ef', // Light  — PHKindID (--color-PHKindID, use dark text)
        KindPartnerID: '#9e9e9e', // Grey   — partner van kind (--color-partner)
        BZID:          '#c8741a', // Orange — BZID (--color-bz darkened for canvas)
        BZPartnerID:   '#9e9e9e', // Grey   — partner van broer/zus
        today:         '#ee0055', // Red    — vertical today dashed line
        tick:          '#bbbbbb', // Light grey — tick marks
        barText:       '#ffffff', // White  — text on most bars
        barTextDark:   '#1a1a1a', // Dark   — text on light bars (PHKindID)
        birthLabel:    '#666666', // Grey   — year labels above bars
        unknown:       '#cccccc', // Light  — unknown-birth bar fill
        unknownText:   '#666666', // Grey   — "?" on unknown bars
        connLine:      '#cccccc', // Light grey — parent→child connectors
        sectionText:   '#888888', // Grey   — section header text
    };

    /* ------------------------------------------------------------------
     * SECTION 4 — STATE
     * ------------------------------------------------------------------ */
    let dataset    = [];
    let rootId     = null;
    let hitRects   = [];
    let dynMinYear = 1800;  // Updated per root person (obs.1)
    let dynMaxYear = new Date().getFullYear();
    const TODAY    = new Date().getFullYear();

    /* ------------------------------------------------------------------
     * SECTION 5 — DATE UTILITIES  (obs.4)
     * Extends utils.js with:
     *   - dd-mmm-yyyy  ("12-jan-1954")
     *   - yyyy-mmm-dd  ("1954-jan-12")
     *   - Question marks replaced by 0 before parsing (round down)
     * ------------------------------------------------------------------ */

    // Replaces every '?' in a string with '0' (round down rule)
    function resolveQ(s) {
        return String(s).replace(/\?/g, '0');
    }

    // Returns 4-digit year from a date string, or null if unparseable
    function parseYear(dateStr) {
        if (!dateStr) return null;
        const d = resolveQ(String(dateStr).trim());

        // dd-mmm-yyyy  e.g. "12-jan-1954" or "12-januari-1954"
        const dmyA = d.match(/^(\d{1,2})[-/\s]([a-zA-Z]+)[-/\s](\d{4})$/);
        if (dmyA) {
            const yr = parseInt(dmyA[3], 10);
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        }

        // yyyy-mmm-dd  e.g. "1954-jan-12"
        const ymdA = d.match(/^(\d{4})[-/\s]([a-zA-Z]+)[-/\s](\d{1,2})$/);
        if (ymdA) {
            const yr = parseInt(ymdA[1], 10);
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        }

        // yyyy only  e.g. "1970" (after resolveQ: "197?" → "1970")
        const yOnly = d.match(/^(\d{4})$/);
        if (yOnly) {
            const yr = parseInt(yOnly[1], 10);
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        }

        // All other formats: delegate to utils.js
        try {
            const obj = window.ftParseBirthday(d);
            if (!obj || isNaN(obj.getTime())) return null;
            const yr = obj.getFullYear();
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        } catch (e) {
            return null;
        }
    }

    // Formats a date string for tooltip, resolving question marks first
    function fmtDate(dateStr) {
        if (!dateStr) return '—';
        const resolved = resolveQ(String(dateStr).trim());
        return window.ftFormatDate ? window.ftFormatDate(resolved) : resolved;
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
        return [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
            .filter(Boolean).join(' ');
    }

    // Light-colored bars need dark text to stay readable
    function needsDarkText(relatie) {
        return relatie === 'PHKindID';
    }

    /* ------------------------------------------------------------------
     * SECTION 7 — TIME AXIS MATH  (obs.1)
     * Uses dynMinYear / dynMaxYear, set per root person.
     * ------------------------------------------------------------------ */
    function yearToX(year, timeW) {
        const ratio = (year - dynMinYear) / (dynMaxYear - dynMinYear);
        return LEFT_PAD + ratio * timeW;
    }

    /* ------------------------------------------------------------------
     * SECTION 8 — DYNAMIC YEAR RANGE  (obs.1)
     * ------------------------------------------------------------------ */
    function setDynamicRange(rootPerson) {
        const rb = parseYear(rootPerson.Geboortedatum);
        if (rb) {
            dynMinYear = rb - 200;                       // 200 years before root birth
            dynMaxYear = Math.max(rb + 200, TODAY);      // 200 years after, at least today
        } else {
            // Fallback: span from earliest known birth in dataset to today
            const years = dataset.map(p => parseYear(p.Geboortedatum)).filter(Boolean);
            dynMinYear  = years.length ? Math.min(...years) - 10 : TODAY - 200;
            dynMaxYear  = TODAY;
        }
    }

    /* ------------------------------------------------------------------
     * SECTION 9 — ROW BUILDER  (obs.5 + obs.9)
     *
     * Produces a flat array of render rows with couple-group nesting:
     *   Ancestors (gen -3 .. -1):  flat per generation, person then partner
     *   Gen 0:   HoofdID → partner → siblings (each with partner)
     *   Gen +1:  each child → partner → grandchildren (each with partner, recursively)
     *
     * Row shape: { entry, indentLevel, sectionLabel }
     * Entry shape: { person, relatie, color, birthYear, deathYear, isDead, isUnknown, isRoot }
     * ------------------------------------------------------------------ */
    function buildRows(rootPerson) {
        const relaties = window.RelatieEngine.computeRelaties(dataset, safe(rootPerson.ID));

        const seen = new Set();
        const rows = [];

        // Build an enriched entry for one person
        function makeEntry(person, relatie) {
            const by = parseYear(person.Geboortedatum);
            const dy = parseYear(person.Overlijdensdatum);
            return {
                person,
                relatie,
                color:     COLOR[relatie] || COLOR.unknown,
                birthYear: by,
                deathYear: dy,
                isDead:    dy !== null,
                isUnknown: by === null,
                isRoot:    safe(person.ID) === safe(rootPerson.ID),
            };
        }

        // Add one row; returns true if added, false if duplicate / not found
        function addRow(id, relatie, indentLevel, sectionLabel) {
            const sid = safe(id);
            if (!sid || seen.has(sid)) return false;
            const p = findPerson(sid);
            if (!p) return false;
            seen.add(sid);
            rows.push({ entry: makeEntry(p, relatie), indentLevel, sectionLabel });
            return true;
        }

        // Add a person + their partner as a sub-row
        function addWithPartner(id, relatie, indentLevel, sectionLabel) {
            const added = addRow(id, relatie, indentLevel, sectionLabel);
            if (!added) return;
            const p = findPerson(id);
            if (p && safe(p.PartnerID)) {
                addRow(p.PartnerID, 'PHoofdID', indentLevel + 1, null);
            }
        }

        /* ---- Ancestor generations (gen -3 .. -1) ---- */
        // Walk upward: collect parent IDs level by level
        function addAncestorLevel(parentIds, sectionLabel) {
            const nextLevel = [];
            parentIds.forEach(pid => {
                const parent = findPerson(pid);
                if (!parent) return;
                // Choose colour: gen -1 uses VHoofdID/MHoofdID, higher gens use VHoofdID
                const rootFatherId = safe(rootPerson.VaderID);
                const isRootParent = sectionLabel === 'Ouders  (gen −1)';
                const relatie = isRootParent
                    ? (safe(parent.ID) === rootFatherId ? 'VHoofdID' : 'MHoofdID')
                    : 'VHoofdID';
                addWithPartner(pid, relatie, 0, sectionLabel);
                // Collect this person's parents for the next level
                [safe(parent.VaderID), safe(parent.MoederID)]
                    .filter(id => id && !seen.has(id))
                    .forEach(id => nextLevel.push(id));
            });
            return [...new Set(nextLevel)];
        }

        const gen1 = [safe(rootPerson.VaderID), safe(rootPerson.MoederID)].filter(Boolean);
        const gen2 = addAncestorLevel(gen1, 'Ouders  (gen −1)');
        const gen3 = addAncestorLevel(gen2, 'Grootouders  (gen −2)');
        addAncestorLevel(gen3, 'Betovergrootouders  (gen −3)');

        /* ---- Gen 0: root + partner + siblings ---- */
        addRow(rootPerson.ID, 'HoofdID', 0, 'Hoofdpersoon  (gen 0)');
        // Partner of root directly below root (obs.5)
        if (safe(rootPerson.PartnerID)) {
            addRow(rootPerson.PartnerID, 'PHoofdID', 1, null);
        }

        // Siblings (sorted by birth year, unknown last), each with partner sub-row
        relaties
            .filter(r => safe(r.Relatie) === 'BZID')
            .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999))
            .forEach(r => {
                addRow(r.ID, 'BZID', 0, null);
                const sib = findPerson(r.ID);
                if (sib && safe(sib.PartnerID)) addRow(sib.PartnerID, 'BZPartnerID', 1, null);
            });

        /* ---- Gen +1 and +2: children recursively (obs.9) ---- */
        const childRelaties = new Set(['KindID', 'HKindID', 'MHKindID', 'PHKindID']);

        const rootChildren = relaties
            .filter(r => childRelaties.has(safe(r.Relatie)))
            .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999));

        // Recursive: child → partner sub-row → grandchildren (each recursive)
        function addChildGroup(childId, childRelatie, indentLevel, sectionLabel) {
            const added = addRow(childId, childRelatie, indentLevel, sectionLabel);
            if (!added) return;

            const child = findPerson(childId);
            if (!child) return;

            // Partner directly below child (obs.5)
            const partnerId = safe(child.PartnerID);
            if (partnerId) addRow(partnerId, 'KindPartnerID', indentLevel + 1, null);

            // Grandchildren: persons whose VaderID or MoederID = this child
            const grandchildren = dataset
                .filter(p => safe(p.VaderID) === safe(childId) || safe(p.MoederID) === safe(childId))
                .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999));

            grandchildren.forEach(gc => {
                if (seen.has(safe(gc.ID))) return;
                // Determine grandchild relation type
                const gcVader  = safe(gc.VaderID);
                const gcMoeder = safe(gc.MoederID);
                let gcRelatie = 'KindID';
                if (gcVader === safe(childId) && gcMoeder === partnerId && partnerId) {
                    gcRelatie = 'KindID';
                } else if (gcVader === safe(childId)) {
                    gcRelatie = 'HKindID';
                } else if (gcMoeder === safe(childId)) {
                    gcRelatie = 'MHKindID';
                } else if (partnerId && (gcVader === partnerId || gcMoeder === partnerId)) {
                    gcRelatie = 'PHKindID';
                }
                addChildGroup(safe(gc.ID), gcRelatie, indentLevel + 1, null);
            });
        }

        rootChildren.forEach((r, idx) => {
            addChildGroup(safe(r.ID), safe(r.Relatie), 0, idx === 0 ? 'Kinderen  (gen +1 / +2)' : null);
        });

        return rows;
    }

    /* ------------------------------------------------------------------
     * SECTION 10 — CANVAS RENDERER
     * Two geometry passes: first compute all Y positions, then draw.
     * Third pass draws connectors (needs all barPositions).
     * ------------------------------------------------------------------ */
    function renderCanvas(rows) {
        if (!rows || rows.length === 0) return;

        /* ---- Step 1: compute canvas dimensions ---- */
        let totalH = TICK_AREA_H;
        let prevLabel = null;
        rows.forEach((row, i) => {
            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                totalH += SECTION_H;
                prevLabel = row.sectionLabel;
            }
            totalH += ROW_H;
            const nextRow = rows[i + 1];
            totalH += (!nextRow || nextRow.indentLevel === 0) ? GROUP_GAP : ROW_GAP;
        });
        totalH += 20; // Bottom padding

        // Canvas width based on year span and available space
        const yearSpan  = dynMaxYear - dynMinYear;
        const available = Math.max(container.clientWidth - LABEL_COL_W - RIGHT_PAD, 600);
        const pxPerYear = Math.max(available / yearSpan, MIN_PX_YEAR);
        const timeW     = yearSpan * pxPerYear;

        canvas.height = totalH;
        canvas.width  = LEFT_PAD + timeW + RIGHT_PAD;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        hitRects = [];
        const barPositions = {}; // id -> { barX, barEndX, barCY }

        /* ---- Step 2: time axis ---- */
        drawTimeAxis(ctx, timeW);

        /* ---- Step 3: rows ---- */
        let curY     = TICK_AREA_H;
        prevLabel    = null;

        rows.forEach((row, i) => {
            // Section header
            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                ctx.fillStyle    = COLOR.sectionText;
                ctx.font         = 'bold 10px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.textAlign    = 'left';
                ctx.fillText(row.sectionLabel, LEFT_PAD + 4, curY + SECTION_H / 2);
                curY     += SECTION_H;
                prevLabel = row.sectionLabel;
            }

            const rowY  = curY;
            const barY  = rowY + (ROW_H - BAR_H) / 2;   // Vertically centred bar
            const barCY = barY + BAR_H / 2;               // Bar vertical centre
            const indentPx = row.indentLevel * 18;        // Horizontal indent for sub-rows

            if (row.entry.isUnknown) {
                drawUnknownBar(ctx, barY, barCY, row.entry, indentPx);
                barPositions[safe(row.entry.person.ID)] = {
                    barX:    LEFT_PAD + indentPx + 4,
                    barEndX: LEFT_PAD + indentPx + 4 + UNKNOWN_BAR_W,
                    barCY,
                };
            } else {
                const bx = yearToX(row.entry.birthYear, timeW);
                const endYear   = row.entry.isDead
                    ? row.entry.deathYear
                    : Math.min(row.entry.birthYear + DEFAULT_SPAN, TODAY);
                const solidEndX = yearToX(Math.min(endYear, dynMaxYear), timeW);
                drawLifeBar(ctx, barY, barCY, row.entry, timeW, indentPx);
                barPositions[safe(row.entry.person.ID)] = {
                    barX:    bx,
                    barEndX: Math.max(solidEndX, bx + 4),
                    barCY,
                };
            }

            hitRects.push({ x: 0, y: rowY, w: canvas.width, h: ROW_H, entry: row.entry });

            const nextRow = rows[i + 1];
            curY += ROW_H + ((!nextRow || nextRow.indentLevel === 0) ? GROUP_GAP : ROW_GAP);
        });

        /* ---- Step 4: connector lines (obs.2) ---- */
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

        /* ---- Step 5: today line on top of everything ---- */
        drawTodayLine(ctx, timeW);

        /* ---- Step 6: update HTML gen-label overlay (obs.8) ---- */
        updateGenLabels(rows);
    }

    /* ------------------------------------------------------------------
     * SECTION 11 — INDIVIDUAL DRAW FUNCTIONS
     * ------------------------------------------------------------------ */

    function drawTimeAxis(ctx, timeW) {
        // Baseline
        ctx.strokeStyle = COLOR.tick;
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        ctx.moveTo(LEFT_PAD, TICK_AREA_H - 4);
        ctx.lineTo(LEFT_PAD + timeW, TICK_AREA_H - 4);
        ctx.stroke();

        ctx.font         = '9px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';

        const firstTick = Math.ceil(dynMinYear / TICK_INTERVAL) * TICK_INTERVAL;
        for (let y = firstTick; y <= dynMaxYear; y += TICK_INTERVAL) {
            const x        = yearToX(y, timeW);
            const isMajor  = y % 50 === 0;  // Taller tick every 50 years
            const isMinor  = y % 25 === 0;  // Label every 25 years
            ctx.strokeStyle = COLOR.tick;
            ctx.lineWidth   = isMajor ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(x, TICK_AREA_H - 4);
            ctx.lineTo(x, TICK_AREA_H - (isMajor ? 14 : 8));
            ctx.stroke();
            if (isMinor || isMajor) {
                ctx.fillStyle = COLOR.tick;
                ctx.fillText(String(y), x, TICK_AREA_H - 16);
            }
        }
    }

    function drawTodayLine(ctx, timeW) {
        const x = yearToX(TODAY, timeW);
        if (x < LEFT_PAD || x > LEFT_PAD + timeW) return; // Out of visible range
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

    function drawLifeBar(ctx, barY, barCY, entry, timeW, indentPx) {
        const { person, relatie, color, birthYear, deathYear, isDead } = entry;

        const startX     = Math.max(yearToX(birthYear, timeW), LEFT_PAD + indentPx);
        const endYear    = isDead ? deathYear : Math.min(birthYear + DEFAULT_SPAN, TODAY);
        const clampEnd   = Math.min(endYear, dynMaxYear);
        const solidEndX  = yearToX(clampEnd, timeW);
        const solidW     = Math.max(solidEndX - startX, 4); // At least 4px

        // Solid bar
        ctx.fillStyle = color;
        roundedRect(ctx, startX, barY, solidW, BAR_H, RADIUS);
        ctx.fill();

        // Dotted extension to TODAY for living persons
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

        // Birth year label above left edge of bar (obs.3)
        ctx.fillStyle    = COLOR.birthLabel;
        ctx.font         = '9px sans-serif';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'bottom';
        if (birthYear) ctx.fillText(String(birthYear), startX, barY - 1);

        // Death year label above right edge of bar (obs.3)
        if (isDead && deathYear) {
            ctx.textAlign = 'right';
            ctx.fillText(String(deathYear), solidEndX, barY - 1);
        }

        // Name inside bar (white or dark depending on bar lightness)
        drawBarLabel(ctx, displayName(person), startX, barY, solidW, needsDarkText(relatie));

        // Amber triangle above root person's bar as anchor
        if (entry.isRoot) drawRootIndicator(ctx, startX + solidW / 2, barY);
    }

    function drawUnknownBar(ctx, barY, barCY, entry, indentPx) {
        const barX = LEFT_PAD + indentPx + 4;
        ctx.fillStyle = COLOR.unknown;
        roundedRect(ctx, barX, barY, UNKNOWN_BAR_W, BAR_H, RADIUS);
        ctx.fill();
        // "?" glyph
        ctx.fillStyle    = COLOR.unknownText;
        ctx.font         = 'bold 10px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', barX + 10, barY + BAR_H / 2);
        // Name beside "?"
        ctx.font      = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(clipText(ctx, displayName(entry.person), UNKNOWN_BAR_W - 18), barX + 18, barY + BAR_H / 2);
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
        ctx.moveTo(cx,     barY - 5);
        ctx.lineTo(cx - 4, barY - 1);
        ctx.lineTo(cx + 4, barY - 1);
        ctx.closePath();
        ctx.fill();
    }

    // L-shaped connector: from RIGHT edge of parent bar to LEFT edge of child bar (obs.2)
    function drawConnector(ctx, parentPos, childPos) {
        const px = parentPos.barEndX; // Right edge of parent bar (not birth point)
        const py = parentPos.barCY;
        const cx = childPos.barX;    // Birth (left) edge of child bar
        const cy = childPos.barCY;

        if (px >= cx - 2) return;    // Parent bar overlaps or extends past child — skip

        ctx.save();
        ctx.strokeStyle = COLOR.connLine;
        ctx.lineWidth   = 0.8;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(px, py);          // Start at right edge of parent bar
        ctx.lineTo(cx, py);          // Horizontal to child birth year
        ctx.lineTo(cx, cy);          // Vertical down to child bar centre
        ctx.stroke();
        // Arrowhead
        ctx.setLineDash([]);
        ctx.fillStyle = COLOR.connLine;
        ctx.beginPath();
        ctx.moveTo(cx,     cy - 3);
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
     * SECTION 12 — HTML GEN-LABEL OVERLAY  (obs.8)
     * Mirrors the Y positions from renderCanvas into absolutely-positioned
     * div elements left of the canvas scroll area. Always visible.
     * ------------------------------------------------------------------ */
    function updateGenLabels(rows) {
        const old = document.getElementById('tlGenLabels');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tlGenLabels';
        Object.assign(overlay.style, {
            position:       'absolute',
            left:           '0',
            top:            '0',
            width:          LABEL_COL_W + 'px',
            pointerEvents:  'none',
            zIndex:         '10',
            background:     'rgba(248,248,248,0.95)',
            borderRight:    '1px solid #e0e0e0',
            fontFamily:     'sans-serif',
            fontSize:       '10px',
            color:          '#666',
            overflow:       'hidden',
        });

        let curY     = TICK_AREA_H;
        let prevLabel = null;

        rows.forEach((row, i) => {
            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                const lbl = document.createElement('div');
                Object.assign(lbl.style, {
                    position:     'absolute',
                    top:          curY + 'px',
                    left:         '6px',
                    right:        '4px',
                    height:       SECTION_H + 'px',
                    lineHeight:   SECTION_H + 'px',
                    fontWeight:   'bold',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                });
                lbl.textContent = row.sectionLabel;
                overlay.appendChild(lbl);
                curY     += SECTION_H;
                prevLabel = row.sectionLabel;
            }
            const nextRow = rows[i + 1];
            curY += ROW_H + ((!nextRow || nextRow.indentLevel === 0) ? GROUP_GAP : ROW_GAP);
        });

        overlay.style.height = (curY + 20) + 'px';
        container.appendChild(overlay);
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
        const LABELS = {
            HoofdID:'Hoofdpersoon', VHoofdID:'Vader', MHoofdID:'Moeder',
            PHoofdID:'Partner', KindID:'Kind', HKindID:'Kind (via hoofd)',
            MHKindID:'Kind (via hoofd)', PHKindID:'Kind (via partner)',
            KindPartnerID:'Partner van kind', BZID:'Broer/Zus', BZPartnerID:'Partner broer/zus',
        };
        const rel   = LABELS[entry.relatie] || entry.relatie || '—';
        const name  = displayName(p) || '(geen naam)';
        const id    = safe(p.ID) || '—';
        const geb   = fmtDate(p.Geboortedatum);
        const overl = p.Overlijdensdatum ? fmtDate(p.Overlijdensdatum) : 'nog in leven';
        let life = '';
        if (entry.birthYear && entry.deathYear) life = `\nLeeftijd: ${entry.deathYear - entry.birthYear} jaar`;
        else if (entry.birthYear) life = `\nLeeftijd: ~${TODAY - entry.birthYear} jaar`;
        return `${name}  [${rel}]\nID: ${id}\nGeboren: ${geb}\nOverleden: ${overl}${life}`;
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
            const tipW    = tooltip.offsetWidth || 220;
            const flipL   = (e.offsetX + tipW + 20 > container.clientWidth);
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
        if (hit) {
            rootId            = safe(hit.entry.person.ID);
            searchInput.value = '';
            draw();
        }
    });

    /* ------------------------------------------------------------------
     * SECTION 14 — MAIN DRAW + PLACEHOLDER
     * ------------------------------------------------------------------ */
    function draw() {
        if (!rootId) return;
        const root = findPerson(rootId);
        if (!root) { showPlaceholder('Persoon niet gevonden.'); return; }

        setDynamicRange(root);     // Set dynMinYear / dynMaxYear for this root

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
        const old = document.getElementById('tlGenLabels');
        if (old) old.remove();
    }

    /* ------------------------------------------------------------------
     * SECTION 15 — INIT
     * ------------------------------------------------------------------ */
    function init() {
        dataset = window.StamboomStorage.get() || [];

        // initLiveSearch(inputEl, dataset, cb) — cb receives persoon.ID string (verified)
        window.initLiveSearch(searchInput, dataset, function (selectedId) {
            rootId = safe(selectedId);
            draw();
        });

        // Auto-select if only one person in dataset
        if (dataset.length === 1) {
            rootId = safe(dataset[0].ID);
            draw();
        }

        window.addEventListener('resize', function () {
            if (rootId) draw();
        });
    }

    init();

})();
