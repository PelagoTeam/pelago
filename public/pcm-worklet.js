// /public/pcm-worklet.js
class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options?.processorOptions?.targetSampleRate || 16000;
    this.buf = [];
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0]; // mono
    const inRate = sampleRate;
    const ratio = inRate / this.targetRate;
    for (let i = 0; i < ch.length; i += ratio) {
      const s = Math.max(-1, Math.min(1, ch[Math.floor(i)] || 0));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      this.buf.push(int16 | 0);
    }
    // 20ms @16kHz = 320 samples
    const FRAME = 320;
    while (this.buf.length >= FRAME) {
      const chunk = this.buf.splice(0, FRAME);
      const bytes = new ArrayBuffer(chunk.length * 2);
      const view = new DataView(bytes);
      for (let i = 0; i < chunk.length; i++)
        view.setInt16(i * 2, chunk[i], true);
      this.port.postMessage(bytes);
    }
    return true;
  }
}
registerProcessor("pcm-worklet", PCMWorklet);
