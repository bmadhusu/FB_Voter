
const configDB = require('./config/database');
const mongoose = require('mongoose');
const request = require('request-promise');
const ONE_MONTH_AGO = 30*24*60*60*1000; // in milliseconds

mongoose.connect(configDB.url);
var User = require('./models/user');

process.on('SIGINT', function () {
    mongoose.connection.close(function () {
        console.log("Mongoose default connection is disconnected due to application termination");
        process.exit(0);
    });
});

// Iterate through each user
// and grab posts
// and likes to later be analyzed

//const queryAllUsers = () => {

    //https://stackoverflow.com/questions/45656257/the-easiest-way-to-iterate-through-a-collection-in-mongoose
    //Where User is you mongoose user model
    User.find({}, (err, users) => {
        if (err) {
            console.log("Yikes! Error getting users!");
        }

         
        users.map(user => {

            console.log('usertoken is ' + user.facebook.token);

            // get time since last updated
            var date_last_retrieved = user.facebook.data_last_retrieved;
            var date_now = new Date();

            if (date_last_retrieved == null) { // this is 1st time we're getting data for this user         
                date_last_retrieved = date_now - ONE_MONTH_AGO;
                console.log("No date last retrieved; setting to ", date_last_retrieved);
            }

           // Date manipulation
           // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date

            const options = {
                method: 'GET',
                uri: `https://graph.facebook.com/v3.0/${user.facebook.id}/posts`,
                qs: {
                    access_token: user.facebook.token,
                    fields: 'link,message,caption,description',
                    since: Math.floor(date_last_retrieved / 1000), // converts last retrieved date to milliseconds since 1970/01/01
                    until: Math.floor(date_now / 1000)
                    
                }
            };

            // `https://graph.facebook.com/v3.0/${fbID}/posts'

            console.log("URL is ", options.uri);

            request(options)
                .then(fbRes => {

                    const parsedRes = JSON.parse(fbRes);
                    //console.log("parsedRes is ", parsedRes);
                    //console.log("posts came back: ", parsedRes['posts']['data']);
                    parsedRes['data'].forEach((a) => {
                        console.log(a);
                        user.facebook.posts.push({ id: a.id, msg: a.message, created_time: a.created_time,
                                                    description: a.description, link: a.link, caption: a.caption });
                    });

                    if (parsedRes.paging && parsedRes.paging.next) {
                        console.log("going to call ProcessPosts");
                        processPosts(parsedRes, user, (user) => {
                            user.facebook.data_last_retrieved = date_now;
                            user.save(function (err) {
                                if (!err) console.log('Success!');
                            });
                        });
         
                    }

                    else {
                    
                        user.facebook.data_last_retrieved = date_now;
                        user.save(function (err) {
                            if (!err) console.log('Success!');
                        });
                    }

                });

        })
        console.log("No more users!");
      //  mongoose.connection.close();

 //       process.exit();
    })
    console.log("Exiting find callback");
//}

//queryAllUsers();

function processPosts(parsedRes, user, cb) {

    console.log("INSIDE ProcessPosts");
    request(parsedRes['paging']['next'])
        .then(res => {
            const more_Res = JSON.parse(res);
            more_Res['data'].forEach((a) => {
                console.log(a);
                user.facebook.posts.push({
                    id: a.id, msg: a.message, created_time: a.created_time,
                    description: a.description, link: a.link, caption: a.caption
                });
            });

            if (more_Res.paging && more_Res.paging.next) {
                console.log("recursively calling processPosts");
                processPosts(more_Res, user, cb);
            }
            else {
                console.log("calling save");
                cb(user);
            }

        })

}

// User.findOne({ 'facebook.id': fbID }, function (err, doc) {
//     if (err) console.log('could not find doc');
//     

