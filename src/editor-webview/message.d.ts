import type { TSESTree } from "@typescript-eslint/typescript-estree";

export interface VSCodeState {
    language: string;
}

export type ToVSCodeMessage = {
    command: "save";
    text: string;
} | { command: "requestAST" } | { command: "ready" };

export type ToEditorMessage = {
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
} | {
    command: "log";
    log: Log;
}

export type Log = {
    filename: string;
    function: string;
    lineNumber: number;
    timestamp: number;
    type: "statement";
} | {
    filename: string;
    function: string;
    lineNumber: number;
    timestamp: number;
    logData: never[];
    type: "console.log";
} | {
    type: "branch";
    filename: string;
    function: string;
    lineNumber: number;
    timestamp: number;
    branchType: string;
    condition: string;
};
