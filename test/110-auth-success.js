const Nightmare = require('nightmare');
const assert = require('assert');
const config = require('../folio-ui.config.js');

describe('Login Page ("test-good-login")', function () {
  this.timeout(Number(config.test_timeout));

  let nightmare = null;

  describe('Login and logout without error', () => {
    nightmare = new Nightmare(config.nightmare);
    it('Login successfully', (done) => {
      nightmare
        .goto(config.url)
        .wait(config.select.username)
        .type(config.select.username, config.username)
        .type(config.select.password, config.password)
        .click('#clickable-login')
        .wait('#clickable-logout')
        .then((result) => { done(); })
        .catch(done);
    });

    it('Logout properly', (done) => {
      nightmare
        .click('#clickable-logout') // logout
        .wait('#clickable-login')
        .end()
        .then((result) => { done(); })
        .catch(done);
    });
  });
});

