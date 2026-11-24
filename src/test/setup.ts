import '@testing-library/jest-dom';

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
