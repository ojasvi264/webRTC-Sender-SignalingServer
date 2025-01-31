# WebRTC Signaling Server and Sender

This is a Sender side system, which will open camera and show the live feed, with signaling server.

## Working Mechanism
1. Initially, the **Signaling Server**should be initialized with `cd server` and `node signalingServer.js`. 
2. Then you can connect this Sender either serving locally or using file path.

> [!IMPORTANT]
> Since the first connection made to the **Signaling Server** is assigned as a * *Receiver* *. So connect the **Sender** only after making the **Receiver** connection.
