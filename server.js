const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve your frontend files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory data store for profiles, challenges, and global high scores
let globalData = {
    profiles: {},
    challenges: {},
    beginner: [],
    intermediate: [],
    extreme: [],
    endless: [],
    daily: []
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send leaderboard and profile state when requested
    socket.on('get_leaderboard', () => {
        socket.emit('leaderboard_data', globalData);
    });

    // Track active user presence
    socket.on('update_presence', (profileData) => {
        globalData.profiles[profileData.name] = {
            avatar: profileData.avatar,
            lastActive: Date.now(),
            bests: profileData.bests || (globalData.profiles[profileData.name] ? globalData.profiles[profileData.name].bests : {})
        };
        io.emit('presence_updated', globalData.profiles);
    });

    // Submit game completion scores
    socket.on('submit_score', ({ category, scoreData }) => {
        if (!globalData[category]) globalData[category] = [];
        globalData[category].push(scoreData);
        globalData[category].sort((a, b) => category === 'endless' ? b.tiles - a.tiles || a.time - b.time : a.time - b.time);
        globalData[category] = globalData[category].slice(0, 10);
        io.emit('leaderboard_data', globalData);
    });

    // Handle 1v1 friend challenges
    socket.on('send_challenge', ({ targetFriend, challengeData }) => {
        if (!globalData.challenges[targetFriend]) globalData.challenges[targetFriend] = [];
        globalData.challenges[targetFriend].push(challengeData);
        io.emit('challenge_received', { target: targetFriend, challenge: challengeData });
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
