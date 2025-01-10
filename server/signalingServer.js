const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// Map to store connected clients by their ID
let peer1Socket = null;
let peer2Socket = null;

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Assign the client to peer1 or peer2 based on the connection order
  if (!peer1Socket) {
    peer1Socket = ws;
    console.log('Peer1 connected');
  } else if (!peer2Socket) {
    peer2Socket = ws;
    console.log('Peer2 connected');
  } else {
    console.log('Too many clients connected. Disconnecting...');
    ws.close();  // Reject connection if both peers are already connected
    return;
  }

  // When a message is received from either peer
  ws.on('message', (message) => {
    // Convert the message to a string if it's a Buffer or ArrayBuffer
    const messageString = Buffer.isBuffer(message) ? message.toString() : message;
    // Now you can parse the message as a JSON string
    try {
      const parsedMessage = JSON.parse(messageString);
      // console.log(parsedMessage);
      // Handle the parsed message as before
      if (parsedMessage.offer) {
        if (ws === peer1Socket) {
          console.log("I am here");
          peer2Socket.send(JSON.stringify(parsedMessage));
          console.log("Sent SDP offer to peer2:", parsedMessage);
        } else if (ws === peer2Socket) {
          peer1Socket.send(JSON.stringify(parsedMessage));
          console.log("Sent SDP offer to peer1:", parsedMessage);
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });


  // Handle disconnection of the clients
  ws.on('close', () => {
    if (ws === peer1Socket) {
      console.log('Peer1 disconnected');
      peer1Socket = null;
    } else if (ws === peer2Socket) {
      console.log('Peer2 disconnected');
      peer2Socket = null;
    }

    // Optionally, you can close the connection for both peers if one disconnects
    // For this, you can choose to notify the other peer that the connection has ended
  });
});
