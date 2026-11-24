import '@testing-library/jest-dom';

// In-memory mock for localStorage (ensures compatibility with Node 22/25 & jsdom)
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const storageInstance = new MemoryStorage();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storageInstance,
    writable: true,
    configurable: true,
  });
}

Object.defineProperty(globalThis, 'localStorage', {
  value: storageInstance,
  writable: true,
  configurable: true,
});

// Mock WebAudio API primitives for headless tests
if (typeof window !== 'undefined') {
  window.AudioContext = window.AudioContext || (class MockAudioContext {
    state = 'running';
    createGain() {
      return {
        gain: {
          value: 1,
          linearRampToValueAtTime: () => {},
          setValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        connect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createBuffer() {
      return {
        getChannelData: () => new Float32Array(100),
      };
    }
    close() {
      return Promise.resolve();
    }
  } as unknown as typeof AudioContext);
}
