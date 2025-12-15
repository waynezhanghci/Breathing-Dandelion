export class MotionService {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stream: MediaStream | null = null;
  private prevFrame: ImageData | null = null;
  private isReady: boolean = false;
  
  // Downsampling for performance
  private readonly width = 64;
  private readonly height = 48;

  constructor() {
    this.video = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 }
        } 
      });
      this.video.srcObject = this.stream;
      this.video.play();
      
      await new Promise<void>((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });
      this.isReady = true;
    } catch (error) {
      console.error("Error accessing camera:", error);
      throw error;
    }
  }

  // Returns a value between -1 (left) and 1 (right) indicating movement center
  getHorizontalMotion(): number {
    if (!this.isReady || this.video.paused || this.video.ended) return 0;

    // Draw current video frame to small canvas
    this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
    const currentFrame = this.ctx.getImageData(0, 0, this.width, this.height);
    
    if (!this.prevFrame) {
      this.prevFrame = currentFrame;
      return 0;
    }

    let motionSumX = 0;
    let motionPixelCount = 0;
    const threshold = 20; // Sensitivity for pixel change

    const data = currentFrame.data;
    const prevData = this.prevFrame.data;

    for (let i = 0; i < data.length; i += 4) {
      // Simple RGB difference
      const rDiff = Math.abs(data[i] - prevData[i]);
      const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
      const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
      
      if (rDiff + gDiff + bDiff > threshold * 3) {
        // Pixel changed significantly
        const pixelIndex = i / 4;
        const x = pixelIndex % this.width;
        
        // Accumulate X coordinate of motion
        motionSumX += x;
        motionPixelCount++;
      }
    }

    this.prevFrame = currentFrame;

    if (motionPixelCount > 10) { // Noise filter
      const avgX = motionSumX / motionPixelCount;
      // Normalize to -1 to 1 (Mirrored because it's a selfie camera usually)
      // If user moves head RIGHT (screen left), x is low. 
      // width/2 is center.
      // (avgX - 32) / 32 -> -1 to 1
      // Multiply by -1 to mirror correctly for intuitive "follow me" feel
      return -1 * ((avgX - (this.width / 2)) / (this.width / 2));
    }

    return 0;
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.video.pause();
    this.video.srcObject = null;
  }
}