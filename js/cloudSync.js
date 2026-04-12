// ========================= js/cloudSync.js v1.0.0 =========================
// Cloud backup module for MyFamTreeCollab
// Saves and loads family tree data to/from Supabase (table: stambomen)
// Requires: auth.js (window.AuthModule), storage.js (window.StamboomStorage)
// Exported as: window.CloudSync
// ==========================================================================

(function () {
    'use strict';

    // Maximum number of persons allowed for free cloud backup
    var MAX_PERSONS_FREE = 100;

    // Name of the Supabase table used for cloud storage
    var TABLE = 'stambomen';

    // -----------------------------------------------------------------------
    // _getClient
    // Returns the authenticated Supabase client via AuthModule.
    // Returns null if AuthModule is not available.
    // -----------------------------------------------------------------------
    function _getClient() {
        if (!window.AuthModule || typeof window.AuthModule.getClient !== 'function') {
            console.error('[cloudSync] AuthModule not available');
            return null;
        }
        return window.AuthModule.getClient();
    }

    // -----------------------------------------------------------------------
    // _getCurrentUserId
    // Returns the current user's UUID, or null if not logged in.
    // -----------------------------------------------------------------------
    async function _getCurrentUserId() {
        var client = _getClient();
        if (!client) return null;

        // Get the current session from Supabase
        var sessionResult = await client.auth.getSession();
        var session = sessionResult.data && sessionResult.data.session;
        if (!session || !session.user) return null;

        return session.user.id;
    }

    // -----------------------------------------------------------------------
    // saveToCloud
    // Saves the current localStorage family tree to Supabase.
    // Enforces the free limit of MAX_PERSONS_FREE persons.
    // Returns: { success: true } or { success: false, error: string }
    // -----------------------------------------------------------------------
    async function saveToCloud() {
        // Check if user is logged in
        var userId = await _getCurrentUserId();
        if (!userId) {
            return { success: false, error: 'not_logged_in' };
        }

        // Load all persons from localStorage via StamboomStorage
        if (!window.StamboomStorage) {
            return { success: false, error: 'storage_unavailable' };
        }
        var allPersons = window.StamboomStorage.getAll();

        // Enforce the free person limit before saving to cloud
        if (allPersons.length > MAX_PERSONS_FREE) {
            return {
                success: false,
                error: 'limit_exceeded',
                count: allPersons.length,
                max: MAX_PERSONS_FREE
            };
        }

        // Build the payload to store in the cloud
        var payload = {
            user_id: userId,
            data: allPersons,
            updated_at: new Date().toISOString()
        };

        var client = _getClient();

        // Use upsert so that a re-save updates the existing row
        // Match on user_id — one cloud save per user
        var result = await client
            .from(TABLE)
            .upsert(payload, { onConflict: 'user_id' });

        if (result.error) {
            console.error('[cloudSync] saveToCloud error:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true, count: allPersons.length };
    }

    // -----------------------------------------------------------------------
    // loadFromCloud
    // Loads the cloud-saved family tree into localStorage, overwriting local data.
    // Returns: { success: true, count: number } or { success: false, error: string }
    // -----------------------------------------------------------------------
    async function loadFromCloud() {
        // Check if user is logged in
        var userId = await _getCurrentUserId();
        if (!userId) {
            return { success: false, error: 'not_logged_in' };
        }

        var client = _getClient();

        // Fetch the row for the current user
        var result = await client
            .from(TABLE)
            .select('data, updated_at')
            .eq('user_id', userId)
            .single();

        if (result.error) {
            // PGRST116 = no rows found — no cloud backup exists yet
            if (result.error.code === 'PGRST116') {
                return { success: false, error: 'no_backup' };
            }
            console.error('[cloudSync] loadFromCloud error:', result.error);
            return { success: false, error: result.error.message };
        }

        var cloudData = result.data.data;   // Array of person objects
        var updatedAt = result.data.updated_at;

        // Validate that we received an array before overwriting local data
        if (!Array.isArray(cloudData)) {
            return { success: false, error: 'invalid_data' };
        }

        // Overwrite localStorage with cloud data via StamboomStorage
        if (!window.StamboomStorage) {
            return { success: false, error: 'storage_unavailable' };
        }
        window.StamboomStorage.replaceAll(cloudData);

        return {
            success: true,
            count: cloudData.length,
            updatedAt: updatedAt
        };
    }

    // -----------------------------------------------------------------------
    // getCloudMeta
    // Returns metadata about the existing cloud backup without loading data.
    // Returns: { exists: true, count, updatedAt } or { exists: false }
    // -----------------------------------------------------------------------
    async function getCloudMeta() {
        var userId = await _getCurrentUserId();
        if (!userId) return { exists: false, error: 'not_logged_in' };

        var client = _getClient();

        var result = await client
            .from(TABLE)
            .select('updated_at, data')
            .eq('user_id', userId)
            .single();

        if (result.error) {
            return { exists: false };
        }

        var count = Array.isArray(result.data.data) ? result.data.data.length : 0;

        return {
            exists: true,
            count: count,
            updatedAt: result.data.updated_at
        };
    }

    // -----------------------------------------------------------------------
    // Public API — exported as window.CloudSync
    // -----------------------------------------------------------------------
    window.CloudSync = {
        saveToCloud: saveToCloud,
        loadFromCloud: loadFromCloud,
        getCloudMeta: getCloudMeta,
        MAX_PERSONS_FREE: MAX_PERSONS_FREE
    };

})();
