const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = require("express")();
const express = require("express");
const cors = require("cors");
var reCAPTCHA = require("recaptcha2");
const multer = require("multer");
const bcrypt = require("bcrypt");
const session = require("express-session");
const uuid = require("uuid");
const uploadImage = multer({
  dest: "public/uploadedImages",
});

app.use("/backend/", express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

//use sessions for tracking logins
app.use(
  session({
    secret: "work hard",
    resave: true,
    saveUninitialized: false,
  })
);

app.use(cors());

// connect to Mongo daemon
mongoose
  .connect("mongodb://localhost:27017/", {
    useNewUrlParser: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const validateToken = function (req, res, next) {
  const token = req.headers.token;
  User.findOne({
    token: token,
  }).then(function (user) {
    if (user && user.tokenTimestamp + 60 * 60 * 1000 > Date.now()) {
      next();
    } else {
      res.status(401);
      res.json({
        success: false,
        message: "Unauthorized",
      });
    }
  });
};

const recaptcha = new reCAPTCHA({
  siteKey: "enter site key here", // retrieved during setup
  secretKey: "enter secret key here", // retrieved during setup
});

//Token Validate Route
app.get("/backend/validate-token/", validateToken, (req, res) => {
  res.json({
    success: true,
  });
});

// Blog Posts DB schema
const blogItemSchema = new mongoose.Schema({
  blogTitle: String,
  blogSubTitle: String,
  blogText: String,
  blogCategory: String,
  author: String,
  avatar: String,
  image: String,
  date: {
    type: Date,
    default: Date.now,
  },
});

blogItem = mongoose.model("blogItem", blogItemSchema);
mongoose.set("useFindAndModify", false);

//Blog Item Post route
app.post("/backend/blog-item-post", validateToken, (req, res) => {
  const newItem = new blogItem({
    blogTitle: req.body.title,
    blogSubTitle: req.body.subtitle,
    blogText: req.body.text,
    blogCategory: req.body.category,
    author: req.body.author,
    avatar: req.body.avatar,
    image: req.body.image,
  });
  newItem.save().then((item) => console.log(item));
  res.json({
    success: true,
  });
});

//Blog All Items Get route
app.get("/backend/blog-item-get", (req, res) => {
  blogItem.find().then((items) => res.json(items));
});

//Blog Image Post Route
app.post(
  "/backend/blog-image-post",
  validateToken,
  uploadImage.single("image"),
  function (req, res) {
    if (!req.file) {
      console.log("No file received");
      return res.send({
        success: false,
      });
    } else {
      const filePath = "/backend/uploadedImages/" + req.file.filename;
      return res.send({
        fileUrl: filePath,
        success: true,
      });
    }
  }
);

//Blog Single Item Get Route
app.get("/backend/blog-single-view/:id", (req, res) => {
  blogItem.findById(req.params.id).then((items) => res.json(items));
});

//Blog Put route
app.put("/backend/blog-single-item-put/:id", validateToken, (req, res) => {
  blogItem
    .findByIdAndUpdate(
      {
        _id: req.params.id,
      },
      req.body
    )
    .then(function () {});
  res.send({
    success: true,
  });
});

//Blog Delete route
app.delete(
  "/backend/blog-single-item-delete/:id",
  validateToken,
  (req, res) => {
    blogItem
      .findByIdAndRemove({
        _id: req.params.id,
      })
      .then(function (item) {});
    res.send({
      success: true,
    });
  }
);

// Todo Posts DB schema
const todoItemSchema = new mongoose.Schema({
  todoTitle: String,
  todoText: String,
  status: String,
  person: String,
  due: {
    type: Date,
    default: Date.now,
  },
});

todoItem = mongoose.model("todoItem", todoItemSchema);

//Todo Item Post route
app.post("/backend/todo-item-post", validateToken, (req, res) => {
  const newItem = new todoItem({
    todoTitle: req.body.todoTitle,
    todoText: req.body.todoText,
    due: req.body.due,
    status: req.body.status,
    person: req.body.person,
  });
  newItem.save().then((item) => console.log(item));
  res.json({
    success: true,
  });
});

//Todo All Items Get route
app.get("/backend/todo-item-get", (req, res) => {
  todoItem.find().then((items) => res.json(items));
});

//Todo Single Item Get route
app.get("/backend/todo-single-item-get/:id", (req, res) => {
  todoItem.findById(req.params.id).then((items) => res.json(items));
});

//Todo Put route
app.put("/backend/todo-single-item-put/:id", validateToken, (req, res) => {
  todoItem
    .findByIdAndUpdate(
      {
        _id: req.params.id,
      },
      req.body
    )
    .then(function (item) {});
  res.send({
    success: true,
  });
});

//Todo Delete route
app.delete(
  "/backend/todo-single-item-delete/:id",
  validateToken,
  (req, res) => {
    todoItem
      .findByIdAndRemove({
        _id: req.params.id,
      })
      .then(function (item) {});
    res.send({
      success: true,
    });
  }
);

// User DB schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  token: {
    type: String,
  },
  tokenTimestamp: {
    type: Number,
  },
  signupDate: {
    type: Date,
    default: Date.now,
  },
});

//authenticate input against database
userSchema.statics.authenticate = function (email, password, callback) {
  User.findOne({
    email: email,
  }).exec(function (err, user) {
    if (err) {
      return callback(err);
    } else if (!user) {
      var err = new Error("User not found.");
      err.status = 401;
      return callback(err);
    }

    bcrypt.compare(password, user.password, function (err, result) {
      if (result === true) {
        return callback(null, user);
      } else {
        return callback();
      }
    });
  });
};

const User = mongoose.model("User", userSchema);

// //User Register Route
// app.post('/backend/user-register/', function (req, res, next) {
//   recaptcha.validate(req.body.recaptchaToken)
//     .then(async function () {
//       // validated and secure
//       if (req.body.password !== req.body.passwordConf) {
//         res.status(400);
//         res.json({
//           success: false,
//           message: 'Password did not match!'
//         });
//         return next();
//       }

//       var userData = {
//         email: req.body.email,
//         username: req.body.username,
//         password: req.body.password,
//       }

//       userData.password = await bcrypt.hash(userData.password, 10)
//       let user = await User.create(userData)

//       req.session.userId = user._id;
//       res.status(200);
//       res.send({
//         success: true
//       });
//     })
//     .catch(function (errorCodes) {
//       // invalid
//       res.status(500).send(recaptcha.translateErrors(errorCodes))
//       //console.log(recaptcha.translateErrors(errorCodes)); // translate error codes to human readable text
//     });
// })

//User Login Route
app.post("/backend/user-login/", function (req, res, next) {
  recaptcha
    .validate(req.body.recaptchaToken)
    .then(async function () {
      // validated and secure
      User.authenticate(req.body.logemail, req.body.logpassword, function (
        error,
        user
      ) {
        if (error || !user) {
          var err = new Error("Wrong email or password.");
          err.status = 401;
          return next(err);
        } else {
          const token = uuid.v4();
          const tokenTimestamp = Date.now();
          user.token = token;
          user.tokenTimestamp = tokenTimestamp;
          user.save();
          console.log(user);
          res.json({
            token: token,
          });
        }
      });
    })
    .catch(function (errorCodes) {
      // invalid
      res.status(500).send(recaptcha.translateErrors(errorCodes));
    });
});

const port = 3000;
app.listen(port, () => console.log("Server running..."));
