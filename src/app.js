const express = require('express');
const cookieParser = require('cookie-parser');

require('./passport');
const usersRouter = require('./routes/users');
const teamsRouter = require('./routes/teams');
const transfersRouter = require('./routes/transfers');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/users', usersRouter);
app.use('/teams', teamsRouter);
app.use('/transfers', transfersRouter);

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
