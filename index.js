const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getRandomMovie } = require('./randomFilm');

const corsOrigin = 'https://your-frontend-app-url.com';
app.use(
  cors({
    origin: corsOrigin,
  })
);
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
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((user) => user !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }

    for (const userId in users) {
      if (users[userId].socketId === socket.id) {
        delete users[userId];
        break;
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`SERVER IS RUNNING ON PORT ${port}`);
});
