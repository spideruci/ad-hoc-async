import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoNamespace from "monaco-editor";
import type { VSCodeState, ToVSCodeMessage, ToEditorMessage } from "./message";
import {
  assignParents,
  findAllTargetChildNodes,
  findOneTargetParent,
  isConsoleLogNode,
  isFunctionNodes,
  type NodeWithParent,
} from "./ast-utils";

// maybe use a factory to generate the message
// { command: "requestAST" } message.createRequestAST();
// not
const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const CustomEditor: React.FC = () => {
  const editorRef = useRef<
    monacoNamespace.editor.IStandaloneCodeEditor | undefined
  >(undefined);
  const monaco = useMonaco();
  const [language, setLanguage] = useState<string>(
    vscode.getState()?.language || "javascript"
  );
  const overlayWidgetsRef = useRef<monacoNamespace.editor.IOverlayWidget[]>([]);

  const handleMessage = useCallback(
    (event: MessageEvent<ToEditorMessage>) => {
      if (!editorRef.current) { return; }

      if (event.data.command === "load") {
        editorRef.current.setValue(event.data.text);
        setLanguage(event.data.language);
        vscode.setState({
          language: event.data.language,
          ...vscode.getState(),
        });
        vscode.postMessage({ command: "requestAST" });
      }

      if (event.data.command === "parsedAST") {
        const ast = event.data.ast;
        const astWithParents = assignParents(ast);
        highlightLogs(astWithParents);
      }

      if (event.data.command === "error") {
        removeExistingWidgets();
      }
    },
    [monaco] // ✅ Ensure `monaco` is included as a dependency
  );

  useEffect(() => {
    if (!monaco) { return; };
    vscode.postMessage({ command: "ready" });

    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [monaco, handleMessage]);


  const handleEditorDidMount = useCallback(
    (editor: monacoNamespace.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      editor.onDidChangeModelContent(() => {
        const newContent = editor.getValue();
        vscode.postMessage({ command: "save", text: newContent });
      });
    },
    []
  );

  const highlightLogs = useCallback(
    (ast?: NodeWithParent) => {
      if (!editorRef.current || !monaco || !ast) { return; }
      const functionBlocks: { startLine: number; endLine: number }[] = [];
      const consoleLogNodes = findAllTargetChildNodes(ast, isConsoleLogNode);
      consoleLogNodes.forEach(node => {
        const enclosingFunctionNode = findOneTargetParent(node, isFunctionNodes);
        if (enclosingFunctionNode) {
          functionBlocks.push({
            startLine: enclosingFunctionNode.loc.start.line,
            endLine: enclosingFunctionNode.loc.end.line,
          });
        }
      });

      removeExistingWidgets();
      functionBlocks.forEach(({ startLine, endLine }, index) => {
        addOverlayWidget(startLine, endLine, `log-highlight-${index}`);
      });
    },
    [monaco]
  );

  const addOverlayWidget = (startLine: number, endLine: number, widgetId: string): void => {
    if (!editorRef.current || !monaco) { return; }
    const editor = editorRef.current;
    const top = editor.getTopForLineNumber(startLine);
    const height = editor.getBottomForLineNumber(endLine) - top;

    // Create a new overlay widget
    const domNode = document.createElement("div");
    domNode.id = widgetId;
    domNode.style.position = "absolute";
    domNode.style.border = "2px solid red";
    domNode.style.background = "rgba(255, 0, 0, 0.1)";
    domNode.style.pointerEvents = "none";
    domNode.style.width = "100%";
    domNode.style.height = `${height}px`;
    domNode.style.top = `${editor.getTopForLineNumber(startLine) - editor.getScrollTop()}px`;

    const widget: monacoNamespace.editor.IOverlayWidget = {
      getId: () => widgetId,
      getDomNode: () => domNode,
      getPosition: () => ({
        preference: null,
      }),
    };

    editor.addOverlayWidget(widget);
    overlayWidgetsRef.current.push(widget);

    // Update position when scrolling
    editor.onDidScrollChange(() => {
      domNode.style.top = `${editor.getTopForLineNumber(startLine) - editor.getScrollTop()}px`;
    });
  };

  const removeExistingWidgets = (): void => {
    if (!editorRef.current) { return; }

    const editor = editorRef.current;
    overlayWidgetsRef.current.forEach((widget) => {
      editor.removeOverlayWidget(widget);
    });
    overlayWidgetsRef.current = [];
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{ automaticLayout: true }}
      />
    </div>
  );
};

export default CustomEditor;
