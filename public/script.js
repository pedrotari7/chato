const socket = io.connect("http://localhost:9000/");
const videoGrid = document.getElementById("video-grid");

const myPeer = new Peer(undefined, {
  host: "localhost",
  port: 9000,
  path: "peerjs",
  proxied: true,
});

const myVideo = document.createElement("video");
myVideo.muted = true;

const peers = {};

myPeer.on("open", (id) => {
  console.log("open", id);

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      addVideoStream(myVideo, stream);

      myPeer.on("call", (call) => {
        console.log("call", call);
        call.answer(stream);
        const video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
          console.log("stream", userVideoStream);

          addVideoStream(video, userVideoStream);
        });
      });

      socket.on("user-connected", (userId) => {
        console.log("user-connected", userId, peers);
        connectToNewUser(userId, stream);
      });
    });

  socket.on("user-disconnected", (userId) => {
    if (peers[userId]) peers[userId].close();
  });

  socket.emit("join-room", id);
});

function connectToNewUser(userId, stream) {
  console.log("connectToNewUser", userId, stream);
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Video Selection

const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");

navigator.mediaDevices
  .enumerateDevices()
  .then(gotDevices)
  .then(getStream)
  .catch(handleError);

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

function gotDevices(deviceInfos) {
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === "audioinput") {
      option.text =
        deviceInfo.label || "microphone " + (audioSelect.length + 1);
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || "camera " + (videoSelect.length + 1);
      videoSelect.appendChild(option);
    }
  }
}

function getStream() {
  if (window.stream) {
    window.stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }

  const constraints = {
    audio: {
      deviceId: { exact: audioSelect.value },
    },
    video: {
      deviceId: { exact: videoSelect.value },
    },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(gotStream)
    .catch(handleError);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  myVideo.srcObject = stream;
}

function handleError(error) {
  console.error("Error: ", error);
}
