export class AudioService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3; // Make values react a bit faster to drops, but smoothing helps stability
      
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }

  getVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume
    let sum = 0;
    const length = this.dataArray.length;
    // Blowing typically dominates low-mid frequencies, but wind noise on mic is broad.
    // We sum all but with a higher divisor to lower sensitivity.
    for (let i = 0; i < length; i++) {
      sum += this.dataArray[i];
    }
    
    const average = sum / length;
    
    // Normalize.
    // Increased divisor from 100 to 140 to make it less sensitive.
    // You now need to blow harder/closer to reach > 0.6
    let volume = average / 140;
    
    // Noise gate: if it's too quiet, ignore it completely to prevent jitter
    if (volume < 0.1) volume = 0;
    
    return Math.min(volume, 1);
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}