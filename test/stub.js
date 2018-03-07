/* global it describe */

const Nightmare = require('nightmare');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe(`Load ${config.url} ("stub")`, function runMain() {
  this.timeout(Number(config.test_timeout));

  const nightmare = new Nightmare(config.nightmare);

  describe('Do something', () => {
    it('should login', (done) => {
      helpers.login(nightmare, config, done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
