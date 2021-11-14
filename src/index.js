// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign
const { port, env } = require('./config/vars');
const logger = require('./config/logger');
const server = require("./config/express");
const mongoose = require('./config/mongoose');

// open mongoose connection
mongoose.connect();

// listen to requests
const POST= process.env.PORT || 3000;
server.listen(POST, () => logger.info(`server started on port ${POST} (${env})`));

/**
* Exports express
* @public
*/
module.exports = server;
