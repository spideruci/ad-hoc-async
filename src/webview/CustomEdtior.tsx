import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoNamespace from "monaco-editor";

// VS Code Webview API
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

// Function to detect `console.log` calls
const isConsoleLog = (node: any) =>
  node.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "console" &&
  node.callee.property?.type === "Identifier" &&
  node.callee.property.name === "log";

const CustomEditor: React.FC = () => {
  const editorRef = useRef<monacoNamespace.editor.IStandaloneCodeEditor | null>(null);
  const monaco = useMonaco();
  const decorationsRef = useRef<string[]>([]);
  const [language, setLanguage] = useState<string>("javascript");

  /** ✅ Handle messages from VS Code */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      console.log("Received Message:", event.data);
      if (!editorRef.current) return;

      if (event.data.command === "load") {
        console.log("Received Content:", event.data.text);
        editorRef.current.setValue(event.data.text);
        setLanguage(event.data.language);
        vscode.postMessage({ command: "requestAST" });
      }

      if (event.data.command === "parsedAST") {
        highlightLogs(event.data.ast);
      }
    },
    [monaco] // ✅ Ensure `monaco` is included as a dependency
  );

  /** ✅ Set up Monaco and event listeners */
  useEffect(() => {
    if (!monaco) return;
    console.log("Monaco is ready. Sending 'ready' to VS Code...");
    vscode.postMessage({ command: "ready" });

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [monaco, handleMessage]);

  /** ✅ Handle Editor Mount */
  const handleEditorDidMount = useCallback(
    (editor: monacoNamespace.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newContent = editor.getValue();
        vscode.postMessage({ command: "save", text: newContent });
        vscode.postMessage({ command: "requestAST" });
      });
    },
    []
  );

  /** ✅ Highlight `console.log` statements */
  const highlightLogs = useCallback(
    (ast: any) => {
      if (!editorRef.current || !monaco || !ast) return;

      const logLocations: { line: number; column: number }[] = [];

      function traverse(node: any) {
        if (isConsoleLog(node)) {
          logLocations.push({
            line: node.loc.start.line,
            column: node.loc.start.column,
          });
        }

        for (const key in node) {
          if (node[key] && typeof node[key] === "object") {
            traverse(node[key]);
          }
        }
      }

      traverse(ast);

      // ✅ Generate Monaco decorations
      const newDecorations = logLocations.map((log) => ({
        range: new monaco.Range(log.line, 1, log.line, 1),
        options: {
          isWholeLine: true,
          inlineClassName: "monaco-log-highlight",
        },
      }));

      // ✅ Apply decorations efficiently
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
    },
    [monaco] // ✅ Ensure `monaco` is included as a dependency
  );

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{ automaticLayout: true }}
      />
      <style>
        {`.monaco-log-highlight { background-color: rgba(255, 200, 0, 0.3); }`}
      </style>
    </div>
  );
};

export default CustomEditor;
