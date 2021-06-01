const express = require('express');
const cookieParser = require('cookie-parser');

require('./passport');
const logger = require('./logger');
const usersRouter = require('./routes/users');
const teamsRouter = require('./routes/teams');
const transfersRouter = require('./routes/transfers');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/users', usersRouter);
app.use('/teams', teamsRouter);
app.use('/transfers', transfersRouter);

app.use((err, req, res, next) => {
  // Catch authorization errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      errors: [{
        msg: 'Unauthorized',
      }],
    });
  }

  // Other errors
  logger.error(err);
  return res.status(400).json({
    errors: [{
      msg: 'Unknown error',
    }],
  });
});

module.exports = app;
