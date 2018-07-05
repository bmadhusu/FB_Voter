var mongoose = require('mongoose');
var bcrypt = require ('bcrypt');

// note: your host/port number may be different!
//mongoose.connect('mongodb://localhost:27017/VoterDatabase');

var Schema = mongoose.Schema;

var Posts = new Schema({
    id: String,
    msg: String,
    created_time: Date,
    link: String,
    caption: String,
    description: String
});

var userSchema = Schema({
    facebook: {
        id: String,
        token: String,
        email: String,
        name: String,
        posts: [Posts],
        data_last_retrieved: Date
        
    }
});

module.exports = mongoose.model('FB_Voter', userSchema);