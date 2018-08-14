/* global describe it */
/* eslint-disable no-console */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^type" }] */

const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Exercise users, inventory, checkout, checkin, settings ("test-exercise")', function descRoot() {
  this.timeout(Number(config.test_timeout));

  describe('Login > Update settings > Find user > Create inventory record > Create holdings record > Create item record > Checkout item > Confirm checkout > Checkin > Confirm checkin > Logout\n', function descStart() {
    const nightmare = new Nightmare(config.nightmare);
    let userid = 'user';

    it(`should login as ${config.username}/${config.password}`, (done) => {
      helpers.login(nightmare, config, done);
    });

    it('should configure checkout for barcode and username', (done) => {
      helpers.circSettingsCheckoutByBarcodeAndUsername(nightmare, config, done);
    });

    it('should find an active user ', (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#clickable-filter-pg-faculty')
        .click('#clickable-filter-pg-faculty')
        .wait('#list-users div[role="listitem"]:nth-child(9)')
        .evaluate(() => {
          const ubc = [];
          const list = document.querySelectorAll('#list-users div[role="listitem"]');
          list.forEach((node) => {
            const status = node.querySelector('a div:nth-child(1)').innerText;
            const barcode = node.querySelector('a div:nth-child(3)').innerText;
            const username = node.querySelector('a div:nth-child(5)').innerText;
            const uuid = node.querySelector('a').href.replace(/.+?([^/]+)\?.*/, '$1');
            if (barcode && status.match(/Active/)) {
              ubc.push({
                barcode,
                uuid,
                username,
              });
            }
          });
          return ubc;
        })
        .then((result) => {
          userid = result[0].username;
          console.log(`          Found user ${userid}`);
          done();
        })
        .catch(done);
    });

    it(`should find current loans count for ${userid}`, (done) => {
      nightmare
        .click(`div[title="${userid}"]`)
        .wait('#clickable-viewcurrentloans')
        .wait(1999)
        .evaluate(() => document.querySelector('#clickable-viewcurrentloans').textContent)
        .then(() => {
          // const ol = result;
          // openLoans = Number(ol.replace(/^(\d+).*/, '$1'));
          done();
          // console.log(`          Open loans: ${openLoans}`);
        })
        .catch(done);
    });
    it(`should find closed loans count for ${userid}`, (done) => {
      nightmare
        .evaluate(() => document.querySelector('#clickable-viewclosedloans').textContent)
        .then(() => {
          // const ol = result;
          // openLoans = Number(ol.replace(/^(\d+).*/, '$1'));
          done();
          // console.log(`          Closed loans: ${openLoans}`);
        })
        .catch(done);
    });

    const barcode = helpers.createInventory(nightmare, config, 'Soul station / Hank Mobley');

    it(`should check out ${barcode} to ${userid}`, (done) => {
      nightmare
        .click('#clickable-checkout-module')
        .wait('#input-patron-identifier')
        .type('#input-patron-identifier', userid)
        .wait('#clickable-find-patron')
        .click('#clickable-find-patron')
        .wait(() => {
          const err = document.querySelector('#patron-form div[class^="textfieldError"]');
          const yay = document.querySelector('#patron-form ~ div a > strong');
          if (err) {
            throw new Error(err.textContent);
          } else if (yay) {
            return true;
          } else {
            return false;
          }
        })
        .wait(222)
        .type('#input-item-barcode', barcode)
        .wait(222)
        .click('#clickable-add-item')
        .wait(1111)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="textfieldError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .then(() => {
          nightmare
            .wait(222)
            .click('#section-item button')
            .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 555) // debugging
            .then(done);
        })
        .catch(done);
    });
    it(`should find ${barcode} in ${userid}'s open loans`, (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .insert('#input-user-search', userid)
        .wait('#clickable-reset-all')
        .click('#clickable-reset-all')
        .insert('#input-user-search', userid)
        .wait(`#list-users div[title="${userid}"]`)
        .click(`#list-users div[title="${userid}"]`)
        .wait('#clickable-viewcurrentloans')
        .click('#clickable-viewcurrentloans')
        .wait((fbarcode) => {
          const element = document.evaluate(`id("list-loanshistory")//div[.="${fbarcode}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (element.singleNodeValue) {
            return true;
          } else {
            return false;
          }
        }, barcode)
        .wait('div[class*="LayerRoot"] button[class*="paneHeaderCloseIcon"]')
        .click('div[class*="LayerRoot"] button[class*="paneHeaderCloseIcon"]')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 555) // debugging
        .then(done)
        .catch(done);
    });
    it(`should check in ${barcode}`, (done) => {
      nightmare
        .click('#clickable-checkin-module')
        .wait(222)
        .insert('#input-item-barcode', barcode)
        .wait(222)
        .click('#clickable-add-item')
        .wait('#list-items-checked-in')
        .evaluate(() => {
          const a = document.querySelector('div[title="Available"]');
          if (a === null) {
            throw new Error("Checkin did not return 'Available' status");
          }
        })
        .then(done)
        .catch(done);
    });
    it(`should confirm ${barcode} in ${userid}'s closed loans`, (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .insert('#input-user-search', userid)
        .wait('#clickable-reset-all')
        .click('#clickable-reset-all')
        .insert('#input-user-search', userid)
        .wait(`div[title="${userid}"]`)
        .click(`div[title="${userid}"]`)
        .wait('#clickable-viewclosedloans')
        .click('#clickable-viewclosedloans')
        .wait((fbarcode) => {
          const element = document.evaluate(`id("list-loanshistory")//div[.="${fbarcode}"]`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (element.singleNodeValue) {
            return true;
          } else {
            return false;
          }
        }, barcode)
        .wait('div[class*="LayerRoot"] button[class*="paneHeaderCloseIcon"]')
        .click('div[class*="LayerRoot"] button[class*="paneHeaderCloseIcon"]')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 555) // debugging
        .then(done)
        .catch(done);
    });

    it('should logout', (done) => {
      helpers.logout(nightmare, config, done);
    });
  });
});
