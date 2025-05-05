const express = require('express');
const router = express.Router();
const auth = require('../Authentication/auth');
const MessageController = require('../Controllers/message');

router.post('/post-message-chat',auth,MessageController.sendMessage);
router.get('/get-message-chat/:convId',auth,MessageController.getMessage);
router.post('/mark-as-read/:conversationId',auth,MessageController.markAsRead);
router.delete('/delete-message/:messageId',auth,MessageController.deleteMessage);
router.delete('/delete-message-for-everyone/:messageId',auth,MessageController.deleteMessageForEveryone);

module.exports = router;