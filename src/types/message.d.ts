import type { TSESTree } from "@typescript-eslint/typescript-estree";

export interface VSCodeState {
    language: string;
}

export type ToVSCodeMessage = {
    command: "save";
    text: string;
} | { command: "requestAST" } | { command: "ready" } | {
    command: "logHover",
    logId: string,
} | { command: "draggedLog", log: ConsoleLog };

export type ToEditorMessage = {
    command: "log";
    log: Log;
} | {
    command: "parsedAST";
    ast: TSESTree.Node;
    language: "javascript" | "typescript";
} | {
    command: "error";
    message: string
} | {
    command: "load";
    text: string;
    language: string;
} | { command: "draggedLog", log: ConsoleLog };

export type ConsoleLog = {
    filename: string;
    functionName: string;
    lineNumber: number;
    timestamp: number;
    currentUUID: string;
    logData: never[];
    logId: string;
    type: "console.log";
    consoleLogText: string;
};
export type Log = ({
    type: "statement";
} | ConsoleLog | {
    type: "branch";
    branchType: string;
    condition: string;
} | {type: "functionStart" | "functionEnd"}) & {   
    lineNumber: number;
    currentUUID: string;
    parentUUID: string;
    timestamp: number;
    programUUID: string;
    filename: string;
    functionName: string;
};