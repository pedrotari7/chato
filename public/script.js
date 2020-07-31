const videoGrid = document.getElementById('video-grid');
const myVideo = document.getElementById('my-video');

const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const socketUrl = isLocalhost ? 'http://localhost:9000/' : 'https://chato-123.herokuapp.com';

const socket = io.connect(socketUrl);

const peerConfig = isLocalhost
  ? {
      host: 'localhost',
      path: 'peerjs',
      port: 9000,
      proxied: true,
    }
  : {
      host: 'chato-123.herokuapp.com',
      secure: true,
      path: 'peerjs',
      proxied: true,
    };

let myPeer;

socket.on('connect', () => {
  myPeer = new Peer(peerConfig);

  myPeer.on('open', async (id) => {
    console.log('open', id);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    myVideo.srcObject = stream;
    myVideo.addEventListener('loadedmetadata', () => {
      myVideo.play();
    });

    myPeer.on('call', (call) => {
      console.log('call', call);
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        console.log('stream', userVideoStream);

        addVideoStream(video, userVideoStream);
      });
    });

    socket.on('user-connected', (userId) => {
      console.log('user-connected', userId);
      connectToNewUser(userId, stream);
    });

    socket.on('user-disconnected', (userId) => {
      console.log('user-disconnected', userId);
      peers[userId] && peers[userId].close();
    });

    socket.emit('join-room', id);
  });
});

myVideo.muted = true;

const peers = {};

const connectToNewUser = (userId, stream) => {
  console.log('connectToNewUser', userId);
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    console.log('new stream', userVideoStream);
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
};

const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
};

// Video Selection

const audioSelect = document.querySelector('select#audioSource');
const videoSelect = document.querySelector('select#videoSource');

navigator.mediaDevices.enumerateDevices().then(gotDevices).then(getStream).catch(handleError);

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

function gotDevices(deviceInfos) {
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || 'microphone ' + (audioSelect.length + 1);
      audioSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
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

  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  myVideo.srcObject = stream;
}

function handleError(error) {
  console.error('Error: ', error);
}
