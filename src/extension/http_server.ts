
import type { Server } from "http";
import express from "express";

export class LogHttpServer {
  private app: express.Express;
  private port: number;
  private server: Server | null = null; // Store the HTTP server instance

  constructor(port: number = 9678) {
    this.port = port;
    this.app = express();
    this.app.use(express.json()); // Middleware to parse JSON requests
  }

  public start(): void {
    // Define the log route to accept POST requests
    this.app.post("/logs", (req, res) => {
      if (req.body && req.body.logs) {
      } else {
      }
      res.sendStatus(200);
    });

    // Start the HTTP server and store the instance
    this.server = this.app.listen(this.port, () => {
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
      });
      this.server = null;
    }
  }
}
