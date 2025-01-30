import * as vscode from "vscode";
import { CustomTextEditorProvider } from "./custom-editor-provider";

export function activate(context: vscode.ExtensionContext): void {
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