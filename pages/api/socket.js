import { Server } from 'socket.io'

const GRID_SIZE = 20;
const INITIAL_SNAKE_LENGTH = 3;

let games = {};

function createGame(roomId) {
  return {
    players: {},
    food: getRandomPosition(),
    roomId
  };
}

function getRandomPosition() {
  return [
    Math.floor(Math.random() * GRID_SIZE),
    Math.floor(Math.random() * GRID_SIZE)
  ];
}

function createSnake(startX, startY, direction) {
  let snake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    switch (direction) {
      case 'RIGHT':
        snake.push([startX - i, startY]);
        break;
      case 'LEFT':
        snake.push([startX + i, startY]);
        break;
      case 'UP':
        snake.push([startX, startY + i]);
        break;
      case 'DOWN':
        snake.push([startX, startY - i]);
        break;
    }
  }
  return snake;
}

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io')

    const io = new Server(res.socket.server)

    io.on('connection', socket => {
      console.log('A user connected')

      socket.on('joinGame', (roomId) => {
        socket.join(roomId);
        
        if (!games[roomId]) {
          games[roomId] = createGame(roomId);
        }

        const game = games[roomId];
        const playerCount = Object.keys(game.players).length;

        if (playerCount >= 2) {
          socket.emit('roomFull');
          return;
        }

        const playerId = socket.id;
        let startX, startY, direction;

        if (playerCount === 0) {
          startX = 5;
          startY = 5;
          direction = 'RIGHT';
        } else {
          startX = GRID_SIZE - 5;
          startY = GRID_SIZE - 5;
          direction = 'LEFT';
        }

        game.players[playerId] = {
          snake: createSnake(startX, startY, direction),
          direction: direction,
          score: 0
        };

        socket.emit('gameState', game);
        socket.to(roomId).emit('playerJoined', playerId);

        if (Object.keys(game.players).length === 2) {
          io.to(roomId).emit('startGame');
        }
      });

      socket.on('updateDirection', ({ roomId, direction }) => {
        const game = games[roomId];
        if (game && game.players[socket.id]) {
          game.players[socket.id].direction = direction;
        }
      });

      socket.on('disconnect', () => {
        console.log('A user disconnected');
        for (let roomId in games) {
          if (games[roomId].players[socket.id]) {
            delete games[roomId].players[socket.id];
            socket.to(roomId).emit('playerLeft', socket.id);
            if (Object.keys(games[roomId].players).length === 0) {
              delete games[roomId];
            }
          }
        }
      });
    })

    res.socket.server.io = io
  } else {
    console.log('socket.io already running')
  }
  res.end()
}

const gameLoop = setInterval(() => {
  for (let roomId in games) {
    const game = games[roomId];
    let foodEaten = false;

    for (let playerId in game.players) {
      const player = game.players[playerId];
      const head = [...player.snake[0]];

      switch (player.direction) {
        case 'UP':
          head[1] = (head[1] - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'DOWN':
          head[1] = (head[1] + 1) % GRID_SIZE;
          break;
        case 'LEFT':
          head[0] = (head[0] - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'RIGHT':
          head[0] = (head[0] + 1) % GRID_SIZE;
          break;
      }

      player.snake.unshift(head);

      if (head[0] === game.food[0] && head[1] === game.food[1]) {
        player.score += 1;
        foodEaten = true;
      } else {
        player.snake.pop();
      }

      // Check for collisions
      for (let otherPlayerId in game.players) {
        const otherPlayer = game.players[otherPlayerId];
        if (otherPlayer.snake.some((segment, index) => 
          (playerId === otherPlayerId && index !== 0 && segment[0] === head[0] && segment[1] === head[1]) ||
          (playerId !== otherPlayerId && segment[0] === head[0] && segment[1] === head[1])
        )) {
          if (res.socket.server.io) {
            res.socket.server.io.to(roomId).emit('gameOver', { loserId: playerId, winnerId: otherPlayerId });
          }
          delete games[roomId];
          return;
        }
      }
    }

    if (foodEaten) {
      game.food = getRandomPosition();
    }

    if (res.socket.server.io) {
      res.socket.server.io.to(roomId).emit('gameState', game);
    }
  }
}, 100);

export default ioHandler
