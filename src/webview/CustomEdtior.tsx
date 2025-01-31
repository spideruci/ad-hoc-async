import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import type * as monacoNamespace from "monaco-editor";
import { VSCodeState, ToVSCodeMessage } from "./message";
import { TSESTree } from '@typescript-eslint/typescript-estree';

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

// Function to detect `console.log` calls
const isConsoleLog = (node: any) =>
  node.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" &&
  node.callee.object?.type === "Identifier" &&
  node.callee.object.name === "console" &&
  node.callee.property?.type === "Identifier" &&
  node.callee.property.name === "log";

const CustomEditor: React.FC = () => {
  const editorRef = useRef<monacoNamespace.editor.IStandaloneCodeEditor | undefined>(undefined);
  const monaco = useMonaco();
  const [language, setLanguage] = useState<string>(vscode.getState()?.language || "javascript");
  const floatingBoxesRef = useRef<{ startLine: number; endLine: number }[]>([]);
  const [floatingDivs, setFloatingDivs] = useState<{ top: number; height: number }[]>([]);


  const handleMessage = useCallback(
    (event: MessageEvent) => {
            
      function assignParents(node: TSESTree.Node, parent: TSESTree.Node | null = null, visited: WeakSet<TSESTree.Node> = new WeakSet()): void {
        if (!node || typeof node !== "object" || visited.has(node)) {
            return; // Prevent infinite recursion
        }
        visited.add(node);
    
        (node as any).parent = parent; // Assign parent
    
        for (const key of Object.keys(node)) { // Use Object.keys to avoid prototype chain issues
            const value = (node as any)[key];
    
            if (Array.isArray(value)) {
                for (const child of value) {
                    if (child && typeof child === "object" && "type" in child) {
                        assignParents(child, node, visited);
                    }
                }
            } else if (value && typeof value === "object" && "type" in value) {
                assignParents(value, node, visited);
            }
        }
    }
      if (!editorRef.current) return;

      if (event.data.command === "load") {
        editorRef.current.setValue(event.data.text);
        setLanguage(event.data.language);
        vscode.setState({ language: event.data.language, ...vscode.getState() });
        vscode.postMessage({ command: "requestAST" });
      }

      if (event.data.command === "parsedAST") {
        const ast = event.data.ast;
        assignParents(ast);
        highlightLogs(ast)
      }
    },
    [monaco] // ✅ Ensure `monaco` is included as a dependency
  );

  /** ✅ Set up Monaco and event listeners */
  useEffect(() => {
    if (!monaco) return;
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
    (ast: TSESTree.Program) => {
      if (!editorRef.current || !monaco || !ast) return;
      const functionBlocks: { startLine: number; endLine: number }[] = [];

      function findEnclosingFunction(node: TSESTree.Node): TSESTree.Node | null {
        let current: TSESTree.Node | null = node;
        const visited = new Set<TSESTree.Node>(); // Track visited nodes to detect cycles
      
        while (current) {
          if (
            current.type === "FunctionDeclaration" ||
            current.type === "FunctionExpression" ||
            current.type === "ArrowFunctionExpression"
          ) {
            return current;
          }
          
          
          // Detect circular references
          if (visited.has(current)) {
            return null; // Break the infinite loop
          }
          visited.add(current);
      
          current = (current as any).parent || null;
      
        }
        
        return null;
      }
      function traverse(node: TSESTree.Node, visited: WeakSet<TSESTree.Node> = new WeakSet()) {
        if (!node || typeof node !== "object") {
            return; // Skip non-object values
        }
    
        if (visited.has(node)) {
            console.warn("Detected circular reference, skipping:", node);
            return; // Avoid infinite recursion
        }
        visited.add(node);
    
        if (isConsoleLog(node)) {
            console.log(node);
            console.log("console.log found")
            const enclosingFunction = findEnclosingFunction(node);
            if (enclosingFunction) {
                functionBlocks.push({
                    startLine: enclosingFunction.loc.start.line,
                    endLine: enclosingFunction.loc.end.line,
                });
            }
        }
    
        for (const key of Object.keys(node) as Array<keyof typeof node>) {
            const value = node[key];
            if (value && typeof value === "object" && "type" in value) {
                traverse(value as TSESTree.Node, visited);
            }
        }
      }
      traverse(ast);

      // Store floating div positions
      floatingBoxesRef.current = functionBlocks;
      updateFloatingDivPositions();
    },
    [monaco] // ✅ Ensure `monaco` is included as a dependency
  );
  const updateFloatingDivPositions = () => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const newFloatingDivs = floatingBoxesRef.current.map(({ startLine, endLine }) => {
      const top = editor.getTopForLineNumber(startLine);
      const bottom = editor.getTopForLineNumber(endLine);
      return { top, height: bottom - top };
    });

    setFloatingDivs(newFloatingDivs);
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
      {floatingDivs.map((box, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: box.top,
            left: "5px",
            width: "calc(100% - 10px)",
            height: box.height,
            border: "2px solid red",
            pointerEvents: "none",
          }}
        ></div>
      ))}
    </div>
  );
};

export default CustomEditor;
