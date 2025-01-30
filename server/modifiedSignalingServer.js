const WebSocket = require('ws');
const server = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

let senders = [];  // Store sender connections
let receivers = []; // Store receiver connections

server.on('connection', (socket) => {
    socket.on('message', (message) => {
        const data = JSON.parse(message.toString());

        if (data.role === "sender") {
            senders.push(socket);
            console.log("New sender connected.");
        } else if (data.role === "receiver") {
            receivers.push(socket);
            console.log("New receiver connected.");

            senders.forEach(sender => {
                sender.send(JSON.stringify({
                    offer: sender.offer,
                    mediaConfig: sender.mediaConfig // Send mediaConfig to the receiver
                }));
            });
        } else if (data.offer) {
            socket.offer = data.offer; // Store sender's offer
            socket.mediaConfig = data.mediaConfig; // Store the sender's mediaConfig

            // Forward the offer and mediaConfig to all receivers
            receivers.forEach(receiver => {
                receiver.send(JSON.stringify({
                    offer: data.offer,
                    mediaConfig: data.mediaConfig // Include mediaConfig with the offer
                }));
            });
        } else if (data.answer) {
            senders.forEach(sender => {
                sender.send(JSON.stringify({ answer: data.answer }));
            });
        } else if (data.iceCandidate) {
            senders.forEach(sender => sender.send(JSON.stringify({ iceCandidate: data.iceCandidate })));
            receivers.forEach(receiver => receiver.send(JSON.stringify({ iceCandidate: data.iceCandidate })));
        }
    });

    socket.on('close', () => {
        senders = senders.filter(s => s !== socket);
        receivers = receivers.filter(r => r !== socket);
        console.log("Client disconnected.");
    });
});
