const UserModel = require('../Models/user');
const bcrypt = require('bcryptjs')
const jwt = require("jsonwebtoken")


exports.register = async(req,res) =>{
    try{
        let { name, mobileNumber, password } = req.body;
        const isExist = await UserModel.findOne({mobileNumber});
        if(isExist){
            return res.status(409).json({error:"User with this Mobile Number already exist. Try with different Number."});
        }

        // Handle profile picture
        let profilePic = "https://img.freepik.com/premium-vector/photograph-cartoon-vector_970209-9543.jpg?ga=GA1.1.1408379961.1714224392&semt=ais_hybrid"; // Default image

        if (req.file) {
            // If a file was uploaded, use its path
            profilePic = `/uploads/${req.file.filename}`;
        } else if (req.body.profilePic) {
            // If a profile pic URL was provided in the body, use it
            profilePic = req.body.profilePic;
        }

        let hashedPassword = await bcrypt.hash(password,10);
        const newUser = new UserModel({name, mobileNumber, password: hashedPassword, profilePic});
        await newUser.save();

        res.status(200).json({
            message: "User Registered Successfully",
            newUser,
        })

    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

const cookieOptions = {
    httpOnly: true,
    secure: false,  //set to true in production
    sameSite: 'Lax',
    // No maxAge or expires means the cookie will be a session cookie
    // that expires when the browser is closed
};

exports.login = async(req,res) =>{
    try{
        const {mobileNumber,password} = req.body;
        const userExist = await UserModel.findOne({mobileNumber});

        if(userExist && await bcrypt.compare(password,userExist.password)){

            const token =jwt.sign({userId:userExist._id},'its_my_secret_key');
            res.cookie("token",token,cookieOptions)

            res.status(200).json({
                message: "Login Successfull",
                user:userExist
            })
        }else{
            res.status(400).json({error: 'Invalid Credentials'});
        }

    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}

exports.searchMember = async(req,res) =>{
    try{
        let {queryParam} = req.query;

        // If query is empty, return empty array
        if (!queryParam || queryParam.trim() === '') {
            return res.status(200).json([]);
        }

        // Escape special regex characters to prevent errors
        const escapedQuery = queryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const users = await UserModel.find({
            $and:[
                // Exclude current user
                {_id : {$ne:req.user._id}},
                {
                    $or:[
                        // Match anywhere in the name (not just at beginning)
                        { name: { $regex: new RegExp(escapedQuery, 'i')}},
                        // Match anywhere in the mobile number
                        { mobileNumber: { $regex: new RegExp(escapedQuery, 'i')}}
                    ]
                }
            ]
        }).limit(10) // Limit results to 10 users for better performance

        return res.status(200).json(users);

    }catch(err){
        console.log(err)
        res.status(500).json({error:'Server Error'})
    }
}


exports.logout = async (req,res)=>{
    res.clearCookie('token', cookieOptions).json({ message: 'Logged out successfully'});
}

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await UserModel.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'User found',
            user
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server Error' });
    }
}

// Update user profile picture
exports.updateProfilePicture = async (req, res) => {
    try {
        // Get the current user from the auth middleware
        const userId = req.user._id;

        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Get the file path
        const profilePic = `/uploads/${req.file.filename}`;

        // Update the user's profile picture
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { profilePic },
            { new: true } // Return the updated document
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the io instance from the req object (will be attached in index.js)
        if (req.app.get('io')) {
            const io = req.app.get('io');
            // Broadcast the profile update to all connected users
            io.emit('profileUpdated', {
                userId: updatedUser._id,
                profilePic: updatedUser.profilePic,
                userName: updatedUser.name
            });
        }

        res.status(200).json({
            message: 'Profile picture updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server Error' });
    }
}

// Get current user profile
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await UserModel.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({
            message: 'User profile retrieved successfully',
            user
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server Error' });
    }
}