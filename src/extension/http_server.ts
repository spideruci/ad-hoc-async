import { type Server } from "http";
import * as vscode from "vscode";
import express from "express";

export class LogHttpServer {
  private app: express.Express;
  private port: number;
  private server: Server | null = null; // Store the HTTP server instance
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, port: number = 9678) {
    this.context = context;
    this.port = port;
    this.app = express();
    this.app.use(express.json()); // Middleware to parse JSON requests
  }

  public start(): void {
    // Define the log route to accept POST requests
    this.app.post("/logs", (req, res) => {
      if (req.body) {
        this.broadcastLog(req.body);
      }
      res.sendStatus(200);
    });

    // Start the HTTP server and store the instance
    this.server = this.app.listen(this.port, () => {
      // console.log(`Server is listening on port ${this.port}`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        // console.log("Server stopped");
      });
      this.server = null;
    }
  }

  private broadcastLog(log: any): void {
    vscode.commands.executeCommand("co-debugger.broadcastLog", log);
  }
}