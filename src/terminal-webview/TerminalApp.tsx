import { type ReactElement } from "react";
import { useState, useCallback, useEffect } from "react";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
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
      <List sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
        {logs.filter((log) => log.type === "console.log").map((log, index) => (
          <ListItem alignItems="flex-start" key={`log-${index}`}>
            <ListItemText
              primary={log.logData.map(data => {
                return JSON.stringify(data);
              })}
              secondary={
                log.functionName
              }
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
};
export default TerminalApp;