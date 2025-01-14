const express = require('express');
require('dotenv').config();
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { getRandomMovie } = require('./randomFilm');
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: corsOrigin,
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: corsOrigin,
    origin: '*',
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
        message: 'Pokój jest pełny, maksymalnie 2 użytkowników',
      });
      return;
    }

    rooms[roomId].push(userId);

    if (!users[userId]) {
      users[userId] = { likedMovies: [], matches: [] };
    }

    socket.join(roomId);
    socket.emit('user_joined', {
      message: `Użytkownik ${userId} podłączył się`,
    });

    // Wyślij losowy film, gdy użytkownik dołączy
    if (rooms[roomId].length >= 2) {
      const randomMovie = await getRandomMovie();

      io.to(roomId).emit('show_movie', randomMovie.results);
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
        (likedMovie) => likedMovie.id == movie.id
      )
    ) {
      io.to(roomId).emit('match', movie);
    }
  });

  socket.on('skip_movie', async (userId, roomId) => {
    // Wysyłanie nowego losowego filmu po pominięciu
    const newRandomMovie = await getRandomMovie();
    io.to(roomId).emit('show_movie', newRandomMovie);
  });

  socket.on('disconnect', () => {
    // Usuwanie użytkownika ze wszystkich pokoi
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((user) => user !== socket.id);
      if (rooms[roomId].length === 0) {
        // Jeśli pokój jest pusty, możesz go usunąć
        delete rooms[roomId];
      }
    }

    // Usuwanie informacji o użytkowniku
    for (const userId in users) {
      if (users[userId].socketId === socket.id) {
        delete users[userId];
        break;
      }
    }

    console.log(`User ${socket.id} disconnected`);
  });
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});
