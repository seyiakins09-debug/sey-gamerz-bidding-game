# SEY GAMERZ — Bidding Arena

A standalone multiplayer bidding game. It is not connected to Billionaire Battle or a shared player dashboard.

## Game rules implemented
- Host creates a room and receives a Room Key.
- Players join before the host starts, using nickname and their own starting game-coin amount.
- Players cannot join after the game starts.
- Host is a spectator and cannot bid.
- Starting bid: 100,000 coins.
- Fixed 30-second timer for every round; bids do not reset the timer.
- Players bid from their own device. Every bid must exceed the current high bid and cannot exceed the bidder's available balance.
- At zero seconds, the highest bidder wins automatically and their bid is deducted immediately.
- After winner announcement, the actual item value is revealed to everyone. It is not credited to the player.
- Host clicks NEXT ROUND to start the next fixed 30-second round.
- 10 sets × 10 rounds = 100 rounds. The game automatically ends after Set 10, Round 10.

## Run locally
Requires Node.js 18 or newer.

1. Extract the ZIP.
2. Open a terminal in the extracted folder.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000`

For real multiplayer testing, the host and players must access the same deployed server URL from their own devices. `localhost` only works on the same device.

## Deploy
Deploy this folder as a Node web service on a hosting provider that supports Node.js and WebSockets (for example Render).
- Build command: `npm install`
- Start command: `npm start`
- Ensure WebSocket connections are supported.
- This project uses in-memory rooms: active rooms and game state reset if the server restarts. This version does not persist rooms between restarts.

## Notes
- Coins are game-room coins, not BLC.
- This standalone version has no player account system, no overall dashboard, and no financial profit/loss calculations.
- The host is identified by the socket that created the room. If the host disconnects or refreshes, the current host session cannot be resumed in this version; create a new room.
