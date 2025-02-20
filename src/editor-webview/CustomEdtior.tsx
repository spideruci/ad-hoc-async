import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoNamespace from "monaco-editor";
import type {
  VSCodeState,
  ToVSCodeMessage,
  ToEditorMessage,
} from "../types/message";
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
import { RangeProvider, useRange } from "./context-providers/RangeProvider";
import { OverlayWidthProvider } from "./context-providers/OverlayWidthProvider";

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const CustomEditor: React.FC = () => {
  const editorRef = useRef<
    monacoNamespace.editor.IStandaloneCodeEditor | undefined
  >(undefined);
  const monaco = useMonaco();
  const [language, setLanguage] = useState<string>(
    vscode.getState()?.language || "typescript"
  );
  const [functionBlocks, setFunctionBlocks] = useState<
    {
      startLine: number;
      endLine: number;
    }[]
  >([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const { setRange } = useRange();

  const handleMessage = useCallback(
    (event: MessageEvent<ToEditorMessage>) => {
      if (!editorRef.current) {
        return;
      }
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
    if (!monaco) {
      return;
    }
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
      if (!editorRef.current || !monaco || !ast) {
        return;
      }

      const functionBlocks: { startLine: number; endLine: number }[] = [];
      const seenFunctions = new Set<number>(); // set to track unique function blocks based on start lines
      const consoleLogNodes = findAllTargetChildNodes(ast, isConsoleLogNode);

      consoleLogNodes.forEach((node) => {
        const enclosingFunctionNode = findOneTargetParent(
          node,
          isFunctionNodes
        );
        const isUniqueFunction =
          enclosingFunctionNode &&
          !seenFunctions.has(enclosingFunctionNode.loc.start.line);

        if (isUniqueFunction) {
          seenFunctions.add(enclosingFunctionNode.loc.start.line);
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

  useEffect(() => {
    if (logs.length > 0) {
      const timestamps = logs.map(log => new Date(log.timestamp).getTime());
      const maxTimestamp = Math.max(...timestamps);
      const minTimestamp = Math.min(...timestamps);

      const initialRange: [number, number] = [minTimestamp - 1000, maxTimestamp + 2000];
      setRange(initialRange);
    }
  }, [logs, setRange]);

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

const CustomEditorWithProvider: React.FC = () => (
  <RangeProvider>
    <OverlayWidthProvider>
      <CustomEditor />
    </OverlayWidthProvider>
  </RangeProvider>
);

export default CustomEditorWithProvider;