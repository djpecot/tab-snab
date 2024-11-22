# Tab Snab

Tab Snab is a Chrome extension that provides real-time audio transcription for any tab using Rev.ai's speech-to-text API. It creates a draggable overlay displaying live transcriptions directly on the webpage you're viewing.

## Features

- Real-time audio transcription using Rev.ai
- Draggable transcription overlay on the webpage
- Estimated wait time notifications
- Auto-downloading of completed transcriptions
- Persistent capture state across browser sessions
- Clean UI with start/stop controls

## Implementation Details

### Core Components

1. **Content Script (content.js)**
   - Manages the transcription overlay UI
   - Handles real-time transcription display
   - Provides draggable interface
   - Manages popup notifications

2. **Background Script (background.js)**
   - Controls tab management
   - Handles extension state
   - Coordinates component communication
   - Manages storage operations

3. **Options Page (options.js)**
   - Implements audio capture logic
   - Manages Rev.ai WebSocket connection
   - Handles audio processing and resampling
   - Provides transcription download functionality

4. **Popup Interface (popup.js)**
   - Provides user controls
   - Manages capture state
   - Coordinates with background processes

## Setup Instructions

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the project directory

## Usage

1. Click the Tab Snab extension icon
2. Click "Start Capture" to begin transcription
3. Drag the transcription overlay to your preferred position
4. Click "Stop Capture" when finished

## Requirements

- Google Chrome browser
- Rev.ai API token
- Active internet connection

## Technical Notes

- Audio is captured at 44.1kHz and resampled to 16kHz for Rev.ai
- Transcription data is processed in real-time
- Transcriptions are automatically saved as text files
- The extension maintains state across browser sessions

## Limitations

- Requires active internet connection
- Depends on Rev.ai service availability
- Only works with tabs that have audio content
- May impact system performance during capture

## Privacy Note

Audio data is processed through Rev.ai's servers. Please review Rev.ai's privacy policy for more information about data handling and storage.