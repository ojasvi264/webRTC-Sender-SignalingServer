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
        } 
        if (data.offer) {
            socket.offer = data.offer; // Store sender's offer
            socket.mediaConfig = data.mediaConfig; // Store the sender's mediaConfig
            receivers.forEach(receiver => {
                receiver.send(JSON.stringify({
                    senderName: data.name,
                    senderId: data.senderId,
                    offer: data.offer,
                    mediaConfig: data.mediaConfig // Include mediaConfig with the offer
                }));
            });
        } else if (data.answer) {
            senders.forEach(sender => {
                sender.send(JSON.stringify({ answer: data.answer }));
            });
        } else if (data.iceCandidate) {
            senderId = data.senderId;
            // console.log(data.iceCandidate);
            if(senderId){
                receivers.forEach(receiver => receiver.send(JSON.stringify({ iceCandidate: data.iceCandidate, senderId: senderId})));               
            } 
            else {
                // console.log(data);
                senders.forEach(sender => sender.send(JSON.stringify({ iceCandidate: data.iceCandidate })));
            }
        }
    });

    socket.on('close', () => {
        senders = senders.filter(s => s !== socket);
        receivers = receivers.filter(r => r !== socket);
        console.log("Client disconnected.");
    });
});
