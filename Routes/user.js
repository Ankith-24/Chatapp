const express = require('express');
const router = express.Router();
const UserController = require('../Controllers/user');
const auth = require('../Authentication/auth');
const upload = require('../middleware/fileUpload');

// Public routes
router.post('/register', upload.single('profileImage'), UserController.register);
router.post('/login', UserController.login);

// Protected routes (require authentication)
router.get('/searchedMember', auth, UserController.searchMember);
router.post('/logout', auth, UserController.logout);
router.get('/user/:userId', auth, UserController.getUserById);
router.get('/profile', auth, UserController.getCurrentUser);
router.post('/update-profile-picture', auth, upload.single('profileImage'), UserController.updateProfilePicture);

module.exports = router;