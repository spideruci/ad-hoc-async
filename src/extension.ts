import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const customizedEditor = new NbfCustomEditorProvider(context);
    // Command to copy the current file as .nbf
    let copyFileDisposable = vscode.commands.registerCommand('extension.startDebuggingSession', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const document = editor.document;

        // Get the full path of the current file
        const originalFilePath = document.uri.fsPath;

        // Block copying if the file is already an .nbf file
        if (originalFilePath.endsWith('.nbf')) {
            vscode.window.showErrorMessage('Cannot copy a .nbf file to another .nbf file.');
            return;
        }

        // Extract the directory, name, and extension of the original file
        const dir = path.dirname(originalFilePath);
        const baseName = path.basename(originalFilePath, path.extname(originalFilePath));
        const extension = path.extname(originalFilePath);

        // Create the new file name
        const newFileName = `${baseName}${extension}.nbf`;
        const newFilePath = path.join(dir, newFileName);

        // Get the selected range
        const selection = editor.selection;
        const selectionStart = document.offsetAt(selection.start);
        const selectionEnd = document.offsetAt(selection.end);

        // Read the content of the current file
        const fileContent = document.getText();

        try {
            // Write the content to the new file
            const nbfContent = JSON.stringify(
                {
                    content: fileContent,
                    editableRange: { start: selectionStart, end: selectionEnd },
                },
                null,
                2
            );

            fs.writeFileSync(newFilePath, nbfContent);

            // Show a success message
            vscode.window.showInformationMessage(`File copied as: ${newFileName}`);

        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage(`Failed to create the file: ${newFileName}`);
        }
    });

    // Register the custom editor for .nbf files
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'nbf.customEditor',
            customizedEditor,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );
    context.subscriptions.push(copyFileDisposable);
}

class NbfCustomEditorProvider implements vscode.CustomTextEditorProvider {
    private readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        const webview = webviewPanel.webview;
        webview.options = { enableScripts: true };

        // Extract the original file extension
        const originalExtension = document.uri.fsPath.split('.').slice(-2, -1)[0];
        let language = 'plaintext'; // Default language

        // Map extensions to Monaco language IDs
        switch (originalExtension) {
            case 'ts':
                language = 'typescript';
                break;
            case 'js':
                language = 'javascript';
                break;
            case 'py':
                language = 'python';
                break;
            case 'html':
                language = 'html';
                break;
            case 'css':
                language = 'css';
                break;
            case 'json':
                language = 'json';
                break;
            // Add more mappings as needed
        }

        // Set the HTML content for the webview
        webviewPanel.webview.html = this.getHtmlForWebview(webview);

        // Parse the content of the .nbf file
        const data = JSON.parse(document.getText());
        const content = data.content;

        // Send the file content and language to the webview
        webview.postMessage({
            command: 'load',
            content,
            language,
        });

        webview.onDidReceiveMessage((message) => {
            if (message.command === 'save') {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    JSON.stringify({ content: message.content, language: message.language }, null, 2)
                );
                vscode.workspace.applyEdit(edit);
                document.save();
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'dist/media', 'main.js')
        );

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NBF Editor</title>
                <style>
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                    }
                    .highlight-block {
                        background: #010101;
                    }
                    .experiment-button-line {
                        margin-bottom: 20px; /* Adds spacing below the line */
                    }
                </style>
            </head>
            <body>
                <div id="editor" style="width:100%; height:100%;"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

export function deactivate() { }