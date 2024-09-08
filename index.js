const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getRandomMovie } = require('./randomFilm');

app.use(cors());
const corsOrigin = 'http://localhost:3000';
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
  },
});

const users = {};
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('join_room', async (userId, roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    if (rooms[roomId].length >= 2) {
      socket.emit('room_full', {
        message: 'Комната заполнена, максимум 2 пользователя',
      });
      return;
    }

    rooms[roomId].push(userId);

    if (!users[userId]) {
      users[userId] = { likedMovies: [], matches: [] };
    }

    socket.join(roomId);
    socket.emit('user_joined', {
      message: `Пользователь ${userId} подключился`,
    });

    // Отправляем случайный фильм при присоединении пользователя
    if (rooms[roomId].length == 2) {
      const randomMovie = await getRandomMovie();
      io.to(roomId).emit('show_movie', randomMovie);
    }
  });

  socket.on('like_movie', async (userId, roomId, movie) => {
    if (!users[userId]) {
      users[userId] = { likedMovies: [], matches: [] };
    }

    users[userId].likedMovies.push(movie);

    const otherUserId = rooms[roomId].find((id) => id !== userId);

    if (
      otherUserId &&
      users[otherUserId] &&
      users[otherUserId].likedMovies.some(
        (likedMovie) => likedMovie.id === movie.id
      )
    ) {
      io.to(roomId).emit('match', movie);
    }

    // Отправляем новый случайный фильм после лайка
    // const newRandomMovie = await getRandomMovie();
    // io.to(roomId).emit('show_movie', newRandomMovie);
  });

  // socket.on('skip_movie', async (userId, roomId) => {
  //   // Отправляем новый случайный фильм после пропуска
  //   const newRandomMovie = await getRandomMovie();
  //   io.to(roomId).emit('show_movie', newRandomMovie);
  // });

  socket.on('disconnect', () => {
    // Удаление пользователя из всех комнат
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((user) => user !== socket.id);
      if (rooms[roomId].length === 0) {
        // Если комната пустая, можно удалить её
        delete rooms[roomId];
      }
    }

    // Удаление информации о пользователе
    for (const userId in users) {
      if (users[userId].socketId === socket.id) {
        delete users[userId];
        break;
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
});

server.listen(3001, () => {
  console.log('SERVER IS RUNNING');
});
