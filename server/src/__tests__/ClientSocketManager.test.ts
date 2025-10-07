import { Server as HttpServer } from "http";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { createServer } from "http";
import ClientSocketManager from "../websocket/clientSocketManager";
import EventEmitter from "events";

// Define the mock class outside the jest.mock call
class MockCoinbaseService extends EventEmitter {
  constructor() {
    super();
    this.subscribeToProducts = jest.fn();
    this.getAvailableProducts = jest.fn().mockReturnValue(["BTC-USD"]);
    this.close = jest.fn();
  }

  subscribeToProducts: jest.Mock;
  getAvailableProducts: jest.Mock;
  close: jest.Mock;
}

// Set up the mock
jest.mock("../services/coinbaseService", () => ({
  __esModule: true,
  default: MockCoinbaseService,
}));

jest.setTimeout(10000); // Increase test timeout to 10 seconds

describe("ClientSocketManager", () => {
  let httpServer: HttpServer;
  let wsServer: ClientSocketManager;
  let clientSocket: ClientSocket;
  let mockCoinbaseService: MockCoinbaseService;
  const PORT = 3003; // Define constant port

  beforeAll((done) => {
    // Create HTTP server and WebSocket manager
    httpServer = createServer();
    wsServer = new ClientSocketManager(httpServer);
    mockCoinbaseService = (wsServer as any).coinbaseService;

    // Start server and create client connection with increased timeout
    const server = httpServer.listen(PORT, () => {
      clientSocket = Client(`http://localhost:${PORT}`, {
        transports: ["websocket"],
        reconnection: false,
        timeout: 10000,
      });

      // Wait for client to connect
      clientSocket.once("connect", () => {
        done();
      });
    });

    // Handle server errors
    server.once("error", (err) => {
      console.error("Server error:", err);
      done(err);
    });
  });

  afterAll((done) => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }

    // Clean up server
    if (wsServer) {
      (wsServer as any).io.close();
    }

    httpServer.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("connection handling", () => {
    it("should handle client connection", (done) => {
      clientSocket.on("serviceStatus", (status: { status: string }) => {
        expect(status.status).toBeDefined();
        done();
      });
    });

    it("should handle client disconnection", (done) => {
      const newClient = Client(`http://localhost:${PORT}`, {
        transports: ["websocket"],
        reconnection: false,
      });

      newClient.on("connect", () => {
        newClient.disconnect();
        setTimeout(done, 100);
      });
    });
  });

  describe("subscription management", () => {
    it("should handle product subscription", (done) => {
      clientSocket.emit("subscribe", { productId: "BTC-USD" });

      clientSocket.on("subscribed", (data: { productId: string }) => {
        expect(data.productId).toBe("BTC-USD");
        done();
      });
    });

    it("should handle product unsubscription", (done) => {
      clientSocket.emit("unsubscribe", { productId: "BTC-USD" });

      clientSocket.on("unsubscribed", (data: { productId: string }) => {
        expect(data.productId).toBe("BTC-USD");
        done();
      });
    });
  });

  describe("market data handling", () => {
    it("should receive channel updates after subscription", (done) => {
      clientSocket.emit("subscribe", { productId: "BTC-USD" });

      interface Channel {
        id: string;
        status: string;
        subscribers: number;
        name: string;
        lastUpdate: string;
      }

      clientSocket.on("channelUpdate", (channels: Channel[]) => {
        const btcChannel = channels.find((c: Channel) => c.id === "BTC-USD");
        expect(btcChannel).toBeDefined();
        expect(btcChannel?.status).toBe("subscribed");
        expect(btcChannel?.subscribers).toBeGreaterThan(0);
        done();
      });
    });

    it("should update channel status after unsubscription", (done) => {
      // First subscribe
      clientSocket.emit("subscribe", { productId: "BTC-USD" });

      // Then unsubscribe
      clientSocket.emit("unsubscribe", { productId: "BTC-USD" });

      interface Channel {
        id: string;
        status: string;
        subscribers: number;
        name: string;
        lastUpdate: string;
      }

      clientSocket.on("channelUpdate", (channels: Channel[]) => {
        const btcChannel = channels.find((c: Channel) => c.id === "BTC-USD");
        expect(btcChannel).toBeDefined();
        expect(btcChannel?.status).toBe("available");
        expect(btcChannel?.subscribers).toBe(0);
        done();
      });
    });
  });

  describe("error handling", () => {
    it("should handle invalid subscription requests", (done) => {
      clientSocket.emit("subscribe", { productId: null });

      clientSocket.on("error", (error: { message: string }) => {
        expect(error.message).toBeDefined();
        done();
      });
    });

    it("should handle service errors", (done) => {
      clientSocket.on("serviceError", (error: { message: string }) => {
        expect(error.message).toBeDefined();
        done();
      });

      // Service errors are emitted from CoinbaseService
      // which is mocked in our tests
      // The error will be emitted when CoinbaseService emits an error
    });
  });
});
