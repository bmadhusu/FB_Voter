var User = require('./models/user');
module.exports = function(app, passport, User) {

    //Define routes.
    app.get('/',
        function (req, res) {
            res.render('home', { user: req.user});
        });

    app.get('/login',
        function (req, res) {
            res.render('login');
        });

    app.get('/login/facebook',
        passport.authenticate('facebook', {
            scope: ['manage_pages', 'user_likes', 'user_posts', 'user_friends', 'user_events', 'email']
        }
        ));

    app.get('/login/facebook/return',
        passport.authenticate('facebook', { failureRedirect: '/login' }),
        function (req, res) {
            res.redirect('/');
        });

    // app.route('/login/facebook/return')
    //   .get(passport.authenticate('facebook', function (err, user, info) {
    //     // this is where I would do a database save of this info!
    //     console.log("HI!!!!");
    //     console.log(user)
    //   }));

    app.get('/profile',
        isLoggedIn,
        function (req, res) {
            res.render('profile', { user: req.user });
        });

    const request = require('request-promise');



    // you'll need to have requested 'user_about_me' permissions
    // in order to get 'quotes' and 'about' fields from search
    const userFieldSet = 'name, link, is_verified, picture';
    const pageFieldSet = 'name, category, link, picture, is_verified';


    app.post('/facebook-search', (req, res) => {
        const { queryTerm, searchType } = req.body;

        var userToken = getToken(req.user);
        console.log('usertoken is ' + userToken);

        const options = {
            method: 'GET',
            uri: 'https://graph.facebook.com/search',
            qs: {
                access_token: userToken, //config.user_access_token,
                q: queryTerm,
                type: searchType,
                fields: searchType === 'page' ? pageFieldSet : userFieldSet
            }
        };

        request(options)
            .then(fbRes => {
                // Search results are in the data property of the response.
                // There is another property that allows for pagination of results.
                // Pagination will not be covered in this post,
                // so we only need the data property of the parsed response.
                const parsedRes = JSON.parse(fbRes).data;
                res.json(parsedRes);
            })
    });

    app.get('/facebook/getPosts', function(req, res) {
        var userToken = getToken(req.user);
        var fbID = getfbID(req.user);

        console.log('usertoken is ' + userToken);

        const options = {
            method: 'GET',
            uri: `https://graph.facebook.com/v3.0/${fbID}`,
            qs: {
                access_token: userToken,
                fields: 'posts'
            }
        };

        // `https://graph.facebook.com/v3.0/${fbID}/posts'
        
        console.log("URL is ", options.uri);

        request(options)
            .then(fbRes => {
                // Post results are in the data property of the response.
                // There is another property that allows for pagination of results.
                // Pagination will not be covered in this post,
                // so we only need the data property of the parsed response.
                const parsedRes = JSON.parse(fbRes);
                console.log("posts came back: ", parsedRes['posts']['data']);

                // save posts into mongo
                User.findOne({'facebook.id': fbID}, function(err, doc) {
                    if (err) console.log('could not find doc');
                    parsedRes['posts']['data'].forEach((a) => {
                        console.log(a);
                        console.log('doc is ', doc);
                        doc.facebook.posts.push({ id: a.id, msg: a.message, created_time: a.created_time});
                    });

                    doc.save(function(err) {
                        if (!err) console.log('Success!');
                    });

                });

                res.json(parsedRes);
            })

    });

    function isLoggedIn(req, res, next) {

        if (req.isAuthenticated()) {

            return next();

        }

        res.redirect('/login');

    }

    function getToken(user) {
        console.log("user Info: ", user);
        return user.facebook.token;
        
    }
    function getfbID(user) {
        return user.facebook.id;
        
    }
}