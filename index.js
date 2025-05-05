const express = require('express');
const app = express();
const cookieparser = require("cookie-parser");
const cors = require("cors");
const {Server} = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 8000;

const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin:"http://localhost:3000",
        methods:["GET","POST"],
    }
})

// Make io available to our routes
app.set('io', io);

const UserRoutes = require('./Routes/user');
const ConversationRoutes = require('./Routes/conversation')
const MessageRoutes = require('./Routes/message')

require('./Database/conn');
app.use(express.json());
app.use(cookieparser());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


io.on('connection',(socket)=>{
    console.log("User connected");

    // Store user's active rooms and active conversation
    const userActiveConversation = new Map();

    // Handle user setup
    socket.on("setup", (userId) => {
        console.log(`User ${userId} setup`);
        socket.join(userId);
        socket.emit("connected");

        // Store the user's ID in the socket for later reference
        socket.userId = userId;
    });

    socket.on("joinConversation",(conversationId)=>{
        console.log(`User joined conversation ${conversationId}`);
        socket.join(conversationId);

        // Store the user's active conversation
        if (socket.userId) {
            userActiveConversation.set(socket.userId, conversationId);
            console.log(`User ${socket.userId} is now active in conversation ${conversationId}`);
        }
    });

    socket.on("leaveConversation",(conversationId)=>{
        console.log(`User left conversation ${conversationId}`);
        socket.leave(conversationId);

        // Remove the user's active conversation
        if (socket.userId) {
            userActiveConversation.delete(socket.userId);
            console.log(`User ${socket.userId} is no longer active in any conversation`);
        }
    });

    socket.on("sendMessage",(message)=>{
        console.log("message sent", message);
        // Emit the message to the conversation room EXCEPT the sender
        socket.to(message.conversationId).emit("messageReceived", message);

        // Get all connected sockets
        const sockets = io.sockets.sockets;

        // Emit a targeted notification to update conversation list for users not in this conversation
        for (const [_, connectedSocket] of sockets) {
            if (connectedSocket.userId && connectedSocket.userId !== message.senderId) {
                // Check if this user is currently in the conversation
                const activeConversation = userActiveConversation.get(connectedSocket.userId);
                const isInConversation = activeConversation === message.conversationId;

                // Only emit to users who are not currently in this conversation
                if (!isInConversation) {
                    io.to(connectedSocket.userId).emit("conversationUpdated", {
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        shouldShowUnread: true,
                        lastMessageAt: new Date().toISOString() // Include timestamp for reordering
                    });
                } else {
                    // For users in the conversation, still update but don't show unread indicator
                    io.to(connectedSocket.userId).emit("conversationUpdated", {
                        conversationId: message.conversationId,
                        senderId: message.senderId,
                        shouldShowUnread: false,
                        lastMessageAt: new Date().toISOString() // Include timestamp for reordering
                    });
                }
            }
        }
    });

    socket.on("deleteMessage", (data) => {
        console.log("message deleted for user", data);
        // Only emit to the user who deleted the message
        // This ensures the deletion is only visible to the user who performed it
        socket.emit("messageDeleted", {
            messageId: data.messageId,
            conversationId: data.conversationId,
            deletionType: "receiver"
        });
    });

    socket.on("deleteMessageForEveryone", (data) => {
        console.log("message deleted for everyone", data);
        // Emit to all users in the conversation that a message was deleted
        io.to(data.conversationId).emit("messageDeleted", {
            messageId: data.messageId,
            conversationId: data.conversationId,
            deletionType: "sender"
        });
    });

    socket.on("updateConversationOrder", (data) => {
        console.log("updating conversation order", data);
        // Emit to the sender to update their conversation order
        // This is needed because the sender doesn't receive the conversationUpdated event
        socket.emit("conversationOrderUpdated", {
            conversationId: data.conversationId,
            lastMessageAt: data.lastMessageAt
        });
    });

    socket.on('disconnect',()=>{
        console.log("user disconnected");
    });
})


app.use(cors({
    credentials: true,
    origin:"http://localhost:3000"
}))

app.use('/api/auth',UserRoutes);
app.use('/api/conversation',ConversationRoutes);
app.use('/api/chat',MessageRoutes);

server.listen(PORT, () => {
    console.log("Backend project is running on port",PORT)
})