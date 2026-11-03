# SEY GAMERZ Bidding Arena — Black & Gold Edition

A standalone multiplayer bidding game built with Node.js, Express and Socket.IO.

## Deploy on Render
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Render Web Service supports Socket.IO/WebSocket connections.

## Game setup
1. Host creates a room and shares the room key.
2. Players join with a nickname and their starting game coin balance.
3. Host starts the game. The host is a spectator and cannot bid.
4. The game contains 10 sets × 10 rounds (100 rounds total).

## Round rules
- Each round lasts 30 seconds; bidding does not reset the timer.
- Opening bid is 100,000 coins.
- Players bid from their own phones.
- Accepted bids reserve coins immediately and the player's available balance updates.
- When another player outbids them, the previous bidder's reserved bid is returned.
- When a player increases their own leading bid, their previous reservation is returned and the new bid is reserved.
- At timer expiry, bidding closes and the highest bidder wins. The winning bid remains deducted.
- Only after the timer expires does the game reveal the actual item value. It is not shown during bidding and is not added to a player's balance.
- The host starts the next round after the reveal. After Set 10, Round 10, the game ends automatically.

## Interface updates
- Compact host control panel with the bidding board taking the majority of the space.
- Player view is simplified to available coins, auction item visual, timer, bid field and Place Bid button.
- Player view hides room key, host status, and extra room information after joining.
- Auction item is shown using a themed icon/illustration and name. Actual value remains hidden until the countdown finishes.
- Black-and-gold responsive layout for mobile and desktop.

## Notes
- Rooms and player data are held in memory; restarting the server clears active rooms.
- Host control is tied to the host's current browser connection. If the host disconnects, create a new room.
- This version has no account login or persistent database.
