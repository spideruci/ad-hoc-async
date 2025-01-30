/* eslint-disable @typescript-eslint/no-explicit-any */
// Declare the VS Code Webview API globally
interface VsCodeApi {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
  }
  
  declare function acquireVsCodeApi(): VsCodeApi;