import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import type {
  ConsoleLog,
  Log,
  ToEditorMessage,
  ToVSCodeMessage,
  VSCodeState,
} from "../types/message";
import { DynamicCallTree } from "./dynamic-call-tree";
import CallTrees from "./CallTrees";

const darkTheme = createTheme({
  palette: { mode: "dark" },
});

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const TerminalApp = (): JSX.Element => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [metaLogs, setMetaLogs] = useState<Log[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const [currentProgramId, setCurrentProgramId] = useState<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clearAll = () => {
    setLogs([]);
    setMetaLogs([]);
    setSearchQuery("");
    setIsSearchVisible(false);
  };
  const handleMessage = useCallback((event: MessageEvent<ToEditorMessage>) => {
    if (event.data.command === "log") {
      const log = event.data.log;
      if (currentProgramId && log.programUUID !== currentProgramId) {
        clearAll();
        setCurrentProgramId(log.programUUID);
      } else if (currentProgramId === undefined) {
        setCurrentProgramId(log.programUUID);
      }
      if (log.type === "console.log") {
        setLogs((prevLogs) => [...prevLogs, log]);
      }
      setMetaLogs((prev) => [...prev, log]);
    }
  }, [currentProgramId]);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        if (isSearchVisible && searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          setIsSearchVisible(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchVisible]);

  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  const callTree = useMemo(() => {
    const callTree = new DynamicCallTree();
    for (const log of metaLogs.sort((a, b) => a.timestamp - b.timestamp)) {
      callTree.appendNode(log);
    }
    return callTree;
  }, [metaLogs]);

  return (
    <ThemeProvider theme={darkTheme}>
      {isSearchVisible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            background: "#333",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            zIndex: 1000,
            borderRadius: "4px",
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              marginRight: "8px",
              background: "#555",
              color: "white",
              border: "1px solid #777",
              borderRadius: "4px",
              padding: "4px",
            }}
          />
          <button
            onClick={() => {
              setIsSearchVisible(false);
              setSearchQuery("");
            }}
            style={{
              background: "#555",
              color: "white",
              border: "1px solid #777",
              borderRadius: "4px",
              padding: "4px 8px",
            }}
          >
            X
          </button>
        </div>
      )}
      <CallTrees
        dynamicCallTree={callTree}
        logs={logs}
        searchQuery={searchQuery}
        onLogDragStart={(log) => {
          vscode.postMessage({ command: "draggedLog", log });
        }}
      />
      <CssBaseline />
    </ThemeProvider>
  );
};

export default TerminalApp;
