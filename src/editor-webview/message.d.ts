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
    command: "load",
    text: string,
    language: string,
}