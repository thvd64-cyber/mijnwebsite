/**
 * versionControl.js
 * Version: 1.0.0
 * Module: VersionControl — save, list, retrieve, restore and compare family tree versions in Supabase
 * Depends on: window.AuthModule (auth.js), window.CloudSync (cloudSync.js), window.StamboomSchema (schema.js)
 * Global export: window.VersionControl
 */

(function () {
  "use strict";

  // ── Constants ──────────────────────────────────────────────────────────────

  /** Maximum number of versions retained per family tree */
  const MAX_VERSIONS = 20;

  /** Supabase table name for version history */
  const TABLE = "stamboom_versies";

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Return the initialised Supabase client from AuthModule.
   * Throws if client is not available (user not logged in / auth not loaded).
   * @returns {object} Supabase client instance
   */
  function getClient() {
    // AuthModule exposes the supabase client as window.AuthModule.client
    if (!window.AuthModule || !window.AuthModule.client) {
      throw new Error("[VersionControl] AuthModule.client not available");
    }
    return window.AuthModule.client;
  }

  /**
   * Return the authenticated user's UUID, or throw if not logged in.
   * @returns {string} user UUID
   */
  async function getCurrentUserId() {
    const client = getClient();
    // getUser() returns { data: { user }, error }
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      throw new Error("[VersionControl] User not authenticated");
    }
    return data.user.id; // UUID string
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const VersionControl = {

    /**
     * saveVersion — persist the current family-tree data as a new version row.
     * Called by cloudSync.js after every successful saveToCloud().
     *
     * Steps:
     *  1. Resolve next versienummer (max existing + 1, or 1 if none)
     *  2. Insert a new row into stamboom_versies
     *  3. Return the created version object
     *
     * @param {string} stamboomId — UUID of the family tree
     * @param {object} data       — full family-tree data (JSON-serialisable)
     * @param {string|null} label — optional human label, e.g. "voor vakantie"
     * @returns {Promise<object>} inserted version row
     */
    async saveVersion(stamboomId, data, label = null) {
      const client = getClient();
      const userId = await getCurrentUserId();

      // Fetch the current highest versienummer for this stamboom
      const { data: existing, error: fetchError } = await client
        .from(TABLE)
        .select("versienummer")
        .eq("stamboom_id", stamboomId)
        .order("versienummer", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("[VersionControl] saveVersion fetch error:", fetchError.message);
        throw fetchError;
      }

      // Calculate next version number (1 if no versions exist yet)
      const nextVersienummer = existing && existing.length > 0
        ? existing[0].versienummer + 1
        : 1;

      // Auto-generate a label if none provided, using the current timestamp
      const autoLabel = label || `v${nextVersienummer} — ${new Date().toLocaleString("nl-BE")}`;

      // Insert the new version row
      const { data: inserted, error: insertError } = await client
        .from(TABLE)
        .insert({
          stamboom_id:  stamboomId,       // FK → stambomen.id
          user_id:      userId,            // FK → auth.users.id
          versienummer: nextVersienummer,  // incrementing integer
          data:         data,              // full JSONB snapshot
          label:        autoLabel,         // human-readable label
        })
        .select()
        .single();

      if (insertError) {
        console.error("[VersionControl] saveVersion insert error:", insertError.message);
        throw insertError;
      }

      console.log(`[VersionControl] Saved version ${nextVersienummer} for stamboom ${stamboomId}`);
      return inserted; // return the full row including generated id and opgeslagen_op
    },

    // ──────────────────────────────────────────────────────────────────────────

    /**
     * listVersions — return the list of versions for a family tree, newest first.
     * Only metadata is returned (no full data blob) to keep the payload small.
     *
     * @param {string} stamboomId — UUID of the family tree
     * @returns {Promise<object[]>} array of { id, versienummer, opgeslagen_op, label, user_id }
     */
    async listVersions(stamboomId) {
      const client = getClient();

      const { data, error } = await client
        .from(TABLE)
        .select("id, versienummer, opgeslagen_op, label, user_id") // exclude heavy data column
        .eq("stamboom_id", stamboomId)
        .order("versienummer", { ascending: false }) // newest first
        .limit(MAX_VERSIONS);

      if (error) {
        console.error("[VersionControl] listVersions error:", error.message);
        throw error;
      }

      return data || []; // always return array
    },

    // ──────────────────────────────────────────────────────────────────────────

    /**
     * getVersionData — fetch the full data blob of a single version.
     * Used before rendering a preview or running a diff.
     *
     * @param {string} versieId — UUID of the version row
     * @returns {Promise<object>} the JSONB data snapshot
     */
    async getVersionData(versieId) {
      const client = getClient();

      const { data, error } = await client
        .from(TABLE)
        .select("data")           // only fetch the data column
        .eq("id", versieId)
        .single();                // exactly one row expected

      if (error) {
        console.error("[VersionControl] getVersionData error:", error.message);
        throw error;
      }

      return data.data; // unwrap the { data: { data: ... } } envelope
    },

    // ──────────────────────────────────────────────────────────────────────────

    /**
     * restoreVersion — overwrite localStorage AND the cloud stamboom row with a historic version.
     *
     * Steps:
     *  1. Fetch the version data blob
     *  2. Write to localStorage via StamboomStorage
     *  3. Overwrite the stambomen.data column in Supabase
     *  4. Save a new version entry so the restore itself is recorded
     *
     * @param {string} stamboomId — UUID of the family tree
     * @param {string} versieId   — UUID of the version to restore
     * @returns {Promise<void>}
     */
    async restoreVersion(stamboomId, versieId) {
      const client = getClient();

      // Step 1 — load the historic snapshot
      const historicData = await VersionControl.getVersionData(versieId);

      // Step 2 — write to localStorage so the UI reflects the restored state immediately
      if (window.StamboomStorage && typeof window.StamboomStorage.setData === "function") {
        window.StamboomStorage.setData(historicData); // overwrite local copy
      } else {
        // Fallback: write raw to localStorage key used by storage.js
        localStorage.setItem("stamboomData", JSON.stringify(historicData));
      }

      // Step 3 — overwrite the cloud row (stambomen table)
      const { error: updateError } = await client
        .from("stambomen")
        .update({
          data:       historicData,            // replace with historic snapshot
          updated_at: new Date().toISOString(), // refresh timestamp
        })
        .eq("id", stamboomId);

      if (updateError) {
        console.error("[VersionControl] restoreVersion update error:", updateError.message);
        throw updateError;
      }

      // Step 4 — record the restore action as a new version entry (for audit trail)
      await VersionControl.saveVersion(
        stamboomId,
        historicData,
        `Hersteld van versie ${versieId.substring(0, 8)}…`
      );

      // Enforce the version cap after creating the restore entry
      await VersionControl.enforceLimit(stamboomId);

      console.log(`[VersionControl] Restored stamboom ${stamboomId} to version ${versieId}`);
    },

    // ──────────────────────────────────────────────────────────────────────────

    /**
     * compareVersions — build a structured diff between two version snapshots.
     *
     * Algorithm:
     *  - Build Map<personId, persoon> for each snapshot
     *  - toegevoegd: persons in B but not in A
     *  - verwijderd: persons in A but not in B
     *  - gewijzigd:  persons in both with ≥1 changed field
     *    → per person: list of { veld, oud, nieuw }
     *
     * Fields compared: all keys from window.StamboomSchema (if available),
     *                  or all keys found in the person objects.
     *
     * @param {string} versieIdA — UUID of version A (the "older" version)
     * @param {string} versieIdB — UUID of version B (the "newer" version)
     * @returns {Promise<object>} diff_object: { toegevoegd, verwijderd, gewijzigd }
     */
    async compareVersions(versieIdA, versieIdB) {
      // Fetch both snapshots in parallel for speed
      const [dataA, dataB] = await Promise.all([
        VersionControl.getVersionData(versieIdA),
        VersionControl.getVersionData(versieIdB),
      ]);

      // Normalise: data may be stored as array of persons or as { personen: [...] }
      const extractPersons = (snapshot) => {
        if (Array.isArray(snapshot)) return snapshot;            // flat array
        if (snapshot && Array.isArray(snapshot.personen)) return snapshot.personen; // wrapped
        return []; // unrecognised shape — return empty
      };

      const personsA = extractPersons(dataA); // array of person objects from version A
      const personsB = extractPersons(dataB); // array of person objects from version B

      // Build lookup maps keyed by person id
      const mapA = new Map(personsA.map((p) => [p.id, p]));
      const mapB = new Map(personsB.map((p) => [p.id, p]));

      // Determine which fields to compare
      // Prefer schema field names; fall back to union of all object keys
      let schemaVelden = [];
      if (window.StamboomSchema && Array.isArray(window.StamboomSchema.velden)) {
        schemaVelden = window.StamboomSchema.velden.map((f) => f.naam || f.key || f);
      }
      if (schemaVelden.length === 0) {
        // Collect all keys from both snapshots as fallback
        const keySet = new Set();
        [...personsA, ...personsB].forEach((p) => Object.keys(p).forEach((k) => keySet.add(k)));
        schemaVelden = [...keySet];
      }

      // Persons in B but not in A → toegevoegd (added)
      const toegevoegd = personsB.filter((p) => !mapA.has(p.id));

      // Persons in A but not in B → verwijderd (removed)
      const verwijderd = personsA.filter((p) => !mapB.has(p.id));

      // Persons in both — check field-by-field → gewijzigd (changed)
      const gewijzigd = [];
      for (const [id, personA] of mapA) {
        if (!mapB.has(id)) continue; // already in verwijderd
        const personB = mapB.get(id);

        // Build list of changed fields
        const gewijzigdeVelden = schemaVelden
          .filter((veld) => {
            // Use JSON stringify for deep equality on nested values
            return JSON.stringify(personA[veld]) !== JSON.stringify(personB[veld]);
          })
          .map((veld) => ({
            veld: veld,           // field name
            oud:  personA[veld],  // value in version A
            nieuw: personB[veld], // value in version B
          }));

        // Only include persons that actually changed
        if (gewijzigdeVelden.length > 0) {
          gewijzigd.push({
            id:     id,
            naam:   personB.naam || personB.voornaam || id, // best available display name
            velden: gewijzigdeVelden,
          });
        }
      }

      // Return structured diff result
      return {
        toegevoegd, // array of full person objects added in B
        verwijderd, // array of full person objects removed in B
        gewijzigd,  // array of { id, naam, velden: [{veld, oud, nieuw}] }
      };
    },

    // ──────────────────────────────────────────────────────────────────────────

    /**
     * enforceLimit — delete the oldest versions when the count exceeds `max`.
     * Called after every saveVersion() to keep the table from growing unbounded.
     *
     * @param {string} stamboomId — UUID of the family tree
     * @param {number} max        — maximum versions to retain (default 20)
     * @returns {Promise<void>}
     */
    async enforceLimit(stamboomId, max = MAX_VERSIONS) {
      const client = getClient();

      // Fetch all version IDs ordered by versienummer ascending (oldest first)
      const { data: allVersions, error: fetchError } = await client
        .from(TABLE)
        .select("id, versienummer")
        .eq("stamboom_id", stamboomId)
        .order("versienummer", { ascending: true }); // oldest first

      if (fetchError) {
        console.error("[VersionControl] enforceLimit fetch error:", fetchError.message);
        return; // non-fatal: log but don't interrupt the save flow
      }

      if (!allVersions || allVersions.length <= max) {
        return; // still within limit — nothing to delete
      }

      // Calculate how many versions to remove
      const excess = allVersions.length - max;
      const toDelete = allVersions.slice(0, excess); // oldest `excess` rows
      const idsToDelete = toDelete.map((v) => v.id);

      // Delete the excess rows in one query
      const { error: deleteError } = await client
        .from(TABLE)
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("[VersionControl] enforceLimit delete error:", deleteError.message);
        return; // non-fatal
      }

      console.log(`[VersionControl] Deleted ${excess} oldest version(s) for stamboom ${stamboomId}`);
    },
  };

  // ── Expose globally ────────────────────────────────────────────────────────
  window.VersionControl = VersionControl;

  console.log("[VersionControl] Module loaded (v1.0.0)");
})();
