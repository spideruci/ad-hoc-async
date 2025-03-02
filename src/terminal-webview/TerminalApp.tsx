import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import Collapse from "@mui/material/Collapse";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Card, CardActions, CardContent, Typography } from "@mui/material";
import ReactJson from "react-json-view";
import type {
  ConsoleLog,
  Log,
  ToEditorMessage,
  ToVSCodeMessage,
  VSCodeState,
} from "../types/message";
import { DynamicCallTree } from "./dynamic-call-tree";

interface FunctionAndCallContent {
  logs: Array<ConsoleLog | null>;
  type: "function" | "call" | "allLog";
  currentUUID?: string;
  functionName: string;
  firstLogTimestamp: number;
  listName: string;
}
interface FunctionAndCallMap {
  [functionNameOrKey: string]: FunctionAndCallContent;
}
const darkTheme = createTheme({
  palette: { mode: "dark" },
});

function customSortForFlatFunctionAndCallMap(
  a: [string, FunctionAndCallContent],
  b: [string, FunctionAndCallContent]
) {
  const functionNameComparison = a[1].functionName!.localeCompare(
    b[1].functionName!
  );
  if (functionNameComparison === 0) {
    if (a[1].currentUUID && !b[1].currentUUID) {
      return 1;
    }
    if (b[1].currentUUID && !a[1].currentUUID) {
      return -1;
    }
    return a[1].firstLogTimestamp - b[1].firstLogTimestamp;
  }
  return functionNameComparison;
}
const vscode = acquireVsCodeApi<VSCodeState, ToVSCodeMessage>();

