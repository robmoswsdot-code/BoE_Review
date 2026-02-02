import * as vscode from 'vscode';

/**
 * Generates a summary log in the VS Code Output Channel.
 * Validates UBA matches, "9999" items, and Linguistic Redactions.
 */
export class PostMortemLogger {
    private static outputChannel = vscode.window.createOutputChannel("WSDOT Estimator Audit");

    public static logSession(targetFile: string, stats: {
        matches: number,
        nonStandard: number,
        redactions: number,
        errors: string[]
    }) {
        this.outputChannel.clear();
        this.outputChannel.appendLine(`=== POST-MORTEM ANALYSIS: ${targetFile} ===`);
        this.outputChannel.appendLine(`Timestamp: ${new Date().toLocaleString()}`);
        this.outputChannel.appendLine(`-------------------------------------------`);
        this.outputChannel.appendLine(`[Standard Items] Market Truth Matches: ${stats.matches}`);
        this.outputChannel.appendLine(`[9999 Items] Non-Standard Buffers: ${stats.nonStandard}`);
        this.outputChannel.appendLine(`[Hygiene] Linguistic Redactions: ${stats.redactions}`);
        
        if (stats.errors.length > 0) {
            this.outputChannel.appendLine(`\n!!! CRITICAL ERRORS !!!`);
            stats.errors.forEach(err => this.outputChannel.appendLine(`- ${err}`));
        }

        this.outputChannel.appendLine(`\nStatus: ${stats.errors.length === 0 ? "DEFENSIBLE" : "NON-COMPLIANT"}`);
        this.outputChannel.show();
    }
}