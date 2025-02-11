import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoNamespace from "monaco-editor";
import type { VSCodeState, ToVSCodeMessage, ToEditorMessage } from "../types/message";
import {
  assignParents,
  findAllTargetChildNodes,
  findOneTargetParent,
  isConsoleLogNode,
  isFunctionNodes,
  type NodeWithParent,
} from "./ast-utils";
import FunctionOverlay from "./components/FunctionOverlay";
import type { Log } from "../types/message";

// maybe use a factory to generate the message
// { command: "requestAST" } message.createRequestAST();
// not
const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();


const CustomEditor: React.FC = () => {
  const editorRef = useRef<monacoNamespace.editor.IStandaloneCodeEditor | undefined>(undefined);
  const monaco = useMonaco();
  const [language, setLanguage] = useState<string>(vscode.getState()?.language || "typescript");
  const [functionBlocks, setFunctionBlocks] = useState<{
    startLine: number;
    endLine: number;
  }[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
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
        const language = event.data.language;
        setLanguage(language);
        const astWithParents = assignParents(ast);
        highlightLogs(astWithParents);
      }

      if (event.data.command === "error") {
        setFunctionBlocks([]);
      }

      if (event.data.command === "log") {
        const log = event.data.log;
        setLogs((prevLogs) => [...prevLogs, log]);
      }
    },
    [monaco]
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
      if (!editorRef.current || !monaco || !ast) { return; };
      const functionBlocks: { startLine: number; endLine: number; }[] = [];
      const consoleLogNodes = findAllTargetChildNodes(ast, isConsoleLogNode);

      consoleLogNodes.forEach((node) => {
        const enclosingFunctionNode = findOneTargetParent(node, isFunctionNodes);
        if (enclosingFunctionNode) {
          functionBlocks.push({
            startLine: enclosingFunctionNode.loc.start.line,
            endLine: enclosingFunctionNode.loc.end.line,
          });
        }
      });

      setFunctionBlocks(functionBlocks);
    },
    [monaco]
  );

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{ automaticLayout: true }}
      />
      {editorRef.current &&
        functionBlocks.map((block, index) => (
          <FunctionOverlay
            logs={logs}
            key={index}
            startLine={block.startLine}
            endLine={block.endLine}
            editor={editorRef.current!}
          />
        ))}
    </div>
  );
};

export default CustomEditor;
