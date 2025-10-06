# Edgewater Markets WebSocket Application

A real-time cryptocurrency price tracking application that displays live market data from Coinbase Pro.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ErrorBoundary/       # Error handling component
│   │   │   ├── MatchView/          # Trade history display
│   │   │   ├── PriceView/          # Real-time price display
│   │   │   ├── RetryableComponent/ # Connection retry logic
│   │   │   ├── SubscribeControl/   # Product subscription controls
│   │   │   └── SystemStatus/       # System status display
│   │   ├── context/      # React context providers
│   │   │   ├── SocketContext.tsx   # WebSocket context provider
│   │   │   └── useSocket.ts        # WebSocket hook
│   │   └── App.tsx       # Main application component
│   └── package.json      # Frontend dependencies
│
├── server/                # Backend Node.js server
│   ├── src/
│   │   ├── services/     # Core services
│   │   │   └── CoinbaseService.ts  # Coinbase WebSocket client
│   │   ├── websocket/    # WebSocket handling
│   │   │   └── WebSocketServer.ts  # Socket.IO server
│   │   ├── __tests__/   # Test files
│   │   └── index.ts      # Server entry point
│   └── package.json      # Backend dependencies
```

## Features

- Real-time cryptocurrency price updates
- Live trade history
- Product subscription management
- System status monitoring
- Error boundary protection
- Automatic connection retry
- WebSocket error handling

## Prerequisites

- Node.js (>= 14.0.0)
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

## Running the Application

1. Start the backend server:

```bash
cd server
npm run dev
```

2. Start the frontend application:

```bash
cd client
npm run dev
```

The application will be available at http://localhost:5173

## Development

### Backend Components

1. **CoinbaseService (server/src/services/CoinbaseService.ts)**

   - Connects to Coinbase Pro WebSocket feed
   - Handles market data subscriptions
   - Processes real-time updates
   - Implements error handling and reconnection logic

2. **WebSocketServer (server/src/websocket/WebSocketServer.ts)**
   - Manages client connections using Socket.IO
   - Handles client subscriptions
   - Broadcasts market data to subscribed clients
   - Implements error handling

### Frontend Components

1. **SocketContext (client/src/context/SocketContext.tsx)**

   - Provides WebSocket connection context
   - Manages connection state
   - Handles reconnection logic

2. **ErrorBoundary (client/src/components/ErrorBoundary/)**

   - Catches and handles React component errors
   - Provides fallback UI for errors
   - Supports error recovery

3. **RetryableComponent (client/src/components/RetryableComponent/)**

   - Implements automatic retry logic
   - Handles connection failures
   - Provides exponential backoff

4. **PriceView (client/src/components/PriceView/)**

   - Displays real-time price updates
   - Shows bid/ask prices
   - Updates in real-time

5. **MatchView (client/src/components/MatchView/)**

   - Shows recent trades
   - Displays trade size and price
   - Updates in real-time

6. **SubscribeControl (client/src/components/SubscribeControl/)**

   - Manages product subscriptions
   - Handles subscription state
   - Provides user controls

7. **SystemStatus (client/src/components/SystemStatus/)**
   - Shows connection status
   - Displays subscription status
   - Updates in real-time

## Testing

The project includes comprehensive test suites for both backend and frontend components.

Run backend tests:

```bash
cd server
npm test
```

Generate test coverage report:

```bash
npm run test:coverage
```

## Error Handling

The application implements multiple levels of error handling:

1. **Backend**

   - WebSocket connection error handling
   - Message parsing error handling
   - Client connection error handling

2. **Frontend**
   - React Error Boundaries
   - Connection retry logic
   - Fallback UI for errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
