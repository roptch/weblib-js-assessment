# Weblib JS Assessment
![example workflow](https://github.com/roptch/weblib-js-assessment/actions/workflows/tests.yml/badge.svg)

## Deployment

### With Docker
```zsh
> docker-compose up -d app
```
Warning: if you already a postgres instance running, either stop it or change the output port of the db container in [docker-compose.yml](/docker-compose.yml)

### Standalone

Requirements:
* PostgreSQL service running with 3 databases created: 'weblib_development', 'weblib_test', 'weblib_production'
* Env variables for the postgres connection: WEBLIB_DB_HOST, WEBLIB_DB_USER, WEBLIB_DB_PW

```zsh
> npm install
> npx sequelize-cli db:migrate
> npm test
> npm run start
```
## API

### Postman

The api is located at http://localhost:1337.

A postman collection is available [here](/Weblib.postman_collection.json) to test all the routes.

### Philosophy

* A user can be a manager or a player
* To be a manager, the user has to create a team
* To be a player, the user has to be recruited in a team
* A manager cannot play in a team, a player cannot create teams
* A manager can make a transfer offer for a player to join one of his team
* For the transfer to be successful, both the manager of the current player team and the player himself have to accept the offer
