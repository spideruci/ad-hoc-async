import { type ReactElement } from "react";
import { useState, useCallback, useEffect } from "react";
import type { Log, ToEditorMessage, ToVSCodeMessage, VSCodeState } from "../types/message";

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const TerminalApp = (): ReactElement => {
  const [logs, setLogs] = useState<Log[]>([]);
  const handleMessage = useCallback(
    (event: MessageEvent<ToEditorMessage>) => {
      if (event.data.command === "log") {
        const log = event.data.log;
        setLogs((prevLogs) => [...prevLogs, log]);
      }
    },
    []
  );
  
  useEffect(() => {
    vscode.postMessage({ command: "ready" });
  
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <div>
      <h1>Terminal Sidebar</h1>
      {logs.filter((log) => log.type === "console.log").map((log, index) => (
        <div key={`log-${index}`}>
          {log.logData.map(data => {
            return <p>{String(data)}</p>;
          })}
        </div>
      ))}
    </div>
  );
};
export default TerminalApp;