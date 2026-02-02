import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

async function verifyBridge() {
    const root = process.cwd(); // C:\Users\mosherr\mytoolbox
    const supportPath = path.join(root, 'SupportDocuments');
    const targetXlsm = "BoE SR 92 et al_Hoople2.xlsm"; 
    
    console.log("=== BRIDGE DIAGNOSTIC START ===");

    // 1. Verify Support Documents
    const files = ['StandardItemReport.csv', 'NonStandardItemReport.csv'];
    files.forEach(file => {
        const filePath = path.join(supportPath, file);
        if (fs.existsSync(filePath)) {
            console.log(`[PASS] Found: ${file}`);
        } else {
            console.error(`[FAIL] Missing: ${file} at ${supportPath}`);
        }
    });

    // 2. Test ExcelJS Stream (The Row 8 Protocol)
    try {
        const workbook = new ExcelJS.Workbook();
        console.log(`[INFO] Attempting to stream: ${targetXlsm}`);
        
        await workbook.xlsx.readFile(path.join(root, targetXlsm));
        const worksheet = workbook.worksheets[0];
        
        // Peek at Row 8 to confirm data alignment
        const row8 = worksheet.getRow(8);
        console.log(`[PASS] Successfully accessed Row 8. Std Item #: ${row8.getCell(1).value}`);
        
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[CRITICAL] Bridge Failure: ${msg}`);
    }

    console.log("=== BRIDGE DIAGNOSTIC COMPLETE ===");
}

verifyBridge();