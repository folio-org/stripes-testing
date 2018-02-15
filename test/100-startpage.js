const Nightmare = require('nightmare');
const assert = require('assert');
const config = require('../folio-ui.config.js');

config.nightmare.gotoTimeout = 90000;

describe(`Load ${config.url} ("test-simple")`, function () {
  // Recommended: 5s locally, 10s to remote server, 30s from airplane
  this.timeout(Number(config.test_timeout));

  let nightmare = null;
  beforeEach(() => {
    nightmare = new Nightmare(config.nightmare);
  });

  describe('/ (Home Page)', () => {
    it('should load without error', (done) => {
      // your actual testing urls will likely be `http://localhost:port/path`
      nightmare.goto(config.url)
        .wait('#clickable-login')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG) ? parseInt(config.debug_sleep) : 0) // debugging
        .end()
        .then(function (result) { done(); })
        .catch(done);
    });
  });
});
