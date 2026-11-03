const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.get("/health", (_, res) => res.json({ ok: true }));
const rooms = new Map();
const ROUND_SECONDS = 30, SETS = 10, ROUNDS_PER_SET = 10, STARTING_BID = 100000;
// Items include a visual symbol for a consistent auction-board illustration.
const items = [
 ["Luxury Diamond Necklace",150000,"💎"],["Designer Handbag",250000,"👜"],["Modern Living Room Set",850000,"🛋️"],["Original Abstract Painting",420000,"🖼️"],["Luxury Wristwatch",600000,"⌚"],
 ["Premium Home Theater",750000,"📺"],["Designer Fashion Collection",300000,"👗"],["Luxury Sports Car",8500000,"🏎️"],["Gold Jewelry Collection",1200000,"✨"],["Penthouse Interior Package",3200000,"🏙️"],
 ["Rare Collector Sneakers",180000,"👟"],["Luxury Dining Set",500000,"🍽️"],["Premium Laptop",350000,"💻"],["Luxury Yacht Package",12000000,"🛥️"],["Designer Sunglasses",125000,"🕶️"],
 ["Royal Bedroom Set",950000,"🛏️"],["Exclusive Sculpture",700000,"🗿"],["Luxury SUV",6500000,"🚙"],["Diamond Earrings",400000,"💎"],["Designer Couture Dress",550000,"👑"],
 ["Premium Sound System",280000,"🔊"],["Private Jet Experience",15000000,"✈️"],["Gold-Plated Art Piece",900000,"🏆"],["Luxury Office Furniture",620000,"🪑"],["Limited Edition Watch",1100000,"⌚"],
 ["High-End Camera Kit",480000,"📸"],["Classic Sports Car",7200000,"🏁"],["Luxury Perfume Collection",220000,"🧴"],["Designer Shoes Collection",350000,"👠"],["Exclusive Crystal Chandelier",800000,"💡"]
];
function makeKey(){return crypto.randomBytes(3).toString("hex").toUpperCase()}
function publicRoom(room){return {key:room.key,status:room.status,set:room.set,round:room.round,players:[...room.players.values()].map(p=>({id:p.id,nickname:p.nickname,balance:p.balance})),item:room.currentItem?{name:room.currentItem.name,icon:room.currentItem.icon,startingBid:STARTING_BID,actualValue:room.revealed?room.currentItem.value:null}:null,highestBid:room.highestBid,winner:room.winner,revealed:room.revealed,secondsLeft:room.secondsLeft,bids:room.bids,message:room.message}}
function emitRoom(room){io.to(room.key).emit("room:update",publicRoom(room))}
function stopTimer(room){if(room.timer)clearInterval(room.timer);room.timer=null}
function refundBid(room,bid){if(!bid)return;const p=room.players.get(bid.playerId);if(p)p.balance+=bid.amount}
function finishRound(room){
 if(room.status!=="running"||room.revealed)return;
 stopTimer(room);room.secondsLeft=0;room.revealed=true;
 if(room.highestBid){const winner=room.players.get(room.highestBid.playerId);if(winner){room.winner={nickname:winner.nickname,playerId:winner.id,amount:room.highestBid.amount,itemName:room.currentItem.name};room.message=`${winner.nickname} wins ${room.currentItem.name} for ${room.highestBid.amount.toLocaleString()} coins!`}}
 else {room.winner=null;room.message="No valid bids this round. The item was not sold."}
 if(room.round>=SETS*ROUNDS_PER_SET){room.status="finished";room.message=(room.winner?room.message+" ":"")+"Game complete! All 10 sets and 100 rounds have finished."}
 emitRoom(room);
}
function startRound(room){
 stopTimer(room);const total=SETS*ROUNDS_PER_SET;
 if(room.round>total){room.status="finished";room.message="Game complete! All 10 sets and 100 rounds have finished.";emitRoom(room);return}
 const [name,value,icon]=items[(room.round-1)%items.length];room.currentItem={name,value,icon};room.highestBid=null;room.bids=[];room.winner=null;room.revealed=false;room.secondsLeft=ROUND_SECONDS;room.message=`Set ${Math.ceil(room.round/ROUNDS_PER_SET)}, Round ${((room.round-1)%ROUNDS_PER_SET)+1} is live!`;room.status="running";emitRoom(room);
 room.timer=setInterval(()=>{if(room.status!=="running"||room.revealed)return stopTimer(room);room.secondsLeft=Math.max(0,room.secondsLeft-1);emitRoom(room);if(room.secondsLeft<=0)finishRound(room)},1000)
}
function newRoom(hostSocketId){let key;do{key=makeKey()}while(rooms.has(key));const room={key,hostSocketId,status:"lobby",players:new Map(),set:1,round:1,currentItem:null,highestBid:null,bids:[],winner:null,revealed:false,secondsLeft:0,timer:null,message:"Waiting for players to join."};rooms.set(key,room);return room}
io.on("connection",socket=>{
 socket.on("host:create",(_,cb)=>{const room=newRoom(socket.id);socket.join(room.key);socket.data.hostRoom=room.key;cb&&cb({ok:true,roomKey:room.key,room:publicRoom(room)})});
 socket.on("host:resume",({roomKey},cb)=>{const room=rooms.get(String(roomKey||"").toUpperCase());if(!room||room.hostSocketId!==socket.id)return cb&&cb({ok:false,error:"This host session is not available on this connection. Create a new room."});socket.join(room.key);socket.data.hostRoom=room.key;cb&&cb({ok:true,room:publicRoom(room)})});
 socket.on("player:join",({roomKey,nickname,startingCoins},cb)=>{const key=String(roomKey||"").trim().toUpperCase(),room=rooms.get(key),name=String(nickname||"").trim().slice(0,24),amount=Number(startingCoins);if(!room)return cb&&cb({ok:false,error:"Room Key not found. Check the key with your host."});if(room.status!=="lobby")return cb&&cb({ok:false,error:"The game has started. No more players can join."});if(name.length<2)return cb&&cb({ok:false,error:"Enter a nickname with at least 2 characters."});if(!Number.isSafeInteger(amount)||amount<0)return cb&&cb({ok:false,error:"Enter a valid starting coin amount."});if([...room.players.values()].some(p=>p.nickname.toLowerCase()===name.toLowerCase()))return cb&&cb({ok:false,error:"That nickname is already in this room."});const id=crypto.randomBytes(4).toString("hex").toUpperCase(),player={id,nickname:name,balance:amount,socketId:socket.id};room.players.set(id,player);socket.join(room.key);socket.data.playerRoom=room.key;socket.data.playerId=id;emitRoom(room);cb&&cb({ok:true,player:{id,nickname:name,balance:amount},room:publicRoom(room)})});
 socket.on("host:start",(_,cb)=>{const room=rooms.get(socket.data.hostRoom);if(!room||room.hostSocketId!==socket.id)return cb&&cb({ok:false,error:"Host access not found."});if(room.status!=="lobby")return cb&&cb({ok:false,error:"The game has already started."});if(!room.players.size)return cb&&cb({ok:false,error:"Wait for at least one player to join."});room.round=1;room.set=1;startRound(room);cb&&cb({ok:true})});
 socket.on("host:next",(_,cb)=>{const room=rooms.get(socket.data.hostRoom);if(!room||room.hostSocketId!==socket.id)return cb&&cb({ok:false,error:"Host access not found."});if(room.status!=="running"||!room.revealed)return cb&&cb({ok:false,error:"Wait for the current round to finish."});room.round++;room.set=Math.ceil(room.round/ROUNDS_PER_SET);startRound(room);cb&&cb({ok:true})});
 socket.on("player:bid",({amount},cb)=>{const room=rooms.get(socket.data.playerRoom),player=room&&room.players.get(socket.data.playerId);if(!room||!player)return cb&&cb({ok:false,error:"You are not in a game room."});if(room.status!=="running"||room.revealed)return cb&&cb({ok:false,error:"Bidding is closed."});const bid=Number(amount);if(!Number.isSafeInteger(bid)||bid<=0)return cb&&cb({ok:false,error:"Enter a valid whole-number bid."});if(bid<STARTING_BID)return cb&&cb({ok:false,error:"The starting bid is 100,000 coins."});if(room.highestBid&&bid<=room.highestBid.amount)return cb&&cb({ok:false,error:"Your bid must be higher than the current highest bid."});
 // Release the player's previous active bid (if they are rebidding), then reserve the new bid immediately.
 const previousOwn=room.highestBid&&room.highestBid.playerId===player.id?room.highestBid:null;
 const available=player.balance+(previousOwn?previousOwn.amount:0);
 if(bid>available)return cb&&cb({ok:false,error:"You cannot bid more than your available coins."});
 if(previousOwn){player.balance+=previousOwn.amount;}
 // If another player is being outbid, release their reserved coins.
 if(room.highestBid&&room.highestBid.playerId!==player.id)refundBid(room,room.highestBid);
 player.balance-=bid;room.highestBid={playerId:player.id,nickname:player.nickname,amount:bid};room.bids.unshift({nickname:player.nickname,amount:bid,time:Date.now()});room.bids=room.bids.slice(0,12);room.message=`${player.nickname} placed a bid of ${bid.toLocaleString()} coins.`;emitRoom(room);cb&&cb({ok:true})});
 socket.on("room:watch",({roomKey},cb)=>{const key=String(roomKey||"").trim().toUpperCase(),room=rooms.get(key);if(!room)return cb&&cb({ok:false,error:"Room not found."});socket.join(key);cb&&cb({ok:true,room:publicRoom(room)})});
 socket.on("disconnect",()=>{});
});
server.listen(PORT,()=>console.log(`Bidding Game server listening on ${PORT}`));
