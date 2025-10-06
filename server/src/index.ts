import express from "express";
import { createServer } from "http";
import ClientSocketManager from "./websocket/clientSocketManager";

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// Initialize WebSocket manager
const socketManager = new ClientSocketManager(server);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  socketManager.close();
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
