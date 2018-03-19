const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Inventory Search ("test-inventorysearch")', function () {
  this.timeout(Number(config.test_timeout));

  describe('Login > Click Inventory > Ente Search Term > Wait for Results > Confirm search term at top of results > Click Reset All > Wait for results pan to change state > Logout\n', () => {
    const nightmare = new Nightmare(config.nightmare);
    const title = '14 cows for America';
    it('should login', (done) => {
      helpers.login(nightmare, config, done);
    });
    it('click inventory', (done) => {
      nightmare
        .click('#clickable-inventory-module')
        .wait(555)
        .click('#input-inventory-search')
        .insert('#input-inventory-search', title)
        .wait(10000)
        .evaluate(function (title2) {
          const list = document.querySelector('#list-inventory div[role="listitem"]:first-of-type > a > div[role="gridcell"]:nth-of-type(1)').title;
          console.log(`list contais: ${list} and title is ${title2} `);
          if (list !== title2) {
            throw new Error('First item not matched');
          }
        }, title)
        .then((result) => { done(); })
        .catch(done);
    });
    it('Click Reset All button', (done) => {
      nightmare
        .wait(2222)
        .evaluate(function () {
          const button = document.querySelectorAll('button > span');
          button.forEach(function (userItem) {
            if (userItem.innerText === 'Reset all') {
              userItem.click();
            }
          });
        })
        .then((result) => { done(); })
        .catch(done);
    });
    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
