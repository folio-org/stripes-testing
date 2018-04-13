const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

/* global describe it */

describe('Inventory Search ("test-inventorysearch")', function runMain() {
  this.timeout(Number(config.test_timeout));

  describe('Login > Click Inventory > Ente Search Term > Wait for Results > Confirm search term at top of results > Click Reset All > Wait for results pan to change state > Logout\n', () => {
    const nightmare = new Nightmare(config.nightmare);
    const title = '14 cows for America';
    const authorName = 'Harmon, Daniel E.';


    it('should login', (done) => {
      helpers.login(nightmare, config, done);
    });
    it('click inventory', (done) => {
      nightmare
        .wait('#clickable-inventory-module')
        .click('#clickable-inventory-module')
        .wait('#input-inventory-search')
        .click('#input-inventory-search')
        .insert('#input-inventory-search', title)
        .wait('#clickable-input-inventory-search-clear-field')
        .wait(555)
        .evaluate(function evall(title2) {
          const list = document.querySelector('#list-inventory div[role="listitem"]:first-of-type > a > div[role="gridcell"]:nth-of-type(1)').title;
          console.log(`list contains: ${list} and title is ${title2} `);

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
        .evaluate(function evall2() {
          const button = document.querySelectorAll('button > span');
          button.forEach(function processUserItem(userItem) {
            if (userItem.innerText === 'Reset all') {
              userItem.click();
            }
          });
        })
        .then((result) => { done(); })
        .catch(done);
    });
    it('title search', (done) => {
      nightmare
        .wait(555)
        .select('#input-inventory-search-qindex', 'title')
        .wait(555)
        .insert('#input-inventory-search', title)
        .wait('#clickable-input-inventory-search-clear-field')
        .wait(6666)
        .evaluate(function evall(title2) {
          const list = document.querySelector('#list-inventory div[role="listitem"]:first-of-type > a > div[role="gridcell"]:nth-of-type(1)').title;
          // console.log(`list contains: ${list} and title is ${title2} `);
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
        .evaluate(function evall2() {
          const button = document.querySelectorAll('button > span');
          button.forEach(function processUserItem(userItem) {
            if (userItem.innerText === 'Reset all') {
              userItem.click();
            }
          });
        })
        .then((result) => { done(); })
        .catch(done);
    });
    it('contributor search', (done) => {
      nightmare
        .wait(555)
        .select('#input-inventory-search-qindex', 'contributor')
        .wait(555)
        .insert('#input-inventory-search', authorName)
        .wait('#clickable-input-inventory-search-clear-field')
        .wait(6666)
        .evaluate(function evall(title2) {
          const list = document.querySelector('#list-inventory div[role="listitem"]:first-of-type > a > div[role="gridcell"]:nth-of-type(2)').title;
          // console.log(`list contains: ${list} and title is ${title2} `);

          if (list !== title2) {
            throw new Error('First item not matched');
          }
        }, authorName)
        .then((result) => { done(); })
        .catch(done);
    });
    it('Click Reset All button', (done) => {
      nightmare
        .wait(2222)
        .evaluate(function evall2() {
          const button = document.querySelectorAll('button > span');
          button.forEach(function processUserItem(userItem) {
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
