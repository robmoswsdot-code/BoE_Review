import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { Sanitizer } from './sanitizer';
import { PostMortemLogger } from './logger';

export async function processEstimate(xlsmPath: string, supportPath: string) {
    const errors: string[] = [];
    const stats = { matches: 0, nonStandard: 0, redactions: 0, errors: [] as string[] };

    // 1. fs Gatekeeper Check - Support both .csv and .xlsx formats
    const requiredFiles = [
        { name: 'StandardItemReport', extensions: ['.csv', '.xlsx'] },
        { name: 'NonStandardItemReport', extensions: ['.csv', '.xlsx'] }
    ];
    
    const foundFiles: Record<string, string> = {};
    
    requiredFiles.forEach(file => {
        let found = false;
        for (const ext of file.extensions) {
            const fullName = file.name + ext;
            const fullPath = path.join(supportPath, fullName);
            try {
                fs.accessSync(fullPath, fs.constants.R_OK);
                foundFiles[file.name] = fullPath;
                found = true;
                break; // Found it, stop checking other extensions
            } catch (err) {
                // Try next extension
            }
        }
        
        if (!found) {
            const msg = `Missing or Unreadable: ${file.name} (expected .csv or .xlsx) in ${supportPath}`;
            stats.errors.push(msg);
        }
    });

    // Check for marketTruth.json
    const marketTruthPath = path.join(supportPath, 'marketTruth.json');
    if (!fs.existsSync(marketTruthPath)) {
        const msg = `WARNING: marketTruth.json not found in ${supportPath}. All unit costs will be $0.00`;
        stats.errors.push(msg);
        console.warn(msg);
    }

    // 2. Immediate Termination on Missing Support Docs
    if (stats.errors.length > 0) {
        PostMortemLogger.logSession(path.basename(xlsmPath), stats);
        throw new Error(`Critical files missing:\n${stats.errors.join('\n')}`);
    }

    // 3. Proceed to exceljs Stream if check passes
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(xlsmPath);
    
    // Find "DB Estimate Sheet" (case-insensitive)
    const sheet = workbook.worksheets.find(ws => 
        ws.name.toLowerCase().includes('db estimate') || 
        ws.name.toLowerCase() === 'db estimate sheet'
    );
    
    if (!sheet) {
        throw new Error('Could not find "DB Estimate Sheet" in workbook. Available sheets: ' + 
            workbook.worksheets.map(ws => ws.name).join(', '));
    }
    
    const sheetName = sheet.name;
    const worksheet = sheet;
    const currentSectionName = sheetName || '';

    // 4. Row 8 Protocol: Row 8 is header row; build objects using headers from row 8
    const headerRow = worksheet.getRow(8);
    const rawHeaders = (headerRow.values || []) as any[]; // ExcelJS uses 1-based indexing; index 0 may be empty
    const headers: string[] = [];
    for (let col = 1; col < rawHeaders.length; col++) {
        const h = rawHeaders[col];
        if (h !== undefined && h !== null && String(h).trim() !== '') {
            // Normalize headers by collapsing multiple spaces into single space
            const normalized = String(h).trim().replace(/\s+/g, ' ');
            headers[col] = normalized;
        }
    }

    console.log(`Processing worksheet: ${sheetName}`);
    console.log(`Found ${headers.filter(Boolean).length} headers in Row 8`);
    console.log(`Headers detected:`, headers.filter(Boolean).slice(0, 10)); // Show first 10

    const data: any[] = [];
    for (let rowNumber = 9; rowNumber <= worksheet.rowCount; rowNumber++) {
        const excelRow = worksheet.getRow(rowNumber);
        // Skip completely empty rows
        const values = excelRow.values as any[];
        const isEmpty = !values || values.length <= 1 || values.every((v: any) => v === null || v === undefined || v === '');
        if (isEmpty) { continue; }

        const rowObj: any = {};
        let hasStdItemNum = false;
        
        for (let col = 1; col < headers.length; col++) {
            const header = headers[col];
            if (!header) { continue; }
            let value: any = excelRow.getCell(col).value;
            if (value && typeof value === 'object' && 'text' in value) { value = (value as any).text; }
            rowObj[header] = value;
            
            // Track if this row has a Std Item # (indicates it's a data row, not section header)
            if (header === 'Std Item #' && value !== null && value !== undefined) {
                hasStdItemNum = true;
            }
        }

        // Only add rows that have a Std Item # (skip section headers like "PREPARATION")
        if (hasStdItemNum) {
            data.push(rowObj);
        } else {
            // This is likely a section header - track it for environmental detection
            const firstCell = excelRow.getCell(2).value;
            if (firstCell && typeof firstCell === 'string') {
                console.log(`Section header detected at Row ${rowNumber}: ${firstCell}`);
            }
        }
    }

    console.log(`Processed ${data.length} data rows`);
    
    // Debug: Show first 3 rows
    if (data.length > 0) {
        console.log('Sample data (first 3 rows):');
        data.slice(0, 3).forEach((row, idx) => {
            console.log(`  Row ${idx + 10}:`, {
                'Std Item #': row['Std Item #'],
                'Item Quantity': row['Item Quantity'],
                'Item Unit Cost': row['Item Unit Cost'],
                'Item Description': String(row['Item Description'] || '').substring(0, 40)
            });
        });
    } else {
        console.warn('WARNING: No data rows found after Row 8!');
    }

    data.forEach((row: any) => {
        const stdItemNum = row['Std Item #'];
        // Use first "Item Quantity" column (there are multiple)
        const qty = Number(row['Item Quantity'] ?? 0);

        // 5. Market Truth Match & Calculation
        // Calculation: Total = Quantity * UnitPrice (derived from Market Truth)
        if (stdItemNum && String(stdItemNum) !== "9999") {
            const unitPrice = getMarketTruth(stdItemNum, supportPath);
            
            // If we found a market truth price, use it; otherwise keep existing
            if (unitPrice > 0) {
                row['Item Unit Cost'] = unitPrice;
                row['Item Total'] = qty * unitPrice; // $$Total = Quantity \times UnitPrice$$
                stats.matches++;
            }
        } else if (String(stdItemNum) === "9999") {
            stats.nonStandard++;
        }

        // 6. Linguistic Hygiene - handle both description fields
        if (row['Item Description']) {
            row['Item Description'] = Sanitizer.linguisticSweep(row['Item Description']);
        }
        if (row['Standard Item Add On Description']) {
            row['Standard Item Add On Description'] = 
                Sanitizer.linguisticSweep(row['Standard Item Add On Description']);
        }

        // 7. Zero-Tree Audit
        const itemDesc = String(row['Item Description'] || '');
        if (Sanitizer.isEnvironmentalItem(itemDesc, currentSectionName)) {
            row['NOTES'] = "FLAGGED: Relocate to BOE Exclusions (Zero-Tree Policy)";
            row['Item Unit Cost'] = 0; // Strips cost from civil total
            stats.redactions++;
        }
    });
    
    // Log successful processing
    console.log('=== PROCESSING COMPLETE ===');
    console.log(`Total rows processed: ${data.length}`);
    console.log(`Market truth matches: ${stats.matches}`);
    console.log(`Non-standard (9999) items: ${stats.nonStandard}`);
    console.log(`Linguistic redactions: ${stats.redactions}`);
    PostMortemLogger.logSession(path.basename(xlsmPath), stats);
    
    // Logic for Sectional Totaling and BOE Generation follows...
    return data;
}

function sanitizeText(text: any): string {
    // Delegate to centralized `Sanitizer` to keep linguistic rules consistent
    if (!text) { return ''; }
    return Sanitizer.linguisticSweep(String(text));
}

/**
 * Safe synchronous helper to return a market unit price for a given Std Item #.
 * - Tries to read a JSON file named `marketTruth.json` located at `supportPath` (or the file at `supportPath` if that's a file).
 * - Expected format: { "1234": 12.34, "5678": 5.00 }
 * - Falls back to 0 when the mapping or file is not available.
 */
function getMarketTruth(stdItemNum: string | number, supportPath: string): number {
    try {
        let candidate = supportPath;
        const stat = fs.existsSync(supportPath) && fs.statSync(supportPath);
        if (stat && stat.isDirectory()) {
            candidate = path.join(supportPath, 'marketTruth.json');
        }

        if (!fs.existsSync(candidate)) {return 0;}
        const raw = fs.readFileSync(candidate, 'utf8');
        const map = JSON.parse(raw) as Record<string, number>;
        return map[String(stdItemNum)] ?? 0;
    } catch (err) {
        console.error(`Error reading market truth data: ${err}`);
        return 0;
    }
}
