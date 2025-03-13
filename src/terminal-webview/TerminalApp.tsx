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

  const listRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((event: MessageEvent<ToEditorMessage>) => {
    if (event.data.command === "log") {
      const log = event.data.log;
      if (log.type === "console.log") {
        setLogs((prevLogs) => [...prevLogs, log]);
      }
      setMetaLogs((prev) => [...prev, log]);
    }
  }, []);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const callTree = useMemo(() => {
    const callTree = new DynamicCallTree();
    for (const log of metaLogs.sort((a, b) => a.timestamp - b.timestamp)) {
      callTree.appendNode(log);
    }
    return callTree;
  }, [metaLogs]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CallTrees dynamicCallTree={callTree} logs={logs}/>
      <CssBaseline />
    </ThemeProvider>
  );
};

export default TerminalApp;
