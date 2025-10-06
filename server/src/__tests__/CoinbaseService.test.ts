jest.mock('ws');
import WebSocket from 'ws';
import CoinbaseService from '../services/coinbaseService';

describe('CoinbaseService', () => {
  let coinbaseService: CoinbaseService;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let mockEmitter: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket = new WebSocket('') as jest.Mocked<WebSocket>;
    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWebSocket);
    mockWebSocket.on = jest.fn();
    mockWebSocket.send = jest.fn();
    coinbaseService = new CoinbaseService();
    mockEmitter = jest.spyOn(coinbaseService, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEmitter.mockRestore();
  });

  describe('initialization', () => {
    it('should establish WebSocket connection when instantiated', () => {
      expect(WebSocket).toHaveBeenCalledWith('wss://ws-feed.exchange.coinbase.com');
    });

    it('should setup websocket event handlers', () => {
      expect(mockWebSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('websocket event handling', () => {
    it('should emit connected status on websocket open', () => {
      const openHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'open'
      )?.[1] as Function;

      openHandler();

      expect(mockEmitter).toHaveBeenCalledWith('status', {
        status: 'connected',
        timestamp: expect.any(String)
      });
    });

    it('should handle level2 price updates', () => {
      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockTickerUpdate = {
        type: 'ticker',
        product_id: 'BTC-USD',
        best_bid: '50000',
        best_ask: '50100',
        time: '2025-10-06T10:00:00.000Z'
      };

      messageHandler(JSON.stringify(mockTickerUpdate));

      expect(mockEmitter).toHaveBeenCalledWith(
        'priceUpdate',
        {
          productId: 'BTC-USD',
          bid: 50000,
          ask: 50100,
          timestamp: '2025-10-06T10:00:00.000Z'
        }
      );
    });

    it('should handle trade matches', () => {
      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      const mockMatch = {
        type: 'match',
        product_id: 'BTC-USD',
        trade_id: '123',
        maker_order_id: '456',
        taker_order_id: '789',
        side: 'buy',
        size: '1.5',
        price: '50000',
        time: '2025-10-06T10:00:00.000Z'
      };

      messageHandler(JSON.stringify(mockMatch));

      expect(mockEmitter).toHaveBeenCalledWith(
        'trade',
        expect.objectContaining({
          productId: 'BTC-USD',
          id: '123',
          price: 50000,
          size: 1.5,
          side: 'buy',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should emit error on websocket error', (done) => {
      const errorHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as Function;

      coinbaseService.on('error', (err) => {
        expect(err).toEqual({
          type: 'connection_error',
          message: 'WebSocket connection error',
          details: {
            code: undefined,
            message: 'WebSocket error',
            syscall: undefined
          }
        });
        done();
      });

      const mockError = new Error('WebSocket error');
      errorHandler(mockError);
    });

    it('should handle malformed messages', (done) => {
      const messageHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1] as Function;

      coinbaseService.on('error', (err) => {
        expect(err).toEqual({
          type: 'parse_error',
          message: 'Failed to parse WebSocket message',
          details: 'Unexpected token \'i\', "invalid json" is not valid JSON'
        });
        done();
      });

      messageHandler('invalid json');
    });
  });
});