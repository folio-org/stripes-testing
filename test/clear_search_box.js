const Nightmare = require('nightmare');
const assert = require('assert');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe(`Load ${config.url} ("test-simple")`, function () {

  this.timeout(Number(config.test_timeout));

  let nightmare = new Nightmare(config.nightmare);

  describe('Do something', () => {
    it('should login', (done) => {
      helpers.login(nightmare, config, done)
    })
    it('should clear search box', (done) => {
      nightmare
        .click('#clickable-users-module')
	.wait('#input-user-search')
	.type('#input-user-search','a')
	.wait(3333)
	// .wait('#clickable-input-user-search-clear-field')
	//.click('#clickable-input-user-search-clear-field')
	.evaluate(() => {
	  document.querySelector('#input-user-search').value = ''
	})
	.wait(5555)
        .end()
        .then(function (result) { done(); })
        .catch(done);
    });
  });
});
