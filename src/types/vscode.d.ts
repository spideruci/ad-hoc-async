// Declare the VS Code Webview API globally
interface VsCodeApi<State, Message> {
  postMessage: (message: Message) => void;
  getState: () => State | undefined;
  setState: (state: State) => void;
}

declare function acquireVsCodeApi<State, Message>(): VsCodeApi<State, Message>;