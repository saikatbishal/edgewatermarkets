import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import CoinbaseService from "../services/coinbaseService";

interface SubscriptionInfo {
  clientId: string;
  products: Set<string>;
}

class ClientSocketManager {
  private io: Server;
  private coinbaseService: CoinbaseService;
  private subscriptions = new Map<string, Set<string>>(); // productId -> Set of client IDs
  private clientProducts = new Map<string, Set<string>>(); // clientId -> Set of product IDs

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:5173", // Vite's default port
        methods: ["GET", "POST"],
      },
    });

    this.coinbaseService = new CoinbaseService();

    // Listen for Coinbase service status changes
    this.coinbaseService.on("status", (status) => {
      this.io.emit("serviceStatus", status);
      this.updateChannelStatus();
    });

    this.coinbaseService.on("error", (error) => {
      console.error("Coinbase service error:", error);
      this.io.emit("serviceError", error);
    });

    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      this.clientProducts.set(socket.id, new Set());

      socket.on("subscribe", ({ productId }) => {
        if (!productId) return;

        // Update client's subscribed products
        const clientSubs = this.clientProducts.get(socket.id) || new Set();
        clientSubs.add(productId);
        this.clientProducts.set(socket.id, clientSubs);

        // Update product's subscribed clients
        const productSubs = this.subscriptions.get(productId) || new Set();
        productSubs.add(socket.id);
        this.subscriptions.set(productId, productSubs);

        // Update Coinbase subscription if this is the first client for this product
        if (productSubs.size === 1) {
          this.coinbaseService.subscribeToProducts([productId]);
        }

        this.updateChannelStatus();
      });

      socket.on("unsubscribe", ({ productId }) => {
        if (!productId) return;

        // Remove product from client's subscriptions
        const clientSubs = this.clientProducts.get(socket.id);
        if (clientSubs) {
          clientSubs.delete(productId);
        }

        // Remove client from product's subscriptions
        const productSubs = this.subscriptions.get(productId);
        if (productSubs) {
          productSubs.delete(socket.id);
          if (productSubs.size === 0) {
            // If no more clients are subscribed to this product, unsubscribe from Coinbase
            this.subscriptions.delete(productId);
            // TODO: Implement unsubscribe in CoinbaseService if needed
          }
        }

        this.updateChannelStatus();
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Clean up client's subscriptions
        const clientSubs = this.clientProducts.get(socket.id) || new Set();
        clientSubs.forEach((productId) => {
          const productSubs = this.subscriptions.get(productId);
          if (productSubs) {
            productSubs.delete(socket.id);
            if (productSubs.size === 0) {
              this.subscriptions.delete(productId);
              // TODO: Implement unsubscribe in CoinbaseService if needed
            }
          }
        });

        this.clientProducts.delete(socket.id);
        this.updateChannelStatus();
      });
    });

    // Forward Coinbase events to subscribed clients
    this.coinbaseService.on("priceUpdate", (data) => {
      const { productId } = data;
      const subscribers = this.subscriptions.get(productId);
      if (subscribers) {
        subscribers.forEach((clientId) => {
          this.io.to(clientId).emit("priceUpdate", data);
        });
      }
    });

    this.coinbaseService.on("trade", (data) => {
      const { productId } = data;
      const subscribers = this.subscriptions.get(productId);
      if (subscribers) {
        subscribers.forEach((clientId) => {
          this.io.to(clientId).emit("trade", data);
        });
      }
    });
  }

  private updateChannelStatus() {
    // Get statuses for all supported products
    const channelsStatus = this.coinbaseService
      .getAvailableProducts()
      .map((productId) => {
        const clients = this.subscriptions.get(productId) || new Set();
        return {
          id: productId,
          name: `${productId} WebSocket`,
          status: clients.size > 0 ? "subscribed" : "available",
          subscribers: clients.size,
          lastUpdate: new Date().toISOString(),
        };
      });

    this.io.emit("channelUpdate", channelsStatus);
  }

  public close() {
    this.coinbaseService.close();
    this.io.close();
  }
}

export default ClientSocketManager;