const TerminalApp = (): JSX.Element => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [metaLogs, setMetaLogs] = useState<Log[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [splitBySpecificFunctionSet, setSplitBySpecficFunctionSet] = useState(
    new Set<string>()
  );
  const [rowOpenSet, setRowOpenSet] = useState(new Set<number>());
  const [splitBySpecificFunctionCallSet, setSplitBySpecificFunctionCallSet] =
    useState(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);

  const handleLogHover = useCallback((logId: string): void => {
    vscode.postMessage({ command: "logHover", logId });
  }, []);

  const handleScroll = useCallback((): void => {
    if (!listRef.current) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollTop + clientHeight >= scrollHeight - 5);
  }, [listRef]);

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
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    vscode.postMessage({ command: "ready" });
    window.addEventListener("message", handleMessage);
    return (): void => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const handleSpecificFunctionCallSplits = useCallback(
    (functionName: string, currentUUID: string) => {
      setSplitBySpecificFunctionCallSet((prev) => {
        const key = `${functionName}-${currentUUID}`;
        const newSet = new Set([...prev, key]);
        if (prev.has(key)) {
          newSet.delete(key);
        }
        return newSet;
      });
    },
    [setSplitBySpecificFunctionCallSet]
  );

  const handleSpecificFunctionSplits = useCallback(
    (functionName: string) => {
      setSplitBySpecficFunctionSet((prev) => {
        const newSet = new Set([...prev, functionName]);
        if (prev.has(functionName)) {
          newSet.delete(functionName);
        }
        return newSet;
      });
    },
    [setSplitBySpecficFunctionSet]
  );
  const handleListItemExpandClick = useCallback(
    (rowIndex: number) => {
      setRowOpenSet((prev) => {
        const newSet = new Set([...prev, rowIndex]);
        if (prev.has(rowIndex)) {
          newSet.delete(rowIndex);
        }
        return newSet;
      });
    },
    [setRowOpenSet]
  );

  const functionLogMap = useMemo(() => {
    const filteredLogs = logs.filter((log) => log.type === "console.log");
    const functionLogMap: FunctionAndCallMap = {};
    let currentLength = 0;
    filteredLogs
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((v) => {
        const key = `${v.functionName}-${v.currentUUID}`;

        if (splitBySpecificFunctionCallSet.has(key)) {
          if (!functionLogMap[key]) {
            functionLogMap[key] = {
              listName: `${v.functionName}-${v.currentUUID}`,
              logs: new Array(currentLength).fill(null),
              type: "call",
              currentUUID: v.currentUUID,
              functionName: v.functionName,
              firstLogTimestamp: v.timestamp,
            };
          }
          Object.keys(functionLogMap).map((k) => {
            functionLogMap[k].logs.push(k === key ? v : null);
          });
        } else if (splitBySpecificFunctionSet.has(v.functionName)) {
          if (!functionLogMap[v.functionName]) {
            functionLogMap[v.functionName] = {
              listName: `${v.functionName}`,
              logs: new Array(currentLength).fill(null),
              type: "function",
              functionName: v.functionName,
              firstLogTimestamp: v.timestamp,
            };
          }
          Object.keys(functionLogMap).map((k) => {
            functionLogMap[k].logs.push(k === v.functionName ? v : null);
          });
        } else {
          if (!functionLogMap["allLog"]) {
            functionLogMap["allLog"] = {
              functionName: "*ALLLOG*",
              listName: "All Logs",
              logs: new Array(currentLength).fill(null),
              type: "allLog",
              firstLogTimestamp: v.timestamp,
            };
          }
          Object.keys(functionLogMap).map((k) => {
            functionLogMap[k].logs.push(k === "allLog" ? v : null);
          });
        }
        currentLength++;
      }, {} as Record<string, (ConsoleLog | null)[]>);

    return functionLogMap;
  }, [logs, splitBySpecificFunctionCallSet, splitBySpecificFunctionSet]);

  const functionCallTree = useMemo(() => {
    const callTree = new DynamicCallTree();
    for (let log of metaLogs) {
      callTree.appendNode(log);
    }
    return callTree;
  }, [metaLogs]);
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
              flexWrap: "nowrap",
            }}
          >
            {Object.entries(functionLogMap)
              .sort(customSortForFlatFunctionAndCallMap)
              .map(([k, functionLogs]) => (
                <Box key={k} sx={{ minWidth: "400px", flex: "1" }}>
                  <List
                    dense={true}
                    subheader={
                      <ListSubheader>
                        {functionLogs.listName}{" "}
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              functionLogs.type !== "allLog" &&
                              functionLogs.type === "function"
                            ) {
                              handleSpecificFunctionSplits(
                                functionLogs.functionName
                              );
                            } else {
                              handleSpecificFunctionCallSplits(
                                functionLogs.functionName,
                                functionLogs.currentUUID!
                              );
                            }
                          }}
                        >
                          <KeyboardArrowLeftIcon fontSize="inherit" />
                        </IconButton>
                      </ListSubheader>
                    }
                  >
                    {functionLogs.logs.map((log, index) =>
                      log === null ? (
                        <div
                          key={`empty-${functionLogs.functionName}-${index}`}
                          style={{
                            height: rowOpenSet.has(index) ? "80px" : "30px",
                          }}
                        >
                          <Divider />
                        </div>
                      ) : (
                        <div key={`log-${functionLogs.functionName}-${index}`}>
                          <ListItemButton
                            sx={{ height: "30px" }}
                            onClick={() => handleListItemExpandClick(index)}
                          >
                            <ListItemText
                              primary={String(log.logData[0]).substring(0, 100)}
                            />
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (functionLogs.type === "allLog") {
                                  handleSpecificFunctionSplits(
                                    log.functionName
                                  );
                                } else {
                                  handleSpecificFunctionCallSplits(
                                    log.functionName,
                                    log.currentUUID
                                  );
                                }
                              }}
                            >
                              <KeyboardArrowRightIcon fontSize="inherit" />
                            </IconButton>
                          </ListItemButton>
                          <Collapse
                            in={rowOpenSet.has(index)}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Card
                              sx={{ height: "auto" }}
                              onMouseEnter={() => handleLogHover(log.logId)}
                            >
                              <CardContent>
                                {log.logData.map((data) => {
                                  if (typeof data === "object") {
                                    return (
                                      <ReactJson
                                        theme={"monokai"}
                                        onEdit={false}
                                        onAdd={false}
                                        onDelete={false}
                                        collapseStringsAfterLength={100}
                                        collapsed={true}
                                        src={data}
                                      />
                                    );
                                  } else {
                                    return (
                                      <Typography variant="body2">
                                        {String(data)}
                                      </Typography>
                                    );
                                  }
                                })}
                              </CardContent>
                            </Card>
                          </Collapse>
                          <Divider />
                        </div>
                      )
                    )}
                  </List>
                </Box>
              ))}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default TerminalApp;
