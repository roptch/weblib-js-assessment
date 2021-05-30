const express = require('express');
const cookieParser = require('cookie-parser');

require('./passport');
const userRouter = require('./routes/user');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/user', userRouter);

// Catch authorization errors
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    // @TODO: error management
    return res.status(401).json({
      errors: [{
        code: 1,
        title: 'Unauthorized',
        detail: 'Must be logged in to access this',
      }],
    });
  }
});

module.exports = app;
