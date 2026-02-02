/**
 * src/sectionAggregator.ts
 * Purpose: Dynamically detect WSDOT sections and calculate aggregate totals.
 */

export interface SectionResult {
    sectionName: string;
    rows: any[];
    total: number;
}

export function aggregateByWsdotSection(data: any[]): SectionResult[] {
    const sections: SectionResult[] = [];
    let currentSection: SectionResult | null = null;

    // Defined WSDOT Sections per your Row 8 Protocol
    const targetSections = [
        "PREPARATION", "GRADING & STOCKPILING", "DRAINAGE", "STORM SEWER", 
        "SANITARY SEWER", "WATER LINES", "STRUCTURE", "TRAFFIC", "OTHER ITEMS"
    ];

    data.forEach((row) => {
        const identifier = row['Std Item #']?.toString().toUpperCase().trim();

        // 1. Detect Section Header
        if (targetSections.includes(identifier)) {
            currentSection = {
                sectionName: identifier,
                rows: [],
                total: 0
            };
            sections.push(currentSection);
            return; // Move to next row after establishing header
        }

        // 2. Aggregate Data into Active Section
        if (currentSection) {
            const itemTotal = parseFloat(row['Item Total']) || 0;
            currentSection.rows.push(row);
            currentSection.total += itemTotal; // $$Section\_Total = \sum Item\_Total$$
        }
    });

    return sections;
}