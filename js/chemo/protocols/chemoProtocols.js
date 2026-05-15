/* =========================================================
   AUTO-LOADER FOR CHEMO PROTOCOLS  —  FINAL STABLE VERSION
   ---------------------------------------------------------
   • Scans /data/protocols/
   • Loads all category folders automatically
   • Loads all JSON files inside each folder
   • Builds a unified protocolIndex object
   • Safe for future expansion
   ========================================================= */

const PROTOCOL_BASE_PATH = "data/protocols";

/**
 * MAIN LOADER — called once on app startup
 */
async function loadAllProtocols() {
    try {
        const categories = await listProtocolCategories();
        const protocols = [];

        for (const category of categories) {
            const files = await listProtocolFiles(category);

            for (const file of files) {
                const protocolData = await loadProtocolJSON(category, file);
                if (protocolData) {
                    protocols.push({
                        category,
                        ...protocolData
                    });
                }
            }
        }

        // Final combined index used by UI
        const protocolIndex = { list: protocols };

        console.log("Protocols loaded:", protocolIndex);
        window.protocolIndex = protocolIndex;

        return protocolIndex;

    } catch (err) {
        console.error("Protocol loading error:", err);
    }
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

/**
 * Returns folder names inside /data/protocols/
 */
async function listProtocolCategories() {
    const res = await fetch(`${PROTOCOL_BASE_PATH}/index.json`);
    if (!res.ok) throw new Error("Missing index.json inside /data/protocols/");
    return res.json();
}

/**
 * Returns JSON files inside a category folder
 */
async function listProtocolFiles(category) {
    const res = await fetch(`${PROTOCOL_BASE_PATH}/${category}/index.json`);
    if (!res.ok) throw new Error(`Missing index.json in category: ${category}`);
    return res.json();
}

/**
 * Loads each JSON file
 */
async function loadProtocolJSON(category, file) {
    try {
        const res = await fetch(`${PROTOCOL_BASE_PATH}/${category}/${file}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}
