async function initializeSetup(){
  const fps = document.getElementById("fps").value;
  const maxVideoBitrate = document.getElementById("maxVideoBitrate").value;
  const maxAudioBitrate = document.getElementById("maxAudioBitrate").value;
  const width = document.getElementById("width").value;
  const height = document.getElementById("height").value;
  const audioCodec = document.getElementById("audioCodec").value;
  const videoCodec = document.getElementById("videoCodec").value;
  const echoCancellation = document.getElementById("echoCancellation").checked;
  const senderVideo = document.getElementById("senderVideo");

  const senderName = document.getElementById("name")?.value || "Sender1";
  const senderId = `sender-${Math.random().toString(36).substring(2, 10)}`;

  const signalingServer = new WebSocket("ws://localhost:8080");

  signalingServer.onmessage = (message) => {
    const data = JSON.parse(message.data);
    console.log("Received signaling message:", data);

    if (data.answer) {
      handleAnswer(data.answer);
    } 
    if (data.iceCandidate) {
      handleICECandidate(data.iceCandidate);
    }
  };

  const peerConnection = new RTCPeerConnection();

  // Handle ICE candidate events
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE candidate generated:", event.candidate);
      signalingServer.send(JSON.stringify({ iceCandidate: event.candidate, senderId: senderId, type: "senderIceCandidate" }));
    }
  };

  const mediaConstraints = {
    video: {
      width: parseInt(width, 10),
      height: parseInt(height, 10),
      frameRate: parseInt(fps, 10),
    },

    audio: {
      echoCancellation: echoCancellation,
    },
  };
  const localStream = await navigator.mediaDevices.getUserMedia( mediaConstraints );
  senderVideo.srcObject = localStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const mediaConfig = {
    fps: fps,
    maxAudioBitrate: maxAudioBitrate,
    maxVideoBitrate: maxVideoBitrate,
    audioCodec: audioCodec,
    videoCodec: videoCodec,
  };

  await setCodecBitrate(peerConnection, mediaConfig);

  const offer = await peerConnection.createOffer();
  console.log("SDP offer created:", offer);
  await peerConnection.setLocalDescription(offer);
  console.log("Local description set with offer.");

  

  // Send offer and media configuration to signaling server
  signalingServer.send(
    JSON.stringify({
      name: senderName,
      senderId: senderId,
      role: "sender",
      offer: offer,
    })
  );
  console.log("Offer and media configuration sent to signaling server.");

  function handleAnswer(answer) {
    console.log("Received SDP answer:", answer);
    try {
      // Check if peer connection is in the correct state to set remote description
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Remote description set with answer.");
    } catch (error) {
      console.error("Error while handling answer:", error);
    }
  }

  function handleICECandidate(iceCandidate) {
    console.log("Received ICE candidate:", iceCandidate);
    if (!peerConnection) {
      console.error("peerConnection is not initialized. Cannot add ICE candidate.");
      return;
    }
    try {
      peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
      console.log("ICE candidate added to connection.");
    } catch (error) {
      console.error("Error while adding ICE candidate:", error);
    }
  }

  signalingServer.onerror = (error) => {
    console.error("Signaling server error:", error);
  };

  signalingServer.onclose = () => {
    console.warn("Signaling server closed. Attempting to reconnect...");
    setTimeout(startCall, 2000);
  };
}

async function setCodecBitrate(peerConnection, mediaConfig){
  const supportsSetCodecPreferences = window.RTCRtpTransceiver && "setCodecPreferences" in window.RTCRtpTransceiver.prototype;
  if (supportsSetCodecPreferences) {
    peerConnection.getTransceivers().forEach((transceiver) => {
      if (transceiver.sender && transceiver.sender.track) {
        const kind = transceiver.sender.track.kind;
        let codecs = RTCRtpSender.getCapabilities(kind).codecs || [];
        console.log(codecs);
        const bitrateParams = transceiver.sender.getParameters();
        if (!bitrateParams.encodings) {
          bitrateParams.encodings = [{}];
        }
        if (kind == "audio") {
          //Assign Max Audio Bitrate
          bitrateParams.encodings[0].maxBitrate = mediaConfig.maxAudioBitrate || 500000; // 500 kbps
          transceiver.sender.setParameters(bitrateParams);
          console.log(`Max Audio Bitrate is set to: ${bitrateParams.encodings[0].maxBitrate}`);

          //Assign Audio Codec
          const preferredAudioCodec = codecs.find((c) => c.mimeType == mediaConfig.audioCodec);
          if (preferredAudioCodec) {
            transceiver.setCodecPreferences([preferredAudioCodec]);
            console.log(`Preferred Audio Codec: ${preferredAudioCodec.mimeType}`);
          } else {
            console.error("Selected Audio Codec not found!");
          }
        }
        if (kind == "video") {
          //Assign Max Video Bitrate
          bitrateParams.encodings[0].maxBitrate = mediaConfig.maxVideoBitrate || 500000; // 500 kbps
          transceiver.sender.setParameters(bitrateParams);
          console.log(`Max Video Bitrate is set to: ${bitrateParams.encodings[0].maxBitrate}`);

          //Assign Video Codec
          const preferredVideoCodec = codecs.find((c) => c.mimeType == mediaConfig.videoCodec);
          if (preferredVideoCodec) {
            transceiver.setCodecPreferences([preferredVideoCodec]);
            console.log(`Preferred Video Codec: ${preferredVideoCodec.mimeType}`);
          } else {
            console.error("Selected Video Codec not found!");
          }
        }
      }
    });
  } else {
    console.warn("Codec Preferences is not supported in this browser.");
  }
}