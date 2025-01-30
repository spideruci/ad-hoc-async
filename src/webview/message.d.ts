
export interface VSCodeState {
    language: string;
}

export type ToVSCodeMessage = {
    command: "save";
    text: string;
} | { command: "requestAST" } | { command: "ready" };