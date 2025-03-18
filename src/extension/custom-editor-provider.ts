import * as vscode from "vscode";
import { parse } from "@typescript-eslint/typescript-estree";
import { getNonce } from "./utils/utils";
import type { ConsoleLog, Log, ToVSCodeMessage } from "../types/message";

export class CustomTextEditorProvider implements vscode.CustomTextEditorProvider {
  private webviewPanel: vscode.WebviewPanel | null = null;
  constructor(private readonly context: vscode.ExtensionContext) {}

  public handleLogBroadcast(log: Log): void {
    if (this.webviewPanel) {
      this.webviewPanel.webview.postMessage({ command: "log", log });
    }
  }

  public handleDraggedLogBroadcast(log: ConsoleLog): void {
    if (this.webviewPanel) {
      this.webviewPanel.webview.postMessage({ command: "draggedLog", log });
    }
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.webviewPanel = webviewPanel;
    webviewPanel.webview.options = { enableScripts: true };

    const fileName = document.uri.path;
    const language = (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) ? "typescript" : "javascript";
    // ✅ Wait for webview to signal that it's ready
    const readyListener = webviewPanel.webview.onDidReceiveMessage(
      async (message: ToVSCodeMessage) => {
        if (message.command === "ready") {
          webviewPanel.webview.postMessage({
            command: "load",
            text: document.getText(),
            language: language,
            fileName: fileName,
          });

          // Send AST immediately after loading
          this.sendASTToWebview(document, webviewPanel, language);
        }
        if (message.command === "save") {
          const edit = new vscode.WorkspaceEdit();

          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            message.text
          );
          await vscode.workspace.applyEdit(edit);
          await document.save();
          this.sendASTToWebview(document, webviewPanel);
        }
        if (message.command === "requestAST") {
          this.sendASTToWebview(document, webviewPanel);
        }
      }
    );

    this.context.subscriptions.push(readyListener);

    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);
    webviewPanel.webview.postMessage({
      command: "load",
      text: document.getText(),
      language: language,
    });
  }

  private sendASTToWebview(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    language: "javascript" | "typescript" = "javascript"
  ): void {
    try {
      let code = document.getText();
      code = this.removeConsoleOverride(code, language); // Remove the override before parsing

      const ast = parse(code, { loc: true, range: true });
      webviewPanel.webview.postMessage({
        command: "parsedAST",
        ast: ast,
        language,
      });
    } catch (error) {
      webviewPanel.webview.postMessage({
        command: "error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }
  private removeConsoleOverride(code: string, fileType: "javascript" | "typescript"): string {
    if (fileType === "javascript") {
      // JavaScript override pattern (removes `var originalConsoleLog`)
      const jsOverridePattern =
        /\(function\(\)\s*\{\s*var\s+originalConsoleLog\s*=\s*console\.log;[\s\S]*?\}\)\(\);\s*\n?/;

      return code.replace(jsOverridePattern, "");
    } else if (fileType === "typescript") {
      // TypeScript override pattern (removes `let originalConsoleLog: typeof console.log`)
      const tsOverridePattern =
        // eslint-disable-next-line max-len
        /\(function\(\)\s*\{\s*let\s+originalConsoleLog\s*:\s*typeof\s*console\.log\s*=\s*console\.log;[\s\S]*?\}\)\(\);\s*\n?/;

      return code.replace(tsOverridePattern, "");
    }

    // If the file type is unknown, return the code unchanged
    return code;
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
