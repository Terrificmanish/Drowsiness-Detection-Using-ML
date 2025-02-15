let videoElement = document.getElementById("videoElement");
let predictionDiv = document.getElementById("prediction");
let alertSound = document.getElementById("alertSound");
let isDetectionRunning = false;
let isCalibrationRunning = false;
let calibrationData = [];
let lastPrediction = "";

function startDetection() {
  if (isDetectionRunning) {
    console.log("Detection is already running.");
    return;
  }

  isDetectionRunning = true;
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoElement.srcObject = stream;
      videoElement.play();
      detectFrame();
    })
    .catch((err) => console.error("Error accessing webcam:", err));
}

function stopDetection() {
  isDetectionRunning = false;
  isCalibrationRunning = false;
  videoElement.pause();
  predictionDiv.innerText = "";
}

function startCalibration() {
  if (!isDetectionRunning) {
    console.log("Start detection before calibration.");
    alert("Please start detection first.");
    return;
  }

  if (isCalibrationRunning) {
    console.log("Calibration is already running.");
    return;
  }

  isCalibrationRunning = true;
  calibrationData = [];
  let startTime = Date.now();

  function collectCalibrationData() {
    if (!isCalibrationRunning) return;

    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    let imageData = canvas.toDataURL("image/jpeg");
    sendFrameForCalibration(imageData);

    if (Date.now() - startTime > CALIBRATION_DURATION) {
      stopCalibration();
    } else {
      setTimeout(collectCalibrationData, 1000);
    }
  }

  collectCalibrationData();
}

function stopCalibration() {
  isCalibrationRunning = false;
}

function sendFrameForCalibration(imageData) {
  fetch("/calibrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageData }),
  })
  .then((response) => response.json())
  .then((data) => {
    if (data.ear) {
      calibrationData.push(data.ear);
    }
  })
  .catch((error) => console.error("Error during calibration:", error));
}

function detectFrame() {
  if (!isDetectionRunning) {
    return;
  }

  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  let imageData = canvas.toDataURL("image/jpeg");
  sendFrameToServer(imageData);

  setTimeout(detectFrame, 100);
}

function sendFrameToServer(imageData) {
  fetch("/process_video", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageData }),
  })
    .then((response) => response.json())
    .then((data) => {
      predictionDiv.innerText = data.prediction;

      if (data.prediction === "Alert" && lastPrediction !== "Alert") {
        alertSound.play();
      }

      lastPrediction = data.prediction;
    })
    .catch((error) => console.error("Error while processing video:", error));
}
