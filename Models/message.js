const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversation:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
    },
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    message:{
        type: String,
        required: true,
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    isDeletedByEveryone: {
        type: Boolean,
        default: false
    }

},{timestamps:true});

module.exports = mongoose.model("Message",MessageSchema)
