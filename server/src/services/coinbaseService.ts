import { WebSocket } from "ws";
import EventEmitter from "events";

interface WebSocketError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
}

interface CoinbaseMessage {
  type: string;
  [key: string]: any;
}

class CoinbaseService extends EventEmitter {
  private ws: WebSocket | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly SUPPORTED_PRODUCTS = [
    "BTC-USD",
    "ETH-USD",
    "XRP-USD",
    "LTC-USD",
  ];
  private subscribedProducts: string[] = [];
  private readonly INITIAL_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly PING_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");

      this.ws.on("open", () => {
        console.log("Connected to Coinbase WebSocket");
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        this.emit("status", {
          status: "connected",
          timestamp: new Date().toISOString(),
        });

        // Resubscribe to all previous products if any
        if (this.subscribedProducts.length > 0) {
          this.subscribe(this.subscribedProducts);
        }

        this.setupPingInterval();
      });

      this.ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data.toString()) as CoinbaseMessage;
          this.handleMessage(message);
        } catch (error) {
          const err = error as Error;
          console.error("Error parsing message:", err.message);
          this.emit("error", {
            type: "parse_error",
            message: "Failed to parse WebSocket message",
            details: err.message,
          });
        }
      });

      this.ws.on("close", (code: number, reason: string) => {
        console.log(
          `Disconnected from Coinbase WebSocket: ${code} - ${reason}`
        );
        this.emit("status", {
          status: "disconnected",
          code,
          reason: reason.toString(),
        });
        this.cleanup();
        this.scheduleReconnect();
      });

      this.ws.on("error", (error: WebSocketError) => {
        console.error("WebSocket error:", error);
        this.emit("error", {
          type: "connection_error",
          message: "WebSocket connection error",
          details: {
            code: error.code,
            message: error.message,
            syscall: error.syscall,
          },
        });
        this.cleanup();
        this.scheduleReconnect();
      });
    } catch (error) {
      const err = error as Error;
      console.error("Error creating WebSocket connection:", err.message);
      this.emit("error", {
        type: "initialization_error",
        message: "Failed to create WebSocket connection",
        details: err.message,
      });
      this.scheduleReconnect();
    }
  }

  private subscribe(products?: string[]): void {
    if (!this.ws) {
      console.error("WebSocket not initialized");
      return;
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not open, current state:", this.ws.readyState);
      return;
    }

    try {
      // If specific products are provided, validate them
      const validProducts = products
        ? products.filter((p) => this.SUPPORTED_PRODUCTS.includes(p))
        : this.SUPPORTED_PRODUCTS;

      if (validProducts.length === 0) {
        throw new Error("No valid product IDs provided");
      }

      // Update subscribed products - merge with existing subscriptions
      this.subscribedProducts = [
        ...new Set([...this.subscribedProducts, ...validProducts]),
      ];

      const subscribeMessage = {
        type: "subscribe",
        product_ids: this.subscribedProducts,
        channels: ["ticker", "matches"],
      };

      console.log("Subscribing to products:", this.subscribedProducts);
      this.ws.send(JSON.stringify(subscribeMessage));
    } catch (error) {
      const err = error as Error;
      console.error("Error subscribing:", err.message);
      this.emit("error", {
        type: "subscription_error",
        message: "Failed to subscribe to products",
        details: err.message,
      });
    }
  }

  public subscribeToProducts(products: string[]): void {
    if (!products || products.length === 0) {
      throw new Error("No product IDs provided");
    }
    this.subscribe(products);
  }

  public getAvailableProducts(): string[] {
    return [...this.SUPPORTED_PRODUCTS];
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      this.emit("error", {
        type: "max_reconnect_error",
        message: "Maximum reconnection attempts reached",
        details: `Failed to reconnect after ${this.MAX_RECONNECT_ATTEMPTS} attempts`,
      });
      return;
    }

    const delay = Math.min(
      this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );

    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`
      );
      this.connect();
    }, delay);
  }

  private handleMessage(message: CoinbaseMessage): void {
    try {
      switch (message.type) {
        case "ticker":
          if (
            !message.best_bid ||
            !message.best_ask ||
            !message.time ||
            !message.product_id
          ) {
            throw new Error("Invalid ticker message format");
          }
          this.emit("priceUpdate", {
            productId: message.product_id,
            bid: parseFloat(message.best_bid),
            ask: parseFloat(message.best_ask),
            timestamp: message.time,
          });
          break;

        case "match":
          if (
            !message.trade_id ||
            !message.price ||
            !message.size ||
            !message.side ||
            !message.time ||
            !message.product_id
          ) {
            throw new Error("Invalid match message format");
          }
          this.emit("trade", {
            productId: message.product_id,
            id: message.trade_id.toString(),
            price: parseFloat(message.price),
            size: parseFloat(message.size),
            side: message.side,
            timestamp: message.time,
          });
          break;

        case "error":
          console.error("Received error from Coinbase:", message);
          this.emit("error", {
            type: "coinbase_error",
            message: "Error from Coinbase WebSocket",
            details: message,
          });
          break;
      }
    } catch (error) {
      const err = error as Error;
      console.error("Error processing message:", err.message);
      this.emit("error", {
        type: "message_processing_error",
        message: "Error processing WebSocket message",
        details: err.message,
      });
    }
  }

  private setupPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.ping();
        } catch (error) {
          const err = error as Error;
          console.error("Error sending ping:", err.message);
          this.cleanup();
          this.scheduleReconnect();
        }
      }
    }, this.PING_INTERVAL);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }
      this.ws = null;
    }
  }

  public close(): void {
    this.reconnectAttempts = this.MAX_RECONNECT_ATTEMPTS; // Prevent further reconnection attempts
    this.cleanup();
  }
}

export default CoinbaseService;
