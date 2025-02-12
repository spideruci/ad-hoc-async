import type { TSESTree } from "@typescript-eslint/typescript-estree";

export interface VSCodeState {
    language: string;
}

export type ToVSCodeMessage = {
    command: "save";
    text: string;
} | { command: "requestAST" } | { command: "ready" };

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
};


export type Log = {
    filename: string;
    function: string;
    lineNumber: number;
    timestamp: number;
    functionKey: number;
    type: "statement";
} | {
    filename: string;
    function: string;
    lineNumber: number;
    timestamp: number;
    functionKey: number;
    logData: never[];
    type: "console.log";
} | {
    type: "branch";
    filename: string;
    function: string;
    functionKey: number;
    lineNumber: number;
    timestamp: number;
    branchType: string;
    condition: string;
};