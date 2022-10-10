const mongoose = require("mongoose");
mongoose.connect(process.env['MONGO_URI'], {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
require('dotenv').config();

// mongoose schemas and models
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});
const User = mongoose.model("User", userSchema);

let exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: {
    type: Date,
    transform: v => v.toDateString()
  },
  userId: String
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// middlewares
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: "false"}));

// log function
const logMiddleWare = function (req, res, next) {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  console.log(req.body["_id"], typeof(req.body["_id"]));
  console.log(req.body["description"], typeof(req.body["description"]));
  console.log(req.body["duration"], typeof(req.body["duration"]));
  console.log(req.body["date"], typeof(req.body["date"]), "\n");
  next();
}
// app.use(logMiddleWare);

// app methods
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", (req, res) => {
  let inputUsername = req.body.username;
  User.findOne({username: inputUsername}, (err, userFound)=>{
    if (err) return console.log(err);
    if (!userFound) {
      let newUser = new User({
        username: inputUsername
      });
      newUser.save((err, savedUser) => {
        if (err) return console.log(err);
        res.json({
          username: savedUser["username"],
          _id: savedUser["_id"]
        });
      });
    } else {
      res.json({
          username: userFound["username"],
          _id: userFound["_id"]
      });
    }
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, (err, data)=>{
    if (err) return console.log(err);
    res.send(data);
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  let userId = req.params["_id"];
  User.findOne({"_id": userId}, (err, userFound) => {
    if (err) return console.log(userFound);
    if (userFound) {
      let newExercise = new Exercise({
        username: userFound["username"],
        description: req.body["description"],
        duration: req.body["duration"],
        userId: userFound["_id"],
      });
      dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(req.body["date"])) {
        newExercise.date = new Date();
      } else {
        newExercise.date = new Date(req.body["date"]);
      }
      newExercise.save((err, savedExercise) => {
        if (err) return console.log(err);
        res.json({
          _id: savedExercise.userId,
          username: savedExercise.username,
          date: savedExercise.date.toDateString(),
          duration: savedExercise.duration,
          description: savedExercise.description,
        });
      });
    } else {
      res.json({error: "User Not Found"});
    }
  });
});

app.get("/api/users/:_id/logs", (req, res) => {
  dateRegex = /^\d{4}-\d{2}-\d{2}$/
  let fromDate;
  let toDate;
  
  let userId = req.params["_id"];
  let limitLogs = +req.query["limit"] || 0;
  
  if (dateRegex.test(req.query["from"])) {
    fromDate = req.query["from"];
  } else {
    fromDate = new Date(0);
  }
  
  if (dateRegex.test(req.query["to"])) {
    toDate = req.query["to"];
  } else {
    toDate = new Date();
  }
  
  Exercise.find({"userId": userId, "date": {$gte: fromDate, $lte: toDate}})
          .select({"description": 1, "duration": 1, "date": 1, "_id": 0})
          .limit(limitLogs)
          .exec((err, userExercises) => {
            if (err) return console.log(err);
            User.findOne({"_id": userId}, (err, userFound) => {
              if (err) return console.log(err);
              res.json({
                username: userFound.username,
                _id: userId,
                count: userExercises.length,
                log: userExercises
              });
            });
          });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
