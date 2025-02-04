const WebSocket = require('ws');
const server = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

const senders = new Map();  // Maps senderId → WebSocket
const receivers = new Set(); // Store receiver connections

server.on('connection', (socket) => {
    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.role === "sender") {
                senders.set(data.senderId, socket);
                console.log(`Sender connected: ${data.senderId}`);
            } else if (data.role === "receiver") {
                receivers.add(socket);
                console.log("New receiver connected.");
            }

            if (data.offer) {
                // Send offer only to receivers
                receivers.forEach(receiver => {
                    receiver.send(JSON.stringify({
                        senderName: data.name,
                        senderId: data.senderId,
                        offer: data.offer,
                    }));
                });
            } else if (data.answer) {
                // Find the correct sender and send the answer
                const senderSocket = senders.get(data.senderId);
                if (senderSocket) {
                    senderSocket.send(JSON.stringify({ answer: data.answer }));
                }
            } else if (data.iceCandidate) {
                if (data.type === "senderIceCandidate") {
                    // Forward ICE candidate to the receiver
                    receivers.forEach(receiver => {
                        receiver.send(JSON.stringify({
                            iceCandidate: data.iceCandidate,
                            senderId: data.senderId,
                        }));
                    });
                } else if(data.type === "receiverIceCandidate"){
                    // Forward ICE candidate to the correct sender
                    const senderSocket = senders.get(data.senderId);
                    if (senderSocket) {
                        senderSocket.send(JSON.stringify({ iceCandidate: data.iceCandidate }));
                    }
                }
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    socket.on('close', () => {
        // Remove from senders or receivers
        for (const [senderId, senderSocket] of senders) {
            if (senderSocket === socket) {
                senders.delete(senderId);
                console.log(`Sender disconnected: ${senderId}`);
                break;
            }
        }

        if (receivers.has(socket)) {
            receivers.delete(socket);
            console.log("Receiver disconnected.");
        }
    });

    socket.on('error', (err) => {
        console.error("WebSocket error:", err);
    });
});

console.log("WebSocket Signaling Server is running on ws://0.0.0.0:8080");
