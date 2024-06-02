// @ts-ignore embed the certificate fingerprint using bundler
import fingerprintHex from '../../cert/localhost.hex?raw';
// 注意这里所有的端口号都是 4443 
import { Logger } from "./logger";
import "./style.css"
import { Transport } from "./transport";
import { WorkerData } from "./media-worker"
// import MediaWorker from "./media-worker/worker?worker";
import { StatsReport } from './metrics';
import { MediaHandler } from './gum';
import { VideoSendStream } from './streams/send_stream';
import { VideoRecvStream } from './streams/recv_stream';

var acquireCamera = document.querySelector<HTMLButtonElement>("#acquire-camera")!;
var acquireScreen = document.querySelector<HTMLButtonElement>("#acquire-screen")!;
var cancelAcquisition = document.querySelector<HTMLButtonElement>("#cancel-acquisition")!;
var initTransport = document.querySelector<HTMLButtonElement>("#init-transport")!;
var initEncoder = document.querySelector<HTMLButtonElement>("#init-encoder")!;
var initDecoder = document.querySelector<HTMLButtonElement>("#init-decoder")!;
var output = document.querySelector<HTMLDivElement>(".output")!;
var framesCount = document.querySelector<HTMLDivElement>(".frames-count")!;

// Convert the hex to binary.
let fingerprint: number[] = [];
for (let c = 0; c < fingerprintHex.length - 1; c += 2) {
  fingerprint.push(parseInt(fingerprintHex.substring(c, c + 2), 16));
}

var outputTrack: WritableStream<VideoFrame>;
// var mediaWorker: Worker | undefined;
var buffer: VideoFrame[] = [];
var transport: Transport[] = [];
var videoSendStream: VideoSendStream;
const logger = new Logger(output)
const mediaHandler = new MediaHandler()

// Helper function to enable/disable buttons
const setButtonState = (button: HTMLButtonElement, enabled: boolean) => {
  button.disabled = !enabled;
  button.style.opacity = enabled ? "1" : "0.5";
}

// Disable other buttons when one is active
const disableOtherButtons = (activeButton: HTMLButtonElement) => {
  const buttons = [acquireCamera, acquireScreen, cancelAcquisition];
  buttons.forEach(button => {
    if (button !== activeButton) {
      setButtonState(button, false);
    }
  });
}

// Enable all buttons
const enableAllButtons = () => {
  const buttons = [acquireCamera, acquireScreen, cancelAcquisition];
  buttons.forEach(button => {
    setButtonState(button, true);
  });
}

// Clear video and reset media handler
const clearVideoAndReset = () => {
  if (mediaHandler.video) {
    mediaHandler.video.stop();
    mediaHandler.video = undefined;
    mediaHandler.stream = new MediaStream();
  }
  clearVideo(".local");
  enableAllButtons();
  logger.write("media acquisition canceled.");
}

// acquire camera media track
acquireCamera.addEventListener('click', async () => {
  disableOtherButtons(acquireCamera);
  clearVideoAndReset();
  logger.write("acquiring camera video track...");
  try {
    await mediaHandler.acquireCamera();
    appendVideo(".local", mediaHandler.stream);
    logger.write("media stream acquired. stream id:", mediaHandler.stream.id);
  } catch (err) {
    logger.write(`Error: ${err}`);
    enableAllButtons();
  }
});

// acquire screen media track
acquireScreen.addEventListener('click', async () => {
  disableOtherButtons(acquireScreen);
  clearVideoAndReset();
  logger.write("acquiring screen video track...");
  try {
    await mediaHandler.acquireVideo();
    appendVideo(".local", mediaHandler.stream);
    logger.write("media stream acquired. stream id:", mediaHandler.stream.id);
  } catch (err) {
    logger.write(`Error: ${err}`);
    enableAllButtons();
  }
});

// cancel acquisition
cancelAcquisition.addEventListener('click', () => {
  clearVideoAndReset();
});

// Init transport for connecting webtransport
initTransport.addEventListener('click', async () => {
  logger.write('connecting webtransport..')
  console.debug('cert hex', fingerprintHex, "cert", fingerprint)
  transport[0] = new Transport('send', "https://localhost:4443/publish?stream_id=1", new Uint8Array(fingerprint))
  await transport[0].init()
  logger.write('webtransport connected...')
})

// init encoder for encoding
initEncoder.addEventListener('click', async () => {
  logger.write("starting encoding...")
  videoSendStream = new VideoSendStream(mediaHandler.video!, transport[0])
  logger.write("encoding in progress...")
  await videoSendStream.start()
  logger.write('encoding stopped')
})

// init decoder for decoding
initDecoder.addEventListener('click', async () => {
  logger.write('starting decoding...')
  transport[1] = new Transport('recv', "https://localhost:4443/subscribe?stream_id=1", new Uint8Array(fingerprint))
  await transport[1].init()
  const recvStream = new VideoRecvStream(
    videoSendStream.ssrc,
    videoSendStream.encoder.decoderConfig!,
    transport[1],
  )
  const generator = recvStream.track.track;
  appendVideo('.remote', new MediaStream([generator as any]))
  videoSendStream.encoder.get_keyframe()
})

const startTrackWriterWorker = async () => {
  while (true) {
    const frame = buffer.pop()
    if (!frame) {
      await new Promise(r => setTimeout(r, 10))
      continue
    }
    const writer = outputTrack.getWriter()
    await writer.ready
    await writer.write(frame)
    frame?.close()
    await writer.ready
    writer.releaseLock()
  }
}

const appendVideo = (selector: string, stream: MediaStream) => {
  const videoNode = document.createElement("video")
  videoNode.setAttribute("width", "1280")
  videoNode.setAttribute("height", "720")
  videoNode.className = "my-2"
  videoNode.autoplay = true
  videoNode.srcObject = stream
  document.querySelector<HTMLDivElement>(selector)!.append(videoNode)
}

const clearVideo = (selector: string) => {
  const videoContainer = document.querySelector<HTMLDivElement>(selector)!;
  videoContainer.innerHTML = '';
}
