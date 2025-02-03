const fps = document.getElementById("fps")?.value || 30;
const maxVideoBitrate = document.getElementById("maxVideoBitrate")?.value || 500000;
const maxAudioBitrate = document.getElementById("maxAudioBitrate")?.value || 500000;
const width = document.getElementById("width")?.value || 1280;
const height = document.getElementById("height")?.value || 720;
const audioCodec = document.getElementById("audioCodec")?.value || "audio/opus";
const videoCodec = document.getElementById("videoCodec")?.value || "video/VP8";
const echoCancellation = document.getElementById("echoCancellation")?.checked || false;

const senderName = document.getElementById("name") || "Sender1";
const senderId = `sender-${Math.random().toString(36).substring(2, 10)}`;

let peerConnection;

async function openConfiguredCamera() {
  const senderVideo = document.getElementById("senderVideo");

  try {
    // const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    const mediaConstraints = {
      video: {
        width: parseInt(width, 10) || 1280,
        height: parseInt(height, 10) || 720,
        frameRate: parseInt(fps, 10) || 30,
      },

      audio: {
        echoCancellation: echoCancellation,
      },
    };
    // console.log(mediaConstraints);
    const localStream = await navigator.mediaDevices.getUserMedia( mediaConstraints );
    senderVideo.srcObject = localStream;
    console.log("Local stream obtained.", localStream);

    peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    const supportsSetCodecPreferences = window.RTCRtpTransceiver && "setCodecPreferences" in window.RTCRtpTransceiver.prototype;

    if (supportsSetCodecPreferences) {
      peerConnection.getTransceivers().forEach((transceiver) => {
        if (transceiver.sender && transceiver.sender.track) {
          const kind = transceiver.sender.track.kind;
          let codecs = RTCRtpSender.getCapabilities(kind).codecs;
          const bitrateParams = transceiver.sender.getParameters();
          if (!bitrateParams.encodings) {
            bitrateParams.encodings = [{}];
          }
          if (kind == "audio") {
            //Assign Max Audio Bitrate
            bitrateParams.encodings[0].maxBitrate = maxAudioBitrate || 500000; // 500 kbps
            transceiver.sender.setParameters(bitrateParams);
            console.log(`Max Audio Bitrate is set to: ${bitrateParams.encodings[0].maxBitrate}`);

            //Assign Audio Codec
            const preferredAudioCodec = codecs.find((c) => c.mimeType == audioCodec);
            if (preferredAudioCodec) {
              transceiver.setCodecPreferences([preferredAudioCodec]);
              console.log(`Preferred Audio Codec: ${preferredAudioCodec.mimeType}`);
            } else {
              console.error("Selected Audio Codec not found!");
            }
          }
          if (kind == "video") {
            //Assign Max Video Bitrate
            bitrateParams.encodings[0].maxBitrate = maxVideoBitrate || 500000; // 500 kbps
            transceiver.sender.setParameters(bitrateParams);
            console.log(`Max Video Bitrate is set to: ${bitrateParams.encodings[0].maxBitrate}`);

            //Assign Video Codec
            const preferredVideoCodec = codecs.find((c) => c.mimeType == videoCodec);
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
  } catch (error) {
    console.log("Error occured during configuration.", error);
  }

  const mediaConfigurationDiv = document.getElementById("mediaConfiguration");
  const configureButton = document.getElementById("configure");
  const connectButton = document.getElementById("connect");
  mediaConfigurationDiv.classList.remove("d-block");
  mediaConfigurationDiv.classList.add("d-none");
  configureButton.classList.remove("d-block");
  configureButton.classList.add("d-none");
  connectButton.classList.remove("d-none");
  connectButton.classList.add("d-block");
}

async function startCall() {
  if (!peerConnection) {
    console.error("PeerConnection is not initialized!");
    return;
  }

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

  signalingServer.onopen = async () => {
    // Wait until after the offer is created
    const offer = await peerConnection.createOffer();
    console.log("SDP offer created:", offer);
    await peerConnection.setLocalDescription(offer);
    console.log("Local description set with offer.");

    // Include media configurations (codec, bitrate, etc.)
    const mediaConfig = {
      fps: fps,
      maxAudioBitrate: maxAudioBitrate,
      maxVideoBitrate: maxVideoBitrate,
      audioCodec: audioCodec,
      videoCodec: videoCodec,
      width: width,
      height: height,
      echoCancellation: echoCancellation,
    };

    // Send offer and media configuration to signaling server
    signalingServer.send(
      JSON.stringify({
        name: senderName,
        senderId: senderId,
        role: "sender",
        offer: offer,
        mediaConfig: mediaConfig,
      })
    );
    console.log("Offer and media configuration sent to signaling server.");

    // Handle ICE candidate events
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate generated:", event.candidate);
        signalingServer.send(
          JSON.stringify({ iceCandidate: event.candidate, senderId: senderId })
        );
      } else {
        console.log("ICE candidate gathering completed.");
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state changed:",
        peerConnection.iceConnectionState
      );
    };

  };

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
    // if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      try {
        peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
        console.log("ICE candidate added to connection.");
      } catch (error) {
        console.error("Error while adding ICE candidate:", error);
      }
    // }else {
    //   console.error("Remote description is not set. Cannot add ICE candidate.");
    // }
  }

  signalingServer.onerror = (error) => {
    console.error("Signaling server error:", error);
  };

  signalingServer.onclose = () => {
    console.log("Signaling server connection closed.");
  };
}
