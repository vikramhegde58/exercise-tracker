const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid');
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

var User = mongoose.model('User', new mongoose.Schema({
  _id: {
    type: String,
    default: shortid.generate,
  },
  username: String
}));

var Exercise = mongoose.model('Exercise', new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: {
    type: Date,
    default: new Date(Date.now())
  }
}));

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', (req, res) => {
  console.log(new Date(Date.now()));
  User.find(function(err, data){
    res.json(data); 
  });
});

app.get('/api/exercise/log', (req, res) => {
  let queryObj = {
    userId: req.query.userId,
    date: Date.now
  }
  if(req.query.hasOwnProperty('from') && req.query.hasOwnProperty('to')){
     queryObj['date'] = {$gte: new Date(req.query.from), $lte: new Date(req.query.to)};
  } else if(req.query.hasOwnProperty('from')){
    queryObj['date'] = {$gte: new Date(req.query.from)};
  } else if(req.query.hasOwnProperty('to')){
    queryObj['date'] = {$lte: new Date(req.query.to)};
  } else {
     delete queryObj.date; 
  }
  Exercise.find(queryObj).select('-_id -userId').limit(Number(req.query.limit)).exec(function(err, exercise){
    User.findById(req.query.userId, function(err, user){
      res.json({username: user.username, _id: user._id, count: exercise.length, log: exercise});
    }); 
  });
});

app.post('/api/exercise/new-user', (req, res) => {
  User.create(req.body, function(err, data){
    if(data.length <= 0){
       res.send("username already taken");
    } else {
        console.log(data);
        res.json({username: data.username, _id: data._id}); 
    }
  });
});

app.post('/api/exercise/add', (req, res) => {
  if(req.body.date == "" || req.body.date == undefined){
       req.body['date'] = new Date;
  }
  User.find({_id: req.body.userId}, function(userErr, user){
    console.log(req.body);
    if(user.length <= 0){
       res.send("unkown _id");
    } else {
        Exercise.create(req.body, function(exErr, exercise){
          res.json({username: user[0].username, _id: exercise.userId, description: exercise.description, duration: exercise.duration, date: exercise.date.toDateString()});
        }); 
    }
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
