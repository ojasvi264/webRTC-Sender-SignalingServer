async function openConfiguredCamera(){
    const senderVideo = document.getElementById('senderVideo');
    const fps = document.getElementById('fps').value;
    const maxVideoBitrate = document.getElementById('maxVideoBitrate').value;
    const maxAudioBitrate = document.getElementById('maxAudioBitrate').value;
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const audioCodec = document.getElementById('audioCodec').value;
    const videoCodec = document.getElementById('videoCodec').value;
    const echoCancellation = document.getElementById('echoCancellation').checked;


    try {
        // const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        // const supportsSetCodecPreferences = window.RTCRtpTransceiver && 'setCodecPreferences' in window.RTCRtpTransceiver.prototype;
        // console.log(supportsSetCodecPreferences);
        // const {codecs} = RTCRtpReceiver.getCapabilities('video');
        // console.log(RTCRtpSender.getCapabilities("video").codecs);
        // console.log(RTCRtpSender.getCapabilities("audio").codecs);
        const mediaConstraints = {
            video: {
              width: parseInt(width, 10) || 1280,
              height: parseInt(height, 10) || 720,
              frameRate: parseInt(fps, 10) || 30, 
            },
           
            audio: {
                echoCancellation: echoCancellation,
                }
        };
        // console.log(mediaConstraints);
        const localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        senderVideo.srcObject = localStream;
        console.log("Local stream obtained.", localStream);

        const peerConnection = new RTCPeerConnection();
        // console.log(localStream.getTracks());

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        const supportsSetCodecPreferences = window.RTCRtpTransceiver && 'setCodecPreferences' in window.RTCRtpTransceiver.prototype;

        if(supportsSetCodecPreferences){
            peerConnection.getTransceivers().forEach(transceiver => {
                // console.log(transceiver);
                if(transceiver.sender && transceiver.sender.track){
                    const kind = transceiver.sender.track.kind;
                    let codecs = RTCRtpSender.getCapabilities(kind).codecs;
                    console.log(codecs);
                    if(kind == "audio"){
                        const preferredAudioCodec = codecs.find(c => c.mimeType == audioCodec);
                        // console.log(preferredAudioCodec);
                        if(preferredAudioCodec){
                            transceiver.setCodecPreferences([preferredAudioCodec]);
                            console.log(`Preferred Audio Codec: ${preferredAudioCodec.mimeType}`);
                        } else {
                            console.error("Selected Audio Codec not found!");
                        }
                    }
                    if(kind == "video"){
                        const preferredVideoCodec = codecs.find(c => c.mimeType == videoCodec);
                        // console.log(preferredVideoCodec);
                        if(preferredVideoCodec){
                            transceiver.setCodecPreferences([preferredVideoCodec]);
                            console.log(`Preferred Video Codec: ${preferredVideoCodec.mimeType}`);
                        } else {
                            console.error("Selected Video Codec not found!");
                        }
                    }
                }
            })
        }else {
            console.warn("Required Codec Preferences is not supported in this browser.");
        }

    } catch(error){
        console.log("Error occured during configuration.", error);
    }

}