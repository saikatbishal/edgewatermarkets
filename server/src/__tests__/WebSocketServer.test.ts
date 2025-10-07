import { Server } from "socket.io";
import { io as Client } from "socket.io-client";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

describe("WebSocketServer", () => {
  let httpServer: HttpServer;
  let wsServer: SocketServer;
  let clientSocket: ReturnType<typeof Client>;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new SocketServer(httpServer);
    port = 3002; // Changed port to avoid conflicts

    // Setup socket event handlers
    wsServer.on("connection", (socket) => {
      socket.emit("welcome", { message: "Welcome to the server!" });

      socket.on("subscribe", (productId: string) => {
        if (!productId || typeof productId !== "string") {
          socket.emit("error", { message: "Invalid product ID" });
          return;
        }

        socket.join(productId);
        socket.emit("subscribed", { productId });
      });

      socket.on("unsubscribe", (productId: string) => {
        if (!productId || typeof productId !== "string") {
          socket.emit("error", { message: "Invalid product ID" });
          return;
        }

        socket.leave(productId);
        socket.emit("unsubscribed", { productId });
      });
    });

    // Start server and wait for it to be ready
    const server = httpServer.listen(port, () => {
      // Create client with increased timeout
      clientSocket = Client(`http://localhost:${port}`, {
        reconnection: false,
        timeout: 10000,
      });

      // Handle initial connection
      clientSocket.on("connect", () => {
        console.log("Client connected to server");
        done(); // Signal test setup completion
      });

      // Handle connection error
      clientSocket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        done(error); // Signal test setup failure
      });
    });
  });

  afterAll((done) => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    wsServer.close();
    httpServer.close(done);
  });

  describe("connection handling", () => {
    it("should emit welcome message on client connection", (done) => {
      const newClient = Client(`http://localhost:${port}`, {
        reconnection: false,
        timeout: 10000,
      });

      newClient.on("welcome", (data) => {
        expect(data.message).toBe("Welcome to the server!");
        newClient.disconnect();
        done();
      });

      newClient.on("connect_error", (error) => {
        newClient.disconnect();
        done(error);
      });
    });

    it("should handle client disconnection", (done) => {
      const newClient = Client(`http://localhost:${port}`, {
        reconnection: false,
      });

      newClient.on("connect", () => {
        newClient.disconnect();
        // Add a small delay to allow disconnect to process
        setTimeout(() => {
          expect(newClient.connected).toBe(false);
          done();
        }, 100);
      });
    });
  });

  describe("subscription management", () => {
    it("should handle product subscription", (done) => {
      const productId = "BTC-USD";
      clientSocket.emit("subscribe", productId);
      clientSocket.on("subscribed", (data) => {
        expect(data.productId).toBe(productId);
        done();
      });
    });

    it("should handle product unsubscription", (done) => {
      const productId = "BTC-USD";
      clientSocket.emit("unsubscribe", productId);
      clientSocket.on("unsubscribed", (data) => {
        expect(data.productId).toBe(productId);
        done();
      });
    });
  });

  describe("error handling", () => {
    it("should handle invalid subscription requests", (done) => {
      clientSocket.emit("subscribe", null);
      clientSocket.on("error", (error) => {
        expect(error.message).toBe("Invalid product ID");
        done();
      });
    });

    it("should handle invalid message format", (done) => {
      clientSocket.emit("subscribe", { invalid: "format" });
      clientSocket.on("error", (error) => {
        expect(error.message).toBe("Invalid product ID");
        done();
      });
    });
  });
});
