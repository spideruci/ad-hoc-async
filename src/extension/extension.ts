import * as vscode from "vscode";
import { TerminalWebviewProvider } from "./terminal-webview-provider";
import { CustomTextEditorProvider } from "./custom-editor-provider";


export function activate(context: vscode.ExtensionContext): void {
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