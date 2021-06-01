const chai = require('chai');
const chaiHttp = require('chai-http');

const { Team } = require('../src/models');
const app = require('../src/app');
const { createUserWithTokens } = require('./helpers');

chai.use(chaiHttp);
const should = chai.should();

describe('Users', () => {
  let manager;
  let managerToken;
  let player;
  let playerToken;

  // Remove all teams before each test
  beforeEach(() => Team.destroy({ where: {} }));

  // Initial database setup
  before(() => Promise.all([
    createUserWithTokens({
      email: 'manager@test.test',
      password: 'test',
      firstName: 'Manager',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      manager = user;
      managerToken = accessToken;
    }),

    createUserWithTokens({
      email: 'player@test.test',
      password: 'test',
      firstName: 'Player',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      player = user;
      playerToken = accessToken;
    }),
  ]));

  describe('GET /teams', () => {
    it('should return an empty list', (done) => {
      chai.request(app)
        .get('/teams')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('teams').be.a('array');
          res.body.teams.length.should.be.eql(0);

          done();
        });
    });

    it('should return a list with one team', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      }).then((team) => {
        chai.request(app)
          .get('/teams')
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.have.property('teams').be.a('array');
            res.body.teams.length.should.be.eql(1);
            res.body.teams[0].should.have.property('id').eql(team.id);
            res.body.teams[0].should.have.property('name').eql(team.name);

            done();
          });
      });
    });
  });

  describe('POST /teams', () => {
    it('should create a new team', (done) => {
      chai.request(app)
        .post('/teams')
        .send({ name: 'Dummy team' })
        .auth(managerToken, { type: 'bearer' })
        .end(async (err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('team').be.a('object');
          res.body.team.should.have.property('id');

          const team = await Team.findByPk(res.body.team.id);
          team.should.be.a('object');

          res.body.team.should.have.property('name').eql(team.name);

          done();
        });
    });

    it('should NOT create a new team if we are a player', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => player.setTeam(team))
        .then(() => {
          chai.request(app)
            .post('/teams')
            .send({ name: 'Dummy team 2' })
            .auth(playerToken, { type: 'bearer' })
            .end(async (err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });

  describe('GET /teams/:teamId', () => {
    it('should return the wanted team data', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => {
          player.setTeam(team)
            .then(() => {
              chai.request(app)
                .get(`/teams/${team.id}`)
                .end((err, res) => {
                  res.should.have.status(200);
                  res.body.should.have.property('team').be.a('object');
                  res.body.team.should.have.property('id').eql(team.id);
                  res.body.team.should.have.property('name').eql(team.name);
                  res.body.team.should.have.property('players').be.a('array');
                  res.body.team.players.length.should.eql(1);

                  done();
                });
            });
        });
    });
  });

  describe('PUT /teams/:teamId', () => {
    it('should update the team', (done) => {
      const newName = 'Dummy Team Updated';

      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => {
          chai.request(app)
            .put(`/teams/${team.id}`)
            .send({ name: newName })
            .auth(managerToken, { type: 'bearer' })
            .end(async (err, res) => {
              await team.reload();

              res.should.have.status(200);
              res.body.should.have.property('team').be.a('object');
              res.body.team.should.have.property('id').eql(team.id);
              res.body.team.should.have.property('name').eql(team.name);
              res.body.team.should.have.property('players').be.a('array');
              res.body.team.players.length.should.eql(0);
              team.name.should.eql(newName);

              done();
            });
        });
    });

    it('should NOT update the team when it is not the owner', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => {
          chai.request(app)
            .put(`/teams/${team.id}`)
            .send({ name: 'Dummy Team Updated' })
            .auth(playerToken, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(401);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });

  describe('DELETE /teams/:teamId', () => {
    it('should delete the team', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => {
          chai.request(app)
            .delete(`/teams/${team.id}`)
            .auth(managerToken, { type: 'bearer' })
            .end(async (err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('deleted').be.true;
              should.not.exist((await Team.findByPk(team.id)));

              done();
            });
        });
    });

    it('should NOT delete the team when it is not the owner', (done) => {
      Team.create({
        ownerId: manager.id,
        name: 'Dummy Team',
      })
        .then((team) => {
          chai.request(app)
            .delete(`/teams/${team.id}`)
            .auth(playerToken, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(401);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              done();
            });
        });
    });
  });
});
