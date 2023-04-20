require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
var findOrCreate = require("mongoose-findorcreate");

const app = express();

mongoose
  .connect(
    "mongodb+srv://" +
      process.env.DB_USERNAME +
      ":" +
      process.env.DB_PASSWORD +
      "@" +
      process.env.DB_ADDRESS +
      "/userDB?retryWrites=true&w=majority"
  )
  .then(console.log("Connected to db"));

// Setting up session
app.use(
  session({
    secret: "kommunisti",
    resave: false,
    saveUninitialized: false,
  })
);
// Defining view-engine and bodyParser
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
// Defining passport
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secrets: String,
  username: String,
  profilePic: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

// some passport required code
passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});

// Google OAUTH
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, profile, cb) => {
      console.log(profile);
      User.findOrCreate(
        {
          googleId: profile.id,
          secrets: null,
          username: profile._json.given_name,
          email: profile._json.email,
          profilePic: profile._json.picture,
        },
        (err, user) => {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", (req, res) => res.render("home"));

app.get("/register", (req, res) => res.render("register"));

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("Authed user from googol");
    res.redirect("/secrets");
  }
);

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    User.find({ secrets: { $ne: null } }).then((foundUsers) => {
      console.log(foundUsers);
      res.render("secrets", { usersWithSecrets: foundUsers });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/all", (req, res) => {
  User.find({}).then((foundUsers) => {
    res.render("users", { users: foundUsers });
  });
});
app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (error, user) => {
      if (error) {
        console.log(error);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("secrets");
      });
    }
  });
});
app.get("/login", (req, res) => res.render("login"));

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { secrets: req.body.secret } },
      { new: true }
    ).then(res.redirect("/secrets"));
    console.log(
      "Successfully updatet user " +
        req.user.id +
        " with secret " +
        submittedSecret
    );
  } catch (e) {
    console.log(e);
  }
  // User.findById(req.user.id).then((foundUser) => {
  //   console.log(foundUser);
  //   if (foundUser) {
  //     foundUser.secret = submittedSecret;
  //     foundUser.save().then((savedObj) => console.log(savedObj));
  //   }
  // });
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.listen(3000, () => console.log("severer running on port 3000"));
