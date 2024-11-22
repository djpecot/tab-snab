/**
 * Captures audio from the active tab in Google Chrome.
 * @returns {Promise<MediaStream>} A promise that resolves with the captured audio stream.
 */
function captureTabAudio() {
  return new Promise((resolve) => {
    chrome.tabCapture.capture(
      {
        audio: true,
        video: false,
      },
      (stream) => {
        resolve(stream);
      }
    );
  });
}

/**
 * Sends a message to a specific tab in Google Chrome.
 * @param {number} tabId - The ID of the tab to send the message to.
 * @param {any} data - The data to be sent as the message.
 * @returns {Promise<any>} A promise that resolves with the response from the tab.
 */
function sendMessageToTab(tabId, data) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, data, (response) => {
      resolve(response);
    });
  });
}

/**
 * Resamples the audio data to a target sample rate of 16kHz.
 * @param {Array|ArrayBuffer|TypedArray} audioData - The input audio data.
 * @param {number} [origSampleRate=44100] - The original sample rate of the audio data.
 * @returns {Float32Array} The resampled audio data at 16kHz.
 */
function resampleTo16kHZ(audioData, origSampleRate = 44100) {
  // Convert the audio data to a Float32Array
  const data = new Float32Array(audioData);

  // Calculate the desired length of the resampled data
  const targetLength = Math.round(data.length * (16000 / origSampleRate));

  // Create a new Float32Array for the resampled data
  const resampledData = new Float32Array(targetLength);

  // Calculate the spring factor and initialize the first and last values
  const springFactor = (data.length - 1) / (targetLength - 1);
  resampledData[0] = data[0];
  resampledData[targetLength - 1] = data[data.length - 1];

  // Resample the audio data
  for (let i = 1; i < targetLength - 1; i++) {
    const index = i * springFactor;
    const leftIndex = Math.floor(index).toFixed();
    const rightIndex = Math.ceil(index).toFixed();
    const fraction = index - leftIndex;
    resampledData[i] = data[leftIndex] + (data[rightIndex] - data[leftIndex]) * fraction;
  }

  // Return the resampled data
  return resampledData;
}

function generateUUID() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

async function startRecord(option) {
  const stream = await captureTabAudio();
  const uuid = generateUUID();

  if (stream) {
    let socket;
    let recorder;
    let context;
    let mediaStream;
    stream.oninactive = () => {
      // window.close();
    };

    // Store references globally so we can stop them later
    window.recordingSession = {
      stream,
      socket: null,
      recorder: null,
      context: null,
      mediaStream: null,
    };

    // Modified WebSocket connection for Rev AI
    socket = new WebSocket(
      `wss://api.rev.ai/speechtotext/v1/stream?` +
      `access_token=${'02YNHWnpptcf8S8gntcfKVdpO9aIMtTm1D2guAlsSzEJRbKZF0CGU7gIJsgHnY6nI4yi230f1wKfPFgaqo6jV4VQLOgC8'}&` +
      `content_type=audio/x-raw;layout=interleaved;rate=16000;format=S16LE;channels=1`
      );

    window.recordingSession.socket = socket;

    console.log('WebSocket connection created');

    let isServerReady = false;

    socket.onopen = function(e) {
        isServerReady = true;
        console.log('WebSocket connection opened');
    };

    let completeTranscript = '';
    let currentPartial = '';

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const transcribedText = data.elements.map(element => element.value).join(" ");

      if (data.type === "partial") {
        // Update only the current partial segment
        currentPartial = transcribedText.trim();
        // Display complete transcript plus current partial, with single space
        updateTranscriptionUI((completeTranscript + ' ' + currentPartial).replace(/\s+/g, ' ').trim());
      } 
      else if (data.type === "final") {
        // Add the final segment to the complete transcript, with single space
        completeTranscript = (completeTranscript + ' ' + transcribedText).replace(/\s+/g, ' ').trim();
        // Reset current partial
        currentPartial = '';
        // Display complete transcript
        updateTranscriptionUI(completeTranscript);
      }
    };

    // Add close button to the page
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close Window';
    closeButton.addEventListener('click', () => window.close());
    document.body.appendChild(closeButton);

    const audioDataCache = [];
    context = new AudioContext();
    mediaStream = context.createMediaStreamSource(stream);
    recorder = context.createScriptProcessor(4096, 1, 1);

    window.recordingSession.context = context;
    window.recordingSession.mediaStream = mediaStream;
    window.recordingSession.recorder = recorder;

    recorder.onaudioprocess = async (event) => {
      if (!context || !isServerReady) return;
      
      const inputData = event.inputBuffer.getChannelData(0);
      const audioData16kHz = resampleTo16kHZ(inputData, context.sampleRate);
      
      // Convert Float32Array to Int16Array
      const audioDataInt16 = new Int16Array(audioData16kHz.length);
      for (let i = 0; i < audioData16kHz.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData16kHz[i]));
        audioDataInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      audioDataCache.push(inputData);
      socket.send(audioDataInt16.buffer);
      console.log('Audio data sent to server');
    };
    mediaStream.connect(recorder);
    recorder.connect(context.destination);
    mediaStream.connect(context.destination);
  } else {
    window.close();
  }
}

// Add new function to stop recording
function stopRecording() {
  if (window.recordingSession) {
    const { stream, socket, recorder, context, mediaStream } = window.recordingSession;

    // Close WebSocket
    if (socket) {
      socket.close();
    }

    // Stop the audio processing
    if (recorder) {
      recorder.disconnect();
    }

    if (mediaStream) {
      mediaStream.disconnect();
    }

    // Stop all tracks in the stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (context) {
      context.close();
    }

    // Get the final transcription and download it
    chrome.storage.local.get(['currentTranscription'], (result) => {
      if (result.currentTranscription) {
        downloadTranscription(result.currentTranscription);
      }
    });

    // Clear the recording session
    window.recordingSession = null;
  }
}

/**
 * Listener for incoming messages from the extension's background script.
 * @param {Object} request - The message request object.
 * @param {Object} sender - The sender object containing information about the message sender.
 * @param {Function} sendResponse - The function to send a response back to the message sender.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { type, data } = request;

  switch (type) {
    case "start_capture":
      startRecord(data);
      break;
    case "stop_capture":
      stopRecording();
      sendResponse({ status: "stopped" });
      break;
    default:
      break;
  }

  return true;
});

function updateTranscriptionUI(text) {
  const transcriptionContainer = document.getElementById("transcription-container");
  if (!transcriptionContainer) {
    const container = document.createElement("div");
    container.id = "transcription-container";
    container.style.whiteSpace = "pre-wrap";
    container.style.padding = "20px";
    container.style.maxHeight = "500px";
    container.style.overflowY = "auto";
    document.body.appendChild(container);
  }

  transcriptionContainer.textContent = text;
  transcriptionContainer.scrollTop = transcriptionContainer.scrollHeight;
  chrome.storage.local.set({ currentTranscription: text });
}

function downloadTranscription(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `transcription-${timestamp}.txt`;
  
  chrome.downloads.download({
    url: URL.createObjectURL(blob),
    filename: filename,
    saveAs: false
  });
}