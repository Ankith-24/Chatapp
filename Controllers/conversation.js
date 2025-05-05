const Conversation = require('../Models/conversation')
const ConversationModel = require("../Models/conversation")


exports.addConversation = async(req,res) =>{
    try{
        let senderId = req.user._id;
        let {receiverId} = req.body;

        // Check if conversation already exists
        const existingConversation = await ConversationModel.findOne({
            members: { $all: [senderId, receiverId] }
        }).populate("members", "-password");

        if (existingConversation) {
            return res.status(200).json({
                message: "Conversation already exists",
                conversation: existingConversation
            });
        }

        // Create new conversation
        let newConversation = new ConversationModel({
            members:[senderId,receiverId],
            lastMessageAt: new Date() // Set initial lastMessageAt to now
        });
        await newConversation.save();

        // Populate the members before returning
        const populatedConversation = await ConversationModel.findById(newConversation._id)
            .populate("members", "-password");

        res.status(201).json({
            message: "Conversation Created Successfully",
            conversation: populatedConversation
        });

    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

exports.getConversation =async(req,res)=>{
    try{
        let loggedinId = req.user._id;
        let conversations = await ConversationModel.find({
            members:{$in:[loggedinId]}
        })
        .sort({ lastMessageAt: -1 }) // Sort by lastMessageAt in descending order (newest first)
        .populate("members","-password");

        res.status(200).json({
            message: "Fetched Successfully",
            conversations
        })
    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}