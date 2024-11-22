// Wait for the DOM content to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById("startCapture");
  const stopButton = document.getElementById("stopCapture");

  // Add click event listeners to the buttons
  startButton.addEventListener("click", startCapture);
  stopButton.addEventListener("click", stopCapture);

  // Retrieve capturing state from storage on popup open
  chrome.storage.local.get("capturingState", ({ capturingState }) => {
    if (capturingState && capturingState.isCapturing) {
      toggleCaptureButtons(true);
    } else {
      toggleCaptureButtons(false);
    }
  });

  // Function to handle the start capture button click event
  async function startCapture() {
    // Ignore click if the button is disabled
    if (startButton.disabled) {
      return;
    }

    // Get the current active tab
    const currentTab = await getCurrentTab();

    chrome.runtime.sendMessage(
        { 
            action: "startCapture", 
            tabId: currentTab.id,
            revAiToken: '02YNHWnpptcf8S8gntcfKVdpO9aIMtTm1D2guAlsSzEJRbKZF0CGU7gIJsgHnY6nI4yi230f1wKfPFgaqo6jV4VQLOgC8' // You'll need to add a way to configure this
        }, 
        () => {
            chrome.storage.local.set({ capturingState: { isCapturing: true } }, () => {
                toggleCaptureButtons(true);
            });
        }
    );
  }

  // Function to handle the stop capture button click event
  function stopCapture() {
    if (stopButton.disabled) {
      return;
    }
  
    chrome.runtime.sendMessage({ action: "stopCapture" }, () => {
      toggleCaptureButtons(false);
      chrome.storage.local.set({ 
        capturingState: { isCapturing: false } 
      });
    });
  }

  // Function to get the current active tab
  async function getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0]);
      });
    });
  }

  // Function to toggle the capture buttons based on the capturing state
  function toggleCaptureButtons(isCapturing) {
    startButton.disabled = isCapturing;
    stopButton.disabled = !isCapturing;
    startButton.classList.toggle("disabled", isCapturing);
    stopButton.classList.toggle("disabled", !isCapturing);
  }


  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "toggleCaptureButtons") {
      toggleCaptureButtons(request.isCapturing);
      chrome.storage.local.set({ 
        capturingState: { isCapturing: request.isCapturing } 
      });
    }
  });
  
});
