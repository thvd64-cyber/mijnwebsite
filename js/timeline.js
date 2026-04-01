/* ======================= js/timeline.js v2.3.4 =======================
 * Canvas-based family timeline renderer
 *
 * Wijzigingen v2.3.0 t.o.v. v2.2.0:
 *  - Jaren naast de balk op balkcenterhoogte: jjjj [ naam ] jjjj
 *  - Gen -3 t/m 0: layout ongewijzigd
 *  - Gen +1 en verder: alle balkjes flat op tijdlijn (geen inspringing)
 *    Volgorde per familie-unit: kind → partner → kinderen van kind (recursief)
 *  - Kleuren per generatieniveau:
 *      +1 = #2196f3 (blauw)
 *      +2 = #00897b (teal)
 *      +3 = #33a895 (teal 20% lichter)
 *      +4 = #66bfac, +5 = #99d5c3 ... (telkens 20% lichter)
 *      Partner = altijd #9e9e9e grijs
 *  - Scheidingslijn alleen tussen blokken -3 t/m 0
 *  - Linkerkolom: gen-label op Y van eerste persoon van die generatie
 *    Volledige reeks van laagste t/m hoogste aanwezige generatie
 *
 * Dependencies (verified):
 *   utils.js         -> window.ftSafe, window.ftParseBirthday, window.ftFormatDate
 *   storage.js       -> window.StamboomStorage.get()
 *   LiveSearch.js    -> window.initLiveSearch(inputEl, dataset, cb) — cb krijgt persoon.ID string
 *   relatieEngine.js -> window.RelatieEngine.computeRelaties(data, hoofdId) v2.3.0
 *     Relatie-waarden: HoofdID, VHoofdID, MHoofdID, PHoofdID,
 *                      KindID, HKindID, PHKindID, BZID, BZPartnerID
 *   Persoon veldnamen: VaderID, MoederID, PartnerID
 *
 * Wijzigingen v2.3.1 t.o.v. v2.3.0:
 *  - Bug fix: ancestor volgorde was -1,-2,-3 (wrong) → nu -3,-2,-1,0 (correct)
 *  - Bug fix: genNum was null voor alle ancestors → linkerkolom labels overlapten
 *    Nu: genNum = -1, -2, -3 zodat genLabelY unieke keys heeft per generatie
 *  - addAncestorLevel vervangen door collectAncestorLevel (buffer-aanpak):
 *    eerst verzamelen, dan in juiste volgorde aan rows[] toevoegen
 *
 * Version: v2.3.1
 * ===================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * SECTION 1 — DOM REFERENCES
     * ------------------------------------------------------------------ */
    const container   = document.getElementById('timelineContainer');
    const canvas      = document.getElementById('timelineCanvas');
    const placeholder = document.getElementById('timelinePlaceholder');
    const tooltip     = document.getElementById('timelineTooltip');
    const searchInput = document.getElementById('sandboxSearch');

    /* ------------------------------------------------------------------
     * SECTION 2 — LAYOUT CONSTANTS
     * ------------------------------------------------------------------ */
    const ROW_H        = 28;   // Height of one person row in pixels
    const ROW_GAP      = 4;    // Gap between rows within same family unit
    const GROUP_GAP    = 12;   // Gap between family units (after last member)
    const RIGHT_PAD    = 32;   // Right margin after time axis end
    const TICK_AREA_H  = 40;   // Height reserved for time axis at top
    const BAR_H        = 16;   // Height of a life bar
    const RADIUS       = 3;    // Corner radius for bars
    const DEFAULT_SPAN = 50;   // Assumed lifespan when death date unknown
    const TICK_INTERVAL= 10;   // Years between tick marks
    const UNKNOWN_BAR_W= 60;   // Width for bars with unknown birth date
    const LABEL_COL_W  = 155;  // Width of HTML gen-label column (left of canvas)
    const MIN_PX_YEAR  = 5;    // Minimum pixels per year
    const SECTION_H    = 20;   // Height of section header row (gen -3 t/m 0)
    const YEAR_PAD     = 5;    // Pixels between year text and bar edge

    /* ------------------------------------------------------------------
     * SECTION 3 — COLOUR PALETTE
     * Gen -3..0: conform RelationColors.css
     * Gen +1..: per generatieniveau, teal wordt 20% lichter per stap
     * ------------------------------------------------------------------ */
    const COLOR = {
        HoofdID:      '#c8960c', // Amber
        PHoofdID:     '#7b56c2', // Purple
        VHoofdID:     '#2d7d46', // Green
        MHoofdID:     '#2d7d46', // Green
        BZID:         '#c8741a', // Orange
        BZPartnerID:  '#9e9e9e', // Grey
        partner:      '#9e9e9e', // Grey — partners at any generation
        today:        '#ee0055', // Red dashed line
        tick:         '#bbbbbb', // Tick marks
        barText:      '#ffffff', // White text on most bars
        barTextDark:  '#1a1a1a', // Dark text on light bars
        birthLabel:   '#555555', // Year labels beside bars
        unknown:      '#cccccc', // Unknown-birth bar fill
        unknownText:  '#666666', // "?" text
        connLine:     '#cccccc', // Parent-child connectors
        genSep:       '#e8e8e8', // Section separator (gen -3..0 only)
        sectionText:  '#888888', // Section header text
    };

    // Returns bar colour for a descendant at a given generation depth (1-based)
    // +1 = blauw, +2 = teal, +3+ = teal lichter per stap (20% per level)
    function descendantColor(genDepth) {
        if (genDepth <= 1) return '#2196f3';          // +1: blauw
        if (genDepth === 2) return '#00897b';         // +2: teal

        // +3 and beyond: teal lightened by 20% per extra generation step
        // Lightening formula: blend toward white by 20% per step
        // Base teal RGB: 0, 137, 123
        const steps  = genDepth - 2;                 // Steps beyond +2
        const factor = Math.min(steps * 0.20, 0.80); // Max 80% lighter
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
     * Handles: dd-mmm-yyyy, yyyy-mmm-dd, question marks → 0 (round down)
     * ------------------------------------------------------------------ */

    function resolveQ(s) {
        return String(s).replace(/\?/g, '0');          // "197?" → "1970"
    }

    function parseYear(dateStr) {
        if (!dateStr) return null;
        const d = resolveQ(String(dateStr).trim());

        // dd-mmm-yyyy  e.g. "12-jan-1954"
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

        // yyyy only
        const yOnly = d.match(/^(\d{4})$/);
        if (yOnly) {
            const yr = parseInt(yOnly[1], 10);
            return (yr >= 100 && yr <= TODAY + 5) ? yr : null;
        }

        // Delegate to utils.js
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
        return [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
            .filter(Boolean).join(' ');
    }

    // True if bar needs dark text (light background colors)
    function needsDarkText(hexOrRgb) {
        // Simple luminance check: light teal variants need dark text
        if (!hexOrRgb) return false;
        const rgb = hexOrRgb.match(/\d+/g);
        if (!rgb) return false;
        const lum = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        return lum > 160; // Threshold: bright colors get dark text
    }

    /* ------------------------------------------------------------------
     * SECTION 7 — TIME AXIS MATH
     * ------------------------------------------------------------------ */
    function yearToX(year, timeW) {
        const ratio = (year - dynMinYear) / (dynMaxYear - dynMinYear);
        return ratio * timeW; // No LEFT_PAD — canvas starts at x=0
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
     *
     * Produces a flat array of render rows:
     *
     * Gen -3 .. 0: unchanged from v2.2.0
     *   Ancestors in generation blocks with section separators
     *   Gen 0: HoofdID → partner → siblings (each with partner)
     *
     * Gen +1 and beyond: flat on timeline, per family unit
     *   For each child of current person (sorted by birth):
     *     child row (genDepth = distance from gen 0)
     *     partner row
     *     recursively: children of child (genDepth+1)
     *       their partner
     *       their children (genDepth+2) ...
     *
     * Row shape:
     *   { entry, isDescendant, genDepth, genNum, sectionLabel, isLastInUnit }
     *
     * Entry shape:
     *   { person, relatie, color, birthYear, deathYear, isDead, isUnknown, isRoot }
     * ------------------------------------------------------------------ */
    function buildRows(rootPerson) {
        const relaties = window.RelatieEngine.computeRelaties(dataset, safe(rootPerson.ID));

        const seen = new Set();
        const rows = [];

        function makeEntry(person, relatie, color) {
            const by = parseYear(person.Geboortedatum);
            const dy = parseYear(person.Overlijdensdatum);
            return {
                person,
                relatie,
                color,
                birthYear: by,
                deathYear: dy,
                isDead:    dy !== null,
                isUnknown: by === null,
                isRoot:    safe(person.ID) === safe(rootPerson.ID),
            };
        }

        function addRow(id, relatie, color, genNum, isDescendant, genDepth, sectionLabel, isLastInUnit) {
            const sid = safe(id);
            if (!sid || seen.has(sid)) return false;
            const p = findPerson(sid);
            if (!p) return false;
            seen.add(sid);
            rows.push({
                entry:        makeEntry(p, relatie, color),
                isDescendant, // true for gen +1 and beyond
                genDepth,     // 1=child, 2=grandchild, etc. (0 for ancestors)
                genNum,       // Actual generation number relative to root
                sectionLabel, // Section header text (or null)
                isLastInUnit, // true if last row before GROUP_GAP
            });
            return true;
        }

        /* ---- Ancestor generations (gen -3 .. -1) ----
         * Fix v2.3.1: ancestors collected into separate buffers first,
         * then added in correct order: -3 → -2 → -1 (oldest first).
         * genNum is now set correctly (-1, -2, -3) so genLabelY keys are unique.
         * Previously: addAncestorLevel pushed directly → order was -1, -2, -3 (wrong).
         * ---- */

        // Collects rows for one ancestor level into a buffer (does NOT push to rows yet)
        function collectAncestorLevel(parentIds, sectionLabel, genNum) {
            const buffer    = []; // Rows for this level, added to rows[] later
            const nextLevel = []; // Parent IDs for the level above

            parentIds.forEach(pid => {
                const parent = findPerson(pid);
                if (!parent || seen.has(safe(pid))) return;
                seen.add(safe(pid));

                const rootFatherId = safe(rootPerson.VaderID);
                const isGen1       = genNum === -1;
                const relatie      = isGen1
                    ? (safe(parent.ID) === rootFatherId ? 'VHoofdID' : 'MHoofdID')
                    : 'VHoofdID';
                const color = COLOR[relatie];

                // Push person row into buffer
                buffer.push({ id: pid, relatie, color, genNum, sectionLabel });

                // Partner immediately after person
                const partnerId = safe(parent.PartnerID);
                if (partnerId && !seen.has(partnerId)) {
                    seen.add(partnerId);
                    buffer.push({ id: partnerId, relatie: 'PHoofdID', color: COLOR.PHoofdID, genNum, sectionLabel: null });
                }

                // Collect parents of this person for level above
                [safe(parent.VaderID), safe(parent.MoederID)]
                    .filter(id => id && !seen.has(id))
                    .forEach(id => nextLevel.push(id));
            });

            return { buffer, nextLevel: [...new Set(nextLevel)] };
        }

        // Step 1: collect all three levels (traversing upward)
        const gen1Ids = [safe(rootPerson.VaderID), safe(rootPerson.MoederID)].filter(Boolean);
        const col1    = collectAncestorLevel(gen1Ids, 'Ouders  (gen −1)',              -1);
        const col2    = collectAncestorLevel(col1.nextLevel, 'Grootouders  (gen −2)',   -2);
        const col3    = collectAncestorLevel(col2.nextLevel, 'Betovergrootouders  (gen −3)', -3);

        // Step 2: push buffers in correct order: -3 first, then -2, then -1
        // This ensures the canvas renders oldest generation at the top.
        [col3.buffer, col2.buffer, col1.buffer].forEach(buffer => {
            buffer.forEach(item => {
                const p = findPerson(item.id);
                if (!p) return;
                rows.push({
                    entry:        makeEntry(p, item.relatie, item.color),
                    isDescendant: false,
                    genDepth:     0,
                    genNum:       item.genNum,       // Correct: -3, -2 or -1
                    sectionLabel: item.sectionLabel,
                    isLastInUnit: false,
                });
            });
        });

        /* ---- Gen 0: root + partner + siblings ---- */
        addRow(rootPerson.ID, 'HoofdID', COLOR.HoofdID, 0, false, 0, 'Hoofdpersoon  (gen 0)', false);

        if (safe(rootPerson.PartnerID)) {
            addRow(rootPerson.PartnerID, 'PHoofdID', COLOR.PHoofdID, 0, false, 0, null, false);
        }

        // Siblings sorted by birth year
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

        /* ---- Gen +1 and beyond: recursive family units ---- */
        const childRelaties = new Set(['KindID', 'HKindID', 'PHKindID']);

        // Direct children of root from relatieEngine
        const rootChildren = relaties
            .filter(r => childRelaties.has(safe(r.Relatie)))
            .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999));

        // Track which gen labels we've already shown (for left column)
        const shownGenLabels = new Set();

        // Returns the section label for a generation depth, shown only once
        function genLabel(depth) {
            const genNum = depth;
            if (shownGenLabels.has(genNum)) return null;
            shownGenLabels.add(genNum);
            const names = ['', 'Kinderen', 'Kleinkinderen', 'Achterkleinkinderen',
                           'Betachterkleinkinderen', 'Verdere nakomelingen'];
            const name = names[genNum] || `Gen +${genNum}`;
            return `${name}  (gen +${genNum})`;
        }

        // Recursive: add child → partner → grandchildren → their partners → ...
        function addDescendantGroup(personId, genDepth) {
            const person = findPerson(personId);
            if (!person || seen.has(safe(personId))) return;

            const color   = descendantColor(genDepth);      // Colour by generation depth
            const label   = genLabel(genDepth);             // Section label (first of this gen only)
            const genNum  = genDepth;                       // Relative generation number

            addRow(safe(personId), 'KindID', color, genNum, true, genDepth, label, false);

            // Partner directly after child
            const partnerId = safe(person.PartnerID);
            if (partnerId) {
                addRow(partnerId, 'PHoofdID', COLOR.partner, genNum, true, genDepth, null, false);
            }

            // Children of this person, sorted by birth year
            const children = dataset
                .filter(p => {
                    const v = safe(p.VaderID);
                    const m = safe(p.MoederID);
                    return v === safe(personId) || m === safe(personId);
                })
                .sort((a, b) => (parseYear(a.Geboortedatum) || 9999) - (parseYear(b.Geboortedatum) || 9999));

            children.forEach(child => {
                if (!seen.has(safe(child.ID))) {
                    addDescendantGroup(safe(child.ID), genDepth + 1);
                }
            });
        }

        // Add all root children, each starting a family unit
        rootChildren.forEach((r, idx) => {
            const isLast = (idx === rootChildren.length - 1);
            addDescendantGroup(safe(r.ID), 1);
            // Mark last row of this family unit for GROUP_GAP spacing
            if (!isLast && rows.length > 0) {
                rows[rows.length - 1].isLastInUnit = true;
            }
        });

        // Mark very last row as last in unit too
        if (rows.length > 0) rows[rows.length - 1].isLastInUnit = true;

        return rows;
    }

    /* ------------------------------------------------------------------
     * SECTION 10 — CANVAS RENDERER
     * ------------------------------------------------------------------ */
    function renderCanvas(rows) {
        if (!rows || rows.length === 0) return;

        /* ---- Compute canvas height ---- */
        let totalH    = TICK_AREA_H;
        let prevLabel = null;
        rows.forEach((row, i) => {
            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                totalH   += SECTION_H;
                prevLabel = row.sectionLabel;
            }
            totalH += ROW_H;
            totalH += row.isLastInUnit ? GROUP_GAP : ROW_GAP;
        });
        totalH += 20;

        /* ---- Compute canvas width ---- */
        const yearSpan  = dynMaxYear - dynMinYear;
        const available = Math.max(container.clientWidth - LABEL_COL_W - RIGHT_PAD, 400);
        const pxPerYear = Math.max(available / yearSpan, MIN_PX_YEAR);
        const timeW     = yearSpan * pxPerYear;

        canvas.height = totalH;
        canvas.width  = timeW + RIGHT_PAD;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        hitRects = [];
        const barPositions = {}; // id -> { barX, barEndX, barCY }

        /* ---- Pass 1: time axis ---- */
        drawTimeAxis(ctx, timeW);

        /* ---- Pass 2: rows ---- */
        let curY     = TICK_AREA_H;
        prevLabel    = null;

        // Track first Y per genNum for left column labels
        const genLabelY = {}; // genNum -> Y pixel

        rows.forEach((row, i) => {
            // Section separator line (gen -3..0 only, not descendants)
            if (row.sectionLabel && row.sectionLabel !== prevLabel && !row.isDescendant) {
                ctx.fillStyle = COLOR.genSep;
                ctx.fillRect(0, curY, canvas.width, 1);
                curY     += 1;
            }

            // Section header text on canvas (small, grey)
            if (row.sectionLabel && row.sectionLabel !== prevLabel) {
                // Record Y for left column label
                const gn = row.isDescendant ? row.genDepth : row.genNum;
                if (gn !== null && gn !== undefined && !(gn in genLabelY)) {
                    genLabelY[gn] = curY;
                }
                curY     += SECTION_H;
                prevLabel = row.sectionLabel;
            }

            // Record genLabelY for rows without explicit section label
            const gn = row.isDescendant ? row.genDepth : row.genNum;
            if (gn !== null && gn !== undefined && !(gn in genLabelY)) {
                genLabelY[gn] = curY;
            }

            const rowY  = curY;
            const barY  = rowY + (ROW_H - BAR_H) / 2;
            const barCY = barY + BAR_H / 2;

            if (row.entry.isUnknown) {
                drawUnknownBar(ctx, barY, barCY, row.entry);
                barPositions[safe(row.entry.person.ID)] = {
                    barX:    4,
                    barEndX: 4 + UNKNOWN_BAR_W,
                    barCY,
                };
            } else {
                drawLifeBar(ctx, barY, barCY, row.entry, timeW);
                const bx     = yearToX(row.entry.birthYear, timeW);
                const endYr  = row.entry.isDead
                    ? row.entry.deathYear
                    : Math.min(row.entry.birthYear + DEFAULT_SPAN, TODAY);
                const ex     = yearToX(Math.min(endYr, dynMaxYear), timeW);
                barPositions[safe(row.entry.person.ID)] = {
                    barX:    bx,
                    barEndX: Math.max(ex, bx + 4),
                    barCY,
                };
            }

            hitRects.push({ x: 0, y: rowY, w: canvas.width, h: ROW_H, entry: row.entry });

            curY += ROW_H + (row.isLastInUnit ? GROUP_GAP : ROW_GAP);
        });

        /* ---- Pass 3: connectors ---- */
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

        /* ---- Pass 4: today line ---- */
        drawTodayLine(ctx, timeW);

        /* ---- Pass 5: update HTML gen-label overlay ---- */
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
            if (y % 25 === 0) {
                ctx.fillStyle = COLOR.tick;
                ctx.fillText(String(y), x, TICK_AREA_H - 16);
            }
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

        // Solid bar
        ctx.fillStyle = color;
        roundedRect(ctx, startX, barY, solidW, BAR_H, RADIUS);
        ctx.fill();

        // Dotted extension for living persons
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

        // Birth year LEFT of bar — same height as bar centre (obs: jjjj [ naam ] jjjj)
        ctx.fillStyle    = COLOR.birthLabel;
        ctx.font         = '9px sans-serif';
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'middle';
        if (birthYear) {
            ctx.fillText(String(birthYear), startX - YEAR_PAD, barCY);
        }

        // Death year RIGHT of bar — same height as bar centre
        if (isDead && deathYear) {
            ctx.textAlign = 'left';
            ctx.fillText(String(deathYear), solidEndX + YEAR_PAD, barCY);
        }

        // Name inside bar
        const dark = needsDarkText(color);
        drawBarLabel(ctx, displayName(person), startX, barY, solidW, dark);

        // Root indicator
        if (entry.isRoot) drawRootIndicator(ctx, startX + solidW / 2, barY);
    }

    function drawUnknownBar(ctx, barY, barCY, entry) {
        const barX = 4;
        ctx.fillStyle = COLOR.unknown;
        roundedRect(ctx, barX, barY, UNKNOWN_BAR_W, BAR_H, RADIUS);
        ctx.fill();
        ctx.fillStyle    = COLOR.unknownText;
        ctx.font         = 'bold 10px sans-serif';
        ctx.textAlign    = 'center';
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
        ctx.moveTo(cx,     barY - 5);
        ctx.lineTo(cx - 4, barY - 1);
        ctx.lineTo(cx + 4, barY - 1);
        ctx.closePath();
        ctx.fill();
    }

    // L-shaped connector from right edge of parent bar to birth point of child bar
    function drawConnector(ctx, parentPos, childPos) {
        const px = parentPos.barEndX;
        const py = parentPos.barCY;
        const cx = childPos.barX;
        const cy = childPos.barCY;
        if (px >= cx - 2) return; // Skip if bars overlap

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
     * SECTION 12 — HTML GEN-LABEL OVERLAY
     * One column left of canvas. For gen -3..0: section labels at their Y.
     * For gen +1..: one label per generatieniveau at first occurrence Y.
     * ------------------------------------------------------------------ */
    function updateGenLabels(rows, genLabelY, totalH) {
        const old = document.getElementById('tlGenLabels');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'tlGenLabels';
        Object.assign(overlay.style, {
            position:      'absolute',
            left:          '0',
            top:           '0',
            width:         LABEL_COL_W + 'px',
            height:        totalH + 'px',
            pointerEvents: 'none',
            zIndex:        '10',
            background:    'rgba(248,248,248,0.95)',
            borderRight:   '1px solid #e0e0e0',
            fontFamily:    'sans-serif',
            fontSize:      '10px',
            color:         '#666',
            overflow:      'hidden',
        });

        // Collect unique labels per row to place in overlay
        const placed    = new Set();
        let   prevLabel = null;

        rows.forEach(row => {
            if (!row.sectionLabel || row.sectionLabel === prevLabel) return;
            prevLabel = row.sectionLabel;
            if (placed.has(row.sectionLabel)) return;
            placed.add(row.sectionLabel);

            // Find Y from genLabelY map
            const gn = row.isDescendant ? row.genDepth : row.genNum;
            const y  = (gn !== null && gn !== undefined && genLabelY[gn] !== undefined)
                ? genLabelY[gn]
                : 0;

            const lbl = document.createElement('div');
            Object.assign(lbl.style, {
                position:     'absolute',
                top:          y + 'px',
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
            overlay.appendChild(lbl);
        });

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
        const LBLS = {
            HoofdID:'Hoofdpersoon', VHoofdID:'Vader', MHoofdID:'Moeder',
            PHoofdID:'Partner', KindID:'Kind', HKindID:'Kind (hoofd)',
            PHKindID:'Kind (partner)', BZID:'Broer/Zus', BZPartnerID:'Partner broer/zus',
        };
        const rel  = LBLS[entry.relatie] || entry.relatie || '—';
        const name = displayName(p) || '(geen naam)';
        const id   = safe(p.ID) || '—';
        const geb  = fmtDate(p.Geboortedatum);
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
            const tipW  = tooltip.offsetWidth || 220;
            const flipL = (e.offsetX + tipW + 20 > container.clientWidth);
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
        const old = document.getElementById('tlGenLabels');
        if (old) old.remove();
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
