/* ======================= js/timeline.js v2.1.0 =======================
 * Canvas-based family timeline renderer
 * Draws every person as a horizontal life bar on a shared time axis.
 * Bars are grouped by generation relative to the selected root person.
 *
 * Dependencies (must be loaded before this file):
 *   utils.js         -> window.ftSafe, window.ftParseBirthday, window.ftFormatDate
 *   schema.js        -> window.StamboomSchema
 *   storage.js       -> window.StamboomStorage
 *   LiveSearch.js    -> window.liveSearch(options), window.initLiveSearch(input, dataset, cb)
 *   relatieEngine.js -> window.RelatieEngine.computeRelaties(data, hoofdId)
 *
 * LiveSearch API (initLiveSearch):
 *   initLiveSearch(searchInput, dataset, onSelectCallback)
 *   - onSelectCallback receives person.ID (string), NOT the full person object
 *
 * RelatieEngine API (computeRelaties):
 *   - Returns array of person clones with added .Relatie string and ._priority number
 *   - .Relatie values: 'HoofdID','VHoofdID','MHoofdID','PHoofdID',
 *                      'KindID','HKindID','PHKindID','KindPartnerID',
 *                      'BZID','BZPartnerID'
 *   - Person fields for parents: VaderID / MoederID (NOT VHoofdID / MHoofdID)
 *   - Person field for partner:  PartnerID
 *
 * Exports: nothing (self-contained IIFE)
 * Version: v2.1.0
 * ===================================================================== */

