export class MediaHandler {
    audio?: MediaStreamAudioTrack;
    video?: MediaStreamVideoTrack;
    stream: MediaStream;
  
    constructor() {
      this.stream = new MediaStream();
    }
  
    async getUserMedia(constraint: MediaStreamConstraints): Promise<MediaStream> {
      return navigator.mediaDevices.getUserMedia(constraint);
    }
  
    async acquireAudio(): Promise<MediaStreamAudioTrack> {
      const tracks = await this.getUserMedia({
        audio: true,
      });
      const atracks = tracks.getAudioTracks();
      if (atracks.length === 0) {
        throw new Error('failed to acquire audio track');
      }
      this.audio = atracks[0];
      this.audio.onended = () => {
        this.stream.removeTrack(this.audio!);
        this.audio = undefined;
      };
      this.stream.addTrack(this.audio);
      return this.audio;
    }
  
    // 获取当前屏幕的录制
    async acquireVideo(): Promise<MediaStreamVideoTrack> {
      const tracks = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1080,
          height: 720,
        },
      });
      const vtracks = tracks.getVideoTracks();
      if (vtracks.length === 0) {
        throw new Error('failed to acquire video track');
      }
      this.video = vtracks[0];
      this.video.onended = () => {
        this.stream.removeTrack(this.video!);
        this.video = undefined;
      };
      this.stream.addTrack(this.video);
      return this.video;
    }
  
    // 获取摄像头录制
    async acquireCamera(): Promise<MediaStreamVideoTrack> {
      const tracks = await this.getUserMedia({
        video: {
          width: 1080,
          height: 720,
        },
      });
      const vtracks = tracks.getVideoTracks();
      if (vtracks.length === 0) {
        throw new Error('failed to acquire video track');
      }
      this.video = vtracks[0];
      this.video.onended = () => {
        this.stream.removeTrack(this.video!);
        this.video = undefined;
      };
      this.stream.addTrack(this.video);
      return this.video;
    }
  }
  