const chai = require('chai');
const chaiHttp = require('chai-http');

const { Team, Transfer } = require('../src/models');
const app = require('../src/app');
const { createUserWithTokens } = require('./helpers');

chai.use(chaiHttp);
const should = chai.should();

describe('Teams', () => {
  let manager1;
  let manager1Token;
  let manager2;
  let manager2Token;
  let player1;
  let player1Token;
  let player2;
  let player2Token;
  let team1;
  let team2;

  // Remove all transfers before each test
  beforeEach(() => Transfer.destroy({ where: {} }));

  // Initial database setup
  before(() => Promise.all([
    createUserWithTokens({
      email: 'manager1@test.test',
      password: 'test',
      firstName: 'Manager-Un',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      manager1 = user;
      manager1Token = accessToken;
    }),

    createUserWithTokens({
      email: 'manager2@test.test',
      password: 'test',
      firstName: 'Manager-Deux',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      manager2 = user;
      manager2Token = accessToken;
    }),

    createUserWithTokens({
      email: 'player1@test.test',
      password: 'test',
      firstName: 'Player Un',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      player1 = user;
      player1Token = accessToken;
    }),

    createUserWithTokens({
      email: 'player2@test.test',
      password: 'test',
      firstName: 'Player Deux',
      lastName: 'Test',
    }).then(({ user, accessToken }) => {
      player2 = user;
      player2Token = accessToken;
    }),
  ]).then(() => Promise.all([
    Team.create({
      ownerId: manager1.id,
      name: 'Team Test 1',
    }).then((team) => {
      team1 = team;
    }),

    Team.create({
      ownerId: manager2.id,
      name: 'Team Test 2',
    }).then((team) => {
      team2 = team;
    }),
  ])));

  describe('POST /transfers', () => {
    it('should create a transfer', (done) => {
      chai.request(app)
        .post('/transfers')
        .send({
          player: { id: player1.id },
          targetTeam: { id: team1.id },
        })
        .auth(manager1Token, { type: 'bearer' })
        .end(async (err, res) => {
          res.should.have.status(200);
          res.body.should.have.property('transfer').be.a('object');
          res.body.transfer.should.have.property('player').be.a('object');
          res.body.transfer.player.should.have.property('id').eql(player1.id);
          res.body.transfer.should.have.property('initialTeam');
          should.not.exist(res.body.transfer.initialTeam);
          res.body.transfer.should.have.property('targetTeam').be.a('object');
          res.body.transfer.targetTeam.should.have.property('id').eql(team1.id);

          const transfers = await player1.getTransfers();
          transfers.should.be.a('array');
          transfers.length.should.eql(1);

          done();
        });
    });

    it('should NOT create a transfer if we are a player', (done) => {
      player2.setTeam(team2)
        .then(() => {
          chai.request(app)
            .post('/transfers')
            .send({
              player: { id: player1.id },
              targetTeam: { id: team1.id },
            })
            .auth(player2Token, { type: 'bearer' })
            .end(async (err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              await player2.setTeam(null);
              done();
            });
        });
    });

    it('should NOT create a transfer if we are not the manager of the target team', (done) => {
      chai.request(app)
        .post('/transfers')
        .send({
          player: { id: player1.id },
          targetTeam: { id: team1.id },
        })
        .auth(manager2Token, { type: 'bearer' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('errors').be.a('array');
          res.body.errors.length.should.be.greaterThan(0);

          done();
        });
    });

    it('should NOT create a transfer if the player is already in the target team', (done) => {
      player1.setTeam(team1)
        .then(() => {
          chai.request(app)
            .post('/transfers')
            .send({
              player: { id: player1.id },
              targetTeam: { id: team1.id },
            })
            .auth(manager1Token, { type: 'bearer' })
            .end(async (err, res) => {
              res.should.have.status(400);
              res.body.should.have.property('errors').be.a('array');
              res.body.errors.length.should.be.greaterThan(0);

              await player1.setTeam(null);
              done();
            });
        });
    });

    it('should NOT create a transfer if the player is a manager', (done) => {
      chai.request(app)
        .post('/transfers')
        .send({
          player: { id: manager2.id },
          targetTeam: { id: team1.id },
        })
        .auth(manager1Token, { type: 'bearer' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('errors').be.a('array');
          res.body.errors.length.should.be.greaterThan(0);

          done();
        });
    });

    it('should NOT create a dupplicate transfer', (done) => {
      Transfer.create({
        playerId: player1.id,
        initialTeamId: null,
        targetTeamId: team1.id,
        status: Transfer.statuses.WAITING_PLAYER_APPROVAL,
      }).then((transfer) => {
        chai.request(app)
          .post('/transfers')
          .send({
            player: { id: player1.id },
            targetTeam: { id: team1.id },
          })
          .auth(manager1Token, { type: 'bearer' })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.have.property('errors').be.a('array');
            res.body.errors.length.should.be.greaterThan(0);

            done();
          });
      });
    });
  });

  describe('PUT /transfers/:transferId', () => {
    it('should accept the transfer from the initial team perspective', (done) => {
      player1.setTeam(team1)
        .then(async () => {
          const transfer = await Transfer.create({
            playerId: player1.id,
            initialTeamId: team1.id,
            targetTeamId: team2.id,
            status: Transfer.statuses.WAITING_TEAM_APPROVAL,
          });

          chai.request(app)
            .put(`/transfers/${transfer.id}`)
            .send({ accept: true })
            .auth(manager1Token, { type: 'bearer' })
            .end(async (err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('transfer').be.a('object');
              res.body.transfer.should.have.property('status').eql(Transfer.statuses.WAITING_PLAYER_APPROVAL);

              done();
            });
        });
    });

    it('should reject the transfer from the initial team perspective', (done) => {
      player1.setTeam(team1)
        .then(async () => {
          const transfer = await Transfer.create({
            playerId: player1.id,
            initialTeamId: team1.id,
            targetTeamId: team2.id,
            status: Transfer.statuses.WAITING_TEAM_APPROVAL,
          });

          chai.request(app)
            .put(`/transfers/${transfer.id}`)
            .send({ accept: false })
            .auth(manager1Token, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('transfer').be.a('object');
              res.body.transfer.should.have.property('status').eql(Transfer.statuses.REJECTED_BY_TEAM);

              done();
            });
        });
    });

    it('should accept the transfer from the player perspective', (done) => {
      player1.setTeam(team1)
        .then(async () => {
          const transfer = await Transfer.create({
            playerId: player1.id,
            initialTeamId: team1.id,
            targetTeamId: team2.id,
            status: Transfer.statuses.WAITING_PLAYER_APPROVAL,
          });

          chai.request(app)
            .put(`/transfers/${transfer.id}`)
            .send({ accept: true })
            .auth(player1Token, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('transfer').be.a('object');
              res.body.transfer.should.have.property('status').eql(Transfer.statuses.SUCCESS);

              done();
            });
        });
    });

    it('should reject the transfer from the player perspective', (done) => {
      player1.setTeam(team1)
        .then(async () => {
          const transfer = await Transfer.create({
            playerId: player1.id,
            initialTeamId: team1.id,
            targetTeamId: team2.id,
            status: Transfer.statuses.WAITING_PLAYER_APPROVAL,
          });

          chai.request(app)
            .put(`/transfers/${transfer.id}`)
            .send({ accept: false })
            .auth(player1Token, { type: 'bearer' })
            .end((err, res) => {
              res.should.have.status(200);
              res.body.should.have.property('transfer').be.a('object');
              res.body.transfer.should.have.property('status').eql(Transfer.statuses.REJECTED_BY_PLAYER);

              done();
            });
        });
    });

    it('should not do anything if we are not related to the current state of the transfer', (done) => {
      Transfer.create({
        playerId: player1.id,
        initialTeamId: team1.id,
        targetTeamId: team2.id,
        status: Transfer.statuses.WAITING_PLAYER_APPROVAL,
      }).then((transfer) => {
        chai.request(app)
          .put(`/transfers/${transfer.id}`)
          .send({ accept: false })
          .auth(manager1Token, { type: 'bearer' })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.have.property('errors').be.a('array');
            res.body.errors.length.should.be.greaterThan(0);

            done();
          });
      });
    });

    it('should not update the transfer if it is already in SUCCESS status', (done) => {
      Transfer.create({
        playerId: player1.id,
        initialTeamId: team1.id,
        targetTeamId: team2.id,
        status: Transfer.statuses.SUCCESS,
      }).then((transfer) => {
        chai.request(app)
          .put(`/transfers/${transfer.id}`)
          .send({ accept: false })
          .auth(player1Token, { type: 'bearer' })
          .end((err, res) => {
            res.should.have.status(400);
            res.body.should.have.property('errors').be.a('array');
            res.body.errors.length.should.be.greaterThan(0);

            done();
          });
      });
    });
  });
});
