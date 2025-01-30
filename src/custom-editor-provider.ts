import * as vscode from "vscode";
import { parse } from "@typescript-eslint/typescript-estree";
import { getNonce } from "./utils";

export class CustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };

    const fileName = document.uri.path;
    const language = fileName.endsWith(".ts") ? "typescript" : "javascript";

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    // ✅ Wait for webview to signal that it's ready
    const readyListener = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "ready") {
          webviewPanel.webview.postMessage({
            command: "load",
            text: document.getText(),
            language: language,
          });

          // Send AST immediately after loading
          this.sendASTToWebview(document, webviewPanel);
        }
      }
    );

    this.context.subscriptions.push(readyListener);

    // ✅ Handle messages for AST request and save
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "save") {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          message.text
        );
        await vscode.workspace.applyEdit(edit);
        await document.save();
      }

      if (message.command === "requestAST") {
        this.sendASTToWebview(document, webviewPanel);
      }
    });
  }

  private sendASTToWebview(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): void {
    try {
      const code = document.getText();
      const ast = parse(code, { loc: true, range: true });

      webviewPanel.webview.postMessage({
        command: "parsedAST",
        ast: ast,
      });
    } catch (error) {
      if (error instanceof Error) {
        webviewPanel.webview.postMessage({
          command: "error",
          message: error.message,
        });
      } else {
        webviewPanel.webview.postMessage({
          command: "error",
          message: "Unknown error occurred",
        });
      }
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "editor.js")
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Editor</title>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </head>
    <body>
        <div id="root"></div>
    </body>
    </html>`;
  }
}
