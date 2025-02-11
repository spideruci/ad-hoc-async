import * as vscode from "vscode";
import { TerminalWebviewProvider } from "./terminal-webview-provider";
import { CustomTextEditorProvider } from "./custom-editor-provider";
import { LogHttpServer } from "./http_server";


export function activate(context: vscode.ExtensionContext): void {
  const webSocketServer = new LogHttpServer(context, 9678);
  webSocketServer.start();
  const terminalProvider = new TerminalWebviewProvider(context);

  const customEditorProvider = new CustomTextEditorProvider(context);

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
      customEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );
  vscode.commands.registerCommand("co-debugger.broadcastLog", (log) => {
    terminalProvider.handleLogBroadcast(log);
    customEditorProvider.handleLogBroadcast(log);
  });
}