import EventEmitter from 'events';

class MockCoinbaseService extends EventEmitter {
  subscribeToProducts = jest.fn();
  getAvailableProducts = jest.fn().mockReturnValue(['BTC-USD']);
  close = jest.fn();
}

export default MockCoinbaseService;