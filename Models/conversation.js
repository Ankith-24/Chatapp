const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    members: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    lastMessage: {
        type: String,
        default: ""
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadMessages: {
        type: Map,
        of: Number,
        default: {}
    }
},{timestamps:true});

module.exports = mongoose.model("Conversation",ConversationSchema)
