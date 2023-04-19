require("dotenv").config();
const express = require("express");
var bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET_KEY,
//   encryptedFields: ["password"],
// });
const User = new mongoose.model("User", userSchema);

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => res.render("home"));

app.get("/register", (req, res) => res.render("register"));
app.post("/register", async (req, res) => {
  await bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    const newUser = new User({
      email: req.body.username,
      password: hash,
    });
    newUser.save().then((joku1) => {
      res.render("secrets");
    });
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ email: username }).then((foundUser) => {
    if (foundUser) {
      bcrypt.compare(password, foundUser.password, function (err, result) {
        if (result === true) {
          res.render("secrets");
        } else {
          res.send("AUTH FAILED!");
        }
      });
    }
  });
});
app.get("/login", (req, res) => res.render("login"));
app.listen(3000, () => console.log("severer running on port 3000"));
