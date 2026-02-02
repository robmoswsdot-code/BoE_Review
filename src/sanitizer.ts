/**
 * src/sanitizer.ts
 * Purpose: Enforce WSDOT Linguistic Hygiene and the Zero-Tree Policy.
 */

export class Sanitizer {
    /**
     * Executes a linguistic sweep to redact forbidden terms.
     * Replaces "Dam" with WSDOT-approved civil terminology.
     */
    public static linguisticSweep(text: string): string {
        if (!text) { return ""; }
        // Case-insensitive replacement of "Dam"
        return text.replace(/\bDam\b/gi, (match) => {
            // Preserves casing of the original word where possible
            return match[0] === 'D' ? "Fish Passage Structure" : "fish passage structure";
        });
    }

    /**
     * Evaluates if a row belongs to environmental mitigation.
     * Triggers the Zero-Tree Policy for relocation to BOE Exclusions.
     */
    public static isEnvironmentalItem(description: string, sectionHeader: string): boolean {
        const lowerDesc = description.toLowerCase();
        const lowerHeader = sectionHeader.toLowerCase();

        // Check 1: Sectional match (IRRIGATION, EROSION CONTROL AND ROADSIDE PLANTING)
        if (lowerHeader.includes("restoration") || lowerHeader.includes("planting")) {
            return true;
        }

        // Check 2: Keyword match for the "Zero-Tree" directive
        const environmentalKeywords = ["tree", "planting", "shrub", "acres", "vegetation", "seedling"];
        return environmentalKeywords.some(keyword => lowerDesc.includes(keyword));
    }
}