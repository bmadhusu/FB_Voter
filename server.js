var express = require('express');
// Create a new Express application.
var app = express();

var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var configAuth = require('./config/auth');
var mongoose = require('mongoose');

var configDB = require('./config/database');

mongoose.connect(configDB.url);
var User = require('./models/user');

// Configure the Facebook strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new Strategy({
  clientID: configAuth.facebookAuth.clientID,
  clientSecret: configAuth.facebookAuth.clientSecret,
  callbackURL: configAuth.facebookAuth.callbackURL,
  profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function (accessToken, refreshToken, profile, cb) {
   // User.findOrCreate({ facebookId: profile.id }, function (err, user) {
   //   return cb(err, user);
    process.nextTick(function () {
        User.findOne({'facebook.id': profile.id}, function(err, user) {
          if (err)
            return cb(err);
          if (user)
            return cb(null, user);
          else
            var newUser = new User();
            newUser.facebook.id = profile.id;
            newUser.facebook.token = accessToken;
            newUser.facebook.name = profile.displayName;
            newUser.facebook.email = profile.emails[0].value;

            newUser.save(function(err) {
              if (err)
                throw err;
              return cb(null, newUser);
            })
        })

    })
  //  console.log(accessToken, refreshToken, profile);
  //  return cb(null, profile);
  }));



// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

require ('./routes')(app, passport, User);




app.listen(3000);