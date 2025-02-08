import * as vscode from "vscode";
import { getNonce } from "./utils";

export class TerminalWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "co-debugger.sidebarView";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "sidebar.js")
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
        <div id="terminal-root"></div>
    </body>
    </html>`;
  }
}