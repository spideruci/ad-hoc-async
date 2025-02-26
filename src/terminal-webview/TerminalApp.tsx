import { useState, useCallback, useEffect, useRef } from "react";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import FunctionsIcon from "@mui/icons-material/Functions";
import { Badge, Tooltip } from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import type { ConsoleLog, ToEditorMessage, ToVSCodeMessage, VSCodeState } from "../types/message";

const darkTheme = createTheme({
  palette: { mode: "dark" },
});

const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const TerminalApp = (): JSX.Element => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [splitByFunction, setSplitByFunction] = useState(false);
  const [splitByFunctionCallsSet, setSplitByFunctionCallsSet] = useState(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((event: MessageEvent<ToEditorMessage>) => {
    if (event.data.command === "log") {
      const log = event.data.log;
      if (log.type === "console.log") {
        setLogs((prevLogs) => [...prevLogs, log]);
      }
    }
  }, []);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleLogHover = (logId: string): void => {
    vscode.postMessage({ command: "logHover", logId });
  };

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = (): void => {
    if (!listRef.current) { return; }
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollTop + clientHeight >= scrollHeight - 5);
  };

  const handleFunctionCallSplits = (functionName: string): void => {
    setSplitByFunctionCallsSet((prev) => {
      const newSet = new Set([...prev, functionName]);
      if (prev.has(functionName)) { newSet.delete(functionName); }
      return newSet;
    });
  };

  const filteredLogs = logs.filter((log) => log.type === "console.log");
  const functionLogMap: {
    [functionNameOrKey: string]: {
      logs: Array<ConsoleLog | null>;
      type: "function" | "call";
      functionKey?: string;
      functionName: string;
      firstLogTimestamp: number;
    }
  } = {};
  let currentLength = 0;
  filteredLogs.sort((a, b) => a.timestamp - b.timestamp).forEach((v) => {
    if (splitByFunctionCallsSet.has(v.functionName)) {
      if (!functionLogMap[`${v.functionName}-${v.functionKey}`]) {
        functionLogMap[`${v.functionName}-${v.functionKey}`] = {
          logs: new Array(currentLength).fill(null),
          type: "call",
          functionKey: v.functionKey,
          functionName: v.functionName,
          firstLogTimestamp: v.timestamp
        };
      }
      Object.keys(functionLogMap).map(k => {
        functionLogMap[k].logs.push(k === `${v.functionName}-${v.functionKey}` ? v : null);
      });
    } else {
      if (!functionLogMap[v.functionName]) {
        functionLogMap[v.functionName] = {
          logs: new Array(currentLength).fill(null),
          type: "function",
          functionName: v.functionName,
          firstLogTimestamp: v.timestamp
        };
      }
      Object.keys(functionLogMap).map(k => {
        functionLogMap[k].logs.push(k === v.functionName ? v : null);
      });
    }

    currentLength++;
  }, {} as Record<string, (ConsoleLog | null)[]>);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box display="flex" flexDirection="column" height="100vh">
        <Box flex={1} p={1} sx={{ height: "100%", overflow: "hidden" }}>
          <Box
            ref={listRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              height: "100%",
              overflowY: "auto",
              overflowX: "auto",
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap"
            }}
          >
            {splitByFunction
              ? Object
                .entries(functionLogMap)
                .sort((a, b) => a[1].firstLogTimestamp - b[1].firstLogTimestamp)
                .map(([k, functionLogs]) => (
                  <Box key={k} sx={{ minWidth: "400px", flex: "1" }}>
                    <List dense={true} subheader={<ListSubheader>
                      {
                        splitByFunctionCallsSet.has(functionLogs.functionName) ?
                          functionLogs.functionName : functionLogs.functionName
                      }
                      <Tooltip title="Merge Functions">
                        <IconButton aria-label="delete"
                          size="small"
                          onClick={() => setSplitByFunction((prev) => !prev)}
                        >
                          <FunctionsIcon fontSize="inherit"></FunctionsIcon>
                          <Badge badgeContent={!splitByFunction ? "+" : "-"} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip 
                        title={
                          !splitByFunctionCallsSet.has(functionLogs.functionName) ? 
                            "Split Function by Calls" : "Merge Calls into Function"
                        }>
                        <IconButton aria-label="delete"
                          size="small"
                          onClick={() => handleFunctionCallSplits(functionLogs.functionName)}
                        >
                          <CallIcon fontSize="inherit"></CallIcon>
                          <Badge badgeContent={!splitByFunctionCallsSet.has(functionLogs.functionName) ? "+" : "-"} />
                        </IconButton>
                      </Tooltip>
                    </ListSubheader>}>
                      {functionLogs.logs.map((log, index) => (
                        log === null ? (
                          <div key={`empty-${functionLogs.functionName}-${index}`}>
                            <ListItemButton
                              sx={{ height: "50px", opacity: 0 }}
                              alignItems="flex-start"
                            />
                            <Divider variant="inset" component="li" />
                          </div>
                        ) : (
                          <div key={`log-${functionLogs.functionName}-${index}`}>
                            <ListItemButton
                              sx={{ height: "50px" }}
                              alignItems="flex-start"
                              onMouseEnter={() => handleLogHover(log.logId)}
                            >
                              <ListItemText primary={log.logData.map((data) => JSON.stringify(data)).join(", ")} />
                            </ListItemButton>
                            <Divider variant="inset" component="li" />
                          </div>
                        )
                      ))}
                    </List>
                  </Box>
                ))
              : (
                <List
                  dense={true}
                  subheader={
                    <ListSubheader component="div" id="nested-list-subheader">
                      All Logs
                      <Tooltip title="Split By Function">
                        <IconButton aria-label="delete"
                          size="small"
                          onClick={() => setSplitByFunction((prev) => !prev)}
                        >
                          <FunctionsIcon fontSize="inherit"></FunctionsIcon>
                          <Badge badgeContent={!splitByFunction ? "+" : "-"} />
                        </IconButton>
                      </Tooltip>
                    </ListSubheader>
                  }
                >
                  {filteredLogs.map((log, index) => (
                    <div key={`log-${index}`}>
                      <ListItemButton
                        sx={{ height: "50px" }}
                        alignItems="flex-start"
                        onMouseEnter={() => handleLogHover(log.logId)}>
                        <ListItemText
                          primary={log.logData.map((data) => JSON.stringify(data)).join(", ")}
                          secondary={`Function: ${log.functionName}`}
                        />
                      </ListItemButton>
                      <Divider variant="inset" component="li" />
                    </div>
                  ))}
                </List>
              )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default TerminalApp;
