import * as vscode from "vscode";
import { TerminalWebviewProvider } from "./terminal-webview-provider";
import { CustomTextEditorProvider } from "./custom-editor-provider";
import { LogHttpServer } from "./http_server";


export function activate(context: vscode.ExtensionContext): void {
  const webSocketServer = new LogHttpServer(9678);
  webSocketServer.start();
  const terminalProvider = new TerminalWebviewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      TerminalWebviewProvider.viewType,
      terminalProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "co-debugger.customEditor",
      new CustomTextEditorProvider(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );
}