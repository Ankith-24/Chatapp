const express = require('express');
const router = express.Router();
const auth = require('../Authentication/auth');
const ConversationController = require('../Controllers/conversation');

router.post('/add-conversation',auth,ConversationController.addConversation);
router.get('/get-conversation',auth,ConversationController.getConversation)

module.exports = router;