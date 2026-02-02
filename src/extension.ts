import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { processEstimate } from './dataProcessor';

export function activate(context: vscode.ExtensionContext) {
    // Register the command defined in your package.json
    let disposable = vscode.commands.registerCommand('mytoolbox.buildEstimate', async () => {
        const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        
        if (!rootPath) {
            vscode.window.showErrorMessage("Please open a project folder first.");
            return;
        }

        const supportPath = path.join(rootPath, 'SupportDocuments');
        
        // Validate SupportDocuments exists
        if (!fs.existsSync(supportPath)) {
            vscode.window.showErrorMessage(
                `CRITICAL: 'SupportDocuments' folder not found.\nExpected: ${supportPath}`
            );
            return;
        }

        // Find the target .xlsm at the root
        let files: string[];
        try {
            files = fs.readdirSync(rootPath);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read project directory: ${error}`);
            return;
        }

        const targetXlsm = files.find(f => f.endsWith('.xlsm'));

        if (!targetXlsm) {
            vscode.window.showErrorMessage(
                `CRITICAL: No .xlsm target document found in root directory.\nSearched: ${rootPath}`
            );
            return;
        }

        const xlsmPath = path.join(rootPath, targetXlsm);

        // Validate xlsm file is accessible
        if (!fs.existsSync(xlsmPath)) {
            vscode.window.showErrorMessage(`CRITICAL: Cannot access file: ${xlsmPath}`);
            return;
        }

        // Execute the Live Test / Build
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `MyToolbox: Processing ${targetXlsm}`,
                cancellable: false
            }, async () => {
                await processEstimate(xlsmPath, supportPath);
            });

            vscode.window.showInformationMessage(
                `✓ Successfully processed: ${targetXlsm}`
            );
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(
                `Processing failed: ${errorMsg}\n\nCheck DEBUG CONSOLE for details.`
            );
            console.error('Extension error:', error);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
