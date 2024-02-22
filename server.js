const express = require('express')
const http = require('http')
const socketIO = require('socket.io')

const port = 4001;                        
const app = express();                    
const server = http.createServer(app);    
const io = socketIO(server);              

server.listen(port, () => {
  console.log(`http server listening on port ${port}`)
});

var roomno = 1;   

io.on('connection', (socket) => {
  var currentRoomId = 'room-' + roomno;
  socket.join(currentRoomId);
  
  console.log(`${socket.id} has connected to ${currentRoomId}`);

  if (io.nsps['/'].adapter.rooms[currentRoomId] && io.nsps['/'].adapter.rooms[currentRoomId].length > 1) roomno++;

  var playerSign = (io.nsps['/'].adapter.rooms[currentRoomId].length > 1) ? 'O' : 'X';
  io.sockets.to(socket.id).emit('playerSign', playerSign)

  io.sockets.in(currentRoomId).emit('connectToRoom', socket.id, currentRoomId, io.nsps['/'].adapter.rooms[currentRoomId].sockets);

  if (io.nsps['/'].adapter.rooms[currentRoomId].length > 1) {
    io.sockets.in(currentRoomId).emit('startGame');
  }

  socket.on('makeMove', (boardState, room, currPlayer, nextPlayer) => {
    if (checkWin(boardState, currPlayer)) {
      io.sockets.in(room).emit('gameWin', currPlayer);
    }
    if (checkStalemate(boardState)) {
      io.sockets.in(room).emit('stalemate');
    }
    io.sockets.in(room).emit('updateBoard', boardState, nextPlayer);
  })

  socket.on('resetGame', (room) => {
    console.log(`${socket.id} reset the game in ${room}!`);
    io.sockets.in(room).emit('resetGame');
  })
  
  socket.on('disconnect', () => {
    console.log(`${socket.id} has disconnected from ${currentRoomId}`);
    socket.broadcast.in(currentRoomId).emit('userLeft', socket.id);
  })

  socket.on('tauntOpponent', (opponentId) => {
    io.sockets.to(opponentId).emit('incomingTaunt', getRandomTaunt());
  })
})

const winConditions = [[0,1,2],
                       [3,4,5],
                       [6,7,8],
                       [0,3,6],
                       [1,4,7],
                       [2,5,8],
                       [0,4,8],
                       [2,4,6]]

const checkStalemate = (boardState) => {
  for (let i=0; i<boardState.length; i++) {
    if (boardState[i] === '') {
      return false;
    }
  }
  if (checkWin(boardState, 'X') || checkWin(boardState, 'O')) {
    return false;
  }
  return true;
}

const checkWin = (boardState, currPlayer) => {
  for (let i=0; i<winConditions.length; i++) {
    var win = true;
    for (let j=0; j<winConditions[i].length; j++) {
      if (boardState[winConditions[i][j]] !== currPlayer) {
        win = false;
      };
    }
    if (win === true) {
      return true;
    }
  }
  return false;
}

const getRandomTaunt = () => {
  return taunts[Math.floor(Math.random() * taunts.length)];
}

const taunts = [
                'u can go home',
                'thanks for wasting my time',
                'can i play with someone else',
                'u should feel bad',
                'stop crying',
              ];