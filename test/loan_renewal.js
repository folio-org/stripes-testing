/* global describe it */
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^type" }] */

const Nightmare = require('../xnightmare.js');
const config = require('../folio-ui.config.js');
const helpers = require('../helpers.js');

describe('Tests to validate the loan renewals', function descRoot() {
  this.timeout(Number(config.test_timeout));

  describe('Login > Update settings > Find user > Create inventory record > Create holdings record > Create item record > Checkout item > Confirm checkout > Logout\n', function descStart() {
    const nightmare = new Nightmare(config.nightmare);
    let userid = 'user';
    const uselector = "#list-users div[role='listitem']:nth-of-type(12) > a > div:nth-of-type(5)";
    const policyName = 'test-policy';
    const renewalLimit = 1;
    const loanPeriod = 1;

    it(`should login as ${config.username}/${config.password}`, (done) => {
      nightmare
        .on('page', function onAlert(type = 'alert', message) {
          throw new Error(message);
        })
        .goto(config.url)
        .wait(Number(config.login_wait))
        .insert(config.select.username, config.username)
        .insert(config.select.password, config.password)
        .click('#clickable-login')
        .wait('#clickable-logout')
        .then(done)
        .catch(done);
    });

    it('should set patron scan ID to "User"', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .wait(222)
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/checkout"]')
        .wait(222)
        .click('a[href="/settings/circulation/checkout"]')
        .wait('#username-checkbox')
        .wait(1000)
        .evaluate(() => {
          const list = document.querySelectorAll('[data-checked="true"]');
          list.forEach(el => (el.click()));
        })
        .wait(222)
        .click('#username-checkbox')
        .wait(222)
        .xclick('//button[.="Save"]')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 1111) // debugging
        .then(done)
        .catch(done);
    });

    it('should create a new loan policy with renewalLimit of 1', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/loan-policies"]')
        .click('a[href="/settings/circulation/loan-policies"]')
        .wait(222)
        .xclick('//button[.="+ New"]')
        .wait('#input_policy_name')
        .type('#input_policy_name', policyName)
        .wait('#input_loan_period')
        .type('#input_loan_period', loanPeriod)
        .wait('#select_policy_period')
        .click('#select_policy_period')
        .wait(222)
        .type('#select_policy_period', 'mo')
        .wait(222)
        .wait('#input_allowed_renewals')
        .type('#input_allowed_renewals', renewalLimit)
        .wait('#select_renew_from')
        .type('#select_renew_from', 'cu')
        .xclick('//button[.="Save and close"]')
        .wait(1000)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="textfieldError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .then(done)
        .catch(done);
    });
    it('Apply the loan policy created to the loan rule', (done) => {
      nightmare
        .wait(config.select.settings)
        .click(config.select.settings)
        .wait('a[href="/settings/circulation"]')
        .click('a[href="/settings/circulation"]')
        .wait('a[href="/settings/circulation/loan-rules"]')
        .click('a[href="/settings/circulation/loan-rules"]')
        .wait('#form-loan-rules')
        .wait(1000)
        .evaluate(() => {
          document.getElementsByClassName("CodeMirror")[0].CodeMirror.setValue('priority: t, s, c, b, a, m, g \nfallback-policy: example-loan-policy \nm book: test-policy');
        })
        .wait(222)
        .xclick('//button[.="Save"]')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 1111) // debugging
        .then(done)
        .catch(done);
    });
    it('should find an active user ', (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait(2000)
        .click('#clickable-filter-active-Active')
        .wait(uselector)
        .evaluate(selector => document.querySelector(selector).title, uselector)
        .then((result) => {
          userid = result;
          done();
          console.log(`          Found user ${userid}`);
        })
        .catch(done);
    });
    const barcode = helpers.createInventory(nightmare, config, 'Soul station / Hank Mobley');

    it(`should check out ${barcode} to ${userid}`, (done) => {
      nightmare
        .click('#clickable-checkout-module')
        .wait('#input-patron-identifier[placeholder*="username"]')
        .evaluate(() => {
          const ph = document.querySelector('#input-patron-identifier').placeholder;
          if (!ph.match(/username/i)) {
            throw new Error(`Placeholder is not asking for Username! (${ph})`);
          }
        })
        .insert('#input-patron-identifier', userid)
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
        .insert('#input-item-barcode', barcode)
        .wait(222)
        .click('#clickable-add-item')
        .wait(1111)
        .evaluate(() => {
          const sel = document.querySelector('div[class^="textfieldError"]');
          if (sel) {
            throw new Error(sel.textContent);
          }
        })
        .wait(222)
        .click('#section-item button')
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 555) // debugging
        .then(done)
        .catch(done);
    });
    it(`should find ${barcode} in ${userid}'s open loans`, (done) => {
      nightmare
        .click('#clickable-users-module')
        .wait('#input-user-search')
        .wait(222)
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
        .wait(parseInt(process.env.FOLIO_UI_DEBUG, 10) ? parseInt(config.debug_sleep, 10) : 555) // debugging
        .then(done)
        .catch(done);
    });

    it(`should Renew the loan`, (done) => {
      nightmare
        .wait(222)
        .wait(`div[title="${barcode}"]`)
        .evaluate((fbarcode) => {
          const ele = document.querySelector(`div[title="${fbarcode}"]`);
          ele.parentElement.querySelector('input[type="checkbox"]').click();
        }, barcode)
        .wait(333)
        .wait('button[title="Renew"]')
        .click('button[title="Renew"]')
        .wait(555)
        .then(done)
        .catch(done);
    });

    it(`should Renew the loan second time and shouldn't succeed`, (done) => {
      nightmare
        .wait(1000)
        .wait(`div[title="${barcode}"]`)
        .evaluate((fbarcode) => {
          const ele = document.querySelector(`div[title="${fbarcode}"]`);
          ele.parentElement.querySelector('input[type="checkbox"]').click();
        }, barcode)
        .wait(333)
        .wait('button[title="Renew"]')
        .click('button[title="Renew"]')
        .wait('#renewal-failure-modal')
        .evaluate(() => {
          const errorMsg = document.querySelector('#renewal-failure-modal > p').innerText;
          if(errorMsg === null){
            throw new Error("Should throw an error as the renewalLimit is reached");
          }
          else if(errorMsg !== "Loan cannot be renewed because: loan has reached its maximum number of renewals"){
            throw new Error("Expected only the renewal failure error message");
          }
        })
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

    it(`should delete the loan policy`, (done) => {
      nightmare
      .wait(222)
      .xclick('//span[.="Settings"]')
      .wait(222)
      .xclick('id("ModuleContainer")//a[.="Circulation"]')
      .wait(222)
      .xclick('id("ModuleContainer")//a[.="Loan policies"]')
      .wait(222)
      .xclick('id("ModuleContainer")//a[.="test-policy"]')
      .wait('#clickable-edit-item')
      .click('#clickable-edit-item')
      .wait('button[title="Delete Loan Policy"]')
      .click('button[title="Delete Loan Policy"]')
      .wait(222)
      .wait('#clickable-deleteloanpolicy-confirmation-confirm')
      .click('#clickable-deleteloanpolicy-confirmation-confirm')
      .wait(222)
      .then(done)
      .catch(done);
    });

    it('should logout', (done) => {
      nightmare
        .click('#clickable-logout')
        .wait(config.select.username)
        .end()
        .then(done)
        .catch(done);
    });
  });
});
