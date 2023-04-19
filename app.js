require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

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
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// some passport required code
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => res.render("home"));

app.get("/register", (req, res) => res.render("register"));

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
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

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});
app.listen(3000, () => console.log("severer running on port 3000"));
