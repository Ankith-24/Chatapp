const MessageModal = require('../Models/message');
const ConversationModel = require('../Models/conversation');


exports.sendMessage = async(req,res)=>{
    try{
        let { conversation, content } = req.body;
        let addMessage = new MessageModal({sender:req.user._id,conversation,message:content});
        await addMessage.save();

        // Update the conversation with the last message
        const conversationDoc = await ConversationModel.findById(conversation);

        // Update last message and lastMessageAt
        conversationDoc.lastMessage = content;
        conversationDoc.lastMessageAt = new Date(); // Set to current time

        // Increment unread messages for all members except the sender
        const senderId = req.user._id.toString();
        for (const memberId of conversationDoc.members) {
            if (memberId.toString() !== senderId) {
                const key = memberId.toString();
                const currentCount = conversationDoc.unreadMessages.get(key) || 0;
                conversationDoc.unreadMessages.set(key, currentCount + 1);
            }
        }

        await conversationDoc.save();

        let populatedMessage = await addMessage.populate("sender");
        res.status(201).json(populatedMessage);
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

exports.getMessage = async(req,res)=>{
    try{
        let {convId} = req.params;
        const userId = req.user._id;

        // Find messages that are:
        // 1. Not deleted by everyone AND
        // 2. Not specifically deleted for this user
        let message = await MessageModal.find({
            conversation: convId,
            isDeletedByEveryone: false, // Exclude messages deleted by everyone
            deletedFor: { $ne: userId } // Exclude messages deleted for this user
        }).populate('sender');

        // Mark messages as read for the current user
        await ConversationModel.findByIdAndUpdate(
            convId,
            { $set: { [`unreadMessages.${userId}`]: 0 } }
        );

        res.status(200).json({messages: "Fetched Message Successfully", message })
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

// Add a new route to mark messages as read
exports.markAsRead = async(req,res)=>{
    try{
        const { conversationId } = req.params;
        const userId = req.user._id.toString();

        await ConversationModel.findByIdAndUpdate(
            conversationId,
            { $set: { [`unreadMessages.${userId}`]: 0 } }
        );

        res.status(200).json({ message: "Messages marked as read" });
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

// Delete a message for the current user only (receiver-side deletion)
exports.deleteMessage = async(req,res)=>{
    try{
        const { messageId } = req.params;
        const userId = req.user._id;

        // Find the message
        const message = await MessageModal.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Add the current user to the deletedFor array
        if (!message.deletedFor) {
            message.deletedFor = [];
        }

        // Check if the message is already deleted for this user
        if (message.deletedFor.includes(userId)) {
            return res.status(400).json({ error: 'Message already deleted' });
        }

        // Add the user to the deletedFor array
        message.deletedFor.push(userId);
        await message.save();

        res.status(200).json({
            message: "Message deleted from your view",
            deletedMessageId: messageId,
            conversationId: message.conversation,
            deletionType: "receiver" // Indicate this is a receiver-side deletion
        });
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

// Delete a message for everyone (sender-side deletion)
exports.deleteMessageForEveryone = async(req,res)=>{
    try{
        const { messageId } = req.params;
        const userId = req.user._id;

        // Find the message
        const message = await MessageModal.findById(messageId);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Check if the user is the sender of the message
        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'You can only delete your own messages for everyone' });
        }

        // Check if the message was sent within the last 1 hour (optional time limit)
        const messageTime = new Date(message.createdAt).getTime();
        const currentTime = new Date().getTime();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        if (currentTime - messageTime > oneHour) {
            return res.status(403).json({ error: 'Messages can only be deleted for everyone within 1 hour of sending' });
        }

        // Mark the message as deleted by everyone
        message.isDeletedByEveryone = true;
        await message.save();

        // Check if this was the last message in the conversation
        const conversationId = message.conversation;
        const lastMessages = await MessageModal.find({
            conversation: conversationId,
            isDeletedByEveryone: false
        })
        .sort({ createdAt: -1 })
        .limit(1);

        // Update the conversation's lastMessage and lastMessageAt if needed
        if (lastMessages.length > 0) {
            await ConversationModel.findByIdAndUpdate(
                conversationId,
                {
                    lastMessage: lastMessages[0].message,
                    lastMessageAt: lastMessages[0].createdAt // Use the timestamp of the last message
                }
            );
        } else {
            // If no messages left, clear the lastMessage and keep the lastMessageAt
            await ConversationModel.findByIdAndUpdate(
                conversationId,
                { lastMessage: "" }
            );
        }

        res.status(200).json({
            message: "Message deleted for everyone",
            deletedMessageId: messageId,
            conversationId: message.conversation,
            deletionType: "sender" // Indicate this is a sender-side deletion
        });
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}