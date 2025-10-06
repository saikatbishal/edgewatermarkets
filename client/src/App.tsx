import { useState, useEffect } from "react";
import { SocketProvider } from "./context/SocketContext";
import { useSocket } from "./context/useSocket";
import SubscribeControl from "./components/SubscribeControl/SubscribeControl";
import PriceView from "./components/PriceView/PriceView";
import MatchView from "./components/MatchView/MatchView";
import SystemStatus from "./components/SystemStatus/SystemStatus";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary";
import RetryableComponent from "./components/RetryableComponent/RetryableComponent";
import "./App.css";

interface PriceData {
  productId: string;
  bid: number;
  ask: number;
  timestamp: string;
}

interface Trade {
  productId: string;
  id: string;
  price: number;
  size: number;
  side: "buy" | "sell";
  timestamp: string;
}

interface Channel {
  id: string;
  name: string;
  status: "subscribed" | "available";
  subscribers: number;
  lastUpdate: string;
}

interface ServiceStatus {
  status: "connected" | "disconnected";
  timestamp: string;
}

interface ProductData {
  priceData: PriceData;
  trades: Trade[];
  isSubscribed: boolean;
}

function AppContent() {
  const { socket, isConnected } = useSocket();
  const [productData, setProductData] = useState<Record<string, ProductData>>({
    "BTC-USD": {
      priceData: {
        productId: "BTC-USD",
        bid: 0,
        ask: 0,
        timestamp: new Date().toISOString(),
      },
      trades: [],
      isSubscribed: false,
    },
    "ETH-USD": {
      priceData: {
        productId: "ETH-USD",
        bid: 0,
        ask: 0,
        timestamp: new Date().toISOString(),
      },
      trades: [],
      isSubscribed: false,
    },
    "XRP-USD": {
      priceData: {
        productId: "XRP-USD",
        bid: 0,
        ask: 0,
        timestamp: new Date().toISOString(),
      },
      trades: [],
      isSubscribed: false,
    },
    "LTC-USD": {
      priceData: {
        productId: "LTC-USD",
        bid: 0,
        ask: 0,
        timestamp: new Date().toISOString(),
      },
      trades: [],
      isSubscribed: false,
    },
  });
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (data: PriceData) => {
      setProductData((prev) => ({
        ...prev,
        [data.productId]: {
          ...prev[data.productId],
          priceData: data,
        },
      }));
    };

    const handleTrade = (trade: Trade) => {
      setProductData((prev) => ({
        ...prev,
        [trade.productId]: {
          ...prev[trade.productId],
          trades: [trade, ...prev[trade.productId].trades].slice(0, 100),
        },
      }));
    };

    const handleChannelUpdate = (channelData: Channel[]) => {
      setChannels(channelData);
      // Update subscription status in productData
      setProductData((prev) => {
        const updated = { ...prev };
        channelData.forEach((channel) => {
          if (updated[channel.id]) {
            updated[channel.id] = {
              ...updated[channel.id],
              isSubscribed: channel.status === "subscribed",
            };
          }
        });
        return updated;
      });
    };

    const handleServiceStatus = (status: ServiceStatus) => {
      console.log("Service status update:", status);
    };

    const handleServiceError = (error: string) => {
      console.error("Service error:", error);
    };

    socket.on("priceUpdate", handlePriceUpdate);
    socket.on("trade", handleTrade);
    socket.on("channelUpdate", handleChannelUpdate);
    socket.on("serviceStatus", handleServiceStatus);
    socket.on("serviceError", handleServiceError);

    return () => {
      socket.off("priceUpdate", handlePriceUpdate);
      socket.off("trade", handleTrade);
      socket.off("channelUpdate", handleChannelUpdate);
      socket.off("serviceStatus", handleServiceStatus);
      socket.off("serviceError", handleServiceError);
    };
  }, [socket]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Market Data Dashboard</h1>
        <div
          className={`connection-status ${
            isConnected ? "connected" : "disconnected"
          }`}
        >
          Status: {isConnected ? "Connected" : "Disconnected"}
        </div>
      </header>

      <main className="app-content">
        <div className="crypto-grid">
          {Object.entries(productData).map(([productId, data]) => (
            <div key={productId} className="crypto-card">
              <h2>{productId}</h2>
              <div className="card-content">
                <div className="control-section">
                  <SubscribeControl
                    isSubscribed={data.isSubscribed}
                    onSubscribe={() => {
                      if (socket) {
                        socket.emit("subscribe", { productId });
                        setProductData((prev) => ({
                          ...prev,
                          [productId]: {
                            ...prev[productId],
                            isSubscribed: true,
                          },
                        }));
                      }
                    }}
                    onUnsubscribe={() => {
                      if (socket) {
                        socket.emit("unsubscribe", { productId });
                        setProductData((prev) => ({
                          ...prev,
                          [productId]: {
                            ...prev[productId],
                            isSubscribed: false,
                          },
                        }));
                      }
                    }}
                  />
                </div>

                <div className="data-section">
                  <div className="price-section">
                    <h3>Price</h3>
                    <PriceView data={data.priceData} />
                  </div>

                  <div className="trades-section">
                    <h3>Recent Trades</h3>
                    <MatchView trades={data.trades} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="status-section">
          <SystemStatus
            channels={channels.map((ch) => ({
              id: ch.id,
              name: ch.name,
              status: ch.status === "subscribed" ? "connected" : "disconnected",
              lastUpdate: ch.lastUpdate,
            }))}
          />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SocketProvider>
        <RetryableComponent maxRetries={5} retryDelay={1000}>
          <AppContent />
        </RetryableComponent>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
