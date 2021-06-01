const chai = require('chai');
const chaiHttp = require('chai-http');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { sequelize, User } = require('../src/models');
const { createUser, createUserWithTokens } = require('./helpers');
const authConfig = require('../config/auth');

chai.use(chaiHttp);
chai.should();

describe('Users', () => {
  // Remove all users before each test
  beforeEach(() => User.destroy({ where: {} }));

  // Close database connection when finished
  after(() => sequelize.close());

  const userData = {
    email: 'test@test.test',
    password: 'test',
    firstName: 'Te',
    lastName: 'St',
  };

  describe('POST /users/signup', () => {
    it('should register a new user', (done) => {
      chai.request(app)
        .post('/users/signup')
        .send(userData)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('user');
          res.body.user.should.have.property('email').eql(userData.email);
          res.body.user.should.have.property('firstName').eql(userData.firstName);
          res.body.user.should.have.property('lastName').eql(userData.lastName);

          done();
        });
    });

    it('should NOT register an existing user', (done) => {
      createUser(userData)
        .then(() => {
          chai.request(app)
            .post('/users/signup')
            .send(userData)
            .end((err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });

  describe('POST /users/signin', () => {
    it('should log in', (done) => {
      createUser(userData)
        .then(() => {
          chai.request(app)
            .post('/users/signin')
            .send({
              email: userData.email,
              password: userData.password,
            })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('user').be.a('object');
              res.body.user.should.have.property('email').eql(userData.email);
              res.body.user.should.have.property('firstName').eql(userData.firstName);
              res.body.user.should.have.property('lastName').eql(userData.lastName);
              res.body.should.have.property('accessToken').be.a('string');
              res.should.have.cookie('refreshToken');

              let decodedToken;
              try {
                decodedToken = jwt.verify(res.body.accessToken, authConfig.accessToken.secret);
              } catch (e) {
                decodedToken = null;
              }

              decodedToken.should.be.a('object');
              decodedToken.should.have.property('id');
              decodedToken.should.have.property('email').eql(userData.email);

              done();
            });
        });
    });

    it('should NOT log in with a wrong password', (done) => {
      createUser(userData)
        .then(() => {
          chai.request(app)
            .post('/users/signin')
            .send({
              email: userData.email,
              password: 'dummy',
            })
            .end((err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });

  describe('POST /users/refreshToken', () => {
    it('should retrieve a new access token', (done) => {
      createUserWithTokens(userData)
        .then(({ accessToken, refreshToken }) => {
          chai.request(app)
            .post('/users/refreshToken')
            .auth(accessToken, { type: 'bearer' })
            .set('Cookie', `refreshToken=${refreshToken.value}`)
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('user').be.a('object');
              res.body.user.should.have.property('email').eql(userData.email);
              res.body.user.should.have.property('firstName').eql(userData.firstName);
              res.body.user.should.have.property('lastName').eql(userData.lastName);
              res.body.should.have.property('accessToken').be.a('string');

              let decodedToken;
              try {
                decodedToken = jwt.verify(res.body.accessToken, authConfig.accessToken.secret);
              } catch (e) {
                decodedToken = null;
              }

              decodedToken.should.be.a('object');
              decodedToken.should.have.property('id');
              decodedToken.should.have.property('email').eql(userData.email);

              done();
            });
        });
    });

    it('should NOT retrieve a new access token with an invalid refresh token', (done) => {
      createUserWithTokens(userData)
        .then(({ accessToken }) => {
          chai.request(app)
            .post('/users/refreshToken')
            .auth(accessToken, { type: 'bearer' })
            .set('Cookie', 'refreshToken=dummy')
            .end((err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });

  describe('POST /users/signout', () => {
    it('should sign out', (done) => {
      createUserWithTokens(userData)
        .then(({ accessToken, refreshToken }) => {
          chai.request(app)
            .post('/users/signout')
            .auth(accessToken, { type: 'bearer' })
            .set('Cookie', `refreshToken=${refreshToken.value}`)
            .end(async (err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('loggedOut').be.true;
              res.should.not.have.cookie('refreshToken');
              (await refreshToken.reload()).active.should.be.false;

              done();
            });
        });
    });
  });

  describe('GET /users/me', () => {
    it('should access the auth required route', (done) => {
      createUserWithTokens(userData)
        .then(({ accessToken }) => {
          chai.request(app)
            .get('/users/me')
            .auth(accessToken, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('user').be.a('object');
              res.body.user.should.have.property('email').eql(userData.email);
              res.body.user.should.have.property('firstName').eql(userData.firstName);
              res.body.user.should.have.property('lastName').eql(userData.lastName);

              done();
            });
        });
    });

    it('should NOT access the auth required route without an access token', (done) => {
      chai.request(app)
        .get('/users/me')
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.have.property('errors').be.a('array');
          res.body.errors.length.should.be.greaterThan(0);

          done();
        });
    });
  });
});
