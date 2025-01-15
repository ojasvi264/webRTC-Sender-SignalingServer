  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

  // Store the senders and the receiver
  let senders = []; // Array to store sender sockets
  let receiverSocket = null;

  wss.on('connection', (ws) => {
    // console.log('Client connected');

    // Check if it's the first connection (receiver)
    if (!receiverSocket) {
      receiverSocket = ws;
      console.log('Receiver connected');
    } else {
      // Otherwise, it's a sender
      senders.push(ws);
      console.log('Sender connected');
    }

    // Handle messages from clients (senders or receiver)
    ws.on('message', (message) => {
      const messageString = Buffer.isBuffer(message) ? message.toString() : message;
      try {
        const parsedMessage = JSON.parse(messageString);

        if (parsedMessage.offer) {
          // If a sender sends an offer, forward it to the receiver
          if (ws !== receiverSocket) {
            console.log("Forwarding offer to receiver:", parsedMessage);
            receiverSocket.send(JSON.stringify({ offer: parsedMessage.offer, senderId: senders.indexOf(ws) }));
          }
        }

        if (parsedMessage.answer) {
          // If the receiver sends an answer, forward it to the corresponding sender
          if (ws === receiverSocket) {
            const senderSocket = senders[parsedMessage.senderId];
            if (senderSocket) {
              console.log("Forwarding answer to sender:", parsedMessage);
              senderSocket.send(JSON.stringify({ answer: parsedMessage.answer }));
            }
          }
        }

        if (parsedMessage.iceCandidate) {
          // Forward ICE candidates from any peer to the appropriate peer
          if (ws === receiverSocket) {
            senders.forEach((senderSocket) => {
              senderSocket.send(JSON.stringify({ iceCandidate: parsedMessage.iceCandidate }));
            });
          } else {
            receiverSocket.send(JSON.stringify({ iceCandidate: parsedMessage.iceCandidate }));
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      if (ws === receiverSocket) {
        console.log('Receiver disconnected');
        receiverSocket = null;
      } else {
        const senderIndex = senders.indexOf(ws);
        if (senderIndex !== -1) {
          console.log('Sender disconnected');
          senders.splice(senderIndex, 1);
        }
      }
    });
  });
