import { useState, useCallback, useEffect } from "react";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItem from "@mui/material/ListItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Log, ToEditorMessage, ToVSCodeMessage, VSCodeState } from "../types/message";


// Define Highcharts custom series type for flame graph

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const TerminalApp = (): JSX.Element => {
  const [logs, setLogs] = useState<Log[]>([]);

  const handleMessage = useCallback((event: MessageEvent<ToEditorMessage>) => {
    if (event.data.command === "log") {
      const log = event.data.log;
      setLogs((prevLogs) => [...prevLogs, log]);
    }
  }, []);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <Box display="flex" flexDirection="row" p={1}>
      <Box width="100%" p={1}>
        <Typography variant="h6" gutterBottom>
          Log Output
        </Typography>
        <List sx={{ bgcolor: "background.paper" }}>
          {logs.filter((log) => log.type === "console.log").map((log, index) => (
            <ListItem alignItems="flex-start" key={`log-${index}`}>
              <ListItemText
                primary={log.logData.map((data) => JSON.stringify(data)).join(", ")}
                secondary={`Function: ${log.functionName}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default TerminalApp;
