const mongoose = require('mongoose');

mongoose.connect("mongodb://localhost:27017/chatApp").then((response) => {
    console.log("MongoDB Database connected successfully");
}).catch((err)=>{
    console.log(err)
})