const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  connectionStateRecovery: {},
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const users = {};
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', (userId, roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (rooms[roomId].length >= 2) {
      // Если в комнате уже 2 пользователя, отправляем сообщение об ошибке
      socket.emit('room_full', {
        message: 'Комната заполнена, максимум 2 пользователя',
      });
      return;
    }
    rooms[roomId].push(userId);

    if (!users[userId]) {
      users[userId] = { likedMovies: [], matches: [] };
    }

    socket.emit('user_joined', {
      message: `Вы подключились к комнате  ${roomId} `,
    });

    console.log(`${userId},${roomId} data`);
    socket.join(roomId);
  });

  socket.on('like_movie', (userId, roomId, movieId) => {
    if (!users[userId]) {
      users[userId] = { likedMovies: [], matches: [] };
    }

    // Добавляем фильм в список понравившихся
    users[userId].likedMovies.push(movieId);
    console.log(`User ${userId} liked movie ${movieId}`);

    // Проверяем второго пользователя в комнате
    const otherUserId = rooms[roomId].find((id) => id !== userId);

    if (otherUserId && users[otherUserId].likedMovies.includes(movieId)) {
      // Если оба пользователя лайкнули один и тот же фильм, то это "match"
      io.to(roomId).emit('match', {
        message: `Match! Оба пользователя лайкнули фильм ${movieId}`,
        movieId,
      });

      // Сохраняем информацию о совпадении
      users[userId].matches.push(movieId);
      users[otherUserId].matches.push(movieId);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((user) => user !== socket.id);
      console.log(`User ${socket.id} disconnected from room ${roomId}`);
    }
  });
});

server.listen(3001, () => {
  console.log('SERVER IS RUNNING');
});