(function () {
    'use strict'; // Strict mode prevents silent errors

    /* ------------------------------------------------------------------
     * SECTION 1 — DOM REFERENCES
     * ------------------------------------------------------------------ */
    const container   = document.getElementById('timelineContainer');   // Outer wrapper (position:relative)
    const canvas      = document.getElementById('timelineCanvas');      // The <canvas> element
    const placeholder = document.getElementById('timelinePlaceholder'); // "Zoek een persoon" message
    const tooltip     = document.getElementById('timelineTooltip');     // Hover tooltip div
    const searchInput = document.getElementById('sandboxSearch');       // Live search input

    /* ------------------------------------------------------------------
     * SECTION 2 — CANVAS CONSTANTS
     * All pixel measurements that define the layout grid.
     * ------------------------------------------------------------------ */
    const MIN_YEAR       = 1800; // Left edge of the time axis
    const ROW_H          = 32;   // Height of one person row in pixels
    const ROW_GAP        = 6;    // Vertical gap between rows
    const LEFT_PAD       = 140;  // Left margin reserved for generation labels
    const RIGHT_PAD      = 24;   // Right margin after the time axis
    const TICK_AREA_H    = 40;   // Height of the top tick/label strip
    const GEN_LABEL_PAD  = 8;    // Top padding before a generation label
    const GEN_BOTTOM_PAD = 12;   // Bottom padding after the last row in a block
    const GEN_SEP_H      = 1;    // Height of the thin separator line between generations
    const BAR_H          = 18;   // Height of a life bar within its row
    const RADIUS         = 4;    // Corner radius for solid bars
    const DEFAULT_SPAN   = 50;   // Assumed lifespan when death date is unknown
    const TICK_INTERVAL  = 25;   // Years between tick marks on the time axis
    const UNKNOWN_BAR_W  = 60;   // Fixed pixel width for persons with unknown birth year

    /* ------------------------------------------------------------------
     * SECTION 3 — COLOUR PALETTE
     * Matches TIMELINE_DEV.docx section 2.3.
     * ------------------------------------------------------------------ */
    const COLOR = {
        parent:     '#2d7d46', // Green  — parents and ancestors
        root:       '#d4a017', // Amber  — the selected root person (gen 0)
        partner:    '#888888', // Grey   — partners at any generation
        child:      '#3a78b5', // Blue   — children and grandchildren
        sibling:    '#c05a1f', // Orange — siblings of the root person
        today:      '#ee0055', // Red    — vertical "today" dashed line
        tick:       '#999999', // Light grey — tick marks and axis line
        genLabel:   '#555555', // Medium grey — generation label text
        genSep:     '#dddddd', // Very light grey — separator between generation blocks
        barText:    '#ffffff', // White  — name text inside bars
        birthLabel: '#444444', // Dark grey — birth year label above bar
        unknown:    '#bbbbbb', // Light grey — fill for unknown-birth bars
        unknownTxt: '#666666', // Medium grey — "?" and label on unknown bars
        connLine:   '#aaaaaa', // Grey   — parent→child connector lines
    };

    /* ------------------------------------------------------------------
     * SECTION 4 — STATE
     * ------------------------------------------------------------------ */
    let dataset  = [];   // Full person array from localStorage
    let rootId   = null; // Currently selected root person ID
    let hitRects = [];   // Array of { x, y, w, h, entry } for mouse hit detection
    const TODAY  = new Date().getFullYear(); // Current year — evaluated once at load

    /* ------------------------------------------------------------------
     * SECTION 5 — UTILITY HELPERS
     * Thin wrappers that delegate to window.ft* from utils.js.
     * ------------------------------------------------------------------ */

    // Returns a trimmed string, never null/undefined
    function safe(val) {
        return window.ftSafe(val); // Delegate to utils.js
    }

    // Parses a date string and returns the 4-digit year as a Number, or null
    function parseYear(dateStr) {
        if (!dateStr) return null;                         // No input
        const d = window.ftParseBirthday(dateStr);        // utils.js returns a Date object
        if (!d || isNaN(d.getTime())) return null;        // Unparseable
        const y = d.getFullYear();
        return (y < 1 || y > TODAY + 5) ? null : y;       // Sanity-check range
    }

    // Formats a date string for tooltip display (e.g. "12 jan 1954")
    function fmtDate(dateStr) {
        if (!dateStr) return '—';
        return window.ftFormatDate(dateStr);               // Delegate to utils.js
    }

    // Finds a person object by ID in the current dataset
    function findPerson(id) {
        const sid = safe(id);
        if (!sid) return null;
        return dataset.find(p => safe(p.ID) === sid) || null;
    }

    // Builds a display name from Roepnaam + Prefix + Achternaam
    function displayName(p) {
        return [safe(p.Roepnaam), safe(p.Prefix), safe(p.Achternaam)]
            .filter(Boolean).join(' ');
    }

    /* ------------------------------------------------------------------
     * SECTION 6 — TIME AXIS MATH
     * yearToX converts a calendar year to an X pixel coordinate.
     * timeW = canvas.width - LEFT_PAD - RIGHT_PAD
     * ------------------------------------------------------------------ */
    function yearToX(year, timeW) {
        const ratio = (year - MIN_YEAR) / (TODAY - MIN_YEAR); // 0.0 = MIN_YEAR, 1.0 = TODAY
        return LEFT_PAD + ratio * timeW;                       // Scale to pixel space
    }

    /* ------------------------------------------------------------------
     * SECTION 7 — GENERATION BUILDER
     * Calls relatieEngine to classify relatives, then groups them into
     * generation blocks for the renderer.
     *
     * Field name note:
     *   The raw person object uses VaderID / MoederID / PartnerID.
     *   relatieEngine produces .Relatie labels 'VHoofdID' / 'MHoofdID' etc.
     *   When traversing the family tree manually (grandparents, grandchildren)
     *   we always read the raw VaderID / MoederID / PartnerID fields.
     *
     * Returns: [ { gen, label, rows: [entry, ...] }, ... ]
     *   entry = { person, color, genNum, isRoot, isUnknown, birthYear, deathYear, isDead }
     * ------------------------------------------------------------------ */
    function buildGenerations(rootPerson) {
        // Get all relatives with their .Relatie label from the engine
        const relaties = window.RelatieEngine.computeRelaties(dataset, safe(rootPerson.ID));

        const seen    = new Set(); // Tracks IDs already added to avoid duplicates
        const entries = [];        // Flat list of all entries before grouping

        // Adds a person to entries if they exist and haven't been added yet
        function addEntry(id, color, genNum) {
            const sid = safe(id);
            if (!sid || seen.has(sid)) return; // Empty or duplicate
            const p = findPerson(sid);
            if (!p) return;                    // Not in the dataset
            seen.add(sid);
            entries.push({ person: p, color, genNum });
        }

        /* ---- GEN 0: root ---- */
        addEntry(rootPerson.ID, COLOR.root, 0);

        /* ---- GEN 0: partner of root ---- */
        relaties
            .filter(r => safe(r.Relatie) === 'PHoofdID')
            .forEach(r => addEntry(r.ID, COLOR.partner, 0));

        /* ---- GEN 0: siblings + their partners ---- */
        relaties
            .filter(r => safe(r.Relatie) === 'BZID')
            .forEach(r => {
                addEntry(r.ID, COLOR.sibling, 0);
                const sib = findPerson(r.ID);                  // Read raw PartnerID from the sibling
                if (sib && safe(sib.PartnerID)) addEntry(sib.PartnerID, COLOR.partner, 0);
            });

        /* ---- GEN -1: parents (read raw VaderID / MoederID from root) ---- */
        const fatherID = safe(rootPerson.VaderID);  // Raw field on the person object
        const motherID = safe(rootPerson.MoederID); // Raw field on the person object

        [fatherID, motherID].filter(Boolean).forEach(pid => {
            addEntry(pid, COLOR.parent, -1);
            const parent = findPerson(pid);
            if (!parent) return;
            if (safe(parent.PartnerID)) addEntry(parent.PartnerID, COLOR.partner, -1);
        });

        /* ---- GEN -2: grandparents (parents of each gen -1 parent) ---- */
        [fatherID, motherID].filter(Boolean).forEach(pid => {
            const parent = findPerson(pid);
            if (!parent) return;
            [safe(parent.VaderID), safe(parent.MoederID)].filter(Boolean).forEach(gpId => {
                addEntry(gpId, COLOR.parent, -2);
                const gp = findPerson(gpId);
                if (gp && safe(gp.PartnerID)) addEntry(gp.PartnerID, COLOR.partner, -2);
            });
        });

        /* ---- GEN -3: great-grandparents (parents of each gen -2 person) ---- */
        entries
            .filter(e => e.genNum === -2 && e.color === COLOR.parent)
            .forEach(e => {
                [safe(e.person.VaderID), safe(e.person.MoederID)].filter(Boolean).forEach(ggpId => {
                    addEntry(ggpId, COLOR.parent, -3);
                    const ggp = findPerson(ggpId);
                    if (ggp && safe(ggp.PartnerID)) addEntry(ggp.PartnerID, COLOR.partner, -3);
                });
            });

        /* ---- GEN +1: children + their partners ---- */
        relaties
            .filter(r => ['KindID', 'HKindID', 'PHKindID'].includes(safe(r.Relatie)))
            .forEach(r => {
                addEntry(r.ID, COLOR.child, 1);
                const child = findPerson(r.ID);
                if (child && safe(child.PartnerID)) addEntry(child.PartnerID, COLOR.partner, 1);
            });

        /* ---- GEN +2: grandchildren (persons whose VaderID/MoederID = a gen+1 child) ---- */
        entries
            .filter(e => e.genNum === 1 && e.color === COLOR.child)
            .forEach(e => {
                const childId = safe(e.person.ID);
                dataset.forEach(p => {
                    if (safe(p.VaderID) === childId || safe(p.MoederID) === childId) {
                        addEntry(p.ID, COLOR.child, 2);
                        const gc = findPerson(p.ID);
                        if (gc && safe(gc.PartnerID)) addEntry(gc.PartnerID, COLOR.partner, 2);
                    }
                });
            });

        /* ---- Enrich entries with parsed date info ---- */
        entries.forEach(e => {
            const by = parseYear(e.person.Geboortedatum);
            const dy = parseYear(e.person.Overlijdensdatum);
            e.birthYear  = by;             // null = unknown
            e.deathYear  = dy;             // null = alive or unknown
            e.isDead     = !!dy;           // true if death year is known
            e.isUnknown  = (by === null);  // true = question-mark bar
            e.isRoot     = (safe(e.person.ID) === safe(rootPerson.ID));
        });

        /* ---- Group into ordered generation blocks ---- */
        const genOrder  = [-3, -2, -1, 0, 1, 2];
        const genLabels = {
            '-3': 'Betovergrootouders (gen −3)',
            '-2': 'Grootouders (gen −2)',
            '-1': 'Ouders (gen −1)',
             '0': 'Hoofdpersoon & broers/zussen (gen 0)',
             '1': 'Kinderen (gen +1)',
             '2': 'Kleinkinderen (gen +2)',
        };

        const blocks = [];
        genOrder.forEach(g => {
            const rows = entries.filter(e => e.genNum === g);
            if (rows.length === 0) return; // Skip empty generations
            rows.sort((a, b) => {          // Sort by birth year; unknown birth sorts last
                if (a.birthYear === null && b.birthYear === null) return 0;
                if (a.birthYear === null) return 1;
                if (b.birthYear === null) return -1;
                return a.birthYear - b.birthYear;
            });
            blocks.push({ gen: g, label: genLabels[String(g)], rows });
        });

        return blocks;
    }

    /* ------------------------------------------------------------------
     * SECTION 8 — CANVAS RENDERER
     * Two-pass rendering:
     *   Pass 1 — time axis, generation labels, life bars
     *   Pass 2 — parent→child connector lines (drawn on top of bars)
     *   Pass 3 — today line (drawn last, on top of everything)
     * ------------------------------------------------------------------ */
    function renderCanvas(blocks) {
        if (!blocks || blocks.length === 0) return;

        const timeW = canvas.width - LEFT_PAD - RIGHT_PAD; // Drawable horizontal span

        /* ---- Calculate canvas height ---- */
        const genBlockH = blocks.reduce((acc, b) =>
            acc + GEN_LABEL_PAD + 16
                + (b.rows.length * (ROW_H + ROW_GAP))
                + GEN_BOTTOM_PAD + GEN_SEP_H, 0);
        canvas.height = TICK_AREA_H + genBlockH + 20;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Wipe previous frame
        hitRects = [];                                     // Reset hit detection

        /* ---- Pass 1a: time axis ---- */
        drawTimeAxis(ctx, timeW);

        /* ---- Pass 1b: generation blocks + bar positions ---- */
        let curY = TICK_AREA_H;          // Y cursor starts below tick strip
        const barPositions = {};          // id -> { cx, cy } for connector lines

        blocks.forEach(block => {
            // Separator line between generation groups
            ctx.fillStyle = COLOR.genSep;
            ctx.fillRect(0, curY, canvas.width, GEN_SEP_H);
            curY += GEN_SEP_H;

            // Generation label
            curY += GEN_LABEL_PAD;
            ctx.fillStyle    = COLOR.genLabel;
            ctx.font         = 'bold 11px sans-serif';
            ctx.textBaseline = 'top';
            ctx.fillText(block.label, 8, curY);
            curY += 16;

            // Person rows
            block.rows.forEach(entry => {
                const rowY  = curY;
                const barY  = rowY + (ROW_H - BAR_H) / 2;  // Vertically centred bar
                const barCY = barY + BAR_H / 2;              // Centre y of bar

                if (entry.isUnknown) {
                    drawUnknownBar(ctx, barY, entry);
                    barPositions[safe(entry.person.ID)] = { cx: LEFT_PAD + 4, cy: barCY };
                } else {
                    drawLifeBar(ctx, barY, barCY, entry, timeW);
                    barPositions[safe(entry.person.ID)] = {
                        cx: yearToX(entry.birthYear, timeW),
                        cy: barCY,
                    };
                }

                // Register row as hit area spanning full canvas width
                hitRects.push({ x: 0, y: rowY, w: canvas.width, h: ROW_H, entry });
                curY += ROW_H + ROW_GAP;
            });

            curY += GEN_BOTTOM_PAD;
        });

        /* ---- Pass 2: connector lines ---- */
        const allEntries = blocks.flatMap(b => b.rows);
        allEntries.forEach(entry => {
            const p = entry.person;
            [safe(p.VaderID), safe(p.MoederID)].forEach(parentId => {
                if (!parentId) return;
                const childPos  = barPositions[safe(p.ID)];
                const parentPos = barPositions[parentId];
                if (!childPos || !parentPos) return; // One party not visible
                drawConnector(ctx, parentPos, childPos);
            });
        });

        /* ---- Pass 3: today line on top ---- */
        drawTodayLine(ctx, timeW);
    }

    /* ------------------------------------------------------------------
     * SECTION 9 — DRAW HELPERS
     * ------------------------------------------------------------------ */

    // Time axis: baseline + tick marks + year labels
    function drawTimeAxis(ctx, timeW) {
        ctx.strokeStyle = COLOR.tick;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(LEFT_PAD, TICK_AREA_H - 4);
        ctx.lineTo(LEFT_PAD + timeW, TICK_AREA_H - 4);
        ctx.stroke();

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        const firstTick = Math.ceil(MIN_YEAR / TICK_INTERVAL) * TICK_INTERVAL;
        for (let y = firstTick; y <= TODAY; y += TICK_INTERVAL) {
            const x = yearToX(y, timeW);
            ctx.strokeStyle = COLOR.tick;
            ctx.lineWidth   = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, TICK_AREA_H - 4);
            ctx.lineTo(x, TICK_AREA_H - 10);
            ctx.stroke();
            ctx.fillStyle = COLOR.tick;
            ctx.font      = '10px sans-serif';
            ctx.fillText(String(y), x, TICK_AREA_H - 12);
        }
    }

    // Red dashed vertical today line spanning full canvas height
    function drawTodayLine(ctx, timeW) {
        const x = yearToX(TODAY, timeW);
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

    // Solid life bar for a person with a known birth year
    function drawLifeBar(ctx, barY, barCY, entry, timeW) {
        const { person, color, birthYear, deathYear, isDead } = entry;

        const startX    = yearToX(birthYear, timeW);
        const endYear   = isDead ? deathYear : Math.min(birthYear + DEFAULT_SPAN, TODAY);
        const solidEndX = yearToX(Math.min(endYear, TODAY), timeW);
        const solidW    = Math.max(solidEndX - startX, 4); // Minimum 4px visibility

        // Solid filled bar
        ctx.fillStyle = color;
        roundedRect(ctx, startX, barY, solidW, BAR_H, RADIUS);
        ctx.fill();

        // Dotted extension to TODAY for living persons
        if (!isDead) {
            const todayX = yearToX(TODAY, timeW);
            if (todayX > solidEndX + 2) {
                ctx.save();
                ctx.strokeStyle = color;
                ctx.lineWidth   = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(solidEndX, barCY);
                ctx.lineTo(todayX, barCY);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Birth year label above bar
        ctx.fillStyle    = COLOR.birthLabel;
        ctx.font         = '10px sans-serif';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(birthYear), startX, barY - 1);

        // Name inside bar
        drawBarLabel(ctx, displayName(person), startX, barY, solidW);

        // Amber triangle above bar for the root person
        if (entry.isRoot) drawRootIndicator(ctx, startX + solidW / 2, barY);
    }

    // Grey fixed-width bar with "?" for persons without a birth date
    function drawUnknownBar(ctx, barY, entry) {
        const barX = LEFT_PAD + 4;

        ctx.fillStyle = COLOR.unknown;
        roundedRect(ctx, barX, barY, UNKNOWN_BAR_W, BAR_H, RADIUS);
        ctx.fill();

        ctx.fillStyle    = COLOR.unknownTxt;
        ctx.font         = 'bold 11px sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', barX + 12, barY + BAR_H / 2);

        ctx.fillStyle    = COLOR.unknownTxt;
        ctx.font         = '10px sans-serif';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            clipText(ctx, displayName(entry.person), UNKNOWN_BAR_W - 20),
            barX + 20, barY + BAR_H / 2
        );
    }

    // White name text inside a bar, clipped with "…" if it doesn't fit
    function drawBarLabel(ctx, name, barX, barY, barW) {
        const padding = 6;
        const maxW    = barW - padding * 2;
        if (maxW < 10) return; // Bar too narrow for any text

        ctx.fillStyle    = COLOR.barText;
        ctx.font         = '10px sans-serif';
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(clipText(ctx, name, maxW), barX + padding, barY + BAR_H / 2);
    }

    // Truncates text to fit within maxW, appending "…" as needed
    function clipText(ctx, text, maxW) {
        if (ctx.measureText(text).width <= maxW) return text;
        let t = text;
        while (t.length > 0 && ctx.measureText(t + '…').width > maxW) {
            t = t.slice(0, -1);
        }
        return t + '…';
    }

    // Small amber upward triangle above the root person's bar
    function drawRootIndicator(ctx, cx, barY) {
        ctx.fillStyle = COLOR.root;
        ctx.beginPath();
        ctx.moveTo(cx,     barY - 6);
        ctx.lineTo(cx - 5, barY - 1);
        ctx.lineTo(cx + 5, barY - 1);
        ctx.closePath();
        ctx.fill();
    }

    // L-shaped dashed connector from parent bar centre to child bar centre
    function drawConnector(ctx, parentPos, childPos) {
        ctx.save();
        ctx.strokeStyle = COLOR.connLine;
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(parentPos.cx, parentPos.cy); // Start at parent
        ctx.lineTo(childPos.cx,  parentPos.cy); // Horizontal leg
        ctx.lineTo(childPos.cx,  childPos.cy);  // Vertical leg to child
        ctx.stroke();

        // Small downward arrowhead at the child end
        ctx.setLineDash([]);
        ctx.fillStyle = COLOR.connLine;
        ctx.beginPath();
        ctx.moveTo(childPos.cx,     childPos.cy - 4);
        ctx.lineTo(childPos.cx - 3, childPos.cy - 9);
        ctx.lineTo(childPos.cx + 3, childPos.cy - 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    // Builds a filled rounded-rectangle path (caller must call ctx.fill())
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
        ctx.lineTo(x, y + rr);
        ctx.arcTo(x,     y,     x + rr, y,          rr);
        ctx.closePath();
    }

    /* ------------------------------------------------------------------
     * SECTION 10 — HIT DETECTION & TOOLTIP
     * ------------------------------------------------------------------ */

    // Returns the hitRect entry under (mx, my) in canvas coordinates, or null
    function getHitAt(mx, my) {
        for (let i = hitRects.length - 1; i >= 0; i--) {
            const r = hitRects[i];
            if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
        }
        return null;
    }

    // Builds the multi-line tooltip text for one entry
    function buildTooltipText(entry) {
        const p    = entry.person;
        const name = displayName(p) || '(geen naam)';
        const id   = safe(p.ID) || '—';
        const geb  = fmtDate(p.Geboortedatum);
        const overl = p.Overlijdensdatum ? fmtDate(p.Overlijdensdatum) : 'nog in leven';

        let lifespan = '';
        if (entry.birthYear && entry.deathYear) {
            lifespan = `\nLeeftijd: ${entry.deathYear - entry.birthYear} jaar`;
        } else if (entry.birthYear && !entry.isDead) {
            lifespan = `\nLeeftijd: ~${TODAY - entry.birthYear} jaar`;
        }

        return `${name}\nID: ${id}\nGeboren: ${geb}\nOverleden: ${overl}${lifespan}`;
    }

    // Mousemove: position + show/hide tooltip
    canvas.addEventListener('mousemove', function (e) {
        const rect  = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top)  * scaleY;

        const hit = getHitAt(mx, my);
        if (hit) {
            canvas.style.cursor   = 'pointer';
            tooltip.style.display = 'block';
            tooltip.textContent   = buildTooltipText(hit.entry);

            const tipW = 200;
            const offsetX = e.offsetX + 14;
            tooltip.style.left = (offsetX + tipW > container.clientWidth)
                ? (e.offsetX - tipW - 8) + 'px'
                : offsetX + 'px';
            tooltip.style.top  = (e.offsetY - 10) + 'px';
        } else {
            canvas.style.cursor   = 'default';
            tooltip.style.display = 'none';
        }
    });

    // Mouseleave: always hide tooltip
    canvas.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
        canvas.style.cursor   = 'default';
    });

    // Click: select clicked person as new root
    canvas.addEventListener('click', function (e) {
        const rect  = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top)  * scaleY;

        const hit = getHitAt(mx, my);
        if (hit) {
            rootId = safe(hit.entry.person.ID); // New root = clicked person
            draw();
        }
    });

    /* ------------------------------------------------------------------
     * SECTION 11 — CANVAS SIZING
     * ------------------------------------------------------------------ */
    function sizeCanvas() {
        canvas.width = Math.max(container.clientWidth - 2, 800); // Min 800px wide
    }

    /* ------------------------------------------------------------------
     * SECTION 12 — MAIN DRAW FUNCTION
     * ------------------------------------------------------------------ */
    function draw() {
        if (!rootId) return;

        const root = findPerson(rootId);
        if (!root) { showPlaceholder('Persoon niet gevonden in de dataset.'); return; }

        const blocks = buildGenerations(root);
        if (blocks.length === 0) { showPlaceholder('Geen familieleden gevonden.'); return; }

        placeholder.style.display = 'none';
        canvas.style.display      = 'block';
        sizeCanvas();
        renderCanvas(blocks);
    }

    /* ------------------------------------------------------------------
     * SECTION 13 — PLACEHOLDER
     * ------------------------------------------------------------------ */
    function showPlaceholder(msg) {
        canvas.style.display      = 'none';
        placeholder.style.display = 'block';
        placeholder.textContent   = msg;
    }

    /* ------------------------------------------------------------------
     * SECTION 14 — LIVE SEARCH WIRING
     * Real signature: initLiveSearch(inputEl, dataset, callback)
     * Callback receives person.ID as a string — resolve via findPerson().
     * ------------------------------------------------------------------ */
    function wireSearch() {
        window.initLiveSearch(
            searchInput,   // HTMLInputElement
            dataset,       // Array of person objects
            function (personId) {              // Called with ID string on selection
                const p = findPerson(personId);
                if (!p) return;
                rootId = safe(p.ID);           // Set new root
                searchInput.value = '';        // Clear search field
                draw();
            }
        );
    }

    /* ------------------------------------------------------------------
     * SECTION 15 — INIT
     * ------------------------------------------------------------------ */
    function init() {
        dataset = window.StamboomStorage.get() || []; // Load from localStorage

        wireSearch(); // Attach live search

        // Auto-select the only person when dataset has exactly one entry
        if (dataset.length === 1) {
            rootId = safe(dataset[0].ID);
            draw();
        }

        // Redraw on window resize to keep canvas width in sync
        window.addEventListener('resize', function () {
            if (rootId) draw();
        });
    }

    init();

})();
